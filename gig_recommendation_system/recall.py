#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
召回层模块

该模块负责推荐系统的召回功能，包括：
1. 基于地理位置的召回
2. 基于用户的协同过滤召回
3. 基于内容的召回
4. 热门岗位召回
5. 最新岗位召回
6. 融合不同召回策略的结果
7. 新用户冷启动策略
8. 完整的召回流水线

这些功能共同构成了推荐系统的召回层，为后续的排序和业务规则处理提供候选岗位。
"""

import random
import numpy as np
from typing import List, Dict, Set, Tuple, Optional
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer

from data_models import Worker, Job
from database import db_manager
from feature_engineering import calculate_distance


def location_based_recall(worker_id: int, max_distance: float = 5.0, limit: int = 100) -> List[int]:
    """
    基于地理位置召回岗位
    
    根据工人的位置，查询指定范围内的岗位。
    
    Args:
        worker_id: 工人ID
        max_distance: 最大距离（公里）
        limit: 返回数量限制
    
    Returns:
        List[int]: 岗位ID列表
    """
    # 获取工人位置
    worker = db_manager.get_worker_by_id(worker_id)
    if not worker:
        return []
    
    # 查询指定范围内的岗位
    nearby_jobs = db_manager.query_jobs_by_distance(
        worker.location_lat,
        worker.location_lng,
        max_distance,
        limit
    )
    
    return [job['job_id'] for job in nearby_jobs]


def collaborative_filtering_recall(worker_id: int, limit: int = 50) -> List[int]:
    """
    基于用户的协同过滤召回
    
    基于用户的历史交互行为，推荐与相似用户交互过的岗位。
    
    Args:
        worker_id: 工人ID
        limit: 返回数量限制
    
    Returns:
        List[int]: 推荐的岗位ID列表
    """
    try:
        # 构建用户-岗位交互矩阵
        user_ids, job_ids, weights = db_manager.build_user_job_matrix()
        
        if not user_ids or not job_ids:
            return []
        
        # 获取唯一的用户ID和岗位ID
        unique_user_ids = list(set(user_ids))
        unique_job_ids = list(set(job_ids))
        
        user_id_to_index = {uid: i for i, uid in enumerate(unique_user_ids)}
        job_id_to_index = {jid: i for i, jid in enumerate(unique_job_ids)}
        
        # 创建用户-岗位矩阵
        num_users = len(unique_user_ids)
        num_jobs = len(unique_job_ids)
        user_job_matrix = np.zeros((num_users, num_jobs))
        
        # 填充矩阵
        for uid, jid, weight in zip(user_ids, job_ids, weights):
            user_idx = user_id_to_index[uid]
            job_idx = job_id_to_index[jid]
            user_job_matrix[user_idx, job_idx] = weight
        
        # 检查当前用户是否在矩阵中
        if worker_id not in user_id_to_index:
            return []
        
        # 获取当前用户的索引
        user_idx = user_id_to_index[worker_id]
        
        # 计算用户相似度
        user_similarity = cosine_similarity(user_job_matrix)
        
        # 获取最相似的用户（排除自己）
        similar_users = user_similarity[user_idx].argsort()[::-1][1:11]  # 前10个最相似用户
        
        # 获取当前用户已交互的岗位
        user_interacted_jobs = set()
        for jid in unique_job_ids:
            job_idx = job_id_to_index[jid]
            if user_job_matrix[user_idx, job_idx] > 0:
                user_interacted_jobs.add(jid)
        
        # 获取相似用户交互过但当前用户未交互的岗位
        recommended_jobs = []
        for similar_user_idx in similar_users:
            similar_user_id = unique_user_ids[similar_user_idx]
            
            for jid in unique_job_ids:
                job_idx = job_id_to_index[jid]
                if (user_job_matrix[similar_user_idx, job_idx] > 0 and 
                    jid not in user_interacted_jobs and
                    jid not in recommended_jobs):
                    recommended_jobs.append(jid)
                    
                    if len(recommended_jobs) >= limit:
                        return recommended_jobs
        
        return recommended_jobs[:limit]
        
    except Exception as e:
        print(f"协同过滤召回失败: {e}")
        return []


def content_based_recall(worker_id: int, limit: int = 50) -> List[int]:
    """
    基于内容的召回
    
    基于工人和岗位的内容特征，计算相似度并推荐最相似的岗位。
    
    Args:
        worker_id: 工人ID
        limit: 返回数量限制
    
    Returns:
        List[int]: 推荐的岗位ID列表
    """
    try:
        # 获取工人信息
        worker = db_manager.get_worker_by_id(worker_id)
        if not worker:
            return []
        
        # 获取所有活跃岗位
        active_jobs = db_manager.get_active_jobs(limit=500)
        
        if not active_jobs:
            return []
        
        # 构建岗位特征文本
        job_features = []
        job_ids = []
        
        for job in active_jobs:
            # 组合岗位标题、描述、技能要求等
            feature_text = f"{job.title} {job.description} {' '.join(job.required_skills)} {job.job_type}"
            job_features.append(feature_text)
            job_ids.append(job.job_id)
        
        # 构建工人特征文本
        worker_feature = f"{' '.join(worker.skills)} {' '.join([str(exp) for exp in worker.work_history])} {worker.name}"
        
        # 使用TF-IDF向量化
        vectorizer = TfidfVectorizer(
            max_features=1000,
            ngram_range=(1, 2),  # 同时考虑单词和短语
        )
        
        # 训练向量器并转换岗位特征
        job_vectors = vectorizer.fit_transform(job_features)
        
        # 转换工人特征
        worker_vector = vectorizer.transform([worker_feature])
        
        # 计算相似度
        similarities = cosine_similarity(worker_vector, job_vectors).flatten()
        
        # 获取最相似的岗位
        similar_job_indices = similarities.argsort()[::-1][:limit]
        
        return [job_ids[idx] for idx in similar_job_indices]
        
    except Exception as e:
        print(f"内容召回失败: {e}")
        return []


def hot_jobs_recall(limit: int = 30) -> List[int]:
    """
    热门岗位召回
    
    查询最近7天申请量最多的岗位。
    
    Args:
        limit: 返回数量限制
    
    Returns:
        List[int]: 热门岗位ID列表
    """
    # 查询最近7天的热门岗位（按申请量排序）
    query = """
    SELECT job_id, COUNT(*) as apply_count
    FROM interactions
    WHERE interaction_type = 'apply'
      AND interaction_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY job_id
    ORDER BY apply_count DESC
    LIMIT %s
    """
    results = db_manager.execute_query(query, (limit,))
    
    return [row['job_id'] for row in results]


def recent_jobs_recall(limit: int = 30) -> List[int]:
    """
    最新岗位召回
    
    查询最近发布的活跃岗位。
    
    Args:
        limit: 返回数量限制
    
    Returns:
        List[int]: 最新岗位ID列表
    """
    query = """
    SELECT job_id FROM jobs
    WHERE status = 1 AND current_count < required_count
    ORDER BY created_at DESC
    LIMIT %s
    """
    results = db_manager.execute_query(query, (limit,))
    
    return [row['job_id'] for row in results]


def merge_recall_results(recall_results: Dict[str, List[int]], 
                        weights: Dict[str, float] = None,
                        max_total: int = 200) -> List[int]:
    """
    融合不同召回策略的结果
    
    对不同召回策略的结果进行加权融合，生成最终的候选岗位列表。
    
    Args:
        recall_results: 各召回策略的结果字典，格式为 {策略名: [job_id列表]}
        weights: 各召回策略的权重字典
        max_total: 最大返回数量
    
    Returns:
        List[int]: 融合后的岗位ID列表
    """
    if not recall_results:
        return []
    
    # 默认权重
    if weights is None:
        weights = {
            'location': 0.35,      # 地理位置召回权重
            'collaborative': 0.25,  # 协同过滤召回权重
            'content': 0.15,        # 内容召回权重
            'hot': 0.1,            # 热门岗位召回权重
            'recent': 0.05          # 最新岗位召回权重
        }
    
    # 构建岗位得分字典
    job_scores = {}
    job_sources = {}
    
    # 为每个召回结果计算得分
    for strategy_name, job_list in recall_results.items():
        if strategy_name not in weights:
            continue
        
        weight = weights[strategy_name]
        
        for i, job_id in enumerate(job_list):
            # 位置越靠前得分越高
            score = weight * (1.0 / (i + 1))
            
            if job_id in job_scores:
                job_scores[job_id] += score
                job_sources[job_id].append(strategy_name)
            else:
                job_scores[job_id] = score
                job_sources[job_id] = [strategy_name]
    
    # 按得分排序
    sorted_jobs = sorted(job_scores.items(), key=lambda x: x[1], reverse=True)
    
    # 返回前max_total个岗位
    result_jobs = []
    for job_id, score in sorted_jobs[:max_total]:
        result_jobs.append(job_id)
    
    return result_jobs


def cold_start_new_worker(worker_id: int, limit: int = 50) -> List[int]:
    """
    新用户冷启动策略
    
    对于新用户，使用多种策略生成推荐，包括：
    1. 基于地理位置的热门岗位
    2. 基于技能的岗位匹配
    3. 全局热门岗位
    4. 最新发布的岗位
    
    Args:
        worker_id: 工人ID
        limit: 返回数量限制
    
    Returns:
        List[int]: 推荐的岗位ID列表
    """
    # 获取用户基本信息
    worker = db_manager.get_worker_by_id(worker_id)
    if not worker:
        return []
    
    # 1. 基于地理位置的热门岗位
    location_hot_jobs = db_manager.query_jobs_by_distance(
        worker.location_lat,
        worker.location_lng,
        max_distance=5,
        limit=20
    )
    location_hot_job_ids = [job['job_id'] for job in location_hot_jobs]
    
    # 2. 基于技能的岗位匹配
    skill_matched_jobs = []
    if worker.skills:
        # 查询要求相关技能的岗位
        query = """
        SELECT job_id FROM jobs
        WHERE status = 1 AND current_count < required_count
          AND required_skills LIKE %s
        LIMIT 20
        """
        skill_pattern = f"%{worker.skills[0]}%" if worker.skills else "%"
        skill_results = db_manager.execute_query(query, (skill_pattern,))
        skill_matched_jobs = [row['job_id'] for row in skill_results]
    
    # 3. 全局热门岗位
    global_hot_jobs = hot_jobs_recall(limit=20)
    
    # 4. 最新发布的岗位
    recent_jobs = recent_jobs_recall(limit=20)
    
    # 合并结果，去重
    all_jobs = location_hot_job_ids + skill_matched_jobs + global_hot_jobs + recent_jobs
    unique_jobs = []
    seen = set()
    
    for job_id in all_jobs:
        if job_id not in seen:
            seen.add(job_id)
            unique_jobs.append(job_id)
    
    return unique_jobs[:limit]


def is_new_worker(worker_id: int) -> bool:
    """
    判断是否为新用户
    
    通过查询用户的交互记录数量来判断是否为新用户。
    
    Args:
        worker_id: 工人ID
    
    Returns:
        bool: 是否为新用户
    """
    # 查询用户的交互记录数量
    query = """
    SELECT COUNT(*) as interaction_count
    FROM interactions
    WHERE worker_id = %s
    """
    result = db_manager.execute_query(query, (worker_id,))
    
    if not result:
        return True
    
    # 交互次数少于5次认为是新用户
    return result[0]['interaction_count'] < 5


def recall_pipeline(worker_id: int, limit: int = 200) -> List[int]:
    """
    完整的召回 pipeline
    
    实现完整的召回流程，包括：
    1. 检查是否为新用户，使用冷启动策略
    2. 多策略召回：地理位置、协同过滤、内容、热门、最新
    3. 融合召回结果
    
    Args:
        worker_id: 工人ID
        limit: 返回数量限制
    
    Returns:
        List[int]: 召回的岗位ID列表
    """
    # 检查是否为新用户
    if is_new_worker(worker_id):
        return cold_start_new_worker(worker_id, limit)
    
    # 多策略召回
    recall_results = {}
    
    # 1. 地理位置召回
    recall_results['location'] = location_based_recall(worker_id, max_distance=5, limit=100)
    
    # 2. 协同过滤召回
    recall_results['collaborative'] = collaborative_filtering_recall(worker_id, limit=50)
    
    # 3. 内容召回
    recall_results['content'] = content_based_recall(worker_id, limit=50)
    
    # 4. 热门岗位召回
    recall_results['hot'] = hot_jobs_recall(limit=30)
    
    # 5. 最新岗位召回
    recall_results['recent'] = recent_jobs_recall(limit=30)
    
    # 融合召回结果
    merged_jobs = merge_recall_results(recall_results, max_total=limit)
    
    return merged_jobs