#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Flask API服务

该模块实现了推荐系统的API接口，包括：
1. 健康检查接口
2. 岗位推荐接口
3. 交互反馈接口
4. 模型更新接口
5. 推荐解释接口

使用Flask框架构建，支持跨域请求。
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional

from flask import Flask, request, jsonify, g
from flask_cors import CORS
import pandas as pd

from database import db_manager
from recall import recall_pipeline
from ranking import ranking_pipeline
from business_rules import business_rules_pipeline
from data_models import RecommendationResult
from ab_testing import ab_test_manager
from experiment_algorithms import enhanced_gbdt_pipeline, hybrid_ranking_pipeline
from ab_testing_api import ab_bp

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 创建Flask应用
app = Flask(__name__)
CORS(app)  # 启用跨域请求

# 注册A/B测试蓝图
app.register_blueprint(ab_bp)

# 配置
app.config['JSON_SORT_KEYS'] = False  # 保持JSON键的原始顺序
app.config['JSONIFY_MIMETYPE'] = 'application/json; charset=utf-8'  # 设置JSON响应的编码

# 数据库连接管理
@app.before_request
def before_request():
    """
    请求前连接数据库
    
    每个请求开始前自动连接数据库，确保后续操作可以访问数据库。
    """
    db_manager.connect()

@app.teardown_request
def teardown_request(exception):
    """
    请求结束后关闭数据库连接
    
    无论请求成功还是失败，都会在请求结束后关闭数据库连接，避免连接泄露。
    """
    db_manager.disconnect()

# 健康检查接口
@app.route('/health', methods=['GET'])
def health_check():
    """
    健康检查接口
    
    用于检查服务是否正常运行，返回服务状态、时间戳和服务名称。
    
    Returns:
        json: 包含健康状态信息的JSON响应
    """
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'service': 'gig-recommendation-system'
    })

# 推荐接口
@app.route('/api/recommend/jobs', methods=['POST'])
def recommend_jobs():
    """
    岗位推荐接口（集成A/B测试）
    
    请求参数:
    {
        "worker_id": 123,
        "location": {
            "lat": 39.9042,
            "lng": 116.4074
        },
        "limit": 20
    }
    
    返回:
    {
        "success": true,
        "jobs": [...],
        "total": 20,
        "experiment_info": {  # A/B测试信息
            "experiment_id": "ranking_algorithm_v1",
            "variant": "gbdt_enhanced"
        }
    }
    
    该接口实现了完整的推荐流程，并集成了A/B测试：
    1. 验证请求参数
    2. A/B测试分配：为用户分配实验变体
    3. 召回阶段：获取候选岗位
    4. 排序阶段：根据变体配置选择不同的排序算法
    5. 业务规则阶段：应用业务规则过滤和调整
    6. 构建返回结果
    7. 记录A/B测试事件和推荐日志
    """
    try:
        # 获取请求参数
        data = request.get_json()
        
        if not data:
            return jsonify({'error': '请求参数不能为空'}), 400
        
        worker_id = data.get('worker_id')
        location = data.get('location')
        limit = data.get('limit', 20)
        
        if not worker_id:
            return jsonify({'error': 'worker_id是必需的'}), 400
        
        # 验证worker_id
        worker = db_manager.get_worker_by_id(worker_id)
        if not worker:
            return jsonify({'error': '工人不存在'}), 404
        
        # 更新工人位置（如果提供）
        if location and 'lat' in location and 'lng' in location:
            db_manager.update_worker_location(
                worker_id, 
                float(location['lat']), 
                float(location['lng'])
            )
            logger.info(f"更新工人 {worker_id} 位置: {location['lat']}, {location['lng']}")
        
        logger.info(f"为工人 {worker_id} 生成推荐，限制 {limit} 个结果")
        
        # A/B测试分配
        experiment_id = "ranking_algorithm_v1"
        variant_name = ab_test_manager.assign_user_to_variant(worker_id, experiment_id)
        logger.info(f"A/B测试分配 - 用户: {worker_id}, 实验: {experiment_id}, 变体: {variant_name}")
        
        # 1. 召回阶段
        logger.info("开始召回阶段...")
        candidate_jobs = recall_pipeline(worker_id, limit=200)
        
        if not candidate_jobs:
            logger.warning(f"没有找到适合工人 {worker_id} 的岗位")
            return jsonify({
                'success': True,
                'jobs': [],
                'total': 0,
                'message': '暂时没有找到适合您的岗位'
            })
        
        logger.info(f"召回了 {len(candidate_jobs)} 个候选岗位")
        
        # 2. 排序阶段（根据A/B测试变体选择不同算法）
        logger.info("开始排序阶段...")
        
        # 根据变体配置选择排序算法
        if variant_name == "control":
            # 控制组：使用原有逻辑回归模型
            ranked_recommendations = ranking_pipeline(worker_id, candidate_jobs, top_k=100)
            algorithm_used = "logistic_regression"
            
        elif variant_name == "gbdt_enhanced":
            # 实验组1：使用增强版GBDT模型
            ranked_recommendations = enhanced_gbdt_pipeline(worker_id, candidate_jobs, top_k=100)
            algorithm_used = "gbdt_enhanced"
            
        elif variant_name == "hybrid_approach":
            # 实验组2：使用混合算法
            ranked_recommendations = hybrid_ranking_pipeline(worker_id, candidate_jobs, top_k=100)
            algorithm_used = "hybrid"
            
        else:
            # 默认使用控制组算法
            ranked_recommendations = ranking_pipeline(worker_id, candidate_jobs, top_k=100)
            algorithm_used = "default"
        
        if not ranked_recommendations:
            logger.warning(f"排序阶段没有返回结果")
            return jsonify({
                'success': True,
                'jobs': [],
                'total': 0
            })
        
        logger.info(f"排序后得到 {len(ranked_recommendations)} 个推荐结果（算法: {algorithm_used}）")
        
        # 3. 业务规则阶段
        logger.info("开始应用业务规则...")
        final_recommendations = business_rules_pipeline(
            worker_id, 
            ranked_recommendations, 
            top_k=limit
        )
        
        logger.info(f"应用业务规则后得到 {len(final_recommendations)} 个最终结果")
        
        # 获取岗位详细信息
        job_ids = [rec.job_id for rec in final_recommendations]
        jobs_info = db_manager.get_jobs_info(job_ids)
        job_info_map = {job['job_id']: job for job in jobs_info}
        
        # 构建返回结果
        result_jobs = []
        for rec in final_recommendations:
            job_info = job_info_map.get(rec.job_id, {})
            
            job_result = {
                'job_id': rec.job_id,
                'score': float(rec.score),
                'distance': float(rec.distance) if rec.distance else None,
                'reason': rec.reason,
                'job_info': {
                    'title': job_info.get('title', ''),
                    'description': job_info.get('description', ''),
                    'salary': float(job_info.get('salary', 0)),
                    'salary_type': job_info.get('salary_type', ''),
                    'job_type': job_info.get('job_type', ''),
                    'location_lat': float(job_info.get('location_lat', 0)),
                    'location_lng': float(job_info.get('location_lng', 0)),
                    'address': job_info.get('address', ''),
                    'start_time': job_info.get('start_time').isoformat() if hasattr(job_info.get('start_time'), 'isoformat') else job_info.get('start_time', ''),
                    'end_time': job_info.get('end_time').isoformat() if hasattr(job_info.get('end_time'), 'isoformat') else job_info.get('end_time', ''),
                    'required_count': job_info.get('required_count', 0),
                    'current_count': job_info.get('current_count', 0),
                    'merchant_name': job_info.get('business_name', ''),
                    'merchant_type': job_info.get('business_type', ''),
                    'merchant_rating': float(job_info.get('merchant_rating', 0)) if job_info.get('merchant_rating') else None,
                    'views_count': job_info.get('views_count', 0),
                    'apply_count': job_info.get('apply_count', 0)
                }
            }
            
            result_jobs.append(job_result)
        
        # 记录A/B测试事件（推荐展示）
        ab_test_manager.record_event(
            worker_id=worker_id,
            experiment_id=experiment_id,
            variant_name=variant_name,
            event_type="recommendation_shown",
            event_data={
                "job_count": len(result_jobs),
                "algorithm_used": algorithm_used,
                "timestamp": datetime.now().isoformat()
            }
        )
        
        # 记录推荐日志
        log_recommendation(worker_id, job_ids)
        
        # 返回结果，包含A/B测试信息
        response_data = {
            'success': True,
            'jobs': result_jobs,
            'total': len(result_jobs),
            'experiment_info': {
                'experiment_id': experiment_id,
                'variant': variant_name,
                'algorithm_used': algorithm_used
            }
        }
        
        return jsonify(response_data)
    
    except Exception as e:
        logger.error(f"推荐接口错误: {str(e)}", exc_info=True)
        
        # 记录错误事件
        try:
            ab_test_manager.record_event(
                worker_id=worker_id,
                experiment_id=experiment_id,
                variant_name=variant_name,
                event_type="recommendation_error",
                event_data={
                    "error": str(e),
                    "timestamp": datetime.now().isoformat()
                }
            )
        except:
            pass
        
        return jsonify({
            'error': '服务器内部错误',
            'message': str(e)
        }), 500

# 交互反馈接口
@app.route('/api/feedback/interaction', methods=['POST'])
def record_interaction():
    """
    记录用户交互反馈
    
    请求参数:
    {
        "worker_id": 123,
        "job_id": 456,
        "interaction_type": "view",  // view/apply/match/complete/rating
        "rating": 5,                 // 可选，评分（1-5）
        "comment": "工作很满意"       // 可选，评论
    }
    
    该接口用于记录用户与岗位的交互行为，包括：
    1. 验证请求参数
    2. 验证工人和岗位是否存在
    3. 记录交互行为
    4. 处理特殊交互类型（如申请）
    5. 更新岗位统计信息
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': '请求参数不能为空'}), 400
        
        worker_id = data.get('worker_id')
        job_id = data.get('job_id')
        interaction_type = data.get('interaction_type')
        
        if not all([worker_id, job_id, interaction_type]):
            return jsonify({'error': '缺少必需参数'}), 400
        
        # 验证参数
        valid_types = ['view', 'apply', 'match', 'complete', 'rating']
        if interaction_type not in valid_types:
            return jsonify({
                'error': '无效的交互类型',
                'valid_types': valid_types
            }), 400
        
        # 验证工人和岗位是否存在
        worker = db_manager.get_worker_by_id(worker_id)
        job = db_manager.get_job_by_id(job_id)
        
        if not worker:
            return jsonify({'error': '工人不存在'}), 404
        
        if not job:
            return jsonify({'error': '岗位不存在'}), 404
        
        # 记录交互
        interaction_id = db_manager.save_interaction(
            worker_id=worker_id,
            job_id=job_id,
            interaction_type=interaction_type,
            rating=data.get('rating'),
            comment=data.get('comment')
        )
        
        if not interaction_id:
            return jsonify({'error': '记录交互失败'}), 500
        
        # 如果是申请操作，创建申请记录
        if interaction_type == 'apply':
            application_id = db_manager.create_application(worker_id, job_id)
            logger.info(f"工人 {worker_id} 申请岗位 {job_id}，申请ID: {application_id}")
        
        # 更新岗位统计信息
        db_manager.update_job_statistics(job_id, interaction_type)
        
        logger.info(f"记录交互: 工人 {worker_id}, 岗位 {job_id}, 类型 {interaction_type}")
        
        return jsonify({
            'success': True,
            'interaction_id': interaction_id
        })
    
    except Exception as e:
        logger.error(f"交互记录接口错误: {str(e)}", exc_info=True)
        return jsonify({
            'error': '服务器内部错误',
            'message': str(e)
        }), 500

# 模型更新接口
@app.route('/api/model/update', methods=['POST'])
def update_model():
    """
    触发模型更新
    
    该接口用于触发模型的重新训练，使用线程异步执行，避免阻塞请求。
    需要通过X-API-Key头部进行授权验证。
    """
    try:
        # 验证权限
        api_key = request.headers.get('X-API-Key')
        if api_key != os.environ.get('API_SECRET_KEY', 'default_secret_key'):
            return jsonify({'error': '未授权访问'}), 401
        
        # 异步触发模型更新
        from threading import Thread
        
        def retrain_model_task():
            """
            模型重新训练任务
            """
            try:
                logger.info("开始重新训练模型...")
                from ranking import train_models
                train_models()
                logger.info("模型重新训练完成")
            except Exception as e:
                logger.error(f"模型训练失败: {str(e)}", exc_info=True)
        
        thread = Thread(target=retrain_model_task)
        thread.daemon = True  # 设置为守护线程，避免阻止应用关闭
        thread.start()
        
        return jsonify({
            'success': True,
            'message': '模型更新已开始，将在后台运行'
        })
    
    except Exception as e:
        logger.error(f"模型更新接口错误: {str(e)}", exc_info=True)
        return jsonify({
            'error': '服务器内部错误',
            'message': str(e)
        }), 500

# 获取推荐解释接口
@app.route('/api/recommend/explain', methods=['GET'])
def explain_recommendation():
    """
    获取推荐解释
    
    请求参数:
    ?worker_id=123&job_id=456
    
    该接口用于获取推荐结果的解释，包括：
    1. 加载最佳模型
    2. 获取特征重要性
    3. 计算该推荐的特征值
    4. 构建特征解释，包括特征值、重要性和影响
    """
    try:
        worker_id = request.args.get('worker_id', type=int)
        job_id = request.args.get('job_id', type=int)
        
        if not all([worker_id, job_id]):
            return jsonify({'error': '缺少必需参数'}), 400
        
        # 获取特征重要性
        from ranking import load_best_model
        model = load_best_model()
        
        if not model:
            return jsonify({'error': '无法加载模型'}), 500
        
        # 获取特征重要性
        importance_df = model.get_feature_importance()
        
        # 获取该推荐的特征值
        from feature_engineering import get_worker_features, get_job_features, generate_combined_features
        from ranking import get_feature_names
        
        worker_features = get_worker_features(worker_id)
        job_features = get_job_features(job_id)
        
        if not worker_features or not job_features:
            return jsonify({'error': '无法获取特征信息'}), 404
        
        feature_values = generate_combined_features(worker_features, job_features)
        feature_names = get_feature_names()
        
        # 构建特征解释
        feature_explanations = []
        for i, (name, value) in enumerate(zip(feature_names, feature_values)):
            importance = importance_df[importance_df['feature'] == name]['importance'].values[0] if 'importance' in importance_df.columns else 0
            coefficient = importance_df[importance_df['feature'] == name]['coefficient'].values[0] if 'coefficient' in importance_df.columns else 0
            
            # 判断特征对推荐的影响
            impact = 'positive' if (coefficient > 0 and value > 0) or (coefficient < 0 and value < 0) else 'negative'
            
            feature_explanations.append({
                'feature': name,
                'value': float(value),
                'importance': float(importance),
                'coefficient': float(coefficient),
                'impact': impact
            })
        
        # 按重要性排序
        feature_explanations.sort(key=lambda x: x['importance'], reverse=True)
        
        return jsonify({
            'success': True,
            'model_type': model.model_name,
            'top_features': feature_explanations[:10],
            'total_features': len(feature_explanations)
        })
    
    except Exception as e:
        logger.error(f"推荐解释接口错误: {str(e)}", exc_info=True)
        return jsonify({
            'error': '服务器内部错误',
            'message': str(e)
        }), 500

# 辅助函数
def log_recommendation(worker_id: int, job_ids: List[int]):
    """
    记录推荐日志
    
    Args:
        worker_id: 工人ID
        job_ids: 推荐的岗位ID列表
    """
    try:
        log_data = {
            'worker_id': worker_id,
            'job_ids': job_ids,
            'timestamp': datetime.now().isoformat(),
            'count': len(job_ids)
        }
        
        # 这里可以将日志写入数据库或文件
        logger.info(f"推荐日志: {json.dumps(log_data)}")
        
    except Exception as e:
        logger.error(f"记录推荐日志失败: {str(e)}")

# 错误处理
@app.errorhandler(404)
def not_found(error):
    """
    处理404错误
    
    Args:
        error: 错误信息
        
    Returns:
        json: 包含错误信息的JSON响应
    """
    return jsonify({
        'error': '资源不存在',
        'message': str(error)
    }), 404

@app.errorhandler(500)
def internal_error(error):
    """
    处理500错误
    
    Args:
        error: 错误信息
        
    Returns:
        json: 包含错误信息的JSON响应
    """
    logger.error(f"内部错误: {str(error)}", exc_info=True)
    return jsonify({
        'error': '服务器内部错误',
        'message': '服务器暂时无法处理请求'
    }), 500

if __name__ == '__main__':
    """
    应用入口点
    
    确保模型目录存在并启动Flask应用。
    """
    # 确保模型目录存在
    os.makedirs('models', exist_ok=True)
    
    # 启动Flask应用
    app.run(
        host='0.0.0.0',  # 监听所有网络接口
        port=5000,  # 端口号
        debug=False,  # 生产环境禁用debug模式
        threaded=True  # 启用多线程处理
    )