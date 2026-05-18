CREATE TABLE IF NOT EXISTS `wallet_password` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `merchant_id` INT NULL DEFAULT NULL COMMENT '商家ID（与worker_id二选一）',
  `worker_id` INT NULL DEFAULT NULL COMMENT '零工ID（与merchant_id二选一）',
  `password` VARCHAR(255) NOT NULL COMMENT '加密后的密码',
  `salt` VARCHAR(100) NOT NULL COMMENT '盐值',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_merchant` (`merchant_id`),
  UNIQUE KEY `uk_worker` (`worker_id`),
  CONSTRAINT `fk_wallet_password_merchant` FOREIGN KEY (`merchant_id`) 
    REFERENCES `merchant` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_wallet_password_worker` FOREIGN KEY (`worker_id`) 
    REFERENCES `gig_worker` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='充值提现密码表';