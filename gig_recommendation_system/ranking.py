#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
排序层模块

该模块负责推荐系统的排序功能，包括：
1. 定义排序模型基类和具体实现（逻辑回归、GBDT）
2. 模型训练和评估
3. 模型保存和加载
4. 岗位排序预测
5. 推荐理由生成
"""

import os
import pickle
import numpy as np
import pandas as pd
from typing import List, Dict, Tuple, Optional
from datetime import datetime, timedelta

from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, average_precision_score, log_loss
)

from data_models import Worker, Job, RecommendationResult
from database import db_manager
from feature_engineering import (
    get_worker_features, get_job_features, generate_combined_features,
    prepare_training_data, normalize_features, get_feature_names
)

def to_float(value):
    """
    统一转换为 float 类型
    
    Args:
        value: 要转换的值
        
    Returns:
        float: 转换后的值，None 会被转换为 0.0
    """
    if value is None:
        return 0.0
    from decimal import Decimal
    if isinstance(value, Decimal):
        return float(str(value))
    return float(value)

class RankingModel:
    """
    排序模型基类
    
    定义排序模型的通用接口，包括训练、预测、保存和加载等方法。
    具体的模型实现需要继承此类并实现相应的方法。
    """
    
    def __init__(self, model_name: str):
        """
        初始化排序模型
        
        Args:
            model_name: 模型名称
        """
        self.model_name = model_name
        self.model = None  # 模型实例
        self.scaler = None  # 特征缩放器
    
    def train(self, X: np.ndarray, y: np.ndarray):
        """
        训练模型
        
        Args:
            X: 特征矩阵
            y: 标签向量
            
        Returns:
            模型评估指标
        """
        raise NotImplementedError
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """
        预测概率
        
        Args:
            X: 特征矩阵
            
        Returns:
            预测的概率值
        """
        raise NotImplementedError
    
    def save(self, path: str):
        """
        保存模型
        
        Args:
            path: 模型保存路径
        """
        model_data = {
            'model': self.model,
            'scaler': self.scaler,
            'model_name': self.model_name,
            'timestamp': datetime.now().isoformat()
        }
        
        with open(path, 'wb') as f:
            pickle.dump(model_data, f)
    
    def load(self, path: str) -> bool:
        """
        加载模型
        
        Args:
            path: 模型加载路径
            
        Returns:
            bool: 加载是否成功
        """
        if not os.path.exists(path):
            return False
        
        try:
            with open(path, 'rb') as f:
                model_data = pickle.load(f)
            
            self.model = model_data['model']
            self.scaler = model_data['scaler']
            return True
        except Exception as e:
            print(f"加载模型失败: {e}")
            return False
    
    def get_feature_importance(self) -> pd.DataFrame:
        """
        获取特征重要性
        
        Returns:
            pd.DataFrame: 包含特征名称和重要性的 DataFrame
        """
        raise NotImplementedError


class LogisticRegressionModel(RankingModel):
    """
    逻辑回归排序模型
    
    基于逻辑回归算法的排序模型，用于预测工人对岗位的感兴趣程度。
    """
    
    def __init__(self):
        """
        初始化逻辑回归模型
        """
        super().__init__('logistic_regression')
    
    def train(self, X: np.ndarray, y: np.ndarray):
        """
        训练逻辑回归模型
        
        Args:
            X: 特征矩阵
            y: 标签向量
            
        Returns:
            dict: 模型评估指标
        """
        # 特征归一化
        X_normalized, self.scaler = normalize_features(X)
        
        # 划分训练集和验证集
        X_train, X_val, y_train, y_val = train_test_split(
            X_normalized, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # 训练模型
        self.model = LogisticRegression(
            C=1.0,  # 正则化强度
            penalty='l2',  # L2正则化
            solver='liblinear',  # 求解器
            class_weight='balanced',  # 类别权重平衡
            random_state=42  # 随机种子
        )
        
        self.model.fit(X_train, y_train)
        
        # 验证模型
        y_pred_proba = self.model.predict_proba(X_val)[:, 1]  # 正类概率
        y_pred = self.model.predict(X_val)  # 预测类别
        
        # 计算评估指标
        metrics = {
            'accuracy': accuracy_score(y_val, y_pred),  # 准确率
            'precision': precision_score(y_val, y_pred),  # 精确率
            'recall': recall_score(y_val, y_pred),  # 召回率
            'f1': f1_score(y_val, y_pred),  # F1分数
            'auc_roc': roc_auc_score(y_val, y_pred_proba),  # AUC-ROC
            'avg_precision': average_precision_score(y_val, y_pred_proba),  # 平均精确率
            'log_loss': log_loss(y_val, y_pred_proba)  # 对数损失
        }
        
        print(f"逻辑回归模型评估结果:")
        for metric_name, value in metrics.items():
            print(f"  {metric_name}: {value:.4f}")
        
        return metrics
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """
        预测概率
        
        Args:
            X: 特征矩阵
            
        Returns:
            np.ndarray: 预测的概率值
            
        Raises:
            ValueError: 如果模型未训练或未加载
        """
        if self.model is None or self.scaler is None:
            raise ValueError("模型未训练或未加载")
        
        # 特征归一化
        X_normalized = self.scaler.transform(X.reshape(1, -1)) if X.ndim == 1 else self.scaler.transform(X)
        
        # 预测概率
        return self.model.predict_proba(X_normalized)[:, 1]
    
    def get_feature_importance(self) -> pd.DataFrame:
        """
        获取特征重要性
        
        Returns:
            pd.DataFrame: 包含特征名称和系数的 DataFrame
            
        Raises:
            ValueError: 如果模型未训练或未加载
        """
        if self.model is None:
            raise ValueError("模型未训练或未加载")
        
        feature_names = get_feature_names()
        coefficients = self.model.coef_[0]
        
        importance_df = pd.DataFrame({
            'feature': feature_names,
            'coefficient': coefficients,
            'abs_coefficient': np.abs(coefficients)
        })
        
        return importance_df.sort_values('abs_coefficient', ascending=False)


class GBDTModel(RankingModel):
    """
    GBDT排序模型
    
    基于梯度提升决策树的排序模型，用于预测工人对岗位的感兴趣程度。
    """
    
    def __init__(self):
        """
        初始化GBDT模型
        """
        super().__init__('gbdt')
    
    def train(self, X: np.ndarray, y: np.ndarray):
        """
        训练GBDT模型
        
        Args:
            X: 特征矩阵
            y: 标签向量
            
        Returns:
            dict: 模型评估指标
        """
        # 特征归一化
        X_normalized, self.scaler = normalize_features(X)
        
        # 划分训练集和验证集
        X_train, X_val, y_train, y_val = train_test_split(
            X_normalized, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # 训练模型
        self.model = GradientBoostingClassifier(
            n_estimators=100,  # 树的数量
            learning_rate=0.1,  # 学习率
            max_depth=6,  # 树的最大深度
            min_samples_split=2,  # 最小分裂样本数
            min_samples_leaf=1,  # 最小叶子节点样本数
            subsample=0.8,  # 子采样比例
            random_state=42  # 随机种子
        )
        
        self.model.fit(X_train, y_train)
        
        # 验证模型
        y_pred_proba = self.model.predict_proba(X_val)[:, 1]  # 正类概率
        y_pred = self.model.predict(X_val)  # 预测类别
        
        # 计算评估指标
        metrics = {
            'accuracy': accuracy_score(y_val, y_pred),  # 准确率
            'precision': precision_score(y_val, y_pred),  # 精确率
            'recall': recall_score(y_val, y_pred),  # 召回率
            'f1': f1_score(y_val, y_pred),  # F1分数
            'auc_roc': roc_auc_score(y_val, y_pred_proba),  # AUC-ROC
            'avg_precision': average_precision_score(y_val, y_pred_proba),  # 平均精确率
            'log_loss': log_loss(y_val, y_pred_proba)  # 对数损失
        }
        
        print(f"GBDT模型评估结果:")
        for metric_name, value in metrics.items():
            print(f"  {metric_name}: {value:.4f}")
        
        return metrics
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """
        预测概率
        
        Args:
            X: 特征矩阵
            
        Returns:
            np.ndarray: 预测的概率值
            
        Raises:
            ValueError: 如果模型未训练或未加载
        """
        if self.model is None or self.scaler is None:
            raise ValueError("模型未训练或未加载")
        
        # 特征归一化
        X_normalized = self.scaler.transform(X.reshape(1, -1)) if X.ndim == 1 else self.scaler.transform(X)
        
        # 预测概率
        return self.model.predict_proba(X_normalized)[:, 1]
    
    def get_feature_importance(self) -> pd.DataFrame:
        """
        获取特征重要性
        
        Returns:
            pd.DataFrame: 包含特征名称和重要性的 DataFrame
            
        Raises:
            ValueError: 如果模型未训练或未加载
        """
        if self.model is None:
            raise ValueError("模型未训练或未加载")
        
        feature_names = get_feature_names()
        importances = self.model.feature_importances_
        
        importance_df = pd.DataFrame({
            'feature': feature_names,
            'importance': importances
        })
        
        return importance_df.sort_values('importance', ascending=False)


def train_models():
    """
    训练所有排序模型
    
    该函数负责训练逻辑回归和GBDT两个模型，并保存训练结果。
    同时会比较两个模型的性能，输出评估结果。
    """
    print("开始准备训练数据...")
    
    # 准备训练数据
    X, y = prepare_training_data()
    
    if len(X) == 0 or len(y) == 0:
        print("没有足够的训练数据")
        return
    
    print(f"训练数据准备完成: {len(X)} 样本")
    
    # 训练逻辑回归模型
    print("\n训练逻辑回归模型...")
    lr_model = LogisticRegressionModel()
    lr_metrics = lr_model.train(X, y)
    lr_model.save('models/logistic_regression_model.pkl')
    
    # 训练GBDT模型
    print("\n训练GBDT模型...")
    gbdt_model = GBDTModel()
    gbdt_metrics = gbdt_model.train(X, y)
    gbdt_model.save('models/gbdt_model.pkl')
    
    print("\n模型训练完成！")
    print(f"逻辑回归 AUC-ROC: {lr_metrics['auc_roc']:.4f}")
    print(f"GBDT AUC-ROC: {gbdt_metrics['auc_roc']:.4f}")
    
    # 比较模型性能
    if lr_metrics['auc_roc'] > gbdt_metrics['auc_roc']:
        print("逻辑回归模型性能更好")
    else:
        print("GBDT模型性能更好")


def load_best_model() -> RankingModel:
    """
    加载最佳排序模型
    
    优先尝试加载GBDT模型，如果不存在则尝试加载逻辑回归模型。
    如果都不存在，则训练新模型并重新尝试加载。
    
    Returns:
        RankingModel: 加载的排序模型
    """
    # 尝试加载GBDT模型
    gbdt_model = GBDTModel()
    if gbdt_model.load('models/gbdt_model.pkl'):
        print("加载GBDT模型成功")
        return gbdt_model
    
    # 如果GBDT模型不存在，尝试加载逻辑回归模型
    lr_model = LogisticRegressionModel()
    if lr_model.load('models/logistic_regression_model.pkl'):
        print("加载逻辑回归模型成功")
        return lr_model
    
    # 如果都不存在，训练新模型
    print("没有找到已训练的模型，开始训练新模型...")
    train_models()
    
    # 重新尝试加载
    return load_best_model()


def predict_job_ranking(model: RankingModel, worker_id: int, 
                       candidate_jobs: List[int]) -> List[Tuple[int, float]]:
    """
    使用模型预测岗位排序
    
    Args:
        model: 排序模型
        worker_id: 工人ID
        candidate_jobs: 候选岗位ID列表
    
    Returns:
        List[Tuple[int, float]]: 排序后的岗位列表，每个元素为(job_id, score)
    """
    if not candidate_jobs:
        return []
    
    # 获取工人特征
    worker_features = get_worker_features(worker_id)
    if not worker_features:
        return []
    
    # 为每个岗位生成特征向量
    feature_vectors = []
    valid_job_ids = []
    
    for job_id in candidate_jobs:
        job_features = get_job_features(job_id)
        
        if job_features:
            combined_features = generate_combined_features(worker_features, job_features)
            feature_vectors.append(combined_features)
            valid_job_ids.append(job_id)
    
    if not feature_vectors:
        return []
    
    # 批量预测
    X = np.array(feature_vectors)
    scores = model.predict(X)
    
    # 按预测分数排序
    ranked_jobs = [(job_id, float(score)) for job_id, score in zip(valid_job_ids, scores)]
    ranked_jobs.sort(key=lambda x: x[1], reverse=True)
    
    return ranked_jobs


def generate_recommend_reason(worker_id: int, job_id: int) -> str:
    """
    生成推荐理由
    
    根据工人和岗位的匹配情况，生成个性化的推荐理由。
    
    Args:
        worker_id: 工人ID
        job_id: 岗位ID
    
    Returns:
        str: 推荐理由文本
    """
    worker = db_manager.get_worker_by_id(worker_id)
    job = db_manager.get_job_by_id(job_id)
    
    if not worker or not job:
        return "系统为您推荐的优质岗位"
    
    reasons = []
    
    # 距离理由
    distance = calculate_distance(
        worker.location_lat, worker.location_lng,
        job.location_lat, job.location_lng
    )
    
    if distance < 1:
        reasons.append(f"距离您仅{distance:.1f}公里")
    elif distance < 3:
        reasons.append(f"距离适中，仅{distance:.1f}公里")
    
    # 技能匹配理由
    from feature_engineering import calculate_skill_match
    skill_match = calculate_skill_match(worker.skills, job.required_skills)
    
    if skill_match == 1.0 and job.required_skills:
        reasons.append("您的技能完全符合岗位要求")
    elif skill_match > 0.5:
        reasons.append("您的技能与岗位要求高度匹配")
    
    # 薪资理由
    avg_salary_query = """
    SELECT AVG(salary) as avg_salary
    FROM jobs
    WHERE job_type = %s AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    """
    avg_result = db_manager.execute_query(avg_salary_query, (job.job_type,))
    
    if avg_result and avg_result[0]['avg_salary']:
        avg_salary = to_float(avg_result[0]['avg_salary'])
        job_salary = to_float(job.salary)
        if job_salary > avg_salary * 1.2:
            reasons.append(f"薪资高于平均水平{((job_salary/avg_salary)-1)*100:.0f}%")
    
    # 紧急程度理由
    hours_to_start = (job.start_time - datetime.now()).total_seconds() / 3600
    if hours_to_start < 12:
        reasons.append("紧急招聘，尽快申请")
    
    # 热门程度理由
    if job.apply_count > 20:
        reasons.append(f"已有{job.apply_count}人申请，竞争激烈")
    
    # 如果没有特定理由，给出通用理由
    if not reasons:
        reasons.append("根据您的偏好推荐")
    
    # 最多返回2个理由
    return " · ".join(reasons[:2])


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    计算两点之间的距离
    
    调用feature_engineering模块中的calculate_distance函数来计算距离。
    
    Args:
        lat1: 第一个点的纬度
        lon1: 第一个点的经度
        lat2: 第二个点的纬度
        lon2: 第二个点的经度
        
    Returns:
        float: 两点之间的距离（公里）
    """
    from feature_engineering import calculate_distance as calc_dist
    return calc_dist(lat1, lon1, lat2, lon2)


def ranking_pipeline(worker_id: int, candidate_jobs: List[int], 
                    top_k: int = 50, algorithm_config: Dict = None) -> List[RecommendationResult]:
    """
    完整的排序 pipeline（支持A/B测试配置）
    
    该函数实现了完整的岗位排序流程，包括：
    1. 根据配置加载模型
    2. 预测岗位排序
    3. 获取岗位详细信息
    4. 计算距离和生成推荐理由
    5. 构建推荐结果（包含A/B测试信息）
    
    Args:
        worker_id: 工人ID
        candidate_jobs: 候选岗位ID列表
        top_k: 返回前k个结果
        algorithm_config: A/B测试算法配置（可选）
    
    Returns:
        List[RecommendationResult]: 排序后的推荐结果列表
    """
    if not candidate_jobs:
        return []
    
    # 加载模型
    model = load_model_with_config(algorithm_config)
    
    # 预测排序
    ranked_jobs = predict_job_ranking(model, worker_id, candidate_jobs)
    
    # 获取岗位详细信息
    job_ids = [job_id for job_id, score in ranked_jobs[:top_k]]
    jobs_info = db_manager.get_jobs_info(job_ids)
    
    # 构建推荐结果
    recommendations = []
    worker = db_manager.get_worker_by_id(worker_id)
    
    for job_id, score in ranked_jobs[:top_k]:
        job_info = next((job for job in jobs_info if job['job_id'] == job_id), None)
        if not job_info:
            continue
        
        # 计算距离
        distance = None
        if worker:
            distance = calculate_distance(
                worker.location_lat, worker.location_lng,
                job_info['location_lat'], job_info['location_lng']
            )
        
        # 生成推荐理由
        reason = generate_recommend_reason(worker_id, job_id)
        
        # 构建推荐结果（包含A/B测试信息）
        recommendation = RecommendationResult(
            job_id=job_id,
            score=score,
            distance=distance,
            reason=reason,
            experiment_algorithm=algorithm_config.get('algorithm') if algorithm_config else None,
            variant_name=algorithm_config.get('variant_name') if algorithm_config else None,
            experiment_id=algorithm_config.get('experiment_id') if algorithm_config else None
        )
        
        recommendations.append(recommendation)
    
    return recommendations


def load_model_with_config(algorithm_config: Dict = None):
    """
    根据A/B测试配置加载模型
    
    Args:
        algorithm_config: 算法配置参数
        
    Returns:
        RankingModel: 加载的排序模型
    """
    if algorithm_config:
        # 根据配置选择特定模型
        algorithm_type = algorithm_config.get('algorithm', 'logistic_regression')
        
        if algorithm_type == 'gbdt_enhanced':
            # 加载增强版GBDT模型
            model = GBDTModel()
            # 应用配置参数
            if algorithm_config.get('parameters'):
                # 这里可以设置模型参数
                pass
            return model
        elif algorithm_type == 'hybrid_approach':
            # 加载混合算法模型
            model = LogisticRegressionModel()  # 暂时使用默认模型
            return model
    
    # 默认加载最佳模型
    return load_best_model()


# 创建模型目录
os.makedirs('models', exist_ok=True)  # 确保模型存储目录存在