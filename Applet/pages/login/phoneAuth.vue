<template>
  <view class="auth-container">
    <!-- 顶部导航栏 -->
    <view class="navbar">
      <uni-icons type="back" size="22" @click="goBack" />
      <text class="title">登录</text>
      <view class="nav-icons">
        <uni-icons type="more-filled" size="24" />
      </view>
    </view>
    <!-- 头像昵称 -->
    <view class="avatar-wrap">
      <image class="avatar" src="https://img1.imgtp.com/2023/07/21/4.jpg" />
      <text class="nickname">邕工帮</text>
    </view>
    <!-- 授权说明 -->
    <view class="auth-card">
      <text class="auth-title">找活儿 | 找工作线上找活儿</text>
      <text class="auth-desc">申请校对并绑定您的手机号</text>
      <input class="phone-input" value="156****9089" disabled />
      <input class="phone-input" value="156****9089" disabled />
      <button class="deny-btn">不允许</button>
      <view class="manage-btn" @click="goManage">管理号码</view>
    </view>
  </view>
</template>

<script>
export default {
  methods: {
    goBack() {
      uni.navigateBack();
    },
    goManage() {
      uni.showToast({ title: '管理号码', icon: 'none' });
    }
  }
}
</script>

<style scoped>
.auth-container {
  background:linear-gradient(180deg, #f0fbfd 20%, #fafafa 100%);
  min-height: 100vh;
}
.navbar {
  width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 20rpx 0 10rpx 0;
}
.title {
  font-size: 36rpx;
  font-weight: bold;
}
.nav-icons {
  position: absolute;
  right: 30rpx;
  top: 50%;
  transform: translateY(-50%);
}
.avatar-wrap {
  margin: 40rpx 0 0 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  border: 4rpx solid #fff;
  box-shadow: 0 2rpx 8rpx #b2ebf2;
}
.nickname {
  font-size: 28rpx;
  color: #333;
  margin-top: 12rpx;
  font-weight: bold;
}
.auth-card {
  background: #fff;
  margin: 30rpx 30rpx 0 30rpx;
  border-radius: 18rpx;
  box-shadow: 0 2rpx 12rpx #f0f0f0;
  padding: 30rpx 24rpx 40rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.auth-title {
  font-size: 26rpx;
  font-weight: bold;
  color: #222;
  margin-bottom: 8rpx;
}
.auth-desc {
  font-size: 22rpx;
  color: #888;
  margin-bottom: 24rpx;
}
.phone-input {
  width: 90%;
  margin: 10rpx 0;
  font-size: 28rpx;
  padding: 16rpx 18rpx;
  border: 1rpx solid #eee;
  border-radius: 8rpx;
  background: #f5f5f5;
  color: #888;
  text-align: center;
}
.deny-btn {
  width: 90%;
  margin: 30rpx 0 0 0;
  background: #eee;
  color: #888;
  font-size: 28rpx;
  border: none;
  border-radius: 10rpx;
  padding: 18rpx 0;
  font-weight: bold;
  letter-spacing: 2rpx;
}
.manage-btn {
  color: #1976d2;
  font-size: 26rpx;
  margin-top: 18rpx;
  text-align: center;
}
</style> 