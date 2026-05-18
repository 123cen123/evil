-- 用户钱包汇总表
CREATE TABLE IF NOT EXISTS `user_wallet` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_type` ENUM('merchant', 'worker') NOT NULL COMMENT '用户类型（merchant=商家，worker=零工）',
  `user_id` INT NOT NULL COMMENT '用户ID（商家ID或零工ID）',
  `balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '账户余额',
  `total_income` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '总收入',
  `total_withdraw` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '总提现',
  `frozen` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '冻结金额',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_wallet_user` (`user_type`, `user_id`) COMMENT '用户类型和用户ID的唯一索引'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户钱包汇总';

-- 钱包流水表
CREATE TABLE IF NOT EXISTS `wallet_transaction` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_type` ENUM('merchant', 'worker') NOT NULL COMMENT '用户类型（merchant=商家，worker=零工）',
  `user_id` INT NOT NULL COMMENT '用户ID（商家ID或零工ID）',
  `tx_type` VARCHAR(32) NOT NULL COMMENT '交易类型（recharge=充值，withdraw=提现，income=收入，expense=支出）',
  `amount` DECIMAL(12,2) NOT NULL COMMENT '交易金额',
  `balance_after` DECIMAL(12,2) NOT NULL COMMENT '交易后余额',
  `remark` VARCHAR(255) NULL COMMENT '备注',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '交易时间',
  PRIMARY KEY (`id`),
  KEY `idx_wallet_tx` (`user_type`, `user_id`, `created_at`) COMMENT '用户类型、用户ID和交易时间的索引'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='钱包流水';
