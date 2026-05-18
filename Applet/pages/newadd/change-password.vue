<template>
  <view class="change-password">
    <!-- 原密码 -->
    <view class="change-password__field">
      <text class="change-password__label">原密码</text>
      <input
        type="password"
        v-model="oldPassword"
        placeholder="请输入原密码"
        placeholder-class="change-password__placeholder"
        class="change-password__input"
      />
    </view>

    <!-- 新密码 -->
    <view class="change-password__field">
      <text class="change-password__label">新密码</text>
      <input
        type="password"
        v-model="newPassword"
        placeholder="请输入新密码"
        placeholder-class="change-password__placeholder"
        class="change-password__input"
      />
    </view>

    <!-- 确认新密码 -->
    <view class="change-password__field">
      <text class="change-password__label">确认新密码</text>
      <input
        type="password"
        v-model="confirmPassword"
        placeholder="请再次输入新密码"
        placeholder-class="change-password__placeholder"
        class="change-password__input"
      />
    </view>

    <!-- 提交按钮 -->
    <button class="change-password__button" @click="submitChangePassword">确认修改</button>
  </view>
</template>

<script>
export default {
  data() {
    return {
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
  },
  methods: {
    submitChangePassword() {
      // 前端验证
      if (!this.oldPassword || !this.newPassword || !this.confirmPassword) {
        uni.showToast({ title: '请填写完整', icon: 'none' });
        return;
      }
      if (this.newPassword !== this.confirmPassword) {
        uni.showToast({ title: '两次输入的新密码不一致', icon: 'none' });
        return;
      }
      if (this.newPassword === this.oldPassword) {
        uni.showToast({ title: '新密码不能与原密码相同', icon: 'none' });
        return;
      }

      const userInfo = uni.getStorageSync('userInfo');
      if (!userInfo) {
        uni.showToast({ title: '用户未登录', icon: 'none' });
        return;
      }

      // 根据用户类型选择接口
      const userType = uni.getStorageSync('userType');
      const userId = userType === 'worker' ? userInfo.worker_id : userInfo.id;
      if (!userId) {
        uni.showToast({ title: '用户信息错误', icon: 'none' });
        return;
      }
      const url = userType === 'worker'
        ? `http://localhost:3000/api/worker/change-password/${userId}`
        : `http://localhost:3000/api/merchant/change-password/${userId}`;

      uni.request({
        url: url,
        method: 'PUT',
        data: {
          oldPassword: this.oldPassword,
          newPassword: this.newPassword
        },
        success: (res) => {
          if (res.data.success) {
            uni.showToast({ title: '修改成功', icon: 'success' });
            setTimeout(() => {
              uni.navigateBack();
            }, 1500);
          } else {
            uni.showToast({ title: res.data.message || '修改失败', icon: 'none' });
          }
        },
        fail: () => {
          uni.showToast({ title: '网络错误', icon: 'none' });
        }
      });
    }
  }
}
</script>

<style scoped>
/* 容器：使用BEM命名规范，增强可维护性 */
.change-password {
  background:linear-gradient(180deg, #f0fbfd 20%, #fafafa 100%);
  padding: 32rpx;
  min-height: 100vh;
  box-sizing: border-box;
}

/* 每个输入字段的外包装 */
.change-password__field {
  margin-bottom: 40rpx; /* 增加间距，视觉更舒适 */
}

/* 标签样式 */
.change-password__label {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 12rpx;
  font-weight: 500; /* 加一点字重，更清晰 */
}

/* 输入框样式 */
.change-password__input {
  width: 100%;
  height: 88rpx;
  border: 2rpx solid #e0e0e0;     /* 稍微加粗边框，并调浅色 */
  border-radius: 12rpx;            /* 稍微增大圆角，更现代 */
  padding: 0 24rpx;
  font-size: 28rpx;
  box-sizing: border-box;
  background: #fafafa;             /* 浅灰背景，与白色区分 */
  transition: border-color 0.2s ease, background 0.2s ease; 
  pointer-events: auto;
  user-select: text;
  -webkit-user-select: text;
}

 
.change-password__input:focus {
  border-color: #007aff;            
  background: #fff;                
  outline: none;                    
}

 
.change-password__placeholder {
  color: #aaa;
  font-size: 26rpx;
}
 
.change-password__button {
  margin-top: 80rpx;              
  background: #619ac3;
  color: #fff;
  font-size: 32rpx;
  border-radius: 12rpx;            
  padding: 24rpx 0;                
  font-weight: bold;
  border: none;
  width: 100%;
  transition: opacity 0.2s ease, background 0.2s ease;
}


.change-password__button:active {
  opacity: 0.8;
  background: #005bbf;            
}

button::after {
  border: none;
}
</style>