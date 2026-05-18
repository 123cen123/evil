-- A/B测试系统数据库表结构
-- 创建时间: 2026-03-29

-- 实验配置表
CREATE TABLE ab_experiments (
    experiment_id VARCHAR(50) PRIMARY KEY COMMENT '实验ID',
    name VARCHAR(100) NOT NULL COMMENT '实验名称',
    description TEXT COMMENT '实验描述',
    target_metric VARCHAR(50) NOT NULL COMMENT '目标指标',
    status ENUM('draft', 'running', 'paused', 'completed', 'archived') DEFAULT 'draft' COMMENT '实验状态',
    start_time DATETIME COMMENT '开始时间',
    end_time DATETIME COMMENT '结束时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    INDEX idx_status (status),
    INDEX idx_time_range (start_time, end_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='A/B测试实验配置表';

-- 实验变体表
CREATE TABLE ab_variants (
    variant_id INT PRIMARY KEY AUTO_INCREMENT COMMENT '变体ID',
    experiment_id VARCHAR(50) NOT NULL COMMENT '实验ID',
    name VARCHAR(50) NOT NULL COMMENT '变体名称',
    config JSON NOT NULL COMMENT '变体配置',
    traffic_percentage DECIMAL(5,2) NOT NULL COMMENT '流量分配比例',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    FOREIGN KEY (experiment_id) REFERENCES ab_experiments(experiment_id) ON DELETE CASCADE,
    INDEX idx_experiment (experiment_id),
    UNIQUE KEY uk_experiment_variant (experiment_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='实验变体配置表';

-- 用户分配记录表
CREATE TABLE ab_user_assignments (
    assignment_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '分配记录ID',
    user_id INT NOT NULL COMMENT '用户ID',
    experiment_id VARCHAR(50) NOT NULL COMMENT '实验ID',
    variant_name VARCHAR(50) NOT NULL COMMENT '变体名称',
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '分配时间',
    
    UNIQUE KEY uk_user_experiment (user_id, experiment_id),
    INDEX idx_user_id (user_id),
    INDEX idx_experiment (experiment_id),
    INDEX idx_assigned_time (assigned_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户实验分配记录表';

-- 实验事件记录表
CREATE TABLE ab_events (
    event_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '事件ID',
    user_id INT NOT NULL COMMENT '用户ID',
    experiment_id VARCHAR(50) NOT NULL COMMENT '实验ID',
    variant_name VARCHAR(50) NOT NULL COMMENT '变体名称',
    event_type VARCHAR(50) NOT NULL COMMENT '事件类型',
    event_data JSON COMMENT '事件数据',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    INDEX idx_user_experiment (user_id, experiment_id),
    INDEX idx_event_type (event_type),
    INDEX idx_created_at (created_at),
    INDEX idx_experiment_event (experiment_id, event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='A/B测试事件记录表';

-- 实验指标统计表（用于快速查询）
CREATE TABLE ab_metrics_daily (
    metric_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '指标ID',
    experiment_id VARCHAR(50) NOT NULL COMMENT '实验ID',
    variant_name VARCHAR(50) NOT NULL COMMENT '变体名称',
    metric_date DATE NOT NULL COMMENT '统计日期',
    metric_name VARCHAR(50) NOT NULL COMMENT '指标名称',
    metric_value DECIMAL(15,4) NOT NULL COMMENT '指标值',
    sample_size INT NOT NULL COMMENT '样本量',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    UNIQUE KEY uk_unique_metric (experiment_id, variant_name, metric_date, metric_name),
    INDEX idx_experiment_date (experiment_id, metric_date),
    INDEX idx_metric_date (metric_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='A/B测试每日指标统计表';

-- 插入示例实验数据
INSERT INTO ab_experiments (experiment_id, name, description, target_metric, status, start_time, end_time) VALUES
('ranking_algorithm_v1', '排序算法效果对比', '比较逻辑回归、GBDT和混合算法的推荐效果', 'click_through_rate', 'running', NOW(), DATE_ADD(NOW(), INTERVAL 14 DAY)),
('recall_strategy_v1', '召回策略优化实验', '测试不同召回策略组合的效果', 'application_conversion_rate', 'draft', DATE_ADD(NOW(), INTERVAL 7 DAY), DATE_ADD(NOW(), INTERVAL 21 DAY));

-- 插入示例变体数据
INSERT INTO ab_variants (experiment_id, name, config, traffic_percentage) VALUES
('ranking_algorithm_v1', 'control', '{"algorithm": "logistic_regression"}', 0.33),
('ranking_algorithm_v1', 'gbdt_enhanced', '{"algorithm": "gbdt_enhanced"}', 0.33),
('ranking_algorithm_v1', 'hybrid_approach', '{"algorithm": "hybrid"}', 0.34),
('recall_strategy_v1', 'control', '{"strategies": ["location", "content"]}', 0.5),
('recall_strategy_v1', 'expanded', '{"strategies": ["location", "content", "collaborative", "hot"]}', 0.5);