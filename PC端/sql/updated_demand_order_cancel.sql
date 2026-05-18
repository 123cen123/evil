-- 需求单取消能力：记录取消原因与取消时间（配合 demand_order.status=3 已取消）
ALTER TABLE `demand_order`
  ADD COLUMN `cancel_reason` TEXT NULL COMMENT '取消原因' AFTER `status`,
  ADD COLUMN `cancel_time` TIMESTAMP NULL COMMENT '取消时间' AFTER `cancel_reason`;

CREATE INDEX idx_cancel_time ON `demand_order`(`cancel_time`);

