<template>
  <view class="login-container">
    <!-- 顶部导航栏 -->
    <view class="navbar">
      <text class="title">欢迎登录</text>
      <view class="nav-icons">
        <uni-icons type="ellipsis" size="24" color="#666" />
      </view>
    </view>

    <!-- 头像 -->
    <view class="avatar-wrap">
      <image class="avatar" src="/static/logo.png" mode="aspectFill" />
    </view>

    <!-- 身份选择：自定义单选框 -->
    <view class="type-select">
      <view
        class="type-item"
        :class="{ active: loginType === 'worker' }"
        @click="loginType = 'worker'"
      >
        <view class="radio-custom">
          <view v-if="loginType === 'worker'" class="radio-dot"></view>
        </view>
        <text class="type-label">零工</text>
      </view>
      <view
        class="type-item"
        :class="{ active: loginType === 'merchant' }"
        @click="loginType = 'merchant'"
      >
        <view class="radio-custom">
          <view v-if="loginType === 'merchant'" class="radio-dot"></view>
        </view>
        <text class="type-label">商家</text>
      </view>
      <view
        class="type-item"
        :class="{ active: loginType === 'admin' }"
        @click="loginType = 'admin'"
      >
        <view class="radio-custom">
          <view v-if="loginType === 'admin'" class="radio-dot"></view>
        </view>
        <text class="type-label">管理员</text>
      </view>
    </view>

    <!-- 手机号输入框 -->
    <input
      class="login-input"
      type="text"
      v-model="phone"
      placeholder="请输入手机号"
      maxlength="11"
      placeholder-class="input-placeholder"
    />

    <!-- 密码输入框 -->
    <input
      class="login-input"
      type="password"
      v-model="password"
      placeholder="请输入密码"
      placeholder-class="input-placeholder"
    />

    <!-- 登录按钮 -->
    <button
      class="login-btn main"
      @click="handleLogin"
      hover-class="btn-hover"
    >登录</button>

    <!-- 协议勾选：自定义复选框 -->
    <view class="protocol">
      <view class="checkbox-wrap" @click="toggleCheck">
        <view class="checkbox-custom" :class="{ checked }">
          <uni-icons v-if="checked" type="checkmarkempty" size="18" color="#fff" />
        </view>
      </view>
      <text class="protocol-text">我已阅读并同意</text>
      <text class="protocol-link">《用户服务协议》</text>
      <text class="protocol-link">《隐私政策》</text>
    </view>

    <!-- 暂不登录 -->
    <view class="skip-login" hover-class="skip-hover" @click="skipLogin">暂不登录</view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      phone: '',
      password: '',
      checked: false,
      loginType: 'worker'
    };
  },
  methods: {
    toggleCheck() {
      this.checked = !this.checked;
    },
    handleLogin() {
      if (this.loginType !== 'admin') {
        const phoneReg = /^1[3-9]\d{9}$/;
        if (!phoneReg.test(this.phone)) {
          uni.showToast({ title: '请输入正确的手机号', icon: 'none' });
          return;
        }
      }
      if (!this.password) {
        uni.showToast({ title: '请输入密码', icon: 'none' });
        return;
      }
      if (!this.checked) {
        uni.showToast({ title: '请同意协议', icon: 'none' });
        return;
      }

      uni.showLoading({ title: '登录中...' });
      
      if (this.loginType === 'admin') {
        uni.request({
          url: `http://localhost:3000/api/admin/login`,
          method: 'POST',
          data: {
            username: this.phone,
            password: this.password
          },
          success: (res) => {
            uni.hideLoading();
            if (res.data.success) {
              uni.showToast({ title: '登录成功', icon: 'success' });
              uni.setStorageSync('userInfo', res.data.data);
              uni.setStorageSync('userType', this.loginType);
              setTimeout(() => {
                uni.reLaunch({ url: '/pages/admin/dashboard' });
              }, 800);
            } else {
              uni.showToast({ title: res.data.message || '登录失败', icon: 'none' });
            }
          },
          fail: () => {
            uni.hideLoading();
            uni.showToast({ title: '网络错误', icon: 'none' });
          }
        });
      } else {
        uni.request({
          url: `http://localhost:3000/api/${this.loginType}/login`,
          method: 'POST',
          data: {
            phone: this.phone,
            password: this.password
          },
          success: (res) => {
            uni.hideLoading();
            if (res.data.success) {
              uni.showToast({ title: '登录成功', icon: 'success' });
              uni.setStorageSync('userInfo', res.data.data);
              uni.setStorageSync('userType', this.loginType);
              setTimeout(() => {
                // 根据用户类型跳转到对应的首页
                if (this.loginType === 'worker') {
                  uni.reLaunch({ url: '/pages/index/WorkerIndex/index' });
                } else if (this.loginType === 'merchant') {
                  uni.reLaunch({ url: '/pages/index/MerchantIndex/index' });
                }
              }, 800);
            } else {
              uni.showToast({ title: res.data.message || '登录失败', icon: 'none' });
            }
          },
          fail: () => {
            uni.hideLoading();
            uni.showToast({ title: '网络错误', icon: 'none' });
          }
        });
      }
    },
    skipLogin() {
      uni.showModal({
        title: '提示',
        content: '未授权登录将无法使用完整功能，是否继续？',
        confirmText: '继续',
        cancelText: '返回',
        success: (res) => {
          if (res.confirm) {
            const pages = getCurrentPages();
            if (pages.length > 1) {
              uni.navigateBack();
            } else {
              // 跳转到引导页或零工首页
              uni.reLaunch({ url: '/pages/guide/index' });
            }
          }
        }
      });
    }
  }
};
</script>

<style scoped>
.login-container {
  --primary-color: #619ac3;
  --primary-dark: #619ac3;
  --text-primary: #333;
  --text-secondary: #666;
  --text-light: #999;
  --border-light: #eee;
  --bg-light: #f9f9f9;
  --shadow-sm: 0 4rpx 12rpx rgba(0, 0, 0, 0.04);
  --shadow-md: 0 8rpx 24rpx rgba(0, 0, 0, 0.06);
  --radius-md: 16rpx;
  --radius-lg: 48rpx;

  background:linear-gradient(180deg, #f0fbfd 20%, #fafafa 100%);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 40rpx;
  box-sizing: border-box;
}

.navbar {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 30rpx 0 20rpx 0;
}

.title {
  font-size: 48rpx;
  font-weight:800;
  color:#4b8e88;
  letter-spacing: 2rpx;
}

.nav-icons {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  padding: 20rpx;
}

.avatar-wrap {
  margin: 40rpx 0 30rpx 0;
  display: flex;
  justify-content: center;
}

.avatar {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  border: 4rpx solid #fff;
  box-shadow: 0 12rpx 24rpx -8rpx #619ac3;
  transition: transform 0.3s ease;
}

.avatar:active {
  transform: scale(0.98);
}

.type-select {
  display: flex;
  justify-content: center;
  gap: 60rpx;
  margin: 30rpx 0 40rpx 0;
  width: 100%;
}

.type-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 0;
  cursor: pointer;
}

.radio-custom {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid var(--border-light);
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.type-item.active .radio-custom {
  border-color:#619ac3;
  background:#619ac3;
}

.radio-dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  background: #fff;
}

.type-label {
  font-size: 32rpx;
  color: var(--text-primary);
  font-weight: 600;
}

.type-item.active .type-label {
   color: #619ac3;
   font-weight: 700;
}

.login-input {
  width: 100%;
  height: 100rpx;
  background: var(--bg-light);
  border: 2rpx solid var(--border-light);
  border-radius: var(--radius-md);
  padding: 0 30rpx;
  font-size: 30rpx;
  color: var(--text-primary);
  transition: border-color 0.2s, box-shadow 0.2s;
  margin-bottom: 30rpx;
  box-sizing: border-box;
}

.login-input:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 6rpx rgba(139, 195, 74, 0.2);
  background: #fff;
}

.input-placeholder {
  color: var(--text-light);
  font-size: 30rpx;
}

.login-btn {
  width: 100%;
  height: 96rpx;
  border-radius: var(--radius-lg);
  font-size: 34rpx;
  font-weight: 600;
  letter-spacing: 4rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  margin: 20rpx 0 30rpx 0;
  box-shadow: var(--shadow-sm);
}

.login-btn.main {
  background:#619ac3;
  color: #fff;
}

.btn-hover {
  opacity: 0.9;
  transform: scale(0.98);
  box-shadow: var(--shadow-md);
}

.protocol {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  font-size: 26rpx;
  color: var(--text-secondary);
  margin: 20rpx 0;
  line-height: 1.6;
}

.checkbox-wrap {
  display: flex;
  align-items: center;
  margin-right: 10rpx;
  cursor: pointer;
}

.checkbox-custom {
  width: 36rpx;
  height: 36rpx;
  border-radius: 8rpx;
  border: 2rpx solid var(--border-light);
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.checkbox-custom.checked {
  background: var(--primary-color);
  border-color: var(--primary-color);
}

.protocol-text {
  margin-right: 6rpx;
}

.protocol-link {
  color:#619ac3;
  margin: 0 2rpx;
  font-weight: 500;
}

.skip-login {
  color: var(--text-light);
  font-size: 28rpx;
  margin: 40rpx 0 20rpx;
  padding: 20rpx 40rpx;
  border-radius: var(--radius-lg);
  transition: background 0.2s;
}

.skip-hover {
  background: rgba(0, 0, 0, 0.02);
}
</style>