<template>
  <view class="container">
    <!-- 改动：添加卡片容器 -->
    <view class="card">
      <!-- 改动：添加卡片标题 -->
      <view class="option-list">
        <view class="option-item" @click="goChangePhone">
          <!-- 改动：添加左侧图标区域 -->
          <view class="option-left">
            <uni-icons type="phone" size="20" color="#619ac3" />
            <text>修改手机号</text>
          </view>
          <uni-icons type="arrow-right" size="22" color="#888" />
        </view>
        <view class="option-item" @click="goChangePassword">
          <!-- 改动：添加左侧图标区域 -->
          <view class="option-left">
            <uni-icons type="locked" size="20" color="#619ac3" />
            <text>修改密码</text>
          </view>
          <uni-icons type="arrow-right" size="22" color="#888" />
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  methods: {
    goChangePhone() {
      uni.navigateTo({
        url: '/pages/newadd/change-phone'
      });
    },
    goChangePassword() {
      uni.navigateTo({
        url: '/pages/newadd/change-password'
      });
    }
  }
}
</script>

<style scoped>
.container {
  background:linear-gradient(180deg, #f0fbfd 20%, #fafafa 100%);
  min-height: 100vh;
  padding: 32rpx 24rpx 40rpx 24rpx;
}

.card {
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.04), 0 2rpx 8rpx rgba(0, 0, 0, 0.02);
}


.option-list {
  background: #fff;
}

.option-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  height: 100rpx;
  border-bottom: 1rpx solid #f5f5f5;
  font-size: 30rpx;
  color: #222;
  transition: background 0.2s ease;
}


.option-item:active {
  background: #f9f9f9;
}

.option-item:last-child {
  border-bottom: none;
}

.option-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.option-left text {
  font-size: 30rpx;
  color: #333;
}
</style>