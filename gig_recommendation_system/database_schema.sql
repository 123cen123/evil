-- =====================================================
-- 打零工平台推荐系统 - 数据库表结构
-- 基于 data_models.py 设计
-- MySQL 8.0+
-- 
-- 本文件定义了推荐系统的完整数据库结构，包括：
-- 1. 工人表 (workers) - 存储工人基本信息、技能和工作历史
-- 2. 商家表 (merchants) - 存储商家信息和联系方式
-- 3. 岗位表 (jobs) - 存储岗位详细信息、要求和时间
-- 4. 交互记录表 (interactions) - 记录工人与岗位的交互行为
-- 5. 申请记录表 (applications) - 记录岗位申请和处理状态
-- 6. 视图 (views) - 提供常用查询的预定义结果
-- 7. 存储过程 (procedures) - 实现业务逻辑
-- 8. 事件调度器 (events) - 自动执行定时任务
-- =====================================================

-- 删除旧数据库（如果存在）
DROP DATABASE IF EXISTS gig_recommendation;
-- 创建新数据库
CREATE DATABASE gig_recommendation;
-- 使用新创建的数据库
USE gig_recommendation;

-- ==================== 工人表 ====================
-- 存储工人的基本信息、技能、可用时间和工作历史
CREATE TABLE workers (
    worker_id INT PRIMARY KEY AUTO_INCREMENT,  -- 工人ID，自增主键
    phone VARCHAR(20) NOT NULL COMMENT '手机号',
    name VARCHAR(50) NOT NULL COMMENT '姓名',
    location_lat DECIMAL(10, 8) NOT NULL COMMENT '纬度',
    location_lng DECIMAL(11, 8) NOT NULL COMMENT '经度',
    address VARCHAR(200) NOT NULL COMMENT '详细地址',
    skills JSON COMMENT '技能列表，JSON格式',
    work_history JSON COMMENT '工作历史，JSON格式',
    rating DECIMAL(3, 2) DEFAULT 0.0 COMMENT '评分',
    total_orders INT DEFAULT 0 COMMENT '总订单数',
    available_time JSON COMMENT '可用时间段，JSON格式',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    -- 索引
    INDEX idx_phone (phone),  -- 手机号索引，加速查询
    INDEX idx_rating (rating),  -- 评分索引，加速排序
    INDEX idx_location (location_lat, location_lng),  -- 位置索引，加速地理查询
    INDEX idx_created (created_at)  -- 创建时间索引，加速时间范围查询
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工人信息表';

-- ==================== 商家表 ====================
-- 存储商家的基本信息、联系信息和业务类型
CREATE TABLE merchants (
    merchant_id INT PRIMARY KEY AUTO_INCREMENT,  -- 商家ID，自增主键
    phone VARCHAR(20) NOT NULL COMMENT '联系电话',
    business_name VARCHAR(100) NOT NULL COMMENT '商家名称',
    contact_name VARCHAR(50) NOT NULL COMMENT '联系人姓名',
    business_type VARCHAR(50) NOT NULL COMMENT '商家类型',
    location_lat DECIMAL(10, 8) NOT NULL COMMENT '纬度',
    location_lng DECIMAL(11, 8) NOT NULL COMMENT '经度',
    address VARCHAR(200) NOT NULL COMMENT '详细地址',
    description TEXT COMMENT '商家描述',
    rating DECIMAL(3, 2) DEFAULT 0.0 COMMENT '评分',
    total_posts INT DEFAULT 0 COMMENT '总发布岗位数',
    status TINYINT DEFAULT 1 COMMENT '状态：1正常，0禁用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    -- 索引
    INDEX idx_phone (phone),  -- 联系电话索引，加速查询
    INDEX idx_business_type (business_type),  -- 商家类型索引，加速分类查询
    INDEX idx_rating (rating),  -- 评分索引，加速排序
    INDEX idx_status (status),  -- 状态索引，加速状态筛选
    INDEX idx_location (location_lat, location_lng),  -- 位置索引，加速地理查询
    FULLTEXT idx_description (description)  -- 全文索引，加速描述搜索
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商家信息表';

-- ==================== 岗位表 ====================
-- 存储岗位的详细信息，包括描述、要求、薪资、时间等
CREATE TABLE jobs (
    job_id INT PRIMARY KEY AUTO_INCREMENT,  -- 岗位ID，自增主键
    merchant_id INT NOT NULL COMMENT '商家ID',
    title VARCHAR(100) NOT NULL COMMENT '岗位标题',
    description TEXT NOT NULL COMMENT '岗位描述',
    job_type VARCHAR(50) NOT NULL COMMENT '工作类型',
    required_skills JSON NOT NULL COMMENT '所需技能列表',
    location_lat DECIMAL(10, 8) NOT NULL COMMENT '纬度',
    location_lng DECIMAL(11, 8) NOT NULL COMMENT '经度',
    address VARCHAR(200) NOT NULL COMMENT '详细地址',
    salary DECIMAL(10, 2) NOT NULL COMMENT '薪资',
    salary_type VARCHAR(20) NOT NULL COMMENT '薪资类型（日结/小时结/周结）',
    start_time DATETIME NOT NULL COMMENT '开始时间',
    end_time DATETIME NOT NULL COMMENT '结束时间',
    required_count INT NOT NULL COMMENT '需要人数',
    current_count INT DEFAULT 0 COMMENT '已招人数',
    status TINYINT DEFAULT 1 COMMENT '状态：1招聘中，2已结束，3已取消',
    views_count INT DEFAULT 0 COMMENT '浏览次数',
    apply_count INT DEFAULT 0 COMMENT '申请次数',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    -- 外键关联
    FOREIGN KEY (merchant_id) REFERENCES merchants(merchant_id) ON DELETE CASCADE,  -- 商家删除时级联删除岗位
    
    -- 索引
    INDEX idx_merchant (merchant_id),  -- 商家ID索引，加速查询
    INDEX idx_status (status),  -- 状态索引，加速状态筛选
    INDEX idx_start_time (start_time),  -- 开始时间索引，加速时间范围查询
    INDEX idx_location (location_lat, location_lng),  -- 位置索引，加速地理查询
    INDEX idx_salary (salary),  -- 薪资索引，加速排序
    FULLTEXT idx_title_desc (title, description),  -- 全文索引，加速标题和描述搜索
    
    -- 约束
    CONSTRAINT chk_job_time CHECK (end_time > start_time)  -- 确保结束时间晚于开始时间
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='岗位信息表';

-- ==================== 交互记录表 ====================
-- 记录工人与岗位之间的交互行为，如浏览、申请、匹配、完成和评分
CREATE TABLE interactions (
    interaction_id INT PRIMARY KEY AUTO_INCREMENT,  -- 交互ID，自增主键
    worker_id INT NOT NULL COMMENT '工人ID',
    job_id INT NOT NULL COMMENT '岗位ID',
    interaction_type ENUM('view', 'apply', 'match', 'complete', 'rating') NOT NULL COMMENT '交互类型',
    interaction_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '交互时间',
    rating TINYINT COMMENT '评分（1-5）',
    comment TEXT COMMENT '评价内容',
    
    -- 外键关联
    FOREIGN KEY (worker_id) REFERENCES workers(worker_id) ON DELETE CASCADE,  -- 工人删除时级联删除交互记录
    FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE,  -- 岗位删除时级联删除交互记录
    
    -- 索引
    INDEX idx_worker (worker_id),  -- 工人ID索引，加速查询
    INDEX idx_job (job_id),  -- 岗位ID索引，加速查询
    INDEX idx_type (interaction_type),  -- 交互类型索引，加速筛选
    INDEX idx_time (interaction_time),  -- 交互时间索引，加速时间范围查询
    
    -- 约束
    CONSTRAINT chk_rating CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5))  -- 确保评分在1-5之间
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户交互记录表';

-- ==================== 申请记录表 ====================
-- 记录工人的岗位申请信息，包括申请状态、处理时间和评价
CREATE TABLE applications (
    application_id INT PRIMARY KEY AUTO_INCREMENT,  -- 申请ID，自增主键
    worker_id INT NOT NULL COMMENT '工人ID',
    job_id INT NOT NULL COMMENT '岗位ID',
    status ENUM('pending', 'accepted', 'rejected', 'completed') DEFAULT 'pending' COMMENT '申请状态',
    apply_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '申请时间',
    accept_time TIMESTAMP NULL COMMENT '接受时间',
    complete_time TIMESTAMP NULL COMMENT '完成时间',
    worker_rating TINYINT COMMENT '工人给商家的评分',
    merchant_rating TINYINT COMMENT '商家给工人的评分',
    worker_comment TEXT COMMENT '工人评价',
    merchant_comment TEXT COMMENT '商家评价',
    
    -- 外键关联
    FOREIGN KEY (worker_id) REFERENCES workers(worker_id) ON DELETE CASCADE,  -- 工人删除时级联删除申请记录
    FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE,  -- 岗位删除时级联删除申请记录
    
    -- 索引
    INDEX idx_worker (worker_id),  -- 工人ID索引，加速查询
    INDEX idx_job (job_id),  -- 岗位ID索引，加速查询
    INDEX idx_status (status),  -- 状态索引，加速筛选
    INDEX idx_apply_time (apply_time),  -- 申请时间索引，加速时间范围查询
    UNIQUE KEY uk_worker_job (worker_id, job_id),  -- 确保每个工人对每个岗位只能申请一次
    
    -- 约束
    CONSTRAINT chk_worker_rating CHECK (worker_rating IS NULL OR (worker_rating >= 1 AND worker_rating <= 5)),  -- 确保工人评分在1-5之间
    CONSTRAINT chk_merchant_rating CHECK (merchant_rating IS NULL OR (merchant_rating >= 1 AND merchant_rating <= 5))  -- 确保商家评分在1-5之间
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='岗位申请记录表';

-- ==================== 创建视图 ====================

-- 活跃岗位视图
-- 提供当前正在招聘且未结束的岗位信息，包含商家信息
CREATE VIEW active_jobs AS
SELECT j.*, m.business_name, m.business_type, m.rating as merchant_rating
FROM jobs j
JOIN merchants m ON j.merchant_id = m.merchant_id
WHERE j.status = 1 
  AND j.current_count < j.required_count
  AND j.end_time > NOW();

-- 工人统计视图
-- 提供工人的统计信息，包括交互次数、完成的工作数量和平均偏好薪资
CREATE VIEW worker_stats AS
SELECT 
    w.worker_id,
    w.name,
    w.rating,
    w.total_orders,
    COUNT(DISTINCT i.job_id) as total_interactions,  -- 总交互次数
    COUNT(DISTINCT CASE WHEN i.interaction_type = 'complete' THEN i.job_id END) as completed_jobs,  -- 完成的工作数量
    AVG(j.salary) as avg_preferred_salary  -- 平均偏好薪资
FROM workers w
LEFT JOIN interactions i ON w.worker_id = i.worker_id
LEFT JOIN jobs j ON i.job_id = j.job_id
GROUP BY w.worker_id;

-- ==================== 创建存储过程 ====================

-- 更新岗位状态的存储过程
-- 自动更新岗位状态和相关申请状态
DELIMITER //
CREATE PROCEDURE update_job_status()
BEGIN
    -- 结束招聘的岗位：已过期或已招满
    UPDATE jobs 
    SET status = 2 
    WHERE status = 1 AND (end_time < NOW() OR current_count >= required_count);
    
    -- 更新申请状态：已接受但岗位已结束的申请
    UPDATE applications a
    JOIN jobs j ON a.job_id = j.job_id
    SET a.status = 'completed'
    WHERE a.status = 'accepted' AND j.end_time < NOW();
END//
DELIMITER ;

-- ==================== 创建事件调度器 ====================

-- 每小时更新岗位状态
-- 定期执行存储过程，确保岗位状态及时更新
CREATE EVENT IF NOT EXISTS hourly_job_status_update
ON SCHEDULE EVERY 1 HOUR  -- 每小时执行一次
DO
CALL update_job_status();

-- ==================== 显示完成信息 ====================
SELECT '数据库结构创建成功！' as 'Message';
SELECT '表清单：' as 'Tables';
SHOW TABLES;