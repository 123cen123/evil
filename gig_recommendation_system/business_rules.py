#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
业务规则层模块

该模块负责应用业务规则对推荐结果进行过滤和调整，包括：
1. 距离过滤
2. 时间冲突检测
3. 推荐多样性保证
4. 紧急岗位优先
5. 过期岗位过滤
6. 业务规则流水线

这些规则确保推荐结果符合业务需求和用户偏好。
"""

import random
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional, Set

from data_models import Job, RecommendationResult
from database import db_manager
from feature_engineering import calculate_distance


def filter_by_distance(worker_id: int, recommendations: List[RecommendationResult], 
                      max_distance: float = 5.0) -> List[RecommendationResult]:
    """
    根据距离过滤推荐结果
    
    Args:
        worker_id: 工人ID
        recommendations: 推荐结果列表
        max_distance: 最大距离（公里）
    
    Returns:
        List[RecommendationResult]: 过滤后的推荐结果列表
    """
    worker = db_manager.get_worker_by_id(worker_id)
    if not worker:
        return recommendations
    
    filtered_recommendations = []
    
    for rec in recommendations:
        # 如果已经有距离信息，直接使用
        if rec.distance is not None:
            if rec.distance <= max_distance:
                filtered_recommendations.append(rec)
        else:
            # 计算距离
            job = db_manager.get_job_by_id(rec.job_id)
            if job:
                distance = calculate_distance(
                    worker.location_lat, worker.location_lng,
                    job.location_lat, job.location_lng
                )
                rec.distance = distance
                
                if distance <= max_distance:
                    filtered_recommendations.append(rec)
    
    return filtered_recommendations


def check_time_conflict(worker_id: int, job_id: int) -> bool:
    """
    检查岗位时间是否与工人已有安排冲突
    
    Args:
        worker_id: 工人ID
        job_id: 岗位ID
    
    Returns:
        bool: 是否存在时间冲突
    """
    # 获取岗位时间
    job = db_manager.get_job_by_id(job_id)
    if not job:
        return False
    
    job_start = job.start_time
    job_end = job.end_time
    
    # 如果是字符串格式，转换为datetime
    if isinstance(job_start, str):
        job_start = datetime.fromisoformat(job_start)
    if isinstance(job_end, str):
        job_end = datetime.fromisoformat(job_end)
    
    # 获取工人已接受的岗位
    accepted_jobs = db_manager.get_worker_accepted_jobs(worker_id)
    
    for accepted_job in accepted_jobs:
        accepted_start = accepted_job['start_time']
        accepted_end = accepted_job['end_time']
        
        # 如果是字符串格式，转换为datetime
        if isinstance(accepted_start, str):
            accepted_start = datetime.fromisoformat(accepted_start)
        if isinstance(accepted_end, str):
            accepted_end = datetime.fromisoformat(accepted_end)
        
        # 检查时间重叠
        if (job_start < accepted_end) and (job_end > accepted_start):
            return True  # 存在时间冲突
    
    return False  # 无时间冲突


def filter_time_conflicts(worker_id: int, recommendations: List[RecommendationResult]) -> List[RecommendationResult]:
    """
    过滤存在时间冲突的推荐结果
    
    Args:
        worker_id: 工人ID
        recommendations: 推荐结果列表
    
    Returns:
        List[RecommendationResult]: 过滤后的推荐结果列表
    """
    filtered_recommendations = []
    
    for rec in recommendations:
        if not check_time_conflict(worker_id, rec.job_id):
            filtered_recommendations.append(rec)
    
    return filtered_recommendations


def ensure_diversity(recommendations: List[RecommendationResult], 
                    diversity_params: Optional[Dict] = None) -> List[RecommendationResult]:
    """
    保证推荐结果的多样性
    
    通过多种策略确保推荐结果的多样性，包括：
    1. 限制同一商家的推荐数量
    2. 限制同一岗位类型的推荐数量
    3. 确保薪资多样性
    4. 确保距离范围多样性
    5. 确保时间间隔多样性
    
    Args:
        recommendations: 推荐结果列表
        diversity_params: 多样性参数配置
    
    Returns:
        List[RecommendationResult]: 多样化后的推荐结果列表
    """
    if not recommendations:
        return []
    
    # 默认多样性参数
    if diversity_params is None:
        diversity_params = {
            'max_same_merchant': 3,    # 同一商家最多推荐岗位数
            'max_same_type': 5,        # 同一岗位类型最多推荐数
            'min_price_diff': 5,       # 薪资差异最小值（元）
            'max_same_distance': 3,    # 同一距离范围最多推荐数
            'min_time_gap_hours': 2    # 最小时间间隔（小时）
        }
    
    # 获取岗位详细信息
    job_ids = [rec.job_id for rec in recommendations]
    jobs_info = db_manager.get_jobs_info(job_ids)
    job_info_map = {job['job_id']: job for job in jobs_info}
    
    # 结果列表
    diversified_recommendations = []
    
    # 统计信息
    merchant_count = {}          # 商家计数
    job_type_count = {}          # 岗位类型计数
    last_salary = None           # 上一个推荐的薪资
    distance_ranges = {}         # 距离范围计数
    last_job_time = None         # 上一个推荐的岗位时间
    
    # 按分数排序的推荐列表
    sorted_recommendations = sorted(recommendations, key=lambda x: x.score, reverse=True)
    
    for rec in sorted_recommendations:
        job_info = job_info_map.get(rec.job_id)
        if not job_info:
            continue
        
        # 检查同一商家限制
        merchant_id = job_info['merchant_id']
        if merchant_count.get(merchant_id, 0) >= diversity_params['max_same_merchant']:
            continue
        
        # 检查同一岗位类型限制
        job_type = job_info['job_type']
        if job_type_count.get(job_type, 0) >= diversity_params['max_same_type']:
            continue
        
        # 检查薪资多样性
        if last_salary and abs(job_info['salary'] - last_salary) < diversity_params['min_price_diff']:
            continue
        
        # 检查距离范围多样性
        distance_range = None
        if rec.distance is not None:
            if rec.distance < 1:
                distance_range = 'very_close'
            elif rec.distance < 3:
                distance_range = 'close'
            else:
                distance_range = 'far'
            
            if distance_ranges.get(distance_range, 0) >= diversity_params['max_same_distance']:
                continue
        
        # 检查时间间隔
        if last_job_time:
            job_start = job_info['start_time']
            if isinstance(job_start, str):
                job_start = datetime.fromisoformat(job_start)
            
            time_diff = abs((job_start - last_job_time).total_seconds() / 3600)
            if time_diff < diversity_params['min_time_gap_hours']:
                continue
        
        # 添加到结果列表
        diversified_recommendations.append(rec)
        
        # 更新统计信息
        merchant_count[merchant_id] = merchant_count.get(merchant_id, 0) + 1
        job_type_count[job_type] = job_type_count.get(job_type, 0) + 1
        last_salary = job_info['salary']
        
        if distance_range:
            distance_ranges[distance_range] = distance_ranges.get(distance_range, 0) + 1
        
        job_start = job_info['start_time']
        if isinstance(job_start, str):
            job_start = datetime.fromisoformat(job_start)
        last_job_time = job_start
    
    # 如果多样性过滤后结果太少，回退到原始排序
    if len(diversified_recommendations) < 10:
        return sorted_recommendations[:20]
    
    return diversified_recommendations


def prioritize_urgent_jobs(recommendations: List[RecommendationResult], 
                          urgent_weight: float = 1.5) -> List[RecommendationResult]:
    """
    优先推荐紧急岗位
    
    对24小时内开始的紧急岗位提升权重，使其在推荐结果中排名更靠前。
    
    Args:
        recommendations: 推荐结果列表
        urgent_weight: 紧急岗位的权重提升
    
    Returns:
        List[RecommendationResult]: 重新排序后的推荐结果列表
    """
    # 获取岗位详细信息
    job_ids = [rec.job_id for rec in recommendations]
    jobs_info = db_manager.get_jobs_info(job_ids)
    job_info_map = {job['job_id']: job for job in jobs_info}
    
    # 重新计算分数
    for rec in recommendations:
        job_info = job_info_map.get(rec.job_id)
        if not job_info:
            continue
        
        # 检查是否紧急（24小时内开始）
        start_time = job_info['start_time']
        if isinstance(start_time, str):
            start_time = datetime.fromisoformat(start_time)
        
        hours_to_start = (start_time - datetime.now()).total_seconds() / 3600
        
        if 0 < hours_to_start <= 24:
            # 紧急岗位提升权重
            rec.score *= urgent_weight
    
    # 重新排序
    return sorted(recommendations, key=lambda x: x.score, reverse=True)


def filter_expired_jobs(recommendations: List[RecommendationResult]) -> List[RecommendationResult]:
    """
    过滤已过期或已满的岗位
    
    Args:
        recommendations: 推荐结果列表
    
    Returns:
        List[RecommendationResult]: 过滤后的推荐结果列表
    """
    valid_recommendations = []
    
    for rec in recommendations:
        job = db_manager.get_job_by_id(rec.job_id)
        if job and job.is_active:
            valid_recommendations.append(rec)
    
    return valid_recommendations


def apply_business_rules(worker_id: int, recommendations: List[RecommendationResult],
                        config: Optional[Dict] = None) -> List[RecommendationResult]:
    """
    应用所有业务规则
    
    按照特定顺序应用各种业务规则，包括：
    1. 过滤已过期或已满的岗位
    2. 距离过滤
    3. 时间冲突检测
    4. 优先紧急岗位
    5. 多样性保证
    
    Args:
        worker_id: 工人ID
        recommendations: 推荐结果列表
        config: 规则配置参数
    
    Returns:
        List[RecommendationResult]: 处理后的推荐结果列表
    """
    if not recommendations:
        return []
    
    # 默认配置
    if config is None:
        config = {
            'max_distance': 5.0,           # 最大距离（公里）
            'enable_time_conflict_check': True,  # 是否启用时间冲突检查
            'enable_diversity': True,      # 是否启用多样性
            'enable_urgent_priority': True, # 是否优先紧急岗位
            'diversity_params': None       # 多样性参数
        }
    
    # 1. 过滤已过期或已满的岗位
    recommendations = filter_expired_jobs(recommendations)
    
    # 2. 距离过滤
    if config['max_distance'] > 0:
        recommendations = filter_by_distance(worker_id, recommendations, config['max_distance'])
    
    # 3. 时间冲突检测
    if config['enable_time_conflict_check']:
        recommendations = filter_time_conflicts(worker_id, recommendations)
    
    # 4. 优先紧急岗位
    if config['enable_urgent_priority']:
        recommendations = prioritize_urgent_jobs(recommendations)
    
    # 5. 多样性保证
    if config['enable_diversity']:
        recommendations = ensure_diversity(recommendations, config['diversity_params'])
    
    return recommendations


def business_rules_pipeline(worker_id: int, recommendations: List[RecommendationResult],
                          top_k: int = 20) -> List[RecommendationResult]:
    """
    完整的业务规则 pipeline
    
    应用所有业务规则并返回前k个结果。
    
    Args:
        worker_id: 工人ID
        recommendations: 推荐结果列表
        top_k: 返回前k个结果
    
    Returns:
        List[RecommendationResult]: 处理后的推荐结果列表
    """
    # 应用业务规则
    processed_recommendations = apply_business_rules(worker_id, recommendations)
    
    # 返回前top_k个结果
    return processed_recommendations[:top_k]