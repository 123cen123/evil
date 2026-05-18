<template>
  <view class="page">
    <!-- 头部信息卡片 -->
    <view class="header-card">
      <view class="header-icon">
        <text class="icon">⭐️</text>
      </view>
      <view class="header-content">
        <text class="title">评价零工</text>
        <text class="sub">任务ID：{{ jobId }}</text>
      </view>
    </view>

    <!-- 评价列表 -->
    <view v-if="list.length > 0" class="list">
      <view class="item" v-for="row in list" :key="row.application_id">
        <view class="item-header">
          <view class="worker-info">
            <text class="worker-name">{{ row.worker_name || '零工' }}</text>
            <text class="worker-phone">{{ row.worker_phone || '' }}</text>
          </view>
          <view class="status-badge" :class="{ 'status-success': row.status === 'completed' || row.status === 'finished' || row.status === 'done' }">
            <text>{{ formatStatus(row.status) }}</text>
          </view>
        </view>

        <view class="info-row">
          <text class="info-label">申请单ID</text>
          <text class="info-value">{{ row.application_id }}</text>
        </view>

        <!-- 已评价信息展示 -->
        <view v-if="row.merchant_rating" class="rating-info">
          <view class="stars">
            <text v-for="i in 5" :key="i" class="star" :class="{ 'star-active': i <= row.merchant_rating }">★</text>
            <text class="rating-score">{{ row.merchant_rating }}星</text>
          </view>
          <view class="comment" v-if="row.merchant_comment">
            <text class="comment-label">评价：</text>
            <text class="comment-text">{{ row.merchant_comment }}</text>
          </view>
        </view>

        <button 
          class="rate-btn" 
          :class="{ 'rated': !!row.merchant_rating }"
          :disabled="!!row.merchant_rating"
          @click="goRate(row)"
        >
          {{ row.merchant_rating ? '已评价' : '去评价' }}
        </button>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-else class="empty-state">
      <view class="empty-icon">📝</view>
      <text class="empty-text">暂无可评价的零工</text>
      <text class="empty-hint">零工完成下工后即可进行评价</text>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      jobId: '',
      merchantId: '',
      list: []
    };
  },
  onLoad(options) {
    this.jobId = options.jobId || '';
    const info = uni.getStorageSync('userInfo') || {};
    this.merchantId = info.merchant_id || info.id || '';
    this.load();
  },
  methods: {
    load() {
      if (!this.jobId || !this.merchantId) {
        this.list = [];
        return;
      }
      uni.showLoading({ title: '加载中...' });
      uni.request({
        url: `http://localhost:3000/api/merchant/${this.merchantId}/job/${this.jobId}/completed-applications`,
        method: 'GET',
        success: (res) => {
          uni.hideLoading();
          if (res.data && res.data.success) {
            this.list = res.data.data || [];
          } else {
            this.list = [];
            uni.showToast({ title: res.data.message || '加载失败', icon: 'none' });
          }
        },
        fail: () => {
          uni.hideLoading();
          this.list = [];
          uni.showToast({ title: '网络错误', icon: 'none' });
        }
      });
    },
    goRate(row) {
      // 修正路径：跳转到商家评价页面
      uni.navigateTo({
        url: `/pages/task/MerchantTask/rate?applicationId=${row.application_id}&jobId=${row.job_id}&raterType=merchant`
      });
    },
    formatStatus(status) {
      const statusMap = {
        'completed': '已完成',
        'finished': '已下工',
        'done': '已完成',
        '待评价': '待评价'
      };
      return statusMap[status] || status || '已完成';
    },
    getStatusClass(status) {
      if (status === 'completed' || status === 'finished' || status === 'done') {
        return 'status-success';
      }
      return 'status-default';
    }
  }
};
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f0fbfd 20%, #fafafa 100%);;
  padding: 32rpx;
  box-sizing: border-box;
}

/* 头部卡片 */
.header-card {
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(0);
  border-radius: 48rpx;
  padding: 32rpx 28rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 12rpx 24rpx rgba(0, 0, 0, 0.04), 0 2rpx 6rpx rgba(0, 0, 0, 0.02);
  display: flex;
  align-items: center;
  gap: 24rpx;
  transition: all 0.3s ease;
}

.header-icon {
  width: 88rpx;
  height: 88rpx;
  background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 16rpx rgba(252, 182, 159, 0.2);
}

.header-icon .icon {
  font-size: 48rpx;
  line-height: 1;
}

.header-content {
  flex: 1;
}

.title {
  font-size: 40rpx;
  font-weight: 700;
  color: #1f1f2f;
  display: block;
  line-height: 1.3;
  letter-spacing: -0.5rpx;
}

.sub {
  font-size: 24rpx;
  color: #8a8a9e;
  margin-top: 6rpx;
  display: block;
}

/* 列表 */
.list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

/* 列表项卡片 */
.item {
  background: #ffffff;
  border-radius: 40rpx;
  padding: 28rpx;
  box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.04);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1rpx solid rgba(0, 0, 0, 0.02);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  flex-wrap: wrap;
  gap: 12rpx;
}

.worker-info {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  flex-wrap: wrap;
}

.worker-name {
  font-size: 34rpx;
  font-weight: 700;
  color: #1f1f2f;
  letter-spacing: -0.3rpx;
}

.worker-phone {
  font-size: 26rpx;
  color: #8e8e9f;
  font-family: monospace;
}

/* 状态徽章 */
.status-badge {
  padding: 8rpx 20rpx;
  border-radius: 60rpx;
  font-size: 24rpx;
  font-weight: 500;
  background: #f0f2f6;
  color: #5a5a6e;
}

.status-success {
  background: #e8f5e9;
  color: #4a90e2;
}

/* 信息行 */
.info-row {
  display: flex;
  align-items: baseline;
  gap: 16rpx;
  margin-bottom: 20rpx;
  background: #fafafc;
  padding: 16rpx 20rpx;
  border-radius: 24rpx;
  flex-wrap: wrap;
}

.info-label {
  font-size: 24rpx;
  color: #8e8e9f;
  background: rgba(0, 0, 0, 0.03);
  padding: 4rpx 12rpx;
  border-radius: 40rpx;
}

.info-value {
  font-size: 26rpx;
  font-weight: 500;
  color: #2c2c3a;
  font-family: monospace;
  word-break: break-all;
  flex: 1;
}

/* 评价信息区域 */
.rating-info {
  background: #fff9f0;
  border-radius: 24rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
  border-left: 6rpx solid #ffb74d;
}

.stars {
  display: flex;
  align-items: center;
  gap: 6rpx;
  margin-bottom: 12rpx;
  flex-wrap: wrap;
}

.star {
  font-size: 32rpx;
  color: #e0e0e6;
  transition: color 0.2s;
}

.star-active {
  color: #ffb300;
  text-shadow: 0 2rpx 4rpx rgba(255, 179, 0, 0.2);
}

.rating-score {
  font-size: 26rpx;
  font-weight: 600;
  color: #ff9800;
  margin-left: 12rpx;
}

.comment {
  display: flex;
  gap: 12rpx;
  font-size: 26rpx;
  line-height: 1.45;
  color: #5a5a6e;
}

.comment-label {
  font-weight: 500;
  color: #8e8e9f;
}

.comment-text {
  flex: 1;
  word-break: break-all;
}

/* 评价按钮 */
.rate-btn {
  width: 100%;
  height: 88rpx;
  border-radius: 48rpx;
  background: linear-gradient(135deg, #ff9a6e 0%, #ff6b4a 100%);
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  box-shadow: 0 6rpx 14rpx rgba(255, 107, 74, 0.25);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  margin-top: 8rpx;
}

.rate-btn:active {
  transform: scale(0.98);
  box-shadow: 0 4rpx 10rpx rgba(255, 107, 74, 0.2);
}

.rate-btn.rated {
  background: #bdbdc7;
  box-shadow: none;
  color: #ffffff;
  opacity: 0.7;
}

.rate-btn.rated:active {
  transform: none;
}

button::after {
  border: none;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 48rpx;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 48rpx;
  margin-top: 60rpx;
  backdrop-filter: blur(8rpx);
}

.empty-icon {
  font-size: 96rpx;
  margin-bottom: 24rpx;
  opacity: 0.6;
}

.empty-text {
  font-size: 30rpx;
  color: #6b6b7f;
  font-weight: 500;
  margin-bottom: 12rpx;
}

.empty-hint {
  font-size: 24rpx;
  color: #9e9eb0;
  text-align: center;
}
</style>