#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
A/B测试系统API接口

提供A/B测试的实验管理、数据查询和效果分析接口。
"""

from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from typing import Dict, List, Any

from ab_testing import ab_test_manager, Experiment, ExperimentStatus

# 创建蓝图
ab_bp = Blueprint('ab_testing', __name__, url_prefix='/api/ab-testing')

# 实验管理接口
@ab_bp.route('/experiments', methods=['GET'])
def list_experiments():
    """
    获取实验列表
    
    返回所有A/B测试实验的基本信息。
    """
    try:
        experiments = []
        for exp in ab_test_manager.experiments.values():
            experiments.append(exp.to_dict())
        
        return jsonify({
            'success': True,
            'experiments': experiments,
            'total': len(experiments)
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ab_bp.route('/experiments/<experiment_id>', methods=['GET'])
def get_experiment(experiment_id: str):
    """
    获取实验详情
    
    Args:
        experiment_id: 实验ID
    """
    try:
        experiment = ab_test_manager.experiments.get(experiment_id)
        if not experiment:
            return jsonify({
                'success': False,
                'error': '实验不存在'
            }), 404
        
        return jsonify({
            'success': True,
            'experiment': experiment.to_dict()
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# 实验数据查询接口
@ab_bp.route('/experiments/<experiment_id>/metrics', methods=['GET'])
def get_experiment_metrics(experiment_id: str):
    """
    获取实验指标数据
    
    Args:
        experiment_id: 实验ID
        
    查询参数:
        start_date: 开始日期 (YYYY-MM-DD)
        end_date: 结束日期 (YYYY-MM-DD)
    """
    try:
        # 解析查询参数
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        
        start_date = None
        end_date = None
        
        if start_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
        if end_date_str:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
        
        # 获取指标数据
        metrics = ab_test_manager.get_experiment_metrics(experiment_id, start_date, end_date)
        
        return jsonify({
            'success': True,
            'experiment_id': experiment_id,
            'metrics': metrics,
            'time_range': {
                'start_date': start_date_str,
                'end_date': end_date_str
            }
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ab_bp.route('/experiments/<experiment_id>/significance', methods=['GET'])
def get_statistical_significance(experiment_id: str):
    """
    获取统计显著性分析
    
    Args:
        experiment_id: 实验ID
        
    查询参数:
        metric: 指标名称 (ctr, conversion_rate等)
    """
    try:
        metric = request.args.get('metric', 'ctr')
        
        significance = ab_test_manager.calculate_statistical_significance(experiment_id, metric)
        
        return jsonify({
            'success': True,
            'experiment_id': experiment_id,
            'metric': metric,
            'significance': significance
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# 用户分配查询接口
@ab_bp.route('/users/<int:user_id>/assignments', methods=['GET'])
def get_user_assignments(user_id: int):
    """
    获取用户的实验分配情况
    
    Args:
        user_id: 用户ID
    """
    try:
        assignments = {}
        
        for experiment_id in ab_test_manager.experiments.keys():
            variant = ab_test_manager.get_user_assignment(user_id, experiment_id)
            if variant:
                assignments[experiment_id] = variant
        
        return jsonify({
            'success': True,
            'user_id': user_id,
            'assignments': assignments
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# 事件记录接口（用于前端记录用户行为）
@ab_bp.route('/events', methods=['POST'])
def record_event():
    """
    记录A/B测试事件
    
    请求参数:
    {
        "user_id": 123,
        "experiment_id": "ranking_algorithm_v1",
        "variant": "gbdt_enhanced",
        "event_type": "click",  // view, click, apply, complete等
        "event_data": {
            "job_id": 456,
            "position": 1
        }
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': '请求参数不能为空'}), 400
        
        user_id = data.get('user_id')
        experiment_id = data.get('experiment_id')
        variant_name = data.get('variant')
        event_type = data.get('event_type')
        event_data = data.get('event_data', {})
        
        if not all([user_id, experiment_id, variant_name, event_type]):
            return jsonify({'error': '缺少必需参数'}), 400
        
        # 记录事件
        ab_test_manager.record_event(user_id, experiment_id, variant_name, event_type, event_data)
        
        return jsonify({
            'success': True,
            'message': '事件记录成功'
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# 实验创建和管理接口（需要权限验证）
@ab_bp.route('/experiments', methods=['POST'])
def create_experiment():
    """
    创建新实验（需要管理员权限）
    
    请求参数:
    {
        "experiment_id": "recall_strategy_v2",
        "name": "召回策略优化实验V2",
        "description": "测试新的召回策略组合",
        "target_metric": "application_conversion_rate",
        "variants": [
            {
                "name": "control",
                "config": {"strategies": ["location", "content"]},
                "traffic_percentage": 0.5
            },
            {
                "name": "enhanced",
                "config": {"strategies": ["location", "content", "collaborative"]},
                "traffic_percentage": 0.5
            }
        ],
        "start_time": "2024-01-01T00:00:00",
        "end_time": "2024-01-15T23:59:59"
    }
    """
    try:
        # 权限验证（简化处理）
        api_key = request.headers.get('X-API-Key')
        if not _validate_api_key(api_key):
            return jsonify({'error': '未授权访问'}), 401
        
        data = request.get_json()
        
        # 创建实验对象
        from ab_testing import Experiment, ExperimentVariant
        experiment = Experiment(
            experiment_id=data['experiment_id'],
            name=data['name'],
            description=data['description'],
            target_metric=data['target_metric'],
            variants=[],
            start_time=datetime.fromisoformat(data['start_time']),
            end_time=datetime.fromisoformat(data['end_time'])
        )
        
        # 添加变体
        for variant_data in data['variants']:
            variant = ExperimentVariant(
                name=variant_data['name'],
                config=variant_data['config'],
                traffic_percentage=variant_data['traffic_percentage']
            )
            experiment.variants.append(variant)
        
        # 保存到数据库（这里简化处理）
        # 实际应该实现数据库保存逻辑
        
        return jsonify({
            'success': True,
            'experiment': experiment.to_dict(),
            'message': '实验创建成功'
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def _validate_api_key(api_key: str) -> bool:
    """验证API密钥（简化实现）"""
    # 实际应该从环境变量或配置文件中读取
    valid_keys = ['admin_key_123', 'test_key_456']
    return api_key in valid_keys