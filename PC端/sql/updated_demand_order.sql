-- 更新需求订单表结构，使其与代码匹配
ALTER TABLE `demand_order`
  -- 添加 demand_no 字段
  ADD COLUMN `demand_no` VARCHAR(20) NOT NULL COMMENT '订单编号' AFTER `merchant_id`,
  
  -- 修改必需字段为非必需
  MODIFY COLUMN `shop_name` VARCHAR(255) NULL COMMENT '商家名称',
  MODIFY COLUMN `title` VARCHAR(100) NULL COMMENT '岗位标题',
  MODIFY COLUMN `description` TEXT NULL COMMENT '岗位描述',
  MODIFY COLUMN `job_type` VARCHAR(50) NULL COMMENT '工作类型',
  MODIFY COLUMN `required_skills` JSON NULL COMMENT '所需技能列表',
  MODIFY COLUMN `location_lat` DECIMAL(10, 8) NULL COMMENT '纬度',
  MODIFY COLUMN `location_lng` DECIMAL(11, 8) NULL COMMENT '经度',
  MODIFY COLUMN `salary_type` VARCHAR(20) NULL COMMENT '薪资类型（日结/小时结/周结）';

-- 创建 demand_no 索引
CREATE INDEX idx_demand_no ON `demand_order`(`demand_no`);