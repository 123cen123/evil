#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
特征工程模块

该模块负责推荐系统的特征工程，包括：
1. 计算距离
2. 计算时间匹配度
3. 计算技能匹配度
4. 获取工人特征
5. 获取岗位特征
6. 计算工人行为特征
7. 编码工人技能和岗位技能要求
8. 生成组合特征向量
9. 获取特征名称
10. 准备训练数据
11. 特征归一化

这些功能为推荐系统的排序模型提供了必要的特征。
"""

import math
import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Set, Tuple, Any
import numpy as np
import pandas as pd

from data_models import Worker, Job, Application
from database import db_manager


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    使用Haversine公式计算两个经纬度之间的距离（单位：公里）
    
    Args:
        lat1: 第一个点的纬度
        lon1: 第一个点的经度
        lat2: 第二个点的纬度
        lon2: 第二个点的经度
    
    Returns:
        float: 两点之间的距离（公里）
    """
    # 将经纬度转换为弧度
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Haversine公式
    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a)) 
    r = 6371  # 地球半径（公里）
    
    return c * r


def calculate_time_match(worker_available: List[Tuple[datetime, datetime]], 
                        job_time: Tuple[datetime, datetime]) -> float:
    """
    计算工人可用时间与岗位时间的匹配度
    
    Args:
        worker_available: 工人可用时间段列表，每个元素为(开始时间, 结束时间)
        job_time: 岗位时间(开始时间, 结束时间)
    
    Returns:
        float: 时间匹配度（0-1之间）
    """
    job_start, job_end = job_time
    
    for avail_start, avail_end in worker_available:
        # 计算时间重叠
        overlap_start = max(job_start, avail_start)
        overlap_end = min(job_end, avail_end)
        
        if overlap_start < overlap_end:
            # 计算重叠时间占岗位总时间的比例
            overlap_duration = (overlap_end - overlap_start).total_seconds()
            job_duration = (job_end - job_start).total_seconds()
            return overlap_duration / job_duration
    
    return 0  # 无时间匹配


def calculate_skill_match(worker_skills: List[str], job_requirements: List[str]) -> float:
    """
    计算工人技能与岗位要求的匹配度
    
    Args:
        worker_skills: 工人技能集合
        job_requirements: 岗位技能要求集合
    
    Returns:
        float: 技能匹配度（0-1之间）
    """
    if not job_requirements:
        return 1.0  # 无技能要求
    
    # 计算交集数量
    matched_skills = set(worker_skills) & set(job_requirements)
    
    # 技能匹配度 = 匹配的技能数 / 岗位要求的技能总数
    return len(matched_skills) / len(job_requirements)


def get_worker_features(worker_id: int) -> Dict[str, Any]:
    """
    获取工人特征
    
    Args:
        worker_id: 工人ID
    
    Returns:
        Dict[str, Any]: 工人特征字典
    """
    # 获取工人基本信息
    worker = db_manager.get_worker_by_id(worker_id)
    if not worker:
        return {}
    
    features = {
        'worker_id': worker_id,
        'location_lat': worker.location_lat,
        'location_lng': worker.location_lng,
        'rating': worker.rating,
        'total_orders': worker.total_orders,
        'has_work_history': len(worker.work_history) > 0,
        'skills_count': len(worker.skills),
        'available_time_slots': len(worker.available_time)
    }
    
    # 计算行为特征
    behavior_features = calculate_worker_behavior_features(worker_id)
    features.update(behavior_features)
    
    # 技能特征（独热编码）
    skill_features = encode_worker_skills(worker.skills)
    features.update(skill_features)
    
    return features


def get_job_features(job_id: int) -> Dict[str, Any]:
    """
    获取岗位特征
    
    Args:
        job_id: 岗位ID
    
    Returns:
        Dict[str, Any]: 岗位特征字典
    """
    # 获取岗位基本信息
    job = db_manager.get_job_by_id(job_id)
    if not job:
        return {}
    
    # 计算岗位时长（小时）
    duration_hours = (job.end_time - job.start_time).total_seconds() / 3600
    salary = float(job.salary) if job.salary else 0
    
    # 计算岗位紧急程度（距离开始时间的小时数）
    hours_to_start = (job.start_time - datetime.now()).total_seconds() / 3600
    urgency = min(1.0, max(0.0, 1.0 - hours_to_start / 24))  # 24小时内为紧急
    
    features = {
        'job_id': job_id,
        'merchant_id': job.merchant_id,
        'location_lat': job.location_lat,
        'location_lng': job.location_lng,
        'salary': job.salary,
        'salary_per_hour': salary / duration_hours if duration_hours > 0 else 0,
        'duration_hours': duration_hours,
        'required_count': job.required_count,
        'current_count': job.current_count,
        'remaining_count': job.required_count - job.current_count,
        'views_count': job.views_count,
        'apply_count': job.apply_count,
        'apply_rate': job.apply_count / job.views_count if job.views_count > 0 else 0,
        'urgency': urgency,
        'is_urgent': hours_to_start <= 24,
        'is_part_time': job.job_type == '兼职',
        'is_daily': job.job_type == '日结',
        'is_temporary': job.job_type == '临时工',
        'required_skills_count': len(job.required_skills)
    }
    
    # 时间特征
    features['start_hour'] = job.start_time.hour
    features['start_day_of_week'] = job.start_time.weekday()
    features['is_weekend'] = job.start_time.weekday() >= 5
    
    # 技能要求特征（独热编码）
    skill_features = encode_job_skills(job.required_skills)
    features.update(skill_features)
    
    return features


def calculate_worker_behavior_features(worker_id: int) -> Dict[str, float]:
    """
    计算工人行为特征
    
    Args:
        worker_id: 工人ID
    
    Returns:
        Dict[str, float]: 行为特征字典
    """
    # 获取工人的交互记录
    query = """
    SELECT interaction_type, COUNT(*) as count
    FROM interactions
    WHERE worker_id = %s
    GROUP BY interaction_type
    """
    interactions = db_manager.execute_query(query, (worker_id,))
    
    # 统计各类交互次数
    interaction_counts = {row['interaction_type']: row['count'] for row in interactions}
    total_views = interaction_counts.get('view', 0)
    total_applies = interaction_counts.get('apply', 0)
    total_completes = interaction_counts.get('complete', 0)
    
    # 计算申请率
    apply_rate = total_applies / total_views if total_views > 0 else 0
    
    # 计算成功率
    success_rate = total_completes / total_applies if total_applies > 0 else 0
    
    # 获取最近的活跃时间
    query = """
    SELECT MAX(interaction_time) as last_active_time
    FROM interactions
    WHERE worker_id = %s
    """
    result = db_manager.execute_query(query, (worker_id,))
    last_active_days = 0
    if result and result[0]['last_active_time']:
        last_active_time = result[0]['last_active_time']
        if isinstance(last_active_time, str):
            last_active_time = datetime.fromisoformat(last_active_time)
        last_active_days = (datetime.now() - last_active_time).days
    
    # 获取平均响应时间（从浏览到申请的平均时间）
    query = """
    SELECT AVG(TIMESTAMPDIFF(MINUTE, view_time, apply_time)) as avg_response_time
    FROM (
        SELECT 
            i1.interaction_time as view_time,
            MIN(i2.interaction_time) as apply_time
        FROM interactions i1
        JOIN interactions i2 ON i1.worker_id = i2.worker_id AND i1.job_id = i2.job_id
        WHERE i1.worker_id = %s 
          AND i1.interaction_type = 'view'
          AND i2.interaction_type = 'apply'
          AND i2.interaction_time > i1.interaction_time
        GROUP BY i1.interaction_id
    ) as response_times
    """
    result = db_manager.execute_query(query, (worker_id,))
    avg_response_time = result[0]['avg_response_time'] if result and result[0]['avg_response_time'] else 0
    
    return {
        'total_views': total_views,
        'total_applies': total_applies,
        'total_completes': total_completes,
        'apply_rate': apply_rate,
        'success_rate': success_rate,
        'last_active_days': last_active_days,
        'avg_response_time_minutes': avg_response_time,
        'is_active_recently': last_active_days <= 7
    }


def encode_worker_skills(skills: List[str]) -> Dict[str, int]:
    """
    对工人技能进行编码
    
    使用独热编码方式对工人技能进行编码。
    
    Args:
        skills: 技能列表
    
    Returns:
        Dict[str, int]: 编码后的技能特征
    """
    # 预定义的常见技能列表
    common_skills = [
        '餐饮服务', '零售销售', '配送', '家政清洁', '搬运', 
        '包装', '促销', '客服', '数据录入', '仓库管理',
        '收银', '理货', '厨房帮工', '服务员', '快递员'
    ]
    
    features = {}
    for skill in common_skills:
        features[f'has_skill_{skill}'] = 1 if skill in skills else 0
    
    return features


def encode_job_skills(skills: List[str]) -> Dict[str, int]:
    """
    对岗位技能要求进行编码
    
    使用独热编码方式对岗位技能要求进行编码。
    
    Args:
        skills: 技能要求列表
    
    Returns:
        Dict[str, int]: 编码后的技能要求特征
    """
    # 预定义的常见技能列表（与工人技能相同）
    common_skills = [
        '餐饮服务', '零售销售', '配送', '家政清洁', '搬运', 
        '包装', '促销', '客服', '数据录入', '仓库管理',
        '收银', '理货', '厨房帮工', '服务员', '快递员'
    ]
    
    features = {}
    for skill in common_skills:
        features[f'requires_skill_{skill}'] = 1 if skill in skills else 0
    
    return features


def generate_combined_features(worker_features: Dict[str, Any], 
                             job_features: Dict[str, Any]) -> np.ndarray:
    """
    生成工人和岗位的组合特征向量
    
    Args:
        worker_features: 工人特征
        job_features: 岗位特征
    
    Returns:
        np.ndarray: 组合特征向量
    """
    # 计算交互特征
    distance = calculate_distance(
        worker_features['location_lat'], worker_features['location_lng'],
        job_features['location_lat'], job_features['location_lng']
    )
    
    # 计算时间匹配度
    worker = db_manager.get_worker_by_id(worker_features['worker_id'])
    job = db_manager.get_job_by_id(job_features['job_id'])
    
    time_match = 0
    if worker and job:
        time_match = calculate_time_match(
            worker.available_time,
            (job.start_time, job.end_time)
        )
    
    # 计算技能匹配度
    skill_match = 0
    if worker and job:
        skill_match = calculate_skill_match(
            worker.skills,
            job.required_skills
        )
    
    # 构建特征向量
    features = [
        # 基础特征
        worker_features.get('rating', 0),
        worker_features.get('total_orders', 0),
        worker_features.get('skills_count', 0),
        job_features.get('salary', 0),
        job_features.get('salary_per_hour', 0),
        job_features.get('duration_hours', 0),
        job_features.get('urgency', 0),
        
        # 行为特征
        worker_features.get('apply_rate', 0),
        worker_features.get('success_rate', 0),
        worker_features.get('last_active_days', 0),
        worker_features.get('is_active_recently', 0),
        
        # 交互特征
        distance,
        time_match,
        skill_match,
        
        # 岗位特征
        job_features.get('views_count', 0),
        job_features.get('apply_count', 0),
        job_features.get('apply_rate', 0),
        job_features.get('remaining_count', 0),
        job_features.get('is_urgent', 0),
        job_features.get('is_weekend', 0),
        
        # 时间特征
        job_features.get('start_hour', 0),
        job_features.get('start_day_of_week', 0)
    ]
    
    return np.array(features)


def get_feature_names() -> List[str]:
    """
    获取特征名称列表
    
    Returns:
        List[str]: 特征名称列表
    """
    return [
        'worker_rating',
        'worker_total_orders',
        'worker_skills_count',
        'job_salary',
        'job_salary_per_hour',
        'job_duration_hours',
        'job_urgency',
        'worker_apply_rate',
        'worker_success_rate',
        'worker_last_active_days',
        'worker_is_active_recently',
        'distance_km',
        'time_match_score',
        'skill_match_score',
        'job_views_count',
        'job_apply_count',
        'job_apply_rate',
        'job_remaining_count',
        'job_is_urgent',
        'job_is_weekend',
        'job_start_hour',
        'job_start_day_of_week'
    ]


def prepare_training_data() -> Tuple[np.ndarray, np.ndarray]:
    """
    准备训练数据
    
    从数据库中获取正样本（申请成功的记录）和负样本（浏览但未申请的记录），
    并生成特征矩阵和标签向量。
    
    Returns:
        Tuple[np.ndarray, np.ndarray]: 特征矩阵和标签向量
    """
    # 获取过去3个月的交互数据
    three_months_ago = datetime.now() - timedelta(days=90)
    
    # 查询正样本（申请成功的记录）
    positive_query = """
    SELECT i.worker_id, i.job_id
    FROM interactions i
    WHERE i.interaction_type = 'complete'
      AND i.interaction_time >= %s
    """
    positive_samples = db_manager.execute_query(positive_query, (three_months_ago,))
    
    # 查询负样本（浏览但未申请的记录）
    negative_query = """
    SELECT i.worker_id, i.job_id
    FROM interactions i
    WHERE i.interaction_type = 'view'
      AND i.interaction_time >= %s
      AND NOT EXISTS (
          SELECT 1 FROM interactions i2
          WHERE i2.worker_id = i.worker_id
            AND i2.job_id = i.job_id
            AND i2.interaction_type = 'apply'
      )
    ORDER BY RAND()
    LIMIT %s
    """
    # 负样本数量为正样本的3倍
    negative_samples = db_manager.execute_query(negative_query, (three_months_ago, len(positive_samples) * 3))
    
    # 构建特征矩阵和标签向量
    X = []
    y = []
    
    # 添加正样本
    for sample in positive_samples:
        worker_features = get_worker_features(sample['worker_id'])
        job_features = get_job_features(sample['job_id'])
        
        if worker_features and job_features:
            combined_features = generate_combined_features(worker_features, job_features)
            X.append(combined_features)
            y.append(1)
    
    # 添加负样本
    for sample in negative_samples:
        worker_features = get_worker_features(sample['worker_id'])
        job_features = get_job_features(sample['job_id'])
        
        if worker_features and job_features:
            combined_features = generate_combined_features(worker_features, job_features)
            X.append(combined_features)
            y.append(0)
    
    return np.array(X), np.array(y)


def normalize_features(X: np.ndarray) -> np.ndarray:
    """
    对特征进行归一化
    
    使用StandardScaler对特征进行标准化，使每个特征的均值为0，标准差为1。
    
    Args:
        X: 特征矩阵
    
    Returns:
        Tuple[np.ndarray, StandardScaler]: 归一化后的特征矩阵和使用的scaler
    """
    from sklearn.preprocessing import StandardScaler
    
    scaler = StandardScaler()
    X_normalized = scaler.fit_transform(X)
    
    return X_normalized, scaler