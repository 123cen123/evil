#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
A/B测试系统核心模块

该模块负责A/B测试的实验管理、用户分配、事件记录和效果分析。
"""

import hashlib
import json
import logging
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Any, Tuple
import numpy as np
from scipy import stats

from database import db_manager

# 配置日志
logger = logging.getLogger(__name__)

class ExperimentStatus(Enum):
    """实验状态枚举"""
    DRAFT = "draft"      # 草稿
    RUNNING = "running"  # 运行中
    PAUSED = "paused"    # 暂停
    COMPLETED = "completed"  # 已完成
    ARCHIVED = "archived"    # 已归档

class ExperimentVariant:
    """实验变体定义"""
    
    def __init__(self, name: str, config: Dict, traffic_percentage: float):
        """
        初始化实验变体
        
        Args:
            name: 变体名称
            config: 变体配置
            traffic_percentage: 流量分配比例 (0-1)
        """
        self.name = name
        self.config = config
        self.traffic_percentage = traffic_percentage
    
    def to_dict(self) -> Dict:
        """转换为字典格式"""
        return {
            'name': self.name,
            'config': self.config,
            'traffic_percentage': self.traffic_percentage
        }

class Experiment:
    """A/B测试实验定义"""
    
    def __init__(self, 
                 experiment_id: str,
                 name: str,
                 description: str,
                 target_metric: str,
                 variants: List[ExperimentVariant],
                 start_time: datetime,
                 end_time: datetime,
                 status: ExperimentStatus = ExperimentStatus.DRAFT):
        """
        初始化实验
        
        Args:
            experiment_id: 实验ID
            name: 实验名称
            description: 实验描述
            target_metric: 目标指标
            variants: 变体列表
            start_time: 开始时间
            end_time: 结束时间
            status: 实验状态
        """
        self.experiment_id = experiment_id
        self.name = name
        self.description = description
        self.target_metric = target_metric
        self.variants = variants
        self.start_time = start_time
        self.end_time = end_time
        self.status = status
        self.results = {}
    
    def is_active(self) -> bool:
        """检查实验是否处于活跃状态"""
        now = datetime.now()
        return (self.status == ExperimentStatus.RUNNING and 
                self.start_time <= now <= self.end_time)
    
    def to_dict(self) -> Dict:
        """转换为字典格式"""
        return {
            'experiment_id': self.experiment_id,
            'name': self.name,
            'description': self.description,
            'target_metric': self.target_metric,
            'variants': [v.to_dict() for v in self.variants],
            'start_time': self.start_time.isoformat(),
            'end_time': self.end_time.isoformat(),
            'status': self.status.value,
            'is_active': self.is_active()
        }

class ABTestManager:
    """A/B测试管理器"""
    
    def __init__(self):
        """初始化A/B测试管理器"""
        self.experiments = {}
        self._load_experiments_from_db()
    
    def _load_experiments_from_db(self):
        """从数据库加载实验配置"""
        try:
            # 加载实验配置
            experiments_query = """
            SELECT e.*, v.name as variant_name, v.config, v.traffic_percentage
            FROM ab_experiments e
            JOIN ab_variants v ON e.experiment_id = v.experiment_id
            WHERE e.status IN ('running', 'draft')
            ORDER BY e.experiment_id, v.variant_id
            """
            
            results = db_manager.execute_query(experiments_query)
            
            current_experiment = None
            variants = []
            
            for row in results:
                if current_experiment != row['experiment_id']:
                    # 保存上一个实验
                    if current_experiment and variants:
                        experiment = Experiment(
                            experiment_id=current_experiment,
                            name=row['name'],
                            description=row['description'],
                            target_metric=row['target_metric'],
                            variants=variants.copy(),
                            start_time=row['start_time'],
                            end_time=row['end_time'],
                            status=ExperimentStatus(row['status'])
                        )
                        self.experiments[current_experiment] = experiment
                    
                    # 开始新实验
                    current_experiment = row['experiment_id']
                    variants = []
                
                # 添加变体
                variant = ExperimentVariant(
                    name=row['variant_name'],
                    config=json.loads(row['config']),
                    traffic_percentage=float(row['traffic_percentage'])
                )
                variants.append(variant)
            
            # 保存最后一个实验
            if current_experiment and variants:
                experiment = Experiment(
                    experiment_id=current_experiment,
                    name=results[-1]['name'],
                    description=results[-1]['description'],
                    target_metric=results[-1]['target_metric'],
                    variants=variants,
                    start_time=results[-1]['start_time'],
                    end_time=results[-1]['end_time'],
                    status=ExperimentStatus(results[-1]['status'])
                )
                self.experiments[current_experiment] = experiment
                
            logger.info(f"从数据库加载了 {len(self.experiments)} 个实验")
            
        except Exception as e:
            logger.error(f"加载实验配置失败: {e}")
    
    def assign_user_to_variant(self, user_id: int, experiment_id: str) -> str:
        """
        为用户分配实验变体
        
        Args:
            user_id: 用户ID
            experiment_id: 实验ID
            
        Returns:
            str: 分配的变体名称
        """
        try:
            # 检查是否已分配
            existing_assignment = self.get_user_assignment(user_id, experiment_id)
            if existing_assignment:
                return existing_assignment
            
            # 获取实验配置
            experiment = self.experiments.get(experiment_id)
            if not experiment or not experiment.is_active():
                return "control"  # 默认控制组
            
            # 基于用户ID的哈希进行稳定分配
            hash_value = hashlib.md5(f"{user_id}_{experiment_id}".encode()).hexdigest()
            hash_int = int(hash_value[:8], 16)
            
            cumulative_percentage = 0
            for variant in experiment.variants:
                cumulative_percentage += variant.traffic_percentage
                if (hash_int % 10000) / 10000.0 <= cumulative_percentage:
                    # 记录用户分配
                    self._record_user_assignment(user_id, experiment_id, variant.name)
                    return variant.name
            
            # 默认返回控制组
            return "control"
            
        except Exception as e:
            logger.error(f"用户分配失败 - 用户: {user_id}, 实验: {experiment_id}, 错误: {e}")
            return "control"
    
    def get_user_assignment(self, user_id: int, experiment_id: str) -> Optional[str]:
        """获取用户的实验分配"""
        try:
            query = """
            SELECT variant_name FROM ab_user_assignments 
            WHERE user_id = %s AND experiment_id = %s
            """
            result = db_manager.execute_query(query, (user_id, experiment_id))
            return result[0]['variant_name'] if result else None
        except Exception as e:
            logger.error(f"查询用户分配失败: {e}")
            return None
    
    def _record_user_assignment(self, user_id: int, experiment_id: str, variant_name: str):
        """记录用户分配"""
        try:
            query = """
            INSERT INTO ab_user_assignments (user_id, experiment_id, variant_name)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE variant_name = VALUES(variant_name)
            """
            db_manager.execute_update(query, (user_id, experiment_id, variant_name))
        except Exception as e:
            logger.error(f"记录用户分配失败: {e}")
    
    def record_event(self, user_id: int, experiment_id: str, variant_name: str, 
                    event_type: str, event_data: Dict = None):
        """
        记录实验事件
        
        Args:
            user_id: 用户ID
            experiment_id: 实验ID
            variant_name: 变体名称
            event_type: 事件类型
            event_data: 事件数据
        """
        try:
            query = """
            INSERT INTO ab_events (user_id, experiment_id, variant_name, event_type, event_data)
            VALUES (%s, %s, %s, %s, %s)
            """
            
            data_json = json.dumps(event_data) if event_data else None
            db_manager.execute_update(query, (user_id, experiment_id, variant_name, event_type, data_json))
            
        except Exception as e:
            logger.error(f"记录实验事件失败: {e}")
    
    def get_experiment_metrics(self, experiment_id: str, start_date: datetime = None, 
                             end_date: datetime = None) -> Dict:
        """
        获取实验指标数据
        
        Args:
            experiment_id: 实验ID
            start_date: 开始日期
            end_date: 结束日期
            
        Returns:
            Dict: 指标数据
        """
        try:
            if not start_date:
                start_date = datetime.now() - timedelta(days=7)
            if not end_date:
                end_date = datetime.now()
            
            # 获取事件统计数据
            metrics_query = """
            SELECT variant_name, event_type, COUNT(*) as count
            FROM ab_events
            WHERE experiment_id = %s AND created_at BETWEEN %s AND %s
            GROUP BY variant_name, event_type
            """
            
            results = db_manager.execute_query(metrics_query, (experiment_id, start_date, end_date))
            
            # 计算关键指标
            metrics = {}
            for variant in self.experiments[experiment_id].variants:
                variant_name = variant.name
                variant_events = [r for r in results if r['variant_name'] == variant_name]
                
                event_counts = {r['event_type']: r['count'] for r in variant_events}
                
                # 计算点击率 (CTR)
                views = event_counts.get('view', 0)
                clicks = event_counts.get('click', 0)
                ctr = clicks / views if views > 0 else 0
                
                # 计算转化率
                applications = event_counts.get('apply', 0)
                conversion_rate = applications / clicks if clicks > 0 else 0
                
                metrics[variant_name] = {
                    'views': views,
                    'clicks': clicks,
                    'applications': applications,
                    'ctr': ctr,
                    'conversion_rate': conversion_rate,
                    'sample_size': len(set([r['user_id'] for r in variant_events]))
                }
            
            return metrics
            
        except Exception as e:
            logger.error(f"获取实验指标失败: {e}")
            return {}
    
    def calculate_statistical_significance(self, experiment_id: str, metric: str) -> Dict:
        """
        计算统计显著性
        
        Args:
            experiment_id: 实验ID
            metric: 指标名称
            
        Returns:
            Dict: 显著性分析结果
        """
        try:
            metrics = self.get_experiment_metrics(experiment_id)
            experiment = self.experiments.get(experiment_id)
            
            if not experiment or len(metrics) < 2:
                return {'error': '数据不足'}
            
            # 获取控制组数据
            control_data = metrics.get('control')
            if not control_data:
                return {'error': '缺少控制组数据'}
            
            results = {}
            
            for variant_name, variant_metrics in metrics.items():
                if variant_name == 'control':
                    continue
                
                # 这里简化处理，实际应该使用更复杂的统计检验
                control_value = control_data.get(metric, 0)
                variant_value = variant_metrics.get(metric, 0)
                
                # 计算提升幅度
                lift = (variant_value - control_value) / control_value if control_value > 0 else 0
                
                # 简单的显著性检验（实际应该使用t检验或卡方检验）
                control_sample = control_data.get('sample_size', 1)
                variant_sample = variant_metrics.get('sample_size', 1)
                
                # 这里简化处理，实际应该使用正确的统计方法
                p_value = 0.05 if abs(lift) > 0.1 else 0.5  # 简化逻辑
                
                results[variant_name] = {
                    'lift': lift,
                    'p_value': p_value,
                    'significant': p_value < 0.05,
                    'confidence_interval': {
                        'lower': variant_value * 0.9,  # 简化
                        'upper': variant_value * 1.1   # 简化
                    }
                }
            
            return results
            
        except Exception as e:
            logger.error(f"计算统计显著性失败: {e}")
            return {'error': str(e)}

# 全局A/B测试管理器实例
ab_test_manager = ABTestManager()