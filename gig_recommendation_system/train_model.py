#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
模型训练脚本

该脚本用于训练推荐系统的排序模型，包括逻辑回归和GBDT模型。
它会调用ranking模块中的训练函数来执行具体的模型训练过程。
"""

import os
import sys
import logging
from datetime import datetime

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('model_training.log'),  # 日志文件
        logging.StreamHandler()  # 控制台输出
    ]
)
logger = logging.getLogger('model_trainer')

def train_models():
    """
    训练推荐系统模型
    
    该函数负责协调整个模型训练过程，包括：
    1. 记录训练开始时间
    2. 导入训练模块
    3. 创建模型存储目录
    4. 调用排序模型训练函数
    5. 处理训练过程中的异常
    
    Returns:
        bool: 训练是否成功
    """
    try:
        logger.info("开始训练推荐系统模型...")
        logger.info(f"训练时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # 导入模型训练模块
        from ranking import train_models as train_ranking_models
        
        # 创建模型目录，确保目录存在
        os.makedirs('models', exist_ok=True)
        
        # 训练排序模型
        logger.info("开始训练排序模型...")
        train_ranking_models()
        
        logger.info("模型训练完成！")
        
    except Exception as e:
        logger.error(f"模型训练失败: {str(e)}", exc_info=True)
        return False
    
    return True

if __name__ == '__main__':
    """
    脚本入口点
    
    执行模型训练并根据训练结果设置退出码
    """
    success = train_models()
    sys.exit(0 if success else 1)