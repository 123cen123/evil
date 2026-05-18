<template>
  <view class="help-container">
    <!-- 顶部导航栏 -->
    <view class="navbar">
      <!-- 删除帮助中心 -->
      <!-- <uni-icons type="back" size="22" @click="goBack" /><text class="title">帮助中心</text> -->
      
      <!-- 删右侧图标区域 - 整个移除 -->
      <!-- <view class="nav-icons">
        <uni-icons type="ellipsis" size="24" />
        <view class="login-btn" @click="goLogin"> </view>
      </view> -->
    </view>
    
    <!-- 帮助分类卡片 -->
    <view class="help-list">
      <view class="help-card blue">
        <text class="card-title">账户相关</text>
        <uni-icons type="person" size="28" color="#1976d2" />
      </view>
      <view class="help-card">
        <text class="card-title">任务相关</text>
        <uni-icons type="list" size="28" color="#1976d2" />
      </view>
      <view class="help-card">
        <text class="card-title">钱包安全</text>
        <uni-icons type="wallet" size="28" color="#1976d2" />
      </view>
      <view class="help-card">
        <text class="card-title">常见问题</text>
        <uni-icons type="help" size="28" color="#1976d2" />
      </view>
    </view>
  </view>
</template>

<script>
export default {
  methods: {
    goBack() {
      uni.navigateBack();
    },
    goLogin() {
      uni.navigateTo({ url: '/pages/login/login' });
    }
  }
}
</script>

<style scoped>
.help-container {
  background: linear-gradient(180deg, #f0fbfd 20%, #fafafa 100%);
  min-height: 100vh;
}


.navbar {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  position: relative;
  padding: 20rpx 0 10rpx 30rpx;
}


.help-list {
  margin: 30rpx 20rpx 0 20rpx;
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}


.help-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 28rpx 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
  border: 2rpx solid #e0e0e0;
  transition: all 0.3s ease;
}


.help-card:active {
  transform: scale(0.98);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}


.help-card.blue {
  background: #FFFFFF;
}


.help-card .uni-icons {
  -webkit-text-stroke: 0.5px #1976d2;
}


.help-card:nth-child(1) .uni-icons {
  color: #737c7b !important;
  -webkit-text-stroke-color: #737c7b !important;
}

.help-card:nth-child(2) .uni-icons {
  color: #2474b5 !important;
  -webkit-text-stroke-color: #2474b5 !important;
}


.help-card:nth-child(3) .uni-icons {
  color: #ffd111 !important;
  -webkit-text-stroke-color: #ffd111 !important;
}/* 第4个图标 - 常见问题（橙色） */
.help-card:nth-child(4) .uni-icons {
  color: #f2481b !important;
  -webkit-text-stroke-color: #f2481b !important;
}

.card-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #222222;
}
</style>