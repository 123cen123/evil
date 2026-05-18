<template>
  <view class="page">
    <view class="card">
      <view class="header">
        <text class="title">实名认证</text>
        <view class="status-pill" :class="statusClass">
          <text class="status-text">{{ statusText }}</text>
        </view>
      </view>

      <view v-if="!isLoggedIn" class="empty">
        <text class="empty-text">请先登录后再进行实名认证</text>
        <button class="btn primary" @click="goLogin">去登录</button>
      </view>

      <!-- 只服务零工，商家显示错误提示 -->
      <view v-else-if="userType === 'merchant'" class="empty">
        <text class="empty-text">您是商家用户，请前往「商家身份验证」</text>
        <button class="btn primary" @click="goMerchantVerify">去商家身份验证</button>
      </view>

      <!-- 零工正常显示 -->
      <view v-else>
        <view v-if="status === 'approved'" class="tips ok">
          <text>您已完成实名认证，可正常报名。</text>
        </view>
        <view v-else-if="status === 'pending'" class="tips warn">
          <text>已提交，等待审核中。</text>
        </view>
        <view v-else-if="status === 'rejected'" class="tips err">
          <text>审核未通过：{{ reviewComment || '无' }}</text>
        </view>
        <view v-else class="tips">
          <text>请填写实名信息并上传身份证照片后提交审核。</text>
        </view>

        <view class="form">
          <view class="form-item">
            <text class="label">用户类型</text>
            <text class="value">{{ userTypeLabel }}</text>
          </view>
          <view class="form-item">
            <text class="label">用户ID</text>
            <text class="value">{{ userId || '-' }}</text>
          </view>

          <view class="form-item">
            <text class="label">真实姓名</text>
            <input class="input" v-model="realName" :disabled="status==='pending' || status==='approved'" placeholder="请输入真实姓名" />
          </view>
          <view class="form-item">
            <text class="label">身份证号</text>
            <input class="input" v-model="idCardNumber" :disabled="status==='pending' || status==='approved'" placeholder="请输入18位身份证号" maxlength="18" />
          </view>

          <view class="upload-row">
            <view class="upload-item">
              <text class="label">身份证正面</text>
              <view class="upload-box" @click="pickAndUpload('front')" :class="{ disabled: status==='pending' || status==='approved' }">
                <image v-if="idCardFront" class="upload-img" :src="idCardFront" mode="aspectFill" />
                <text v-else class="upload-placeholder">点击上传</text>
              </view>
            </view>
            <view class="upload-item">
              <text class="label">身份证反面</text>
              <view class="upload-box" @click="pickAndUpload('back')" :class="{ disabled: status==='pending' || status==='approved' }">
                <image v-if="idCardBack" class="upload-img" :src="idCardBack" mode="aspectFill" />
                <text v-else class="upload-placeholder">点击上传</text>
              </view>
            </view>
          </view>

          <button class="btn primary" :disabled="!canSubmit" @click="submit">
            {{ status === 'rejected' ? '重新提交' : '提交审核' }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      apiBase: 'http://localhost:3000',
      userType: '',
      userId: '',
      status: 'none',
      reviewComment: '',
      realName: '',
      idCardNumber: '',
      idCardFront: '',
      idCardBack: ''
    };
  },
  computed: {
    isLoggedIn() {
      return !!this.userType && !!this.userId;
    },
    userTypeLabel() {
      if (this.userType === 'worker') return '零工';
      return '-';
    },
    statusText() {
      if (this.status === 'approved') return '已通过';
      if (this.status === 'pending') return '待审核';
      if (this.status === 'rejected') return '已驳回';
      return '未提交';
    },
    statusClass() {
      return this.status || 'none';
    },
    canSubmit() {
      if (!this.isLoggedIn) return false;
      if (this.status === 'pending' || this.status === 'approved') return false;
      if (!this.realName) return false;
      if (!/^\d{17}[\dXx]$/.test(this.idCardNumber)) return false;
      return true;
    }
  },
  onShow() {
    this.initUser();
    if (this.isLoggedIn && this.userType === 'worker') {
      this.loadStatus();
    }
  },
  methods: {
    initUser() {
      const userInfo = uni.getStorageSync('userInfo') || {};
      const userType = uni.getStorageSync('userType') || '';
      this.userType = userType;
      this.userId = userType === 'worker' ? (userInfo.worker_id || userInfo.id) : '';
    },
    goLogin() {
      uni.navigateTo({ url: '/pages/login/login' });
    },
    goMerchantVerify() {
      uni.navigateTo({ url: '/pages/index/MerchantIndex/merchant-verification' });
    },
    loadStatus() {
      if (!this.userId) return;
      
      uni.request({
        url: `${this.apiBase}/api/identity/status`,
        method: 'GET',
        data: { user_type: this.userType, user_id: this.userId },
        success: (res) => {
          if (res.data && res.data.success) {
            const d = res.data.data || {};
            this.status = d.status || 'none';
            this.reviewComment = d.review_comment || '';
            if (d.real_name) {
              this.realName = d.real_name;
            }
            this.idCardFront = d.id_card_front || '';
            this.idCardBack = d.id_card_back || '';
          } else {
            uni.showToast({ title: res.data.message || '获取状态失败', icon: 'none' });
          }
        },
        fail: () => uni.showToast({ title: '网络错误', icon: 'none' })
      });
    },
    pickAndUpload(side) {
      if (this.status === 'pending' || this.status === 'approved') return;
      
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const filePath = res.tempFilePaths[0];
          uni.showLoading({ title: '上传中...' });
          uni.uploadFile({
            url: `${this.apiBase}/api/identity/upload`,
            filePath,
            name: 'file',
            success: (upRes) => {
              uni.hideLoading();
              if (upRes.statusCode === 200) {
                let data;
                try {
                  data = JSON.parse(upRes.data);
                } catch (e) {
                  uni.showToast({ title: '解析失败', icon: 'none' });
                  return;
                }
                if (data.success) {
                  const url = data.data.url;
                  if (side === 'front') this.idCardFront = url;
                  else this.idCardBack = url;
                } else {
                  uni.showToast({ title: data.message || '上传失败', icon: 'none' });
                }
              } else {
                uni.showToast({ title: '上传失败', icon: 'none' });
              }
            },
            fail: () => {
              uni.hideLoading();
              uni.showToast({ title: '网络错误', icon: 'none' });
            }
          });
        }
      });
    },
    submit() {
      if (!this.canSubmit) {
        uni.showToast({ title: '请完善信息后提交', icon: 'none' });
        return;
      }
      uni.showLoading({ title: '提交中...' });
      uni.request({
        url: `${this.apiBase}/api/identity/submit`,
        method: 'POST',
        data: {
          user_type: this.userType,
          user_id: this.userId,
          real_name: this.realName,
          id_card_number: this.idCardNumber,
          id_card_front: this.idCardFront,
          id_card_back: this.idCardBack
        },
        success: (res) => {
          uni.hideLoading();
          if (res.data && res.data.success) {
            uni.showToast({ title: '提交成功', icon: 'success' });
            this.loadStatus();
          } else {
            uni.showToast({ title: res.data.message || '提交失败', icon: 'none' });
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
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f0fbfd 20%, #fafafa 100%);
  padding: 24rpx;
  box-sizing: border-box;
}

.card {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  border: 2rpx solid #e0e0e0;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22rpx;
}

.title {
  font-size: 36rpx;
  font-weight: 700;
  color: #222;
}

.status-pill {
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: #eee;
}

.status-pill.approved {
  background: #e8f5e9;
}

.status-pill.pending {
  background: #fff8e1;
}

.status-pill.rejected {
  background: #ffebee;
}

.status-pill.none {
  background: #eceff1;
}

.status-text {
  font-size: 24rpx;
  color: #333;
}

.tips {
  padding: 18rpx 20rpx;
  border-radius: 12rpx;
  background: #f5f5f5;
  color: #444;
  margin-bottom: 22rpx;
  font-size: 26rpx;
}

.tips.ok {
  background: #e8f5e9;
  color: #2e7d32;
}

.tips.warn {
  background: #fff8e1;
  color: #ef6c00;
}

.tips.err {
  background: #ffebee;
  color: #c62828;
}

.form-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.label {
  font-size: 26rpx;
  color: #666;
  width: 160rpx;
  flex-shrink: 0;
}

.value {
  font-size: 26rpx;
  color: #222;
  flex: 1;
  text-align: right;
}

.input {
  flex: 1;
  text-align: right;
  font-size: 26rpx;
  color: #222;
  padding: 0 10rpx;
}

/* 上传区域布局 */
.upload-row {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  gap: 20rpx;
  margin: 24rpx 0;
}

.upload-item {
  flex: 1;
  min-width: 0;
  width: 0;
}

.upload-item .label {
  display: block;
  margin-bottom: 12rpx;
  width: auto;
}

.upload-box {
  width: 100%;
  height: 200rpx;
  background: #fafafa;
  border: 1rpx dashed #ddd;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  transition: all 0.2s ease;
}

.upload-box:active {
  background: #f0f0f0;
  transform: scale(0.98);
}

.upload-box.disabled {
  opacity: 0.6;
  pointer-events: none;
}

.upload-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upload-placeholder {
  color: #999;
  font-size: 26rpx;
}

/* 预览提示（可选） */
.preview-tip {
  text-align: center;
  margin-top: 8rpx;
}

.tip-text {
  font-size: 22rpx;
  color: #619ac3;
}

/* 按钮样式 */
.btn {
  width: 100%;
  border-radius: 12rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  font-weight: 600;
  margin-top: 20rpx;
  border: none;
  transition: all 0.2s ease;
}

.btn.primary {
  background: #619ac3;
  color: #fff;
}

.btn.primary:active {
  background: #4a8aaf;
  transform: scale(0.98);
}

.btn:disabled {
  background: #bdbdbd;
  color: #fff;
  opacity: 0.6;
}

/* 空状态样式 */
.empty {
  padding: 40rpx 0;
  text-align: center;
}

.empty-text {
  color: #666;
  font-size: 28rpx;
  display: block;
  margin-bottom: 20rpx;
}
</style>