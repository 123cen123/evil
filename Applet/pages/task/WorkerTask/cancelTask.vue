<template>
  <view class="page">
    <!-- 装饰性背景 -->
    <view class="bg-decoration"></view>
    
    <view class="card">
      <!-- 头部区域 -->
      <view class="card-header">
        <view class="icon-alert">
          <text class="iconfont">⚠️</text>
        </view>
        <view class="header-content">
          <text class="title">取消任务</text>
          <text class="sub">操作后无法恢复，请谨慎处理</text>
        </view>
      </view>

      <!-- 任务信息卡片 -->
      <view class="task-badge">
        <text class="badge-label">任务ID</text>
        <text class="badge-value">{{ taskId }}</text>
        <view class="copy-hint" v-if="taskId" @tap="copyTaskId">
          <text class="copy-icon">📋</text>
        </view>
      </view>

      <!-- 表单区域 -->
      <view class="form">
        <view class="label-wrapper">
          <text class="label">取消原因</text>
          <text class="required">*</text>
          <text class="char-count">{{ reason.length }}/200</text>
        </view>
        
        <textarea 
          class="textarea" 
          v-model="reason" 
          placeholder="请详细说明取消原因，这将帮助商家了解问题并改进服务"
          placeholder-class="textarea-placeholder"
          maxlength="200"
          :disabled="submitting"
        />
        
        <view class="tip-text">
          <text class="tip-icon">💡</text>
          <text>请确保原因真实有效，提交后将通知任务发布方</text>
        </view>
        
        <button 
          class="btn" 
          :class="{ 'btn-disabled': !reason.trim() || submitting }"
          :disabled="!reason.trim() || submitting"
          @click="submit"
        >
          <text v-if="!submitting" class="btn-text">提交取消申请</text>
          <text v-else class="btn-text">提交中...</text>
        </button>
      </view>
    </view>
    
    <!-- 底部安全提示 -->
    <view class="footer-note">
      <text>取消后任务状态将变更为「已取消」</text>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      taskId: '',
      merchantId: '',
      reason: '',
      submitting: false
    };
  },
  onLoad(options) {
    this.taskId = options.taskId || '';
    const info = uni.getStorageSync('userInfo') || {};
    this.merchantId = info.merchant_id || info.id || '';
  },
  methods: {
    // 复制任务ID
    copyTaskId() {
      if (!this.taskId) return;
      uni.setClipboardData({
        data: this.taskId,
        success: () => {
          uni.showToast({ title: '任务ID已复制', icon: 'success', duration: 1500 });
        }
      });
    },
    
    submit() {
      // 防重复提交
      if (this.submitting) return;
      
      // 校验信息
      if (!this.taskId || !this.merchantId) {
        uni.showToast({ title: '缺少任务或商家信息', icon: 'none' });
        return;
      }
      if (!this.reason || !this.reason.trim()) {
        uni.showToast({ title: '请填写取消原因', icon: 'none' });
        return;
      }
      
      this.submitting = true;
      uni.showLoading({ title: '提交中...', mask: true });
      
      uni.request({
        url: `http://localhost:3000/api/demand/${this.taskId}/cancel`,
        method: 'POST',
        data: { 
          merchant_id: this.merchantId, 
          reason: this.reason.trim() 
        },
        success: (res) => {
          uni.hideLoading();
          if (res.data && res.data.success) {
            uni.showToast({ 
              title: '取消申请已提交', 
              icon: 'success',
              duration: 1500
            });
            setTimeout(() => {
              uni.navigateBack();
            }, 800);
          } else {
            uni.showToast({ 
              title: res.data.message || '取消失败，请稍后重试', 
              icon: 'none',
              duration: 2000
            });
          }
        },
        fail: () => {
          uni.hideLoading();
          uni.showToast({ 
            title: '网络异常，请检查网络后重试', 
            icon: 'none',
            duration: 2000
          });
        },
        complete: () => {
          this.submitting = false;
        }
      });
    }
  }
};
</script>

<style scoped>
/* 页面基础样式 */
.page {
  min-height: 100vh;
  background:linear-gradient(180deg, #f0fbfd 60%, #fafafa 100%);
  padding: 32rpx;
  box-sizing: border-box;
  position: relative;
}

/* 装饰背景元素 */
.bg-decoration {
  position: fixed;
  top: -20%;
  right: -20%;
  width: 400rpx;
  height: 400rpx;
  background: radial-gradient(circle, rgba(97, 154, 195, 0.08) 0%, rgba(97, 154, 195, 0) 70%);
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
}

/* 主卡片 */
.card {
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(0);
  border-radius: 48rpx;
  padding: 40rpx 32rpx;
  box-shadow: 0 20rpx 40rpx rgba(0, 0, 0, 0.04), 0 2rpx 6rpx rgba(0, 0, 0, 0.02);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  z-index: 1;
}

/* 卡片头部 */
.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 32rpx;
  gap: 20rpx;
}

.icon-alert {
  width: 88rpx;
  height: 88rpx;
  background: linear-gradient(135deg, #e8f4f8 0%, #d4eaf0 100%);
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 44rpx;
  box-shadow: 0 4rpx 12rpx rgba(97, 154, 195, 0.12);
}

.header-content {
  flex: 1;
}

.title {
  font-size: 40rpx;
  font-weight: 700;
  color: #1a1a2e;
  letter-spacing: -0.5rpx;
  display: block;
  line-height: 1.3;
}

.sub {
  font-size: 24rpx;
  color: #8e8e9f;
  margin-top: 6rpx;
  display: block;
  letter-spacing: 0.3rpx;
}

/* 任务ID徽章区域 */
.task-badge {
  background: #f8f9fc;
  border-radius: 24rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 40rpx;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12rpx;
  border: 1rpx solid rgba(0, 0, 0, 0.04);
}

.badge-label {
  font-size: 24rpx;
  color: #6b6b7f;
  font-weight: 500;
  background: rgba(97, 154, 195, 0.1);
  padding: 6rpx 16rpx;
  border-radius: 40rpx;
}

.badge-value {
  font-size: 28rpx;
  font-weight: 600;
  color: #1e1e2f;
  font-family: monospace;
  letter-spacing: 0.5rpx;
  flex: 1;
}

.copy-hint {
  padding: 8rpx 12rpx;
  background: rgba(97, 154, 195, 0.1);
  border-radius: 32rpx;
  transition: all 0.2s ease;
}

.copy-hint:active {
  background: rgba(97, 154, 195, 0.2);
  transform: scale(0.96);
}

.copy-icon {
  font-size: 28rpx;
  color: #619ac3;
}

/* 表单区域 */
.form {
  margin-top: 8rpx;
}

.label-wrapper {
  display: flex;
  align-items: baseline;
  margin-bottom: 16rpx;
  gap: 8rpx;
}

.label {
  font-size: 28rpx;
  font-weight: 600;
  color: #2c2c3a;
}

.required {
  color: #f44336;
  font-size: 28rpx;
  font-weight: 600;
  margin-left: -4rpx;
}

.char-count {
  margin-left: auto;
  font-size: 22rpx;
  color: #9a9aae;
  background: #f5f5fa;
  padding: 4rpx 12rpx;
  border-radius: 32rpx;
}

.textarea {
  width: 100%;
  min-height: 280rpx;
  background: #fbfbfd;
  border: 1.5rpx solid #e9e9ef;
  border-radius: 28rpx;
  padding: 24rpx;
  box-sizing: border-box;
  font-size: 28rpx;
  line-height: 1.5;
  color: #1e1e2f;
  transition: all 0.2s ease;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

.textarea:focus {
  border-color: rgba(97, 154, 195, 0.4);
  background: #ffffff;
  box-shadow: 0 0 0 4rpx rgba(97, 154, 195, 0.1);
}

.textarea-placeholder {
  color: #c1c1d0;
  font-size: 26rpx;
}

/* 提示文本 */
.tip-text {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 20rpx;
  margin-bottom: 32rpx;
  background: #e8f4f8;
  padding: 16rpx 20rpx;
  border-radius: 24rpx;
}

.tip-icon {
  font-size: 28rpx;
}

.tip-text text:last-child {
  font-size: 24rpx;
  color: #5a7a8e;
  line-height: 1.4;
}

/* 按钮样式 */
.btn {
  width: 100%;
  height: 96rpx;
  border-radius: 48rpx;
  background: #619ac3;
  color: #ffffff;
  font-size: 32rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  box-shadow: 0 8rpx 20rpx rgba(97, 154, 195, 0.3);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  margin-top: 16rpx;
  position: relative;
  overflow: hidden;
}

.btn::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.1);
  opacity: 0;
  transition: opacity 0.2s;
}

.btn:active::after {
  opacity: 1;
}

.btn-text {
  letter-spacing: 1rpx;
}

.btn-disabled {
  opacity: 0.65;
  box-shadow: 0 4rpx 12rpx rgba(97, 154, 195, 0.2);
  transform: scale(0.98);
}

.btn-disabled:active::after {
  opacity: 0;
}

/* 底部说明 */
.footer-note {
  text-align: center;
  margin-top: 32rpx;
  margin-bottom: 24rpx;
  font-size: 22rpx;
  color: #9c9cae;
  letter-spacing: 0.5rpx;
  position: relative;
  z-index: 1;
}

/* 移动端优化，移除点击灰色背景 */
button {
  background: transparent;
  line-height: 1.2;
}

button::after {
  border: none;
}
</style>