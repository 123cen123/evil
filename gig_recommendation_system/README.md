# 打零工平台推荐系统

## 项目概述

这是一个面向社会大众的打零工平台推荐系统，连接普通劳动者（兼职、临时工）和商家（餐饮/零售/物流等）。系统基于地理位置、时效性、技能匹配等因素，为工人推荐最适合的零工岗位。

### 核心特点

- **地理位置优先**：5公里范围内的岗位优先推荐
- **时效性强**：支持当天/次日工作的紧急招聘
- **技能匹配**：基于工人技能和岗位要求进行智能匹配
- **日结薪资**：支持日结、小时结等多种薪资方式
- **AI智能推荐**：采用机器学习算法，持续优化推荐效果
- **A/B测试驱动**：内置完整的A/B测试框架，数据驱动算法优化

## 系统架构

### 整体架构

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   前端应用      │     │   Flask API     │     │   推荐系统      │
│  (App/小程序)   │────▶│    服务层       │────▶│    核心引擎     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                      │
                                                      ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   MySQL数据库   │◀────│   数据存储层    │◀────│   数据处理层    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 推荐系统架构（集成A/B测试）

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   A/B测试分配   │────▶│   召回层        │────▶│   排序层        │
│ (AB Testing)    │     │  (Recall)       │     │  (Ranking)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                                                │
         ▼                                                ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   实验变体      │────▶│   业务规则层    │────▶│   推荐结果      │
│ (Variants)      │     │ (Business Rules)│     │ (Results)       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                                                │
         └────────────────────────────────────────────────┘
                          事件记录和效果分析
```

## 技术栈

- **后端框架**：Python 3.8+, Flask 2.0+
- **数据库**：MySQL 8.0+
- **机器学习**：scikit-learn, numpy, pandas
- **A/B测试框架**：自定义A/B测试引擎，统计显著性分析
- **API接口**：RESTful API, JSON
- **部署**：Docker, Gunicorn, Nginx

## 核心功能模块

### 1. 数据模型 (`data_models.py`)

定义了系统的核心数据结构：

- `Worker`：工人信息模型
- `Merchant`：商家信息模型
- `Job`：岗位信息模型
- `Interaction`：交互记录模型
- `Application`：申请记录模型
- `RecommendationResult`：推荐结果模型

### 2. 数据库操作 (`database.py`)

提供数据库访问和操作功能：

- 工人、商家、岗位的CRUD操作
- 交互记录和申请记录管理
- 地理位置查询（基于Haversine公式）
- 用户-岗位交互矩阵构建

### 3. 特征工程 (`feature_engineering.py`)

负责特征提取和处理：

- **距离计算**：基于Haversine公式计算地理位置距离
- **时间匹配度**：计算工人可用时间与岗位时间的匹配程度
- **技能匹配度**：计算工人技能与岗位要求的匹配程度
- **行为特征**：提取工人的历史行为模式
- **特征向量生成**：构建用于机器学习的特征向量

### 4. 召回层 (`recall.py`)

实现多种召回策略：

- **地理位置召回**：基于距离的岗位召回
- **协同过滤召回**：基于用户行为相似性的召回
- **内容召回**：基于岗位和工人特征的文本匹配
- **热门召回**：基于申请量的热门岗位召回
- **新岗位召回**：最新发布的岗位召回
- **冷启动策略**：针对新用户的特殊召回策略

### 5. 排序层 (`ranking.py`)

实现排序模型：

- **逻辑回归模型**：基础排序模型
- **GBDT模型**：梯度提升决策树模型
- **特征重要性分析**：识别影响推荐结果的关键特征
- **推荐理由生成**：为每个推荐结果生成解释性文本

### 6. 业务规则层 (`business_rules.py`)

应用业务规则过滤和优化推荐结果：

- **距离过滤**：过滤超出最大距离的岗位
- **时间冲突检测**：避免推荐时间冲突的岗位
- **多样性保证**：确保推荐结果的多样性
- **紧急岗位优先**：优先推荐紧急招聘的岗位
- **过期岗位过滤**：过滤已过期或已满的岗位

### 7. API服务 (`app.py`)

提供RESTful API接口：

- `/api/recommend/jobs`：岗位推荐接口（集成A/B测试）
- `/api/feedback/interaction`：用户交互反馈接口
- `/api/model/update`：模型更新触发接口
- `/api/recommend/explain`：推荐解释接口
- `/health`：健康检查接口

### 8. A/B测试系统

#### 8.1 A/B测试核心模块 (`ab_testing.py`)
- **实验管理**：实验配置、状态管理、生命周期控制
- **用户分配**：基于哈希的稳定用户分配算法
- **事件记录**：完整的用户行为追踪系统
- **统计分析**：统计显著性计算、置信区间分析

#### 8.2 A/B测试API (`ab_testing_api.py`)
- `/api/ab-testing/experiments`：获取实验列表
- `/api/ab-testing/experiments/{id}/metrics`：获取实验指标数据
- `/api/ab-testing/events`：记录A/B测试事件
- `/api/ab-testing/experiments/{id}/significance`：统计显著性分析

#### 8.3 实验算法 (`experiment_algorithms.py`)
- **增强版GBDT算法**：优化的梯度提升决策树模型
- **混合排序算法**：多算法融合的混合方法
- **扩展召回策略**：更多召回策略的组合优化

## 数据库设计

### 主要数据表

1. **workers**：工人信息表
2. **merchants**：商家信息表
3. **jobs**：岗位信息表
4. **interactions**：交互记录表
5. **applications**：申请记录表

### A/B测试专用表

6. **ab_experiments**：A/B测试实验配置表
7. **ab_variants**：实验变体配置表
8. **ab_user_assignments**：用户实验分配记录表
9. **ab_events**：实验事件记录表

### 索引优化

- 地理位置索引（SPATIAL索引）
- 用户ID和岗位ID的复合索引
- 时间字段索引
- A/B测试相关索引（实验ID、用户ID、事件类型等）

## 安装部署

### 环境要求

- Python 3.8+
- MySQL 8.0+
- pip 20.0+
- scipy (用于统计显著性计算)

### A/B测试数据库初始化

```sql
-- 执行A/B测试数据库脚本
mysql -u root -p gig_recommendation < ab_testing_schema.sql

-- 插入示例实验数据
INSERT INTO ab_experiments VALUES ('ranking_algorithm_v1', '排序算法优化实验V1', '测试GBDT增强版算法效果', 'ctr', 'running', NOW(), DATE_ADD(NOW(), INTERVAL 14 DAY));
```

### 安装步骤

1. **克隆代码**
```bash
git clone https://github.com/your-repo/gig-recommendation-system.git
cd gig-recommendation-system
```

2. **创建虚拟环境**
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
```

3. **安装依赖**
```bash
pip install -r requirements.txt
```

4. **配置数据库**
```bash
# 创建数据库
mysql -u root -p
CREATE DATABASE gig_recommendation;
USE gig_recommendation;

# 导入数据库表结构（执行SQL脚本）
source database_schema.sql
```

5. **配置环境变量**
```bash
cp .env.example .env
# 编辑.env文件，配置数据库连接信息和API密钥
```

6. **初始化模型**
```bash
python train_model.py
```

7. **启动服务**
```bash
# 开发环境
python app.py

# 生产环境
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

## API接口使用

### 1. 获取推荐岗位

**请求**：
```bash
POST /api/recommend/jobs
Content-Type: application/json

{
  # 工人ID
  "worker_id": 123,
  # 当前位置
  "location": {
    "lat": 39.9042,
    "lng": 116.4074
  },
  # 返回数量
  "limit": 20

```

**响应**：
```json
{
    "jobs": [
        {
            // 距离（公里）
            "distance": 2.270184589881402,
            // 岗位唯一标识
            "job_id": 66,
            "job_info": {
                // 工作地点
                "address": "深圳市零售街54号",
                // 申请人数
                "apply_count": 40,
                // 已招人数
                "current_count": 0,
                // 详细描述
                "description": "招聘打包员，要求认真负责，有经验者优先。工作地点在深圳市零售街54号附近。",
                // 结束时间
                "end_time": "2026-03-03T00:00:00",
                // 工作类型
                "job_type": "临时",
                // 位置纬度
                "location_lat": 22.564774,
                // 位置经度
                "location_lng": 114.059305,
                // 商家评分
                "merchant_name": "深圳现代零售",
                // 商家评分
                "merchant_rating": 3.2,
                // 商家类型
                "merchant_type": "零售",
                // 招聘人数
                "required_count": 5,
                // 薪资金额
                "salary": 481.84,
                // 结算方式
                "salary_type": "日结",
                // 开始时间
                "start_time": "2026-03-02T12:00:00",
                // 岗位标题
                "title": "打包员",
                // 浏览次数
                "views_count": 49
            },
            // 推荐理由
            "reason": "距离适中，仅2.3公里 · 薪资高于平均水平64%",
            // 推荐分数（越高越推荐）
            "score": 1.4734192276013067
        }
            ],
    "success": true,
    "total": 20
}

```

### 2. 记录用户交互

**请求**：
```bash
POST /api/feedback/interaction
Content-Type: application/json

{
  # 工人ID
  "worker_id": 123,
  # 岗位ID
  "job_id": 456,
  # 操作类型
  "interaction_type": "view",
  # 评分
  "rating": 5,
  # 评论
  "comment": "工作很满意"
}
```

**响应**：
```json
{
    // 交互记录ID
    "interaction_id": 5001,
    // 请求成功
    "success": true
}
```

### 3. 获取推荐解释

**请求**：
```bash
GET /api/recommend/explain?worker_id=123&job_id=456
```

**响应**：
```json
{
    // 模型类型
    "model_type": "gbdt",
    // 请求成功
    "success": true,
    // 最重要的特征列表
    "top_features": [
        {
            // 系数
            "coefficient": 0.0,
            // 特征名称
            "feature": "worker_success_rate",
            // 影响方向(正负)
            "impact": "negative",
            // 重要性
            "importance": 0.1872572849554552,
            // 当前值
            "value": 1.0
        }
    ],
    // 总特征数
    "total_features": 22
}
```

## 模型训练和更新

### 手动训练模型

```bash
python train_model.py
```

### API触发更新

```bash
POST /api/model/update
X-API-Key: default_secret_key
```

## 性能优化

1. **缓存策略**
   - 热门岗位缓存
   - 用户特征缓存
   - 推荐结果短期缓存

2. **数据库优化**
   - 地理位置索引
   - 读写分离
   - 慢查询优化

3. **算法优化**
   - 增量训练
   - 模型压缩
   - 特征选择

## 监控和日志

- **系统监控**：API响应时间、QPS、错误率
- **业务监控**：推荐点击率、申请转化率、岗位完成率
- **模型监控**：AUC-ROC、精确率、召回率

## 扩展功能

1. **实时推荐**：基于流处理的实时推荐
2. **多目标优化**：同时优化点击率和转化率
3. **强化学习**：基于用户反馈的在线学习
4. **联邦学习**：保护隐私的分布式模型训练

## 快速开始

### 启动服务

```bash
# 安装依赖
pip install -r requirements.txt

# 安装A/B测试额外依赖
pip install scipy numpy

# 启动服务
python app.py
```

### 测试A/B测试功能

```bash
# 查看A/B测试实验列表
curl http://localhost:5000/api/ab-testing/experiments

# 获取推荐（自动集成A/B测试）
curl -X POST http://localhost:5000/api/recommend/jobs \
     -H "Content-Type: application/json" \
     -d '{"worker_id": 1, "limit": 10}'

# 记录用户行为事件
curl -X POST http://localhost:5000/api/ab-testing/events \
     -H "Content-Type: application/json" \
     -d '{"user_id": 1, "experiment_id": "ranking_algorithm_v1", "variant": "control", "event_type": "click"}'
```

## 性能指标

- **推荐准确率**：基于历史数据的离线评估
- **A/B测试效果**：统计显著性分析，置信区间计算
- **响应时间**：API接口平均响应时间 < 200ms
- **并发处理**：支持1000+并发用户
- **数据一致性**：事务处理保证数据完整性

## A/B测试效果评估

### 核心评估指标

1. **点击率(CTR)**：推荐展示到点击的转化率
2. **申请转化率**：点击到岗位申请的转化率
3. **完成率**：申请到工作完成的转化率
4. **用户满意度**：基于评分的用户反馈

### 统计显著性标准

- **p值 < 0.05**：95%置信水平的统计显著性
- **提升幅度 > 5%**：有实际业务价值的提升
- **样本量 > 1000**：每个变体足够的样本数量
- **连续正向趋势**：多天稳定的改善效果

### 决策规则

- **强烈推荐上线**：70%以上指标显著提升
- **建议上线**：主要指标有显著改善
- **需要观察**：部分指标有改善但不够显著
- **停止实验**：无显著改善或负面效果

## 故障排除

### 常见问题

1. **推荐结果为空**
   - 检查工人位置信息
   - 检查附近是否有活跃岗位
   - 检查工人是否为新用户

2. **API响应缓慢**
   - 检查数据库连接
   - 检查模型加载状态
   - 检查是否有大量并发请求

3. **模型训练失败**
   - 检查训练数据是否充足
   - 检查特征工程模块
   - 查看训练日志获取详细错误信息

## 联系方式

如有问题或建议，请联系：
- 邮箱：support@gig-system.com
- 技术支持：tech@gig-system.com

---

© 2026 打零工平台推荐系统 | 版本 1.0.0