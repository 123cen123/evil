<template>
  <view class="change-phone">
    <!-- 原手机号 -->
    <view class="change-phone__field">
      <text class="change-phone__label">原手机号</text>
      <input
        type="text"
        v-model="oldPhone"
        placeholder="请输入原手机号"
        placeholder-class="change-phone__placeholder"
        class="change-phone__input"
      />
    </view>

    <!-- 新手机号 -->
    <view class="change-phone__field">
      <text class="change-phone__label">新手机号</text>
      <input
        type="text"
        v-model="newPhone"
        placeholder="请输入新手机号"
        placeholder-class="change-phone__placeholder"
        class="change-phone__input"
      />
    </view>

    <!-- 确认新手机号 -->
    <view class="change-phone__field">
      <text class="change-phone__label">确认新手机号</text>
      <input
        type="text"
        v-model="confirmPhone"
        placeholder="请再次输入新手机号"
        placeholder-class="change-phone__placeholder"
        class="change-phone__input"
      />
    </view>

    <!-- 提交按钮 -->
    <button class="change-phone__button" @click="submitChangePhone">确认修改</button>
  </view>
</template>

<script>
export default {
  data() {
    return {
      oldPhone: '',
      newPhone: '',
      confirmPhone: ''
    };
  },
  methods: {
    submitChangePhone() {
      // 前端验证
      if (!this.oldPhone || !this.newPhone || !this.confirmPhone) {
        uni.showToast({ title: '请填写完整', icon: 'none' });
        return;
      }
      if (this.newPhone !== this.confirmPhone) {
        uni.showToast({ title: '两次输入的新手机号不一致', icon: 'none' });
        return;
      }
      if (this.newPhone === this.oldPhone) {
        uni.showToast({ title: '新手机号不能与原手机号相同', icon: 'none' });
        return;
      }

      const userInfo = uni.getStorageSync('userInfo');
      if (!userInfo) {
        uni.showToast({ title: '用户未登录', icon: 'none' });
        return;
      }

      // 检查用户类型
      const userType = uni.getStorageSync('userType');
      const userId = userType === 'worker' ? userInfo.worker_id : userInfo.id;
      if (!userId) {
        uni.showToast({ title: '用户信息错误', icon: 'none' });
        return;
      }
      const url = userType === 'worker'
        ? `http://localhost:3000/api/worker/change-phone/${userId}`
        : `http://localhost:3000/api/merchant/change-phone/${userId}`;

      uni.request({
        url: url,
        method: 'PUT',
        data: {
          oldPhone: this.oldPhone,
          newPhone: this.newPhone
        },
        success: (res) => {
          if (res.data.success) {
            uni.showToast({ title: '修改成功', icon: 'success' });
            uni.setStorageSync('phone', this.newPhone); // 更新本地手机号
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
.change-phone {
  background:linear-gradient(180deg, #f0fbfd 20%, #fafafa 100%);
  padding: 32rpx;
  min-height: 100vh;
  box-sizing: border-box;
}

/* 每个输入字段的外包装 */
.change-phone__field {
  margin-bottom: 40rpx; /* 增加间距，视觉更舒适 */
}

/* 标签样式 */
.change-phone__label {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 12rpx;
  font-weight: 500; /* 加一点字重，更清晰 */
}

/* 输入框样式 */
.change-phone__input {
  width: 100%;
  height: 88rpx;
  border: 2rpx solid #e0e0e0;     /* 稍微加粗边框，并调浅色 */
  border-radius: 12rpx;            /* 稍微增大圆角，更现代 */
  padding: 0 24rpx;
  font-size: 28rpx;
  box-sizing: border-box;
  background: #fafafa;             /* 浅灰背景，与白色区分 */
  transition: border-color 0.2s ease, background 0.2s ease; /* 平滑过渡 */
  pointer-events: auto;
  user-select: text;
  -webkit-user-select: text;
}

/* 输入框聚焦状态 */
.change-phone__input:focus {
  border-color: #007aff;           /* 聚焦时变为主题色 */
  background: #fff;                /* 背景变白，突出聚焦 */
  outline: none;                   /* 移除默认outline */
}

/* 占位符样式 */
.change-phone__placeholder {
  color: #aaa;
  font-size: 26rpx;
}

/* 提交按钮 */
.change-phone__button {
  margin-top: 80rpx;               /* 增加上边距，使布局更舒展 */
  background:#619ac3;
  color: #fff;
  font-size: 32rpx;
  border-radius: 12rpx;            /* 与输入框圆角一致 */
  padding: 24rpx 0;                /* 稍微增加内边距，按钮更大方 */
  font-weight: bold;
  border: none;
  width: 100%;
  transition: opacity 0.2s ease, background 0.2s ease; /* 平滑过渡 */
}

/* 按钮按压效果（适用于H5和App，小程序可能不支持） */
.change-phone__button:active {
  opacity: 0.8;
  background: #005bbf;             /* 按压时变深 */
}

/* 移除按钮默认边框（uni-app自带） */
button::after {
  border: none;
}
</style>