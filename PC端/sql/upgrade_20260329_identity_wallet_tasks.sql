-- =============================================================================
-- 升级：身份证哈希、钱包表、任务状态、task_type、order_accept 唯一键
-- 按顺序执行；若某列已存在会报错，跳过对应语句即可。建议先备份。
-- =============================================================================

-- ---- identity_verification ----
-- 删除明文身份证号唯一索引（索引名以你库中为准，可能是 uk_id_card）
-- ALTER TABLE identity_verification DROP INDEX uk_id_card;

-- 旧版明文列改为可空，便于新逻辑只写 hash
ALTER TABLE identity_verification MODIFY COLUMN id_card_number VARCHAR(18) NULL COMMENT 'deprecated';

ALTER TABLE identity_verification
  ADD COLUMN id_card_tail CHAR(4) NULL COMMENT '身份证后4位（仅展示）' AFTER real_name;

ALTER TABLE identity_verification
  ADD COLUMN id_card_salt VARCHAR(64) NOT NULL DEFAULT '' COMMENT '盐值(hex)' AFTER id_card_tail;

ALTER TABLE identity_verification
  ADD COLUMN id_card_enc VARCHAR(64) NULL COMMENT 'SHA256(salt+证件号) hex；NULL 表示未迁移旧数据' AFTER id_card_salt;

ALTER TABLE identity_verification
  ADD COLUMN id_card_dup_key VARCHAR(64) NULL COMMENT 'SHA256(全局pepper+证件号) 用于判重' AFTER id_card_enc;

-- MySQL 8 迁移旧明文（可选）：
-- UPDATE identity_verification SET id_card_salt = LOWER(TO_HEX(RANDOM_BYTES(16))) WHERE id_card_enc = '' AND id_card_number IS NOT NULL;
-- UPDATE identity_verification SET id_card_tail = RIGHT(REPLACE(TRIM(UPPER(id_card_number)),' ',''), 4),
--   id_card_enc = LOWER(SHA2(CONCAT(id_card_salt, REPLACE(TRIM(UPPER(id_card_number)),' ','')), 256))
--   WHERE id_card_number IS NOT NULL AND id_card_number != '' AND id_card_enc = '';

-- 新库不再保留明文列时执行（仅在对上面 UPDATE 后执行）：
-- ALTER TABLE identity_verification DROP COLUMN id_card_number;

-- 判重依赖 id_card_dup_key（见 settlement_table / 后端 PEPPER），勿对 id_card_enc 做唯一约束

-- ---- demand_order.task_type ----
ALTER TABLE demand_order
  ADD COLUMN task_type ENUM('simple', 'audit') NOT NULL DEFAULT 'audit'
    COMMENT 'simple=上工直接服务中; audit=上工/下工需商家审' AFTER salary_type;

-- ---- applications ----
ALTER TABLE applications
  MODIFY COLUMN status ENUM(
    'pending',
    'signed_up',
    'pending_start',
    'accepted',
    'pending_complete',
    'completed',
    'rejected',
    'cancelled'
  ) NOT NULL DEFAULT 'signed_up';

ALTER TABLE applications
  ADD COLUMN start_request_time TIMESTAMP NULL COMMENT '申请上工时间' AFTER accept_time;

ALTER TABLE applications
  ADD COLUMN complete_photo_url VARCHAR(500) NULL COMMENT '下工凭证照片' AFTER complete_time;

-- 可选：旧 pending 视作已报名待上工
-- UPDATE applications SET status = 'signed_up' WHERE status = 'pending';

-- ---- order_accept 唯一约束（若已有重复数据需先清理） ----
-- ALTER TABLE order_accept ADD UNIQUE KEY uk_demand_worker (demand_id, worker_id);

-- ---- 钱包 ----
CREATE TABLE IF NOT EXISTS user_wallet (
  id INT NOT NULL AUTO_INCREMENT,
  user_type ENUM('merchant', 'worker') NOT NULL,
  user_id INT NOT NULL,
  balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_income DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_withdraw DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  frozen DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_wallet_user (user_type, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户钱包汇总';

CREATE TABLE IF NOT EXISTS wallet_transaction (
  id INT NOT NULL AUTO_INCREMENT,
  user_type ENUM('merchant', 'worker') NOT NULL,
  user_id INT NOT NULL,
  tx_type VARCHAR(32) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  balance_after DECIMAL(12,2) NOT NULL,
  remark VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_wallet_tx (user_type, user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='钱包流水';
