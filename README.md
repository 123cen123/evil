# 零工用工平台（Ling）— 项目说明文档

本项目是一个完整的零工用工平台，包含前端小程序（uni-app）、后端 Node.js/Express 服务。主要功能包括：商家发布用工需求、零工报名接单、上工/下工记录、任务结算、身份验证、钱包管理等核心流程。

***

## 1. 技术栈与目录结构

- 前端小程序：uni-app（Vue2），目录 `Applet/`
- 后端服务：Node.js + Express + MySQL2（Promise），目录 `Rearend/`
- PC 端静态演示：纯 HTML/CSS/JS，目录 `PC端/`

项目根目录结构（节选）：

```
Ling/
  Applet/                 # 前端小程序（uni-app）
  Rearend/                # Node/Express 后端
  PC端/                   # PC 端静态页面（演示）
  project.config.json     # 微信小程序/uni 项目配置（根级）
```

***

## 2. 环境要求

- Node.js ≥ 18.x（建议 18 LTS）
- npm ≥ 9.x 或 pnpm ≥ 8.x
- MySQL ≥ 8.0（或 5.7，需自行验证）
- 微信开发者工具（用于运行 mp-weixin 端）或 HBuilderX（uni-app IDE，可真机/多端调试）

可选：

- Git（版本管理）

***

## 3. 数据库配置与表结构

后端默认从环境变量读取数据库连接，未设置时使用以下默认值（见 `Rearend/config/db.js`）：

```
DB_HOST=localhost
DB_PORT=3307
DB_USER=root
DB_PASSWORD=root
DATABASE=user_management
```

建议在 `Rearend/` 目录创建 `.env` 文件：

```
DB_HOST=localhost
DB_PORT=3307
DB_USER=root
DB_PASSWORD=root
DATABASE=user_management
```

### 3.1 建库

```sql
CREATE DATABASE IF NOT EXISTS `user_management` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `user_management`;
```

### 3.2 建表

完整的数据库表结构如下（包含所有必要的表）：

```sql
-- 商家表
CREATE TABLE IF NOT EXISTS `merchant` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `shop_name` VARCHAR(100) NOT NULL,
  `shop_address` VARCHAR(255) NOT NULL,
  `contact_person` VARCHAR(50) NOT NULL,
  `phone` VARCHAR(20) NOT NULL UNIQUE,
  `password` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `status` VARCHAR(20) DEFAULT '正常',
  `merchant_description` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 零工表
CREATE TABLE IF NOT EXISTS `gig_worker` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL,
  `phone` VARCHAR(20) NOT NULL UNIQUE,
  `gender` INT,
  `age` INT,
  `skills` VARCHAR(255),
  `password` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 需求单表
-- 注意：后端以字符串型订单号作为主键（形如 SDYYYYMMDD####）
CREATE TABLE IF NOT EXISTS `demand_order` (
  `demand_id` VARCHAR(20) PRIMARY KEY,
  `merchant_id` INT NOT NULL,
  `title` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `job_type` VARCHAR(50),
  `work_time` VARCHAR(50) NOT NULL,   -- 如：2025-08-17 09:00-19:00 或 2025-08-17 09:00:00
  `location` VARCHAR(255) NOT NULL,
  `required_workers` INT NOT NULL,
  `hourly_wage` DECIMAL(10,2) NOT NULL,
  `required_skills` VARCHAR(255),
  `salary_type` VARCHAR(20) DEFAULT '小时结算',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `application_deadline` DATETIME,
  CONSTRAINT `fk_demand_merchant` FOREIGN KEY (`merchant_id`) REFERENCES `merchant`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 接单记录表
CREATE TABLE IF NOT EXISTS `order_accept` (
  `accept_id` INT PRIMARY KEY AUTO_INCREMENT,
  `demand_id` VARCHAR(20) NOT NULL,
  `worker_id` INT NOT NULL,
  `status` VARCHAR(20) DEFAULT 'pending',
  `start_work_time` DATETIME NULL,
  `end_work_time` DATETIME NULL,
  `clock_out_photo` VARCHAR(255),
  `start_request_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `settlement_status` VARCHAR(20) DEFAULT '未结算',
  CONSTRAINT `fk_accept_demand` FOREIGN KEY (`demand_id`) REFERENCES `demand_order`(`demand_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_accept_worker` FOREIGN KEY (`worker_id`) REFERENCES `gig_worker`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uniq_worker_demand` (`demand_id`, `worker_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 身份验证表
CREATE TABLE IF NOT EXISTS `identity_verification` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_type` ENUM('merchant', 'worker') NOT NULL,
  `user_id` INT NOT NULL,
  `real_name` VARCHAR(50),
  `id_card_number` VARCHAR(18),
  `id_card_front` VARCHAR(255),
  `id_card_back` VARCHAR(255),
  `business_license` VARCHAR(255),
  `permit` VARCHAR(255),
  `status` VARCHAR(20) DEFAULT 'pending',
  `review_comment` TEXT,
  `submitted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` TIMESTAMP NULL,
  `id_card_dup_key` VARCHAR(18),
  UNIQUE KEY `uk_user` (`user_type`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 用户钱包表
CREATE TABLE IF NOT EXISTS `user_wallet` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_type` ENUM('merchant', 'worker') NOT NULL,
  `user_id` INT NOT NULL,
  `balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_income` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_withdraw` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `frozen` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_wallet_user` (`user_type`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户钱包汇总';

-- 钱包流水表
CREATE TABLE IF NOT EXISTS `wallet_transaction` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_type` ENUM('merchant', 'worker') NOT NULL,
  `user_id` INT NOT NULL,
  `tx_type` VARCHAR(32) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `balance_after` DECIMAL(12,2) NOT NULL,
  `remark` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_wallet_tx` (`user_type`, `user_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='钱包流水';

-- 钱包密码表
CREATE TABLE IF NOT EXISTS `wallet_password` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `merchant_id` INT NULL,
  `worker_id` INT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_merchant` (`merchant_id`),
  UNIQUE KEY `uk_worker` (`worker_id`),
  CONSTRAINT `fk_wallet_merchant` FOREIGN KEY (`merchant_id`) REFERENCES `merchant`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wallet_worker` FOREIGN KEY (`worker_id`) REFERENCES `gig_worker`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='钱包密码';

-- 结算表
CREATE TABLE IF NOT EXISTS `settlement` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_id` VARCHAR(20) NOT NULL,
  `merchant_id` INT NOT NULL,
  `total_amount` DECIMAL(12,2) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  KEY `idx_order` (`order_id`),
  KEY `idx_merchant` (`merchant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='结算主表';

-- 结算明细表
CREATE TABLE IF NOT EXISTS `settlement_detail` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `settlement_id` INT NOT NULL,
  `worker_id` INT NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  KEY `idx_settlement` (`settlement_id`),
  KEY `idx_worker` (`worker_id`),
  CONSTRAINT `fk_settlement_detail_settlement` FOREIGN KEY (`settlement_id`) REFERENCES `settlement`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='结算明细';
```

4\. 后端服务

位置：`Rearend/`

### 4.1 安装依赖

```bash
cd Rearend
npm install
```

依赖说明（见 `Rearend/package.json`）：express、mysql2、cors、dotenv。

### 4.2 启动服务

```bash
node app.js
# 启动后默认监听 http://localhost:3000
```

如需改端口，请在 `Rearend/app.js` 修改 `PORT` 常量。

### 4.3 时区说明

- 连接池会在建立连接时执行 `SET time_zone = "+08:00"`。
- 部分接口会对传入时间做 +8 小时调整，避免服务器时区导致的显示偏差。

### 4.4 主要接口（节选）

鉴权流程简化为“明文密码比对”，未引入 Token（生产环境需替换为加密与鉴权）。

- 商家/零工
  - POST `/api/merchant/register` | `/api/worker/register`
  - POST `/api/merchant/login` | `/api/worker/login`
  - PUT `/api/merchant/change-password/:merchantId`
  - PUT `/api/worker/change-password/:workerId`
  - GET `/api/merchant/list` | `/api/worker/list`
  - DELETE `/api/merchant/:id` | `/api/worker/:id`
  - PUT `/api/merchant/:id` | `/api/worker/:id`
- 需求单（商家发布）
  - POST `/api/demand/create`
  - GET `/api/demand/list` 支持筛选：`region`、`time_filter`（今天/明天/本周）、`salary_min`、`salary_max`；可传 `worker_id` 返回是否已报名
  - GET `/api/demand/:id`
  - PUT `/api/demand/:id`
  - DELETE `/api/demand/:id`
- 接单/任务
  - POST `/api/order/accept` 零工报名接单
  - POST `/api/order/start-work` 上工（记录开始时间）
  - POST `/api/order/end-work` 下工（记录结束时间和照片）
  - GET `/api/worker/:worker_id/tasks?status=all|pending|working|completed|cancelled`
  - GET `/api/merchant/:merchant_id/tasks?status=all|not_started|in_progress|completed`
- 身份验证
  - GET `/api/identity/status` 获取验证状态
  - POST `/api/identity/upload` 上传证件照片
  - POST `/api/identity/submit` 提交验证信息
  - GET `/api/admin/identity/list` 管理员获取验证列表
  - POST `/api/admin/identity/review` 管理员审核验证
- 钱包
  - GET `/api/wallet/balance` 获取余额
  - POST `/api/wallet/recharge` 充值
  - POST `/api/wallet/withdraw` 提现
  - GET `/api/wallet/transactions` 获取交易记录
  - POST `/api/wallet/set-password` 设置钱包密码
  - POST `/api/wallet/verify-password` 验证钱包密码
- 结算
  - GET `/api/settlement/report` 获取结算报表
  - POST `/api/settlement/pay` 执行结算
- 管理员
  - POST `/api/admin/login` 管理员登录

***

## 5. 前端小程序（uni-app）

位置：`Applet/`

### 5.1 运行方式（推荐两种）

1. HBuilderX 方式：

- 用 HBuilderX 打开 `Applet/` 目录
- 选择运行到“微信小程序（开发者工具）”或“浏览器”

1. 微信开发者工具方式：

- 在 HBuilderX 编译到 `mp-weixin`
- 使用微信开发者工具打开 `Applet/unpackage/dist/dev/mp-weixin/`

后端接口默认指向 `http://localhost:3000`，请确保后端已启动并允许网络请求。

### 5.2 页面说明

- `pages/login/login.vue`：登录页面（支持零工、商家、管理员登录）
- `pages/index/index.vue`：主页 + “招工市场”卡片列表
- `pages/index/market.vue`：招工市场页面（显示更多任务）
- `pages/index/mine.vue`：个人中心
- `pages/index/profile.vue`：零工个人信息页面
- `pages/index/merchant-profile.vue`：商家个人信息页面
- `pages/index/wallet.vue`：钱包页面（支持充值、提现、密码设置）
- `pages/index/identityVerification.vue`：零工身份验证页面
- `pages/index/merchant-verification.vue`：商家身份验证页面
- `pages/task/publishTask.vue`：商家发布任务页面
- `pages/task/job-detail.vue`：任务详情页面
- `pages/task/task.vue`：任务中心
- `pages/task/taskV2.vue`：任务管理页面（支持审核、上工、下工）
- `pages/task/rate.vue`：互评页面（星级评分）
- `pages/task/settlementDetail.vue`：结算详情页面
- `pages/admin/dashboard.vue`：管理员仪表盘
- `pages/admin/identity-verification.vue`：管理员身份验证审核页面

***

## 6. 核心功能说明

### 6.1 身份验证

- 零工：需要上传身份证正面、反面照片，填写真实姓名和身份证号
- 商家：需要上传营业执照、营业许可证照片，填写商家信息
- 管理员：审核身份验证申请，查看上传的证件照片

### 6.2 任务发布与报名

- 商家：发布任务时需要填写任务标题、描述、工作类型、工作时间、地点、薪资等信息
- 零工：浏览招工市场，报名感兴趣的任务（需要先完成身份验证）

### 6.3 上工与下工

- 零工：在任务详情页面点击“上工”开始工作，点击“下工（拍照）”结束工作并上传工作照片
- 商家：审核零工的上工申请和下工照片

### 6.4 结算

- 商家：在结算详情页面选择已完成工作的零工进行结算
- 零工：收到结算款项到钱包

### 6.5 钱包管理

- 充值：向钱包充值金额
- 提现：从钱包提现金额
- 交易记录：查看钱包的收支记录
- 密码保护：充值和提现需要输入钱包密码

***

## 7. 常用命令汇总

后端：

```bash
cd Rearend
npm install
node app.js
```

前端（HBuilderX）：

```text
使用 HBuilderX 打开 Applet/ ，点击“运行”选择目标平台
```

前端（mp-weixin 路径）：

```text
Applet/unpackage/dist/dev/mp-weixin/
```

数据库（MySQL 客户端示例）：

```bash
mysql -h 127.0.0.1 -P 3307 -u root -proot
SOURCE path/to/schema.sql
```

***

## 8. 端口与跨域

- 后端默认端口：`3000`
- 小程序端请求跨域：已在后端启用 `cors()`，微信小程序需在开发者工具“项目设置”中允许不校验合法域名（开发阶段），或在正式环境配置合法域名白名单。

***

## 9. 注意与约定

- 本项目为课堂/作业性质示例，登录鉴权未启用加密与 Token，请勿直接用于生产。
- 订单号 `demand_id` 为业务自定义字符串（`SDYYYYMMDD####`），请勿用自增整数替代。
- `work_time` 目前作为字符串存储，支持两类格式，前端也做了兼容：
  - `YYYY-MM-DD HH:MM-HH:MM`
  - `YYYY-MM-DD HH:MM:SS`
- 管理员账号：admin，密码：admin123

***

## 10. FAQ（快速排查）

- 小程序请求后端失败？
  - 确认后端已启动在 `http://localhost:3000`
  - 微信开发者工具是否允许不校验合法域名（仅开发期）
  - 控制台查看具体请求 URL 与报错信息
- 时间显示不正确？
  - 后端对时间做了 +8 小时调整，并强制 `SET time_zone = '+08:00'`，请确认系统时区/数据库时区一致
- 已报名仍然显示可报名？
  - 前端调用列表接口时，建议带上 `worker_id` 以返回 `is_applied` 字段
- 商家发布任务失败？
  - 确认商家已完成身份验证
  - 检查任务信息是否填写完整
- 零工报名失败？
  - 确认零工已完成身份验证
  - 检查任务是否已过报名截止时间
- 充值/提现失败？
  - 确认已设置钱包密码
  - 检查输入的密码是否正确
  - 检查余额是否充足（提现时）

***

## 11. 里程碑与拓展建议（可选）

- 替换明文密码为哈希（bcrypt）与 JWT 鉴权
- 将 `work_time` 拆分为日期 + 起止时间，或使用标准 DATETIME 字段
- 接入支付与结算状态表
- 增加操作/访问日志
- 添加消息通知系统
- 优化图片上传功能，支持压缩和预览
- 增加任务评价和信用体系

***

## 12. 项目启动流程

1. 启动 MySQL 数据库服务
2. 创建数据库和表结构（执行上述 SQL 语句）
3. 启动后端服务（`node app.js`）
4. 运行前端小程序（使用 HBuilderX 或微信开发者工具）
5. 注册账号并完成身份验证
6. 开始使用平台功能

***

