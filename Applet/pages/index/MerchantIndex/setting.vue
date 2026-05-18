<template>
  <view class="setting-container">
    <!-- 设置卡片 -->
    <view class="setting-card">
      <view class="setting-list">
        <view class="setting-item" @click="goAccount">
          <text>账号管理</text>
          <uni-icons type="arrow-right" size="22" color="#888" />
        </view>
        <view class="setting-item" @click="toggleTheme">
          <text>主题切换</text>
          <uni-icons type="arrow-right" size="22" color="#888" />
        </view>
        <view class="setting-item" @click="goNotification">
          <text>通知设置</text>
          <uni-icons type="arrow-right" size="22" color="#888" />
        </view>
        <view class="setting-item" @click="goAbout">
          <text>关于</text>
          <uni-icons type="arrow-right" size="22" color="#888" />
        </view>
        <view class="setting-item" @click="clearCache">
          <text>清理缓存</text>
          <uni-icons type="arrow-right" size="22" color="#888" />
        </view>
      </view>
    </view>
    
    <button class="logout-btn" @click="logout">退出登录</button>
  </view>
</template>

<script>
export default {
  methods: {
    goAccount() {
      uni.navigateTo({
        url: '/pages/newadd/account-management'
      });
    },
    toggleTheme() {
      uni.showToast({ title: '主题切换', icon: 'none' });
    },
    goNotification() {
      uni.showToast({ title: '通知设置', icon: 'none' });
    },
    goAbout() {
      uni.showToast({ title: '关于', icon: 'none' });
    },
    clearCache() {
      uni.clearStorageSync();
      uni.showToast({ title: '缓存已清理', icon: 'success' });
    },
    logout() {
      uni.clearStorageSync();
      uni.reLaunch({ url: '/pages/login/login' });
    }
  }
}
</script>

<style scoped>
.setting-container {
  background:linear-gradient(180deg, #f0fbfd 20%, #fafafa 100%);
  min-height: 100vh;
  padding: 32rpx 24rpx 40rpx 24rpx;
}
/* 卡片样式 */
.setting-card {
  background: #fff;
  border-radius: 24rpx;
  border: 4rpx solid #e0e0e0;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
  overflow: hidden;
}
.setting-list {
  background: #fff;
}
.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  height: 100rpx;
  border-bottom: 1rpx solid #f5f5f5;
  font-size: 30rpx;
  color: #222;
}
.setting-item:last-child {
  border-bottom: none;
}
.logout-btn {
  width: 100%;
  margin: 60rpx auto 0 auto;
  font-size: 32rpx;
  border-radius: 24rpx;
  padding: 22rpx 0;
  font-weight: bold;
  background:#619ac3;
  color:white;
  border: none;
  display: block;
}
</style>