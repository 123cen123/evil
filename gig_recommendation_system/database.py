#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据库操作模块

该模块负责数据库的连接管理和各种数据操作，包括：
1. 数据库连接和断开
2. 执行查询和更新操作
3. 工人相关操作
4. 商家相关操作
5. 岗位相关操作
6. 交互相关操作
7. 申请相关操作
8. 批量操作
9. 构建用户-岗位交互矩阵

使用mysql.connector库连接MySQL数据库。
"""

import mysql.connector
from mysql.connector import Error
import json
from datetime import datetime
from typing import List, Dict, Optional, Tuple, Any
from decimal import Decimal
from data_models import Worker, Merchant, Job, Interaction, Application


class DatabaseManager:
    """
    数据库管理器
    
    负责数据库的连接管理和各种数据操作。
    """
    
    def __init__(self, host: str, user: str, password: str, database: str):
        """
        初始化数据库连接
        
        Args:
            host: 数据库主机地址
            user: 数据库用户名
            password: 数据库密码
            database: 数据库名称
        """
        self.host = host
        self.user = user
        self.password = password
        self.database = database
        self.connection = None  # 数据库连接对象
    
    def connect(self):
        """
        建立数据库连接
        
        尝试连接到MySQL数据库，如果连接失败则打印错误信息。
        """
        try:
            self.connection = mysql.connector.connect(
                host=self.host,
                user=self.user,
                password=self.password,
                database=self.database
            )
            print("数据库连接成功")
        except Error as e:
            print(f"数据库连接失败: {e}")
            self.connection = None
    
    def disconnect(self):
        """
        关闭数据库连接
        
        如果连接存在且处于连接状态，则关闭连接。
        """
        if self.connection and self.connection.is_connected():
            self.connection.close()
            print("数据库连接已关闭")
    
    def execute_query(self, query: str, params: Tuple = None) -> List[Dict]:
        """
        执行查询并返回结果
        
        Args:
            query: SQL查询语句
            params: 查询参数
            
        Returns:
            List[Dict]: 查询结果列表，每个元素为一个字典
        """
        if not self.connection or not self.connection.is_connected():
            self.connect()
        
        try:
            cursor = self.connection.cursor(dictionary=True)  # 返回字典格式的结果
            cursor.execute(query, params or ())
            result = cursor.fetchall()
            cursor.close()
            return result
        except Error as e:
            print(f"查询执行失败: {e}")
            return []
    
    def execute_update(self, query: str, params: Tuple = None) -> int:
        """
        执行更新操作并返回影响行数
        
        Args:
            query: SQL更新语句
            params: 更新参数
            
        Returns:
            int: 影响的行数
        """
        if not self.connection or not self.connection.is_connected():
            self.connect()
        
        try:
            cursor = self.connection.cursor()
            cursor.execute(query, params or ())
            self.connection.commit()  # 提交事务
            affected_rows = cursor.rowcount
            cursor.close()
            return affected_rows
        except Error as e:
            print(f"更新执行失败: {e}")
            self.connection.rollback()  # 回滚事务
            return 0
    
    # 工人相关操作
    def get_worker_by_id(self, worker_id: int) -> Optional[Worker]:
        """
        根据ID获取工人信息
        
        Args:
            worker_id: 工人ID
            
        Returns:
            Optional[Worker]: 工人对象，如果不存在则返回None
        """
        query = """
        SELECT * FROM workers WHERE worker_id = %s
        """
        result = self.execute_query(query, (worker_id,))
        
        if not result:
            return None
        
        row = result[0]

        # 转换位置坐标
        if isinstance(row.get('location_lat'), Decimal):
            row['location_lat'] = float(row['location_lat'])
        if isinstance(row.get('location_lng'), Decimal):
            row['location_lng'] = float(row['location_lng'])
        # 转换评分
        if isinstance(row.get('rating'), Decimal):
            row['rating'] = float(str(row['rating']))

        # 解析 available_time
        available_time = []
        if row['available_time']:
            time_data = json.loads(row['available_time'])
            if isinstance(time_data, list):
                available_time = [
                    (datetime.fromisoformat(item['start']), datetime.fromisoformat(item['end']))
                    for item in time_data
                    if isinstance(item, dict) and 'start' in item and 'end' in item
                ]

        return Worker(
            worker_id=row['worker_id'],
            phone=row['phone'],
            name=row['name'],
            location_lat=row['location_lat'],
            location_lng=row['location_lng'],
            address=row['address'],
            skills=json.loads(row['skills']) if row['skills'] else [],
            work_history=json.loads(row['work_history']) if row['work_history'] else [],
            rating=row['rating'],
            total_orders=row['total_orders'],
            available_time=available_time,
            created_at=row['created_at']
        )
    
    def update_worker_location(self, worker_id: int, lat: float, lng: float) -> bool:
        """
        更新工人位置
        
        Args:
            worker_id: 工人ID
            lat: 新的纬度
            lng: 新的经度
            
        Returns:
            bool: 更新是否成功
        """
        query = """
        UPDATE workers SET location_lat = %s, location_lng = %s
        WHERE worker_id = %s
        """
        affected = self.execute_update(query, (lat, lng, worker_id))
        return affected > 0
    
    def get_worker_accepted_jobs(self, worker_id: int) -> List[Dict]:
        """
        获取工人已接受的岗位
        
        Args:
            worker_id: 工人ID
            
        Returns:
            List[Dict]: 已接受的岗位列表
        """
        query = """
        SELECT j.* FROM jobs j
        JOIN applications a ON j.job_id = a.job_id
        WHERE a.worker_id = %s AND a.status = 'accepted'
        """
        return self.execute_query(query, (worker_id,))
    
    # 商家相关操作
    def get_merchant_by_id(self, merchant_id: int) -> Optional[Merchant]:
        """
        根据ID获取商家信息
        
        Args:
            merchant_id: 商家ID
            
        Returns:
            Optional[Merchant]: 商家对象，如果不存在则返回None
        """
        query = """
        SELECT * FROM merchants WHERE merchant_id = %s
        """
        result = self.execute_query(query, (merchant_id,))
        
        if not result:
            return None
        
        row = result[0]

        # 转换位置坐标
        if isinstance(row.get('location_lat'), Decimal):
            row['location_lat'] = float(row['location_lat'])
        if isinstance(row.get('location_lng'), Decimal):
            row['location_lng'] = float(row['location_lng'])
        # 转换评分
        if isinstance(row.get('rating'), Decimal):
            row['rating'] = float(str(row['rating']))

        return Merchant(
            merchant_id=row['merchant_id'],
            phone=row['phone'],
            business_name=row['business_name'],
            contact_name=row['contact_name'],
            business_type=row['business_type'],
            location_lat=row['location_lat'],
            location_lng=row['location_lng'],
            address=row['address'],
            description=row['description'],
            rating=row['rating'],
            total_posts=row['total_posts'],
            status=row['status'],
            created_at=row['created_at']
        )
    
    # 岗位相关操作
    def get_job_by_id(self, job_id: int) -> Optional[Job]:
        """
        根据ID获取岗位信息
        
        Args:
            job_id: 岗位ID
            
        Returns:
            Optional[Job]: 岗位对象，如果不存在则返回None
        """
        query = """
        SELECT * FROM jobs WHERE job_id = %s
        """
        result = self.execute_query(query, (job_id,))
        
        if not result:
            return None
        
        row = result[0]

        # 转换位置坐标
        if isinstance(row.get('location_lat'), Decimal):
            row['location_lat'] = float(row['location_lat'])
        if isinstance(row.get('location_lng'), Decimal):
            row['location_lng'] = float(row['location_lng'])
        # 转换薪资
        if isinstance(row.get('salary'), Decimal):
            row['salary'] = float(str(row['salary']))

        return Job(
            job_id=row['job_id'],
            merchant_id=row['merchant_id'],
            title=row['title'],
            description=row['description'],
            job_type=row['job_type'],
            required_skills=json.loads(row['required_skills']) if row['required_skills'] else [],
            location_lat=row['location_lat'],
            location_lng=row['location_lng'],
            address=row['address'],
            salary=row['salary'],
            salary_type=row['salary_type'],
            start_time=row['start_time'],
            end_time=row['end_time'],
            required_count=row['required_count'],
            current_count=row['current_count'],
            status=row['status'],
            views_count=row['views_count'],
            apply_count=row['apply_count'],
            created_at=row['created_at']
        )
    
    def get_active_jobs(self, limit: int = 1000) -> List[Job]:
        """
        获取活跃岗位
        
        Args:
            limit: 返回的岗位数量限制
            
        Returns:
            List[Job]: 活跃岗位列表
        """
        query = """
        SELECT * FROM jobs WHERE status = 1 AND current_count < required_count
        ORDER BY created_at DESC LIMIT %s
        """
        results = self.execute_query(query, (limit,))
        
        jobs = []
        for row in results:
            job = Job(
                job_id=row['job_id'],
                merchant_id=row['merchant_id'],
                title=row['title'],
                description=row['description'],
                job_type=row['job_type'],
                required_skills=json.loads(row['required_skills']) if row['required_skills'] else [],
                location_lat=row['location_lat'],
                location_lng=row['location_lng'],
                address=row['address'],
                salary=row['salary'],
                salary_type=row['salary_type'],
                start_time=row['start_time'],
                end_time=row['end_time'],
                required_count=row['required_count'],
                current_count=row['current_count'],
                status=row['status'],
                views_count=row['views_count'],
                apply_count=row['apply_count'],
                created_at=row['created_at']
            )
            jobs.append(job)
        
        return jobs
    
    def query_jobs_by_distance(self, lat: float, lng: float, max_distance: float, limit: int) -> List[Dict]:
        """
        查询指定范围内的岗位
        
        使用Haversine公式计算地球表面两点之间的距离。
        
        Args:
            lat: 纬度
            lng: 经度
            max_distance: 最大距离（公里）
            limit: 返回的岗位数量限制
            
        Returns:
            List[Dict]: 岗位列表，每个岗位包含距离信息
        """
        # 使用Haversine公式计算距离
        query = """
        SELECT *, 
               (6371 * acos(cos(radians(%s)) * cos(radians(location_lat)) * 
               cos(radians(location_lng) - radians(%s)) + 
               sin(radians(%s)) * sin(radians(location_lat)))) AS distance
        FROM jobs
        WHERE status = 1 AND current_count < required_count
        HAVING distance <= %s
        ORDER BY distance ASC
        LIMIT %s
        """
        return self.execute_query(query, (lat, lng, lat, max_distance, limit))
    
    def update_job_statistics(self, job_id: int, interaction_type: str) -> bool:
        """
        更新岗位统计信息
        
        根据交互类型更新岗位的浏览次数或申请次数。
        
        Args:
            job_id: 岗位ID
            interaction_type: 交互类型，如view或apply
            
        Returns:
            bool: 更新是否成功
        """
        if interaction_type == 'view':
            query = """
            UPDATE jobs SET views_count = views_count + 1, updated_at = NOW()
            WHERE job_id = %s
            """
        elif interaction_type == 'apply':
            query = """
            UPDATE jobs SET apply_count = apply_count + 1, updated_at = NOW()
            WHERE job_id = %s
            """
        else:
            return False
        
        affected = self.execute_update(query, (job_id,))
        return affected > 0
    
    # 交互相关操作
    def save_interaction(self, worker_id: int, job_id: int, interaction_type: str, 
                        rating: Optional[int] = None, comment: Optional[str] = None) -> int:
        """
        保存交互记录
        
        Args:
            worker_id: 工人ID
            job_id: 岗位ID
            interaction_type: 交互类型
            rating: 评分（可选）
            comment: 评论（可选）
            
        Returns:
            int: 交互记录ID，如果失败则返回0
        """
        query = """
        INSERT INTO interactions (worker_id, job_id, interaction_type, rating, comment, interaction_time)
        VALUES (%s, %s, %s, %s, %s, NOW())
        """
        try:
            cursor = self.connection.cursor()
            cursor.execute(query, (worker_id, job_id, interaction_type, rating, comment))
            self.connection.commit()
            interaction_id = cursor.lastrowid
            cursor.close()
            return interaction_id
        except Error as e:
            print(f"保存交互记录失败: {e}")
            self.connection.rollback()
            return 0
    
    def get_user_interacted_jobs(self, worker_id: int) -> set:
        """
        获取用户交互过的岗位ID集合
        
        Args:
            worker_id: 工人ID
            
        Returns:
            set: 交互过的岗位ID集合
        """
        query = """
        SELECT DISTINCT job_id FROM interactions WHERE worker_id = %s
        """
        results = self.execute_query(query, (worker_id,))
        return {row['job_id'] for row in results}
    
    # 申请相关操作
    def create_application(self, worker_id: int, job_id: int) -> int:
        """
        创建申请记录
        
        Args:
            worker_id: 工人ID
            job_id: 岗位ID
            
        Returns:
            int: 申请记录ID，如果失败则返回0
        """
        query = """
        INSERT INTO applications (worker_id, job_id, status, apply_time)
        VALUES (%s, %s, 'pending', NOW())
        """
        try:
            cursor = self.connection.cursor()
            cursor.execute(query, (worker_id, job_id))
            self.connection.commit()
            application_id = cursor.lastrowid
            cursor.close()
            return application_id
        except Error as e:
            print(f"创建申请记录失败: {e}")
            self.connection.rollback()
            return 0
    
    # 批量操作
    def get_jobs_info(self, job_ids: List[int]) -> List[Dict]:
        """
        批量获取岗位信息
        
        同时获取岗位和对应的商家信息。
        
        Args:
            job_ids: 岗位ID列表
            
        Returns:
            List[Dict]: 岗位信息列表，包含商家信息
        """
        if not job_ids:
            return []
        
        placeholders = ','.join(['%s'] * len(job_ids))
        query = f"""
        SELECT j.*, m.business_name, m.business_type, m.rating as merchant_rating
        FROM jobs j
        LEFT JOIN merchants m ON j.merchant_id = m.merchant_id
        WHERE j.job_id IN ({placeholders})
        """
        return self.execute_query(query, tuple(job_ids))
    
    def get_workers_by_location(self, lat: float, lng: float, radius: float, limit: int) -> List[Dict]:
        """
        根据位置获取工人
        
        Args:
            lat: 纬度
            lng: 经度
            radius: 半径（公里）
            limit: 返回的工人数量限制
            
        Returns:
            List[Dict]: 工人列表，包含距离信息
        """
        query = """
        SELECT *, 
               (6371 * acos(cos(radians(%s)) * cos(radians(location_lat)) * 
               cos(radians(location_lng) - radians(%s)) + 
               sin(radians(%s)) * sin(radians(location_lat)))) AS distance
        FROM workers
        HAVING distance <= %s
        ORDER BY distance ASC
        LIMIT %s
        """
        return self.execute_query(query, (lat, lng, lat, radius, limit))
    
    # 构建用户-岗位交互矩阵
    def build_user_job_matrix(self) -> Tuple[List[int], List[int], List[int]]:
        """
        构建用户-岗位交互矩阵（用于协同过滤）
        
        为协同过滤算法准备数据，返回用户ID、岗位ID和交互权重。
        不同交互类型有不同的权重：
        - view: 1
        - apply: 2
        - complete: 3
        
        Returns:
            Tuple[List[int], List[int], List[int]]: 用户ID列表、岗位ID列表和权重列表
        """
        query = """
        SELECT worker_id, job_id, 
               CASE 
                   WHEN interaction_type = 'apply' THEN 2
                   WHEN interaction_type = 'complete' THEN 3
                   ELSE 1
               END as weight
        FROM interactions
        WHERE interaction_type IN ('view', 'apply', 'complete')
        """
        results = self.execute_query(query)
        
        user_ids = []
        job_ids = []
        weights = []
        
        for row in results:
            user_ids.append(row['worker_id'])
            job_ids.append(row['job_id'])
            weights.append(row['weight'])
        
        return user_ids, job_ids, weights


# 数据库配置
DB_CONFIG = {
    'host': 'localhost',      # 数据库主机地址
    'user': 'root',           # 数据库用户名
    'password': '123456',     # 数据库密码
    'database': 'gig_recommendation'  # 数据库名称
}

# 创建全局数据库管理器实例
db_manager = DatabaseManager(**DB_CONFIG)  # 全局数据库管理器实例