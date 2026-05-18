# 找活么平台后端服务

## 功能概述

找活么平台后端服务，为零工人员和商家提供完整的招聘服务支持。

### 核心功能模块

- **用户管理**：零工和商家的注册、登录、信息管理
- **任务管理**：需求单发布、接单、上工、下工全流程
- **报名审批**：零工报名、商家审批、上工申请、下工申请
- **实名认证**：身份证上传、营业执照上传、管理员审核
- **钱包系统**：余额管理、充值提现、钱包密码、交易流水
- **结算系统**：商家结算、薪资发放
- **数据报表**：订单报表、结算报表、订单明细
- **数据大屏**：实时统计、地区分布、时间趋势
- **管理员后台**：管理员登录、认证审核

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | 18+ | 运行环境 |
| Express | 5.x | Web框架 |
| MySQL | 8.0+ | 数据库 |
| mysql2 | 3.x | MySQL驱动 |
| Multer | 2.x | 文件上传 |
| CORS | 2.x | 跨域支持 |

## 目录结构

```text
hou/
├── app.js                    # 主入口，定义所有API接口
├── package.json              # 项目依赖
├── package-lock.json         # 依赖锁定
├── .env                      # 环境配置（需自行创建）
├── config/
│   └── db.js                 # 数据库连接池配置
├── databases/                # 数据模型层
│   ├── user_merchant.js      # 商家数据模型
│   ├── user_gig_worker.js    # 零工数据模型
│   ├── demand_order.js       # 需求订单模型
│   ├── order_accept.js       # 接单记录模型
│   ├── applications.js       # 申请记录模型（报名/审批/互评）
│   ├── interactions.js       # 用户交互记录模型
│   ├── identity_verification.js # 实名认证模型
│   ├── wallet.js             # 钱包模型
│   └── settlement.js         # 结算记录模型
├── utils/                    # 工具函数
│   └── passwordUtils.js      # 密码加密工具（加盐哈希）
└── uploads/                  # 上传文件目录（运行时自动创建）
    ├── avatars/              # 用户头像
    └── identity/             # 实名认证图片
安装与启动
1. 安装依赖
bash
npm install
2. 配置数据库
在项目根目录下创建 .env 文件：

env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DATABASE=user_management
3. 初始化数据库
执行项目根目录下的SQL脚本创建表结构：

bash
mysql -u root -p < settlement_table.sql
mysql -u root -p < updated_tables.sql
mysql -u root -p < upgrade_20260329_identity_wallet_tasks.sql
mysql -u root -p < wallet_password_table.sql
4. 创建上传目录
bash
mkdir -p uploads/avatars uploads/identity
5. 启动服务
bash
# 开发模式
node app.js

# 或使用 nodemon 热重载
npm install -g nodemon
nodemon app.js
服务默认运行在 http://localhost:3000

API接口文档
基础响应格式
所有接口统一返回 JSON 格式：

json
{
  "success": true,
  "data": {},
  "message": "提示信息"
}
一、用户管理
1.1 商家注册
POST /api/merchant/register

请求体：

json
{
  "phone": "13800138000",
  "password": "123456",
  "name": "某某餐厅",
  "address": "深圳市南山区xxx",
  "contact": "张三",
  "business_type": "餐饮",
  "location_lat": 22.5431,
  "location_lng": 114.0579
}
响应：

json
{
  "success": true,
  "data": {
    "merchant_id": 1,
    "phone": "13800138000",
    "name": "某某餐厅"
  },
  "message": "注册成功"
}
1.2 商家登录
POST /api/merchant/login

请求体：

json
{
  "phone": "13800138000",
  "password": "123456"
}
响应：

json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "某某餐厅",
    "phone": "13800138000",
    "status": 1,
    "rating": 4.5
  }
}
1.3 零工注册
POST /api/worker/register

请求体：

json
{
  "phone": "13900139000",
  "password": "123456",
  "name": "李四",
  "gender": "male",
  "age": 25,
  "skills": "搬运,配送",
  "location_lat": 22.5431,
  "location_lng": 114.0579,
  "address": "深圳市南山区xxx"
}
1.4 零工登录
POST /api/worker/login

请求体：

json
{
  "phone": "13900139000",
  "password": "123456"
}
1.5 获取商家列表
GET /api/merchant/list

1.6 获取零工列表
GET /api/worker/list

1.7 修改商家信息
PUT /api/merchant/:id

1.8 修改零工信息
PUT /api/worker/:id

1.9 删除商家
DELETE /api/merchant/:id

1.10 删除零工
DELETE /api/worker/:id

1.11 修改密码
PUT /api/worker/change-password/:workerId

PUT /api/merchant/change-password/:merchantId

请求体：

json
{
  "oldPassword": "123456",
  "newPassword": "654321"
}
1.12 修改手机号
PUT /api/worker/change-phone/:workerId

PUT /api/merchant/change-phone/:merchantId

请求体：

json
{
  "oldPhone": "13900139000",
  "newPhone": "13800138000"
}
1.13 头像上传
POST /api/worker/avatar/:workerId

POST /api/merchant/avatar/:merchantId

请求：multipart/form-data，字段名 avatar

二、任务管理
2.1 发布需求单
POST /api/demand/create

请求体：

json
{
  "merchant_id": 1,
  "title": "招聘服务员",
  "description": "负责点餐、送餐",
  "job_type": "兼职",
  "work_time": "2024-01-15 09:00-18:00",
  "location": "深圳市南山区",
  "hourly_wage": 25,
  "required_workers": 3,
  "required_skills": ["服务意识", "沟通能力"],
  "task_type": "audit"
}
2.2 获取需求单列表
GET /api/demand/list

查询参数：

参数	说明
worker_id	零工ID（返回是否已报名）
merchant_id	商家ID
region	区域筛选
time_filter	时间筛选（今天/明天/本周）
salary_min	最低时薪
salary_max	最高时薪
2.3 获取需求单详情
GET /api/demand/:id

2.4 更新需求单
PUT /api/demand/:id

2.5 删除需求单
DELETE /api/demand/:id

2.6 取消任务
POST /api/demand/:id/cancel

请求体：

json
{
  "merchant_id": 1,
  "reason": "用人计划调整"
}
三、接单管理
3.1 零工接单
POST /api/order/accept

请求体：

json
{
  "demand_id": 1,
  "worker_id": 1
}
3.2 上工
POST /api/order/start-work

请求体：

json
{
  "demand_id": 1,
  "worker_id": 1,
  "start_work_time": "2024-01-15 09:00:00"
}
3.3 下工
POST /api/order/end-work

请求体：

json
{
  "demand_id": 1,
  "worker_id": 1,
  "end_work_time": "2024-01-15 18:00:00"
}
3.4 获取零工任务列表
GET /api/worker/:worker_id/tasks

查询参数：status - pending/working/completed/cancelled/all

3.5 获取商家任务列表
GET /api/merchant/:merchant_id/tasks

查询参数：status - not_started/in_progress/completed/cancelled/all

四、报名审批系统
4.1 零工报名
POST /api/applications/apply

请求体：

json
{
  "worker_id": 1,
  "job_id": 1
}
4.2 取消报名
POST /api/applications/:id/cancel-signup

请求体：

json
{
  "worker_id": 1
}
4.3 申请上工
POST /api/applications/:id/request-start

请求体：

json
{
  "worker_id": 1
}
4.4 商家通过上工
POST /api/applications/:id/approve

4.5 商家驳回上工
POST /api/applications/:id/reject

4.6 申请下工
POST /api/applications/:id/complete

请求体：

json
{
  "worker_id": 1,
  "photo_url": "http://xxx.com/photo.jpg"
}
4.7 商家确认下工
POST /api/applications/:id/approve-complete

4.8 商家驳回下工
POST /api/applications/:id/reject-complete

4.9 互评
POST /api/applications/:id/rate

请求体：

json
{
  "rater_type": "worker",
  "rating": 5,
  "comment": "工作认真负责"
}
4.10 获取商家报名列表
GET /api/merchant/:merchant_id/applications

查询参数：

参数	说明
group	pending_service/in_service/done/cancelled/all
job_id	筛选指定任务
task_type	simple/audit
4.11 获取零工报名列表
GET /api/worker/:worker_id/applications

五、实名认证
5.1 查询认证状态
GET /api/identity/status

查询参数：user_type（merchant/worker），user_id

5.2 提交认证
POST /api/identity/submit

请求体（零工）：

json
{
  "user_type": "worker",
  "user_id": 1,
  "real_name": "李四",
  "id_card_number": "440301199001011234",
  "id_card_front": "http://xxx.com/front.jpg",
  "id_card_back": "http://xxx.com/back.jpg"
}
请求体（商家）：

json
{
  "user_type": "merchant",
  "user_id": 1,
  "real_name": "张三",
  "business_license": "http://xxx.com/license.jpg",
  "merchant_name": "某某餐厅",
  "contact_phone": "13800138000",
  "address": "深圳市南山区xxx"
}
5.3 上传认证图片
POST /api/identity/upload

请求：multipart/form-data，字段名 file

六、钱包系统
6.1 设置钱包密码
POST /api/wallet/password/set

请求体：

json
{
  "user_type": "worker",
  "user_id": 1,
  "password": "123456"
}
6.2 验证钱包密码
POST /api/wallet/password/verify

请求体：

json
{
  "user_type": "worker",
  "user_id": 1,
  "password": "123456"
}
6.3 检查密码状态
GET /api/wallet/password/status?user_type=worker&user_id=1

6.4 获取钱包余额
GET /api/wallet/summary?user_type=worker&user_id=1

响应：

json
{
  "success": true,
  "data": {
    "balance": 500.00,
    "total_income": 1200.00,
    "total_withdraw": 700.00,
    "frozen": 0.00
  }
}
6.5 获取交易流水
GET /api/wallet/transactions?user_type=worker&user_id=1&limit=20

6.6 充值
POST /api/wallet/recharge

请求体：

json
{
  "user_type": "worker",
  "user_id": 1,
  "amount": 100
}
6.7 提现
POST /api/wallet/withdraw

请求体：

json
{
  "user_type": "worker",
  "user_id": 1,
  "amount": 50
}
6.8 商家结算
POST /api/settlement/pay

请求体：

json
{
  "demand_id": 1,
  "merchant_id": 1,
  "payment_method": "微信",
  "wallet_password": "123456",
  "order_ids": [1, 2, 3]
}
七、数据报表
7.1 订单报表
GET /api/order/report

7.2 订单明细
GET /api/order/detail

7.3 结算报表
GET /api/settlement/report

查询参数：demand_id， merchant_id

7.4 更新结算状态
PUT /api/settlement/:orderid

八、数据大屏
8.1 实时统计
GET /api/dashboard/stats

响应：

json
{
  "success": true,
  "data": {
    "totalMerchants": 50,
    "totalWorkers": 200,
    "totalOrders": 500,
    "completedOrders": 350,
    "completionRate": 70.00,
    "totalHours": 1250.5,
    "totalAmount": 31250.00
  }
}
8.2 地区分布
GET /api/dashboard/location-distribution

8.3 时间趋势
GET /api/dashboard/time-trend?days=7

8.4 热门任务类型
GET /api/dashboard/popular-tasks

九、数据挖掘
9.1 批量获取用户数据
GET /api/data-mining/users?start_date=2024-01-01&end_date=2024-01-31

9.2 批量获取订单数据
GET /api/data-mining/orders

9.3 批量获取接单记录
GET /api/data-mining/accepts

十、管理员
10.1 管理员登录
POST /api/admin/login

请求体：

json
{
  "username": "admin",
  "password": "admin123"
}
10.2 获取认证列表
GET /api/admin/identity/list

10.3 审核认证
POST /api/admin/identity/review

请求体：

json
{
  "id": 1,
  "status": "approved",
  "review_comment": "审核通过"
}
错误码说明
HTTP状态码	说明
200	成功
400	请求参数错误
401	未授权/密码错误
403	权限不足
404	资源不存在
500	服务器内部错误
业务错误码（在响应体中返回）：

code	说明
WORKER_HAS_ACTIVE_APPLICATION	零工有进行中的任务
IDENTITY_NOT_APPROVED	未通过实名认证
WORKER_HAS_ACTIVE_ORDER	零工有未下工的任务
DEMAND_CANCELLED	任务已取消
数据库表结构
核心表说明：

表名	说明
merchant	商家信息
gig_worker	零工信息
demand_order	需求订单
order_accept	接单记录
applications	申请记录（报名/审批/互评）
interactions	用户交互记录
identity_verification	实名认证
user_wallet	用户钱包
wallet_transaction	钱包流水
wallet_password	钱包密码
settlement	结算记录
platform_admin	平台管理员
注意事项
密码安全：所有密码使用加盐哈希存储，不存储明文

手机号格式：需为中国大陆11位手机号

时区处理：后端已内置时区调整函数 adjustTimezone()

文件上传：支持头像和身份证图片，存储在 uploads/ 目录

跨域配置：已启用 CORS，支持跨域请求

实名认证：商家和零工需通过实名认证才能发布/接单

常见问题
Q: 启动报错 "Cannot find module xxx"
A: 运行 npm install 重新安装依赖

Q: 数据库连接失败
A: 检查 .env 配置是否正确，确认 MySQL 服务已启动

Q: 上传图片失败
A: 确保 uploads/avatars 和 uploads/identity 目录存在且有写入权限

Q: 接口返回 500 错误
A: 查看控制台错误日志，通常为数据库查询或参数解析问题

更新日志
版本	日期	更新内容
v1.0.0	2024-01	基础用户注册登录、任务发布接单
v1.1.0	2024-03	实名认证、钱包系统、结算系统
v1.2.0	2024-05	报名审批流程、互评系统、数据大屏
v1.3.0	2024-06	管理员后台、数据挖掘接口
联系方式
如有问题或建议，请联系开发团队。