<template>
  <view class="page">
    <!-- 顶部导航栏 -->
    <view class="navbar">
      <text class="navbar-title"> </text><!-- 互评 -->
      <view class="navbar-back" @click="navigateBack">
        <uni-icons type="back" size="28" color="#333" />
      </view>
    </view>

    <view class="card">
      <!-- 卡片头部 -->
      <view class="card-header">
        <text class="card-title">评价</text>
        <text class="card-subtitle">请对本次服务进行客观评价</text>
      </view>

      <!-- 信息区域 -->
      <view class="info-section">
        <view class="info-item">
          <text class="info-label">申请单ID</text>
          <text class="info-value">{{ applicationId }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">岗位ID</text>
          <text class="info-value">{{ jobId }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">当前身份</text>
          <text class="info-value">{{ raterLabel }}</text>
        </view>
      </view>

      <!-- 评分区域 -->
      <view class="rating-section">
        <text class="section-title">服务评分</text>
        <view class="star-container">
          <text 
            v-for="star in 5" 
            :key="star"
            class="star"
            :class="{ 'filled': rating >= star }"
            @click="rating = star"
          >★</text>
          <text class="rating-text">{{ rating ? rating : 0 }}分</text>
        </view>
      </view>

      <!-- 评价内容区域 -->
      <view class="comment-section">
        <text class="section-title">评价内容</text>
        <textarea 
          class="textarea" 
          v-model="comment" 
          placeholder="请输入您的评价..."
          placeholder-class="textarea-placeholder"
        />
      </view>

      <!-- 提交按钮 -->
      <button 
        class="submit-btn" 
        @click="submit"
        :disabled="!rating"
      >
        提交评价
      </button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      applicationId: '',
      jobId: '',
      raterType: '',
      rating: '',
      comment: ''
    };
  },
  computed: {
    raterLabel() {
      if (this.raterType === 'worker') return '零工';
      if (this.raterType === 'merchant') return '商家';
      return '-';
    }
  },
  onLoad(options) {
    this.applicationId = options.applicationId || '';
    this.jobId = options.jobId || '';
    this.raterType = options.raterType || '';
  },
  methods: {
    navigateBack() {
      uni.navigateBack();
    },
    submit() {
      const r = Number(this.rating);
      if (!this.applicationId) {
        uni.showToast({ title: '缺少申请单ID', icon: 'none' });
        return;
      }
      if (!this.raterType) {
        uni.showToast({ title: '缺少评价身份', icon: 'none' });
        return;
      }
      if (!r || r < 1 || r > 5) {
        uni.showToast({ title: '请选择评分', icon: 'none' });
        return;
      }
      uni.showLoading({ title: '提交中...' });
      uni.request({
        url: `http://localhost:3000/api/applications/${this.applicationId}/rate`,
        method: 'POST',
        data: {
          rater_type: this.raterType,
          rating: r,
          comment: this.comment
        },
        success: (res) => {
          uni.hideLoading();
          if (res.data && res.data.success) {
            uni.showToast({ title: '评价成功', icon: 'success' });
            setTimeout(() => uni.navigateBack(), 600);
          } else {
            uni.showToast({ title: res.data.message || '评价失败', icon: 'none' });
          }
        },
        fail: () => {
          uni.hideLoading();
          uni.showToast({ title: '网络错误', icon: 'none' });
        }
      });
    }
  }
};
</script>

<style scoped>
/* 页面根元素样式 - 确保整个页面背景统一 */
page {
  background: linear-gradient(180deg, #f0fbfd 20%, #fafafa 100%);
  margin: 0;
  padding: 0;
}

/* 页面容器 */
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f0fbfd 20%, #fafafa 100%);
  padding: 0;
  box-sizing: border-box;
}

/* 移除导航栏自定义样式，因为使用了原生导航栏 */
.navbar {
  display: none;
}

/* 卡片容器 */
.card {
  background: #fff;
  margin: 30rpx;
  border-radius: 20rpx;
  padding: 40rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.1);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 卡片头部 */
.card-header {
  text-align: center;
  margin-bottom: 40rpx;
  padding-bottom: 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.card-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #222;
  display: block;
  margin-bottom: 10rpx;
}

.card-subtitle {
  font-size: 24rpx;
  color: #999;
  display: block;
}

/* 信息区域 */
.info-section {
  background: #f8f9fa;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 40rpx;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #e9ecef;
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 26rpx;
  color: #666;
  font-weight: 500;
}

.info-value {
  font-size: 26rpx;
  color: #222;
  font-weight: 600;
  word-break: break-all;
  text-align: right;
  flex: 1;
  margin-left: 20rpx;
}

/* 评分区域 */
.rating-section {
  margin-bottom: 40rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 20rpx;
  display: block;
}

.star-container {
  display: flex;
  align-items: center;
  gap: 15rpx;
}

.star {
  font-size: 52rpx;
  color: #e0e0e0;
  cursor: pointer;
  transition: all 0.2s ease;
  text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.1);
}

.star:hover {
  transform: scale(1.1);
}

.star.filled {
  color: #ffc107;
  text-shadow: 0 2rpx 4rpx rgba(255, 193, 7, 0.4);
}

.rating-text {
  font-size: 28rpx;
  color: #666;
  margin-left: 20rpx;
  font-weight: 500;
}

/* 评价内容区域 */
.comment-section {
  margin-bottom: 40rpx;
}

.textarea {
  width: 100%;
  min-height: 200rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 16rpx;
  padding: 24rpx;
  box-sizing: border-box;
  font-size: 26rpx;
  background: #fafafa;
  resize: none;
  transition: all 0.3s ease;
  font-family: inherit;
}

.textarea:focus {
  outline: none;
  border-color: #4a90e2;
  background: #fff;
  box-shadow: 0 0 0 4rpx rgba(74, 144, 226, 0.1);
}

.textarea-placeholder {
  color: #aaa;
  font-size: 24rpx;
}

/* 提交按钮 */
.submit-btn {
  width: 100%;
  height: 96rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: 0 4rpx 12rpx rgba(74, 144, 226, 0.3);
}

.submit-btn:hover {
  transform: translateY(-2rpx);
  box-shadow: 0 6rpx 16rpx rgba(74, 144, 226, 0.4);
}

.submit-btn:active {
  transform: translateY(0);
  box-shadow: 0 2rpx 8rpx rgba(74, 144, 226, 0.3);
}

.submit-btn:disabled {
  background: #e0e0e0;
  color: #999;
  box-shadow: none;
  cursor: not-allowed;
}

.submit-btn:disabled:hover {
  transform: none;
}
</style>