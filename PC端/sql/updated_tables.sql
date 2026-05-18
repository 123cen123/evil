-- 更新表结构，支持密码加盐加密和性别枚举类型

-- 更新商家表
ALTER TABLE `merchant` 
MODIFY COLUMN `password` VARCHAR(255) NOT NULL COMMENT '加盐加密后的密码',
MODIFY COLUMN `status` TINYINT DEFAULT 1 COMMENT '状态：1正常，0禁用',
ADD COLUMN `salt` VARCHAR(64) NOT NULL COMMENT '密码盐值',
ADD COLUMN `business_type` VARCHAR(50) NOT NULL COMMENT '商家类型',
ADD COLUMN `location_lat` DECIMAL(10, 8) NOT NULL COMMENT '纬度',
ADD COLUMN `location_lng` DECIMAL(11, 8) NOT NULL COMMENT '经度',
ADD COLUMN `description` TEXT COMMENT '商家描述',
ADD COLUMN `rating` DECIMAL(3, 2) DEFAULT 0.0 COMMENT '评分',
ADD COLUMN `total_posts` INT DEFAULT 0 COMMENT '总发布岗位数',
ADD COLUMN `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
ADD INDEX idx_phone (phone),
ADD INDEX idx_business_type (business_type),
ADD INDEX idx_rating (rating),
ADD INDEX idx_status (status),
ADD INDEX idx_location (location_lat, location_lng),
ADD FULLTEXT idx_description (description);

-- 更新零工表
ALTER TABLE `gig_worker` 
MODIFY COLUMN `password` VARCHAR(255) NOT NULL COMMENT '加盐加密后的密码',
MODIFY COLUMN `gender` TINYINT DEFAULT 0 COMMENT '性别：0-未知，1-男，2-女',
MODIFY COLUMN `skills` JSON COMMENT '技能列表，JSON格式',
ADD COLUMN `salt` VARCHAR(64) NOT NULL COMMENT '密码盐值',
ADD COLUMN `location_lat` DECIMAL(10, 8) NOT NULL COMMENT '纬度',
ADD COLUMN `location_lng` DECIMAL(11, 8) NOT NULL COMMENT '经度',
ADD COLUMN `address` VARCHAR(200) NOT NULL COMMENT '详细地址',
ADD COLUMN `work_history` JSON COMMENT '工作历史，JSON格式',
ADD COLUMN `rating` DECIMAL(3, 2) DEFAULT 0.0 COMMENT '评分',
ADD COLUMN `total_orders` INT DEFAULT 0 COMMENT '总订单数',
ADD COLUMN `available_time` JSON COMMENT '可用时间段，JSON格式',
ADD COLUMN `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
ADD INDEX idx_phone (phone),
ADD INDEX idx_rating (rating),
ADD INDEX idx_location (location_lat, location_lng),
ADD INDEX idx_created (created_at);

-- 更新平台管理员表
ALTER TABLE `platform_admin` 
MODIFY COLUMN `password` VARCHAR(255) NOT NULL COMMENT '加盐加密后的密码',
ADD COLUMN `salt` VARCHAR(64) NOT NULL COMMENT '密码盐值';



-- 创建商家表（更新版）
CREATE TABLE IF NOT EXISTS `merchant` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL COMMENT '商家名称',
  `address` VARCHAR(255) NOT NULL COMMENT '商家地址',
  `contact` VARCHAR(100) NOT NULL COMMENT '联系人',
  `phone` VARCHAR(20) NOT NULL COMMENT '手机号',
  `password` VARCHAR(255) NOT NULL COMMENT '加盐加密后的密码',
  `salt` VARCHAR(64) NOT NULL COMMENT '密码盐值',
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

-- 创建零工表（更新版）
CREATE TABLE IF NOT EXISTS `gig_worker` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL COMMENT '姓名',
  `phone` VARCHAR(20) NOT NULL COMMENT '手机号',
  `gender` TINYINT DEFAULT 0 COMMENT '性别：0-未知，1-男，2-女',
  `age` INT DEFAULT NULL COMMENT '年龄',
  `skills` JSON COMMENT '技能列表，JSON格式',
  `password` VARCHAR(255) NOT NULL COMMENT '加盐加密后的密码',
  `salt` VARCHAR(64) NOT NULL COMMENT '密码盐值',
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

-- 创建平台管理员表（更新版）
CREATE TABLE IF NOT EXISTS `platform_admin` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `adminId` VARCHAR(100) NOT NULL COMMENT '管理员ID',
  `username` VARCHAR(100) NOT NULL COMMENT '账号',
  `password` VARCHAR(255) NOT NULL COMMENT '加盐加密后的密码',
  `salt` VARCHAR(64) NOT NULL COMMENT '密码盐值',
  `email` VARCHAR(255) DEFAULT NULL COMMENT '邮箱',
  `status` VARCHAR(20) DEFAULT '已启用' COMMENT '账号状态',
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='平台管理员表';