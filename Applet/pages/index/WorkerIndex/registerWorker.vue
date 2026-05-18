<template>
  <view class="register-container">
    <!-- 顶部导航栏 -->
    <view class="navbar">
      <!-- 导航栏已简化 -->
    </view>

    <!-- 注册表单 -->
    <view class="form-section">
      <view class="form-title">请填写注册信息</view>

      <!-- 分组1：基本信息 -->
      <view class="form-group">
        <view class="group-title">基本信息</view>

        <!-- 姓名 -->
        <view class="form-item">
          <view class="label">
            姓名
            <text class="required-star">*</text>
          </view>
          <view class="input-wrapper">
            <uni-icons type="person" size="20" color="#999" class="input-icon" />
            <input
              class="input"
              v-model="form.name"
              placeholder="请输入姓名"
              placeholder-class="input-placeholder"
            />
          </view>
        </view>

        <!-- 性别 -->
        <view class="form-item">
          <view class="label">
            性别
            <text class="required-star">*</text>
          </view>
          <picker
            mode="selector"
            :range="genderOptions.slice(1)"
            :range-key="'label'"
            :value="form.genderIndex > 0 ? form.genderIndex - 1 : 0"
            @change="onGenderChange"
          >
            <view class="input-wrapper picker-wrapper">
              <uni-icons type="people" size="20" color="#999" class="input-icon" />
              <view class="picker-content">
                <text :class="['picker-text', form.genderIndex > 0 ? '' : 'placeholder']">
                  {{ genderOptions[form.genderIndex] ? genderOptions[form.genderIndex].label : '请选择性别' }}
                </text>
                <uni-icons type="arrowdown" size="16" color="#999" />
              </view>
            </view>
          </picker>
        </view>

        <!-- 年龄 -->
        <view class="form-item">
          <view class="label">
            年龄
            <text class="required-star">*</text>
          </view>
          <view class="input-wrapper">
            <uni-icons type="calendar" size="20" color="#999" class="input-icon" />
            <input
              class="input"
              v-model="form.age"
              placeholder="请输入年龄"
              type="number"
              placeholder-class="input-placeholder"
            />
          </view>
        </view>
      </view>

      <!-- 分组2：联系方式 -->
      <view class="form-group">
        <view class="group-title">联系方式</view>

        <!-- 联系电话 -->
        <view class="form-item">
          <view class="label">
            联系电话
            <text class="required-star">*</text>
          </view>
          <view class="input-wrapper">
            <uni-icons type="phone" size="20" color="#999" class="input-icon" />
            <input
              class="input"
              v-model="form.phone"
              placeholder="请输入联系电话"
              type="tel"
              placeholder-class="input-placeholder"
            />
          </view>
        </view>
      </view>

      <!-- 分组3：能力与安全 -->
      <view class="form-group">
        <view class="group-title">能力与安全</view>

        <!-- 技能特长 -->
        <view class="form-item">
          <view class="label">
            技能特长
            <text class="required-star">*</text>
          </view>
          <view class="input-wrapper">
            <uni-icons type="star" size="20" color="#999" class="input-icon" />
            <input
              class="input"
              v-model="form.skills"
              placeholder="请输入技能特长"
              placeholder-class="input-placeholder"
            />
          </view>
        </view>

        <!-- 登录密码 -->
        <view class="form-item">
          <view class="label">
            登录密码
            <text class="required-star">*</text>
          </view>
          <view class="input-wrapper">
            <uni-icons type="locked" size="20" color="#999" class="input-icon" />
            <input
              class="input"
              v-model="form.password"
              placeholder="请输入登录密码（至少6位）"
              type="password"
              placeholder-class="input-placeholder"
            />
          </view>
        </view>
      </view>

      <!-- 提交按钮 -->
      <button class="submit-btn" @click="submitForm">
        <text class="btn-text">提交注册</text>
        <view class="btn-glow"></view>
      </button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      genderOptions: [
        { label: '请选择性别', value: '' },
        { label: '男', value: 'male' },
        { label: '女', value: 'female' }
      ],
      form: {
        name: '',
        phone: '',
        genderIndex: 0,
        age: '',
        skills: '',
        password: ''
      },
      showGenderPicker: false
    }
  },
  methods: {
    onGenderChange(e) {
      this.form.genderIndex = Number(e.detail.value) + 1;
      this.showGenderPicker = false;
    },
    submitForm() {
      if (!this.form.name || !this.form.phone || !this.form.age || !this.form.skills || !this.form.password || this.form.genderIndex === 0) {
        uni.showToast({ title: '请完善信息', icon: 'none' });
        return;
      }
      if (this.form.password.length < 6) {
        uni.showToast({ title: '密码长度不能小于6位', icon: 'none' });
        return;
      }
      if (!/^1[3-9]\d{9}$/.test(this.form.phone)) {
        uni.showToast({ title: '手机号格式不正确', icon: 'none' });
        return;
      }
      
      uni.showLoading({ title: '注册中...' });
      
      uni.request({
        url: 'http://localhost:3000/api/worker/register',
        method: 'POST',
        data: {
          name: this.form.name,
          phone: this.form.phone,
          gender: this.genderOptions[this.form.genderIndex].value,
          age: this.form.age,
          skills: this.form.skills,
          password: this.form.password
        },
        success: (res) => {
          uni.hideLoading();
          if (res.data.success) {
            const workerInfo = res.data.data;
            uni.setStorageSync('userInfo', workerInfo);
            uni.setStorageSync('userType', 'worker');
            uni.showToast({ title: '注册成功', icon: 'success' });
            setTimeout(() => {
              // 修正路径：跳转到零工首页，而不是 mine
              uni.reLaunch({ url: '/pages/index/WorkerIndex/index' });
            }, 800);
          } else {
            uni.showToast({ title: res.data.message || '注册失败', icon: 'none' });
          }
        },
        fail: () => {
          uni.hideLoading();
          uni.showToast({ title: '网络错误', icon: 'none' });
        }
      });
    }
  }
}
</script>

<style scoped>
/* 整体容器 - 柔和渐变背景 */
.register-container {
  background:linear-gradient(180deg, #f0fbfd 20%, #fafafa 100%);
  min-height: 100vh;
  padding: 32rpx;
  box-sizing: border-box;
  position: relative;
}

/* 导航栏 - 透明简洁 */
.navbar {
  height: 40rpx;
  background-color: transparent;
}

/* 表单主卡片 */
.form-section {
  background: #ffffff;
  border-radius: 48rpx;
  padding: 48rpx 36rpx 56rpx;
  box-shadow: 0 20rpx 40rpx rgba(0, 0, 0, 0.04), 0 4rpx 12rpx rgba(0, 0, 0, 0.02);
}

/* 表单主标题 */
.form-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1a2c3e;
  margin-bottom: 40rpx;
  text-align: center;
  letter-spacing: 2rpx;
  position: relative;
}

.form-title::after {
  content: '';
  position: absolute;
  bottom: -16rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 60rpx;
  height: 6rpx;
  background: linear-gradient(90deg, #619ac3, #4a9eff);
  border-radius: 6rpx;
}

/* 分组 */
.form-group {
  margin-bottom: 44rpx;
}

.form-group:last-child {
  margin-bottom: 0;
}

/* 分组标题 */
.group-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #6c7a8a;
  margin-bottom: 24rpx;
  padding-left: 8rpx;
  letter-spacing: 1rpx;
}

.group-title::after {
  display: none;
}

/* 表单项 */
.form-item {
  margin-bottom: 28rpx;
}

/* 标签 */
.label {
  display: block;
  font-size: 28rpx;
  color: #334155;
  margin-bottom: 14rpx;
  font-weight: 540;
}

.required-star {
  color: #ef4444;
  margin-left: 6rpx;
  font-size: 28rpx;
}

/* 输入框容器 - 现代圆角 */
.input-wrapper {
  width: 100%;
  height: 92rpx;
  background: #f8fafc;
  border: 1.5rpx solid #e2e8f0;
  border-radius: 28rpx;
  padding: 0 28rpx;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  transition: all 0.25s ease;
}

.input-wrapper:focus-within {
  border-color: #619ac3;
  background: #ffffff;
  box-shadow: 0 0 0 6rpx rgba(97, 154, 195, 0.12);
  transform: translateY(-2rpx);
}

/* 图标样式 */
.input-icon {
  margin-right: 16rpx;
  flex-shrink: 0;
  opacity: 0.7;
}

.input-wrapper:focus-within .input-icon {
  opacity: 1;
}

/* 输入框 */
.input {
  flex: 1;
  height: 100%;
  font-size: 28rpx;
  color: #1e293b;
  background: transparent;
  border: none;
  outline: none;
}

.input-placeholder {
  color: #94a3b8;
  font-size: 26rpx;
}

/* 选择器样式 */
.picker-wrapper {
  padding: 0 28rpx;
  cursor: pointer;
}

.picker-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
}

.picker-text {
  font-size: 28rpx;
  color: #1e293b;
  flex: 1;
}

.picker-text.placeholder {
  color: #94a3b8;
}

/* 提交按钮 - 纯色 #619ac3 */
.submit-btn {
  margin-top: 72rpx;
  background: #619ac3;
  color: #ffffff;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 48rpx;
  padding: 28rpx 0;
  border: none;
  width: 100%;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  box-shadow: 0 12rpx 24rpx rgba(97, 154, 195, 0.3);
}

.btn-text {
  position: relative;
  z-index: 2;
  letter-spacing: 4rpx;
}

.btn-glow {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  transition: left 0.5s ease;
  z-index: 1;
  border-radius: 48rpx;
}

.submit-btn:active {
  transform: scale(0.97);
  background: #5082a6;
  box-shadow: 0 6rpx 16rpx rgba(97, 154, 195, 0.4);
}

.submit-btn:active .btn-glow {
  left: 100%;
}

button::after {
  border: none;
}

/* 响应式微调 */
@media (max-width: 768px) {
  .register-container {
    padding: 24rpx;
  }
  
  .form-section {
    padding: 36rpx 28rpx 48rpx;
  }
  
  .form-title {
    font-size: 32rpx;
  }
  
  .submit-btn {
    margin-top: 56rpx;
    padding: 24rpx 0;
  }
}
</style>