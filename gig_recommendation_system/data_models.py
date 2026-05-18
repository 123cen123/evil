#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据模型定义

该模块定义了系统中使用的数据模型，包括：
1. Worker: 工人数据模型
2. Merchant: 商家数据模型
3. Job: 岗位数据模型
4. Interaction: 交互数据模型
5. Application: 申请记录数据模型
6. RecommendationResult: 推荐结果数据模型

使用dataclass装饰器简化类定义。
"""

from datetime import datetime
from typing import List, Dict, Optional, Set, Tuple
from dataclasses import dataclass, field


@dataclass
class Worker:
    """
    工人数据模型
    
    存储工人的基本信息、技能、工作历史、位置等信息。
    """
    worker_id: int  # 工人ID
    phone: str  # 电话号码
    name: str  # 姓名
    location_lat: float  # 位置纬度
    location_lng: float  # 位置经度
    address: str  # 地址
    skills: List[str] = field(default_factory=list)  # 技能列表
    work_history: List[Dict] = field(default_factory=list)  # 工作历史
    rating: float = 0.0  # 评分
    total_orders: int = 0  # 总订单数
    available_time: List[Tuple[datetime, datetime]] = field(default_factory=list)  # 可用时间段
    created_at: datetime = field(default_factory=datetime.now)  # 创建时间
    
    def to_dict(self) -> Dict:
        """
        转换为字典格式
        
        Returns:
            Dict: 包含工人信息的字典
        """
        return {
            'worker_id': self.worker_id,
            'phone': self.phone,
            'name': self.name,
            'location_lat': self.location_lat,
            'location_lng': self.location_lng,
            'address': self.address,
            'skills': self.skills,
            'work_history': self.work_history,
            'rating': self.rating,
            'total_orders': self.total_orders,
            'available_time': [(t[0].isoformat(), t[1].isoformat()) for t in self.available_time],
            'created_at': self.created_at.isoformat()
        }


@dataclass
class Merchant:
    """
    商家数据模型
    
    存储商家的基本信息、联系方式、位置等信息。
    """
    merchant_id: int  # 商家ID
    phone: str  # 电话号码
    business_name: str  # 企业名称
    contact_name: str  # 联系人姓名
    business_type: str  # 企业类型
    location_lat: float  # 位置纬度
    location_lng: float  # 位置经度
    address: str  # 地址
    description: str = ""  # 企业描述
    rating: float = 0.0  # 评分
    total_posts: int = 0  # 发布的岗位总数
    status: int = 1  # 状态，1:正常, 0:禁用
    created_at: datetime = field(default_factory=datetime.now)  # 创建时间
    
    def to_dict(self) -> Dict:
        """
        转换为字典格式
        
        Returns:
            Dict: 包含商家信息的字典
        """
        return {
            'merchant_id': self.merchant_id,
            'phone': self.phone,
            'business_name': self.business_name,
            'contact_name': self.contact_name,
            'business_type': self.business_type,
            'location_lat': self.location_lat,
            'location_lng': self.location_lng,
            'address': self.address,
            'description': self.description,
            'rating': self.rating,
            'total_posts': self.total_posts,
            'status': self.status,
            'created_at': self.created_at.isoformat()
        }


@dataclass
class Job:
    """
    岗位数据模型
    
    存储岗位的详细信息，包括岗位描述、要求、薪资、时间等信息。
    """
    job_id: int  # 岗位ID
    merchant_id: int  # 商家ID
    title: str  # 岗位标题
    description: str  # 岗位描述
    job_type: str  # 岗位类型（兼职、日结、临时工等）
    required_skills: List[str]  # 技能要求
    location_lat: float  # 位置纬度
    location_lng: float  # 位置经度
    address: str  # 地址
    salary: float  # 薪资
    salary_type: str  # 薪资类型（小时、天、项目等）
    start_time: datetime  # 开始时间
    end_time: datetime  # 结束时间
    required_count: int  # 需求人数
    current_count: int = 0  # 当前报名人数
    status: int = 1  # 状态，1:招聘中, 2:已结束, 3:已取消
    views_count: int = 0  # 浏览次数
    apply_count: int = 0  # 申请次数
    created_at: datetime = field(default_factory=datetime.now)  # 创建时间
    
    def to_dict(self) -> Dict:
        """
        转换为字典格式
        
        Returns:
            Dict: 包含岗位信息的字典
        """
        return {
            'job_id': self.job_id,
            'merchant_id': self.merchant_id,
            'title': self.title,
            'description': self.description,
            'job_type': self.job_type,
            'required_skills': self.required_skills,
            'location_lat': self.location_lat,
            'location_lng': self.location_lng,
            'address': self.address,
            'salary': self.salary,
            'salary_type': self.salary_type,
            'start_time': self.start_time.isoformat(),
            'end_time': self.end_time.isoformat(),
            'required_count': self.required_count,
            'current_count': self.current_count,
            'status': self.status,
            'views_count': self.views_count,
            'apply_count': self.apply_count,
            'created_at': self.created_at.isoformat()
        }
    
    @property
    def is_active(self) -> bool:
        """
        岗位是否处于活跃状态
        
        Returns:
            bool: 岗位是否处于招聘中且未招满
        """
        return self.status == 1 and self.current_count < self.required_count
    
    @property
    def is_urgent(self) -> bool:
        """
        岗位是否紧急（24小时内开始）
        
        Returns:
            bool: 岗位是否在24小时内开始
        """
        time_diff = (self.start_time - datetime.now()).total_seconds() / 3600
        return 0 < time_diff <= 24


@dataclass
class Interaction:
    """
    交互数据模型
    
    记录工人与岗位之间的交互行为，如浏览、申请、完成等。
    """
    interaction_id: int  # 交互ID
    worker_id: int  # 工人ID
    job_id: int  # 岗位ID
    interaction_type: str  # 交互类型，如view/apply/match/complete/rating
    interaction_time: datetime = field(default_factory=datetime.now)  # 交互时间
    rating: Optional[int] = None  # 评分（1-5）
    comment: Optional[str] = None  # 评论
    
    def to_dict(self) -> Dict:
        """
        转换为字典格式
        
        Returns:
            Dict: 包含交互信息的字典
        """
        return {
            'interaction_id': self.interaction_id,
            'worker_id': self.worker_id,
            'job_id': self.job_id,
            'interaction_type': self.interaction_type,
            'interaction_time': self.interaction_time.isoformat(),
            'rating': self.rating,
            'comment': self.comment
        }


@dataclass
class Application:
    """
    申请记录数据模型
    
    记录工人对岗位的申请信息，包括申请状态、时间、评分等。
    """
    application_id: int  # 申请ID
    worker_id: int  # 工人ID
    job_id: int  # 岗位ID
    status: str = 'pending'  # 状态，如pending/accepted/rejected/completed
    apply_time: datetime = field(default_factory=datetime.now)  # 申请时间
    accept_time: Optional[datetime] = None  # 接受时间
    complete_time: Optional[datetime] = None  # 完成时间
    worker_rating: Optional[int] = None  # 工人对岗位的评分
    merchant_rating: Optional[int] = None  # 商家对工人的评分
    worker_comment: Optional[str] = None  # 工人评论
    merchant_comment: Optional[str] = None  # 商家评论
    
    def to_dict(self) -> Dict:
        """
        转换为字典格式
        
        Returns:
            Dict: 包含申请信息的字典
        """
        return {
            'application_id': self.application_id,
            'worker_id': self.worker_id,
            'job_id': self.job_id,
            'status': self.status,
            'apply_time': self.apply_time.isoformat(),
            'accept_time': self.accept_time.isoformat() if self.accept_time else None,
            'complete_time': self.complete_time.isoformat() if self.complete_time else None,
            'worker_rating': self.worker_rating,
            'merchant_rating': self.merchant_rating,
            'worker_comment': self.worker_comment,
            'merchant_comment': self.merchant_comment
        }


@dataclass
class RecommendationResult:
    """
    推荐结果数据模型（集成A/B测试支持）
    
    存储推荐结果的相关信息，包括岗位ID、推荐分数、距离等。
    新增A/B测试相关字段，支持实验追踪和效果分析。
    """
    job_id: int  # 岗位ID
    score: float  # 推荐分数
    distance: Optional[float] = None  # 距离（公里）
    time_match: Optional[float] = None  # 时间匹配度
    skill_match: Optional[float] = None  # 技能匹配度
    reason: Optional[str] = None  # 推荐理由
    experiment_algorithm: Optional[str] = None  # A/B测试：使用的算法类型
    variant_name: Optional[str] = None  # A/B测试：分配的变体名称
    experiment_id: Optional[str] = None  # A/B测试：实验ID
    
    def to_dict(self) -> Dict:
        """
        转换为字典格式（包含A/B测试信息）
        
        Returns:
            Dict: 包含推荐结果信息的字典
        """
        return {
            'job_id': self.job_id,
            'score': self.score,
            'distance': self.distance,
            'time_match': self.time_match,
            'skill_match': self.skill_match,
            'reason': self.reason,
            'experiment_info': {
                'algorithm_used': self.experiment_algorithm,
                'variant': self.variant_name,
                'experiment_id': self.experiment_id
            } if self.experiment_algorithm else None
        }