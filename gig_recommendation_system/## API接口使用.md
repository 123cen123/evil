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
}
```

**响应**：
```json
{
    "success": true,
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
    "total": 20,
    "experiment_info": {
        "experiment_id": "ranking_algorithm_v1",
        "variant": "gbdt_enhanced",
        "algorithm_used": "gbdt_enhanced"
    }
}
```

### 2. A/B测试实验管理接口

#### 2.1 获取实验列表

**请求**：
```bash
GET /api/ab-testing/experiments
```

**响应**：
```json
{
    "success": true,
    "experiments": [
        {
            "experiment_id": "ranking_algorithm_v1",
            "name": "排序算法优化实验V1",
            "description": "测试GBDT增强版算法效果",
            "target_metric": "ctr",
            "status": "running",
            "start_time": "2024-01-01T00:00:00",
            "end_time": "2024-01-15T23:59:59"
        }
    ],
    "total": 1
}
```

#### 2.2 获取实验指标数据

**请求**：
```bash
GET /api/ab-testing/experiments/ranking_algorithm_v1/metrics?start_date=2024-01-01&end_date=2024-01-15
```

**响应**：
```json
{
    "success": true,
    "experiment_id": "ranking_algorithm_v1",
    "metrics": {
        "control": {
            "ctr": 0.15,
            "conversion_rate": 0.08,
            "sample_size": 1500
        },
        "gbdt_enhanced": {
            "ctr": 0.18,
            "conversion_rate": 0.09,
            "sample_size": 1480
        }
    }
}
```

#### 2.3 记录A/B测试事件

**请求**：
```bash
POST /api/ab-testing/events
Content-Type: application/json

{
  "user_id": 123,
  "experiment_id": "ranking_algorithm_v1",
  "variant": "gbdt_enhanced",
  "event_type": "click",  // view, click, apply, complete等
  "event_data": {
    "job_id": 456,
    "position": 1
  }
}
```

**响应**：
```json
{
    "success": true,
    "message": "事件记录成功"
}
```

### 3. 记录用户交互

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