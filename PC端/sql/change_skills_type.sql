-- 修改零工表的 skills 字段类型从 JSON 改为 VARCHAR
ALTER TABLE `gig_worker`
  MODIFY COLUMN `skills` VARCHAR(255) COMMENT '技能特长';

-- 可选：更新现有数据，将 JSON 格式转换为字符串格式
UPDATE `gig_worker`
SET `skills` = REPLACE(REPLACE(REPLACE(`skills`, '[', ''), ']', ''), '"', '')
WHERE `skills` LIKE '[%';
