-- 创建结算表（简化版，易于运行）
CREATE TABLE IF NOT EXISTS `settlement` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `demand_id` INT NOT NULL COMMENT '需求ID',
  `worker_id` INT NOT NULL COMMENT '零工ID',
  `merchant_id` INT NOT NULL COMMENT '商家ID',
  `working_hour` DECIMAL(10,2) NOT NULL COMMENT '上工时长(小时)',
  `hourly_wage` DECIMAL(10,2) NOT NULL COMMENT '时薪(元)',
  `amount` DECIMAL(10,2) NOT NULL COMMENT '结算金额(元)',
  `start_time` DATETIME NOT NULL COMMENT '上工时间',
  `end_time` DATETIME NOT NULL COMMENT '下工时间',
  `status` VARCHAR(20) DEFAULT 'unpaid' COMMENT '状态',
  `payment_method` VARCHAR(20) DEFAULT '现金' COMMENT '结算方式',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='结算表';

-- 为了方便运行，这里也提供其他相关表的简化版本

-- 创建商家表（简化版）
CREATE TABLE IF NOT EXISTS `merchant` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL COMMENT '商家名称',
  `address` VARCHAR(255) NOT NULL COMMENT '商家地址',
  `contact` VARCHAR(100) NOT NULL COMMENT '联系人',
  `phone` VARCHAR(20) NOT NULL COMMENT '手机号',
  `password` VARCHAR(255) NOT NULL COMMENT '密码',
  `status` TINYINT DEFAULT 1 COMMENT '状态：1正常，0禁用',
  `business_type` VARCHAR(50) NOT NULL COMMENT '商家类型',
  `location_lat` DECIMAL(10, 8) NOT NULL COMMENT '纬度',
  `location_lng` DECIMAL(11, 8) NOT NULL COMMENT '经度',
  `description` TEXT COMMENT '商家描述',
  `rating` DECIMAL(3, 2) DEFAULT 0.0 COMMENT '评分',
  `total_posts` INT DEFAULT 0 COMMENT '总发布岗位数',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  INDEX idx_phone (phone),
  INDEX idx_business_type (business_type),
  INDEX idx_rating (rating),
  INDEX idx_status (status),
  INDEX idx_location (location_lat, location_lng),
  FULLTEXT idx_description (description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商家表';

-- 创建零工表（简化版）
CREATE TABLE IF NOT EXISTS `gig_worker` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL COMMENT '姓名',
  `phone` VARCHAR(20) NOT NULL COMMENT '手机号',
  `gender` VARCHAR(10) DEFAULT 'male' COMMENT '性别',
  `age` INT DEFAULT NULL COMMENT '年龄',
  `skills` JSON COMMENT '技能列表，JSON格式',
  `password` VARCHAR(255) NOT NULL COMMENT '密码',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '状态',
  `location_lat` DECIMAL(10, 8) NOT NULL COMMENT '纬度',
  `location_lng` DECIMAL(11, 8) NOT NULL COMMENT '经度',
  `address` VARCHAR(200) NOT NULL COMMENT '详细地址',
  `work_history` JSON COMMENT '工作历史，JSON格式',
  `rating` DECIMAL(3, 2) DEFAULT 0.0 COMMENT '评分',
  `total_orders` INT DEFAULT 0 COMMENT '总订单数',
  `available_time` JSON COMMENT '可用时间段，JSON格式',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  INDEX idx_phone (phone),
  INDEX idx_rating (rating),
  INDEX idx_location (location_lat, location_lng),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='零工表';

-- 创建需求订单表（简化版）
CREATE TABLE IF NOT EXISTS `demand_order` (
  `demand_id` INT NOT NULL AUTO_INCREMENT,
  `merchant_id` INT NOT NULL COMMENT '商家ID',
  `shop_name` VARCHAR(255) NOT NULL COMMENT '商家名称',
  `work_time` VARCHAR(50) NOT NULL COMMENT '用工时间',
  `location` VARCHAR(255) NOT NULL COMMENT '工作地点',
  `hourly_wage` DECIMAL(10,2) NOT NULL COMMENT '时薪',
  `required_workers` INT NOT NULL COMMENT '需求人数',
  `accepted_count` INT DEFAULT 0 COMMENT '已接单人数',
  `working_count` INT DEFAULT 0 COMMENT '正在工作人数',
  `completed_count` INT DEFAULT 0 COMMENT '已完成人数',
  `status` TINYINT DEFAULT 1 COMMENT '状态：1招聘中，2已结束，3已取消',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '需求发布时间',
  `title` VARCHAR(100) NOT NULL COMMENT '岗位标题',
  `description` TEXT NOT NULL COMMENT '岗位描述',
  `job_type` VARCHAR(50) NOT NULL COMMENT '工作类型',
  `required_skills` JSON NOT NULL COMMENT '所需技能列表',
  `location_lat` DECIMAL(10, 8) NOT NULL COMMENT '纬度',
  `location_lng` DECIMAL(11, 8) NOT NULL COMMENT '经度',
  `salary_type` VARCHAR(20) NOT NULL COMMENT '薪资类型（日结/小时结/周结）',
  `views_count` INT DEFAULT 0 COMMENT '浏览次数',
  `apply_count` INT DEFAULT 0 COMMENT '申请次数',
  PRIMARY KEY (`demand_id`),
  INDEX idx_merchant (merchant_id),
  INDEX idx_status (status),
  INDEX idx_location (location_lat, location_lng),
  FULLTEXT idx_title_desc (title, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='需求订单表';

-- 创建订单接受表（简化版）
CREATE TABLE IF NOT EXISTS `order_accept` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `demand_id` INT NOT NULL COMMENT '需求ID',
  `worker_id` INT NOT NULL COMMENT '零工ID',
  `start_work_time` DATETIME DEFAULT NULL COMMENT '上工时间',
  `end_work_time` DATETIME DEFAULT NULL COMMENT '下工时间',
  `status` VARCHAR(20) DEFAULT '未完成' COMMENT '状态',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单接受表';

-- 创建平台管理员表（简化版）
CREATE TABLE IF NOT EXISTS `platform_admin` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `adminId` VARCHAR(100) NOT NULL COMMENT '管理员ID',
  `username` VARCHAR(100) NOT NULL COMMENT '账号',
  `password` VARCHAR(255) NOT NULL COMMENT '密码',
  `email` VARCHAR(255) DEFAULT NULL COMMENT '邮箱',
  `status` VARCHAR(20) DEFAULT '已启用' COMMENT '账号状态',
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='平台管理员表';



CREATE TABLE IF NOT EXISTS interactions (
    interaction_id INT PRIMARY KEY AUTO_INCREMENT,
    worker_id INT NOT NULL COMMENT '工人ID',
    job_id INT NOT NULL COMMENT '岗位ID',
    interaction_type ENUM('view', 'apply', 'match', 'complete', 'rating') NOT NULL COMMENT '交互类型',
    interaction_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '交互时间',
    rating TINYINT COMMENT '评分（1-5）',
    comment TEXT COMMENT '评价内容',
    
    FOREIGN KEY (worker_id) REFERENCES gig_worker(id) ON DELETE CASCADE,   -- 关联零工表
    FOREIGN KEY (job_id) REFERENCES demand_order(demand_id) ON DELETE CASCADE, -- 关联需求订单表
    INDEX idx_worker (worker_id),
    INDEX idx_job (job_id),
    INDEX idx_type (interaction_type),
    INDEX idx_time (interaction_time),
  
    -- 确保评分在1-5之间
    CONSTRAINT chk_rating CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户交互记录表';



CREATE TABLE IF NOT EXISTS applications (
    application_id INT PRIMARY KEY AUTO_INCREMENT,
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
    
    FOREIGN KEY (worker_id) REFERENCES gig_worker(id) ON DELETE CASCADE,   -- 关联零工表
    FOREIGN KEY (job_id) REFERENCES demand_order(demand_id) ON DELETE CASCADE, -- 关联需求订单表
    INDEX idx_worker (worker_id),
    INDEX idx_job (job_id),
    INDEX idx_status (status),
    INDEX idx_apply_time (apply_time),
    UNIQUE KEY uk_worker_job (worker_id, job_id),   -- 确保同一工人对同一岗位只有一条申请记录
    
    CONSTRAINT chk_worker_rating CHECK (worker_rating IS NULL OR (worker_rating >= 1 AND worker_rating <= 5)),
    CONSTRAINT chk_merchant_rating CHECK (merchant_rating IS NULL OR (merchant_rating >= 1 AND merchant_rating <= 5))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='岗位申请记录表';

-- 实名认证表
CREATE TABLE IF NOT EXISTS `identity_verification` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_type` ENUM('merchant', 'worker', 'admin') NOT NULL COMMENT '用户类型：merchant-商家，worker-零工，admin-管理员',
  `user_id` INT NOT NULL COMMENT '用户ID，对应各用户表的主键',
  `real_name` VARCHAR(100) NOT NULL COMMENT '真实姓名',
  `id_card_number` VARCHAR(18) NOT NULL COMMENT '身份证号码（18位）',
  `id_card_front` VARCHAR(255) COMMENT '身份证正面照片路径/URL',
  `id_card_back` VARCHAR(255) COMMENT '身份证反面照片路径/URL',
  `status` ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' COMMENT '认证状态：pending-待审核，approved-已通过，rejected-已驳回',
  `submitted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '提交认证时间',
  `reviewed_at` TIMESTAMP NULL COMMENT '审核时间',
  `reviewer_id` INT COMMENT '审核人ID（关联platform_admin.id）',
  `review_comment` TEXT COMMENT '审核意见/驳回原因',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '记录更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_type_id` (`user_type`, `user_id`) COMMENT '同一用户只能有一条实名认证记录',
  UNIQUE KEY `uk_id_card` (`id_card_number`) COMMENT '身份证号唯一',
  INDEX `idx_status` (`status`),
  INDEX `idx_submitted_at` (`submitted_at`),
  CONSTRAINT `fk_reviewer_admin` FOREIGN KEY (`reviewer_id`) REFERENCES `platform_admin` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='实名认证表';