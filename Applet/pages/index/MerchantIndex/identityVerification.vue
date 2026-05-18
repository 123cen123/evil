<template>
  <view class="page">
    <view class="card">
      <view class="header">
        <text class="title">商家身份验证</text>
        <view class="status-pill" :class="statusClass">
          <text class="status-text">{{ statusText }}</text>
        </view>
      </view>

      <!-- 未登录 -->
      <view v-if="!isLoggedIn" class="empty">
        <text class="empty-text">请先登录后再进行身份验证</text>
        <button class="btn primary" @click="goLogin">去登录</button>
      </view>

      <!-- 零工用户误入 -->
      <view v-else-if="userType === 'worker'" class="empty">
        <text class="empty-text">您是零工用户，请前往「实名认证」</text>
        <button class="btn primary" @click="goWorkerVerify">去实名认证</button>
      </view>

      <!-- 商家正常显示 -->
      <view v-else>
        <!-- 状态提示 -->
        <view v-if="status === 'approved'" class="tips ok">
          <text>✅ 您已完成商家身份验证，可正常发布任务。</text>
        </view>
        <view v-else-if="status === 'pending'" class="tips warn">
          <text>⏳ 已提交，等待审核中。</text>
        </view>
        <view v-else-if="status === 'rejected'" class="tips err">
          <text>❌ 审核未通过：{{ reviewComment || '请重新提交' }}</text>
        </view>
        <view v-else class="tips">
          <text>📋 请填写商家信息并上传相关证件后提交审核。</text>
        </view>

        <!-- 表单 - 只有未提交或驳回时可编辑 -->
        <view class="form" v-if="status !== 'pending' && status !== 'approved'">
          <view class="form-item">
            <text class="label">商家名称</text>
            <input class="input" v-model="merchantName" placeholder="请输入商家名称" />
          </view>
          <view class="form-item">
            <text class="label">联系人</text>
            <input class="input" v-model="contactName" placeholder="请输入联系人姓名" />
          </view>
          <view class="form-item">
            <text class="label">联系电话</text>
            <input class="input" v-model="contactPhone" placeholder="请输入联系电话" maxlength="11" type="number" />
          </view>
          <view class="form-item">
            <text class="label">经营地址</text>
            <input class="input" v-model="address" placeholder="请输入经营地址" />
          </view>
          
          <view class="upload-section">
            <text class="section-title">上传证件</text>
            
            <view class="upload-item">
              <text class="label">营业执照</text>
              <view class="upload-box" @click="pickAndUpload('business_license')">
                <image v-if="businessLicense" class="upload-img" :src="businessLicense" mode="aspectFill" @click.stop="previewImage(businessLicense)" />
                <text v-else class="upload-placeholder">点击上传</text>
              </view>
            </view>
            
            <view class="upload-item">
              <text class="label">营业许可证</text>
              <view class="upload-box" @click="pickAndUpload('permit')">
                <image v-if="permit" class="upload-img" :src="permit" mode="aspectFill" @click.stop="previewImage(permit)" />
                <text v-else class="upload-placeholder">点击上传</text>
              </view>
            </view>
          </view>

          <button class="btn primary" :disabled="!canSubmit" @click="submit">
            {{ status === 'rejected' ? '重新提交' : '提交审核' }}
          </button>
        </view>

        <!-- 已通过或审核中的只读状态 -->
        <view class="readonly-info" v-else>
          <view class="info-item">
            <text class="info-label">商家名称</text>
            <text class="info-value">{{ merchantName || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">联系人</text>
            <text class="info-value">{{ contactName || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">联系电话</text>
            <text class="info-value">{{ contactPhone || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">经营地址</text>
            <text class="info-value">{{ address || '-' }}</text>
          </view>
          
          <view class="upload-section" v-if="businessLicense || permit">
            <text class="section-title">已上传证件</text>
            <view class="uploaded-images">
              <image v-if="businessLicense" class="uploaded-img" :src="businessLicense" mode="aspectFill" @click="previewImage(businessLicense)" />
              <image v-if="permit" class="uploaded-img" :src="permit" mode="aspectFill" @click="previewImage(permit)" />
            </view>
          </view>
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
      merchantName: '',
      contactName: '',
      contactPhone: '',
      address: '',
      businessLicense: '',
      permit: ''
    };
  },
  computed: {
    isLoggedIn() {
      return !!this.userType && !!this.userId;
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
      if (this.userType !== 'merchant') return false;
      if (this.status === 'pending' || this.status === 'approved') return false;
      if (!this.merchantName.trim()) return false;
      if (!this.contactName.trim()) return false;
      if (!/^1[3-9]\d{9}$/.test(this.contactPhone)) return false;
      if (!this.address.trim()) return false;
      if (!this.businessLicense) return false;
      return true;
    }
  },
  onShow() {
    this.initUser();
    if (this.isLoggedIn && this.userType === 'merchant') {
      this.loadStatus();
    }
  },
  methods: {
    initUser() {
      const userInfo = uni.getStorageSync('userInfo') || {};
      const userType = uni.getStorageSync('userType') || '';
      
      this.userType = userType;
      
      if (userType === 'merchant') {
        this.userId = userInfo.merchant_id || userInfo.id;
        // 预填商家信息
        if (userInfo.name || userInfo.shop_name) {
          this.merchantName = userInfo.name || userInfo.shop_name;
        }
        if (userInfo.contact) this.contactName = userInfo.contact;
        if (userInfo.phone) this.contactPhone = userInfo.phone;
        if (userInfo.address) this.address = userInfo.address;
      } else if (userType === 'worker') {
        this.userId = userInfo.worker_id || userInfo.id;
      }
    },
    goLogin() {
      uni.navigateTo({ url: '/pages/login/login' });
    },
    goWorkerVerify() {
      uni.navigateTo({ url: '/pages/index/WorkerIndex/identityVerification' });
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
            // 加载已保存的商家信息
            if (d.merchant_name) this.merchantName = d.merchant_name;
            if (d.contact_phone) this.contactPhone = d.contact_phone;
            if (d.address) this.address = d.address;
            if (d.business_license) this.businessLicense = d.business_license;
            if (d.permit) this.permit = d.permit;
          } else {
            uni.showToast({ title: res.data.message || '获取状态失败', icon: 'none' });
          }
        },
        fail: () => uni.showToast({ title: '网络错误', icon: 'none' })
      });
    },
    pickAndUpload(type) {
      if (this.status === 'pending' || this.status === 'approved') {
        uni.showToast({ title: '审核中或已通过，无法修改', icon: 'none' });
        return;
      }
      
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
                  if (type === 'business_license') {
                    this.businessLicense = url;
                  } else if (type === 'permit') {
                    this.permit = url;
                  }
                  uni.showToast({ title: '上传成功', icon: 'success' });
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
    previewImage(url) {
      uni.previewImage({
        urls: [url],
        fail: () => {
          uni.showToast({ title: '图片加载失败', icon: 'none' });
        }
      });
    },
    submit() {
      if (!this.canSubmit) {
        uni.showToast({ title: '请完整填写所有信息并上传营业执照', icon: 'none' });
        return;
      }
      
      uni.showLoading({ title: '提交中...' });
      uni.request({
        url: `${this.apiBase}/api/identity/submit`,
        method: 'POST',
        data: {
          user_type: this.userType,
          user_id: this.userId,
          real_name: this.contactName,
          id_card_number: '',
          id_card_front: '',
          id_card_back: '',
          business_license: this.businessLicense,
          permit: this.permit,
          merchant_name: this.merchantName,
          contact_phone: this.contactPhone,
          address: this.address
        },
        success: (res) => {
          uni.hideLoading();
          if (res.data && res.data.success) {
            uni.showToast({ title: '提交成功，等待审核', icon: 'success' });
            this.status = 'pending';
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

.status-pill.approved { background: #e8f5e9; }
.status-pill.pending { background: #fff8e1; }
.status-pill.rejected { background: #ffebee; }
.status-pill.none { background: #eceff1; }

.status-text { font-size: 24rpx; color: #333; }

.tips {
  padding: 18rpx 20rpx;
  border-radius: 12rpx;
  background: #f5f5f5;
  color: #444;
  margin-bottom: 22rpx;
  font-size: 26rpx;
}

.tips.ok { background: #e8f5e9; color: #2e7d32; }
.tips.warn { background: #fff8e1; color: #ef6c00; }
.tips.err { background: #ffebee; color: #c62828; }

.form-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.label { font-size: 26rpx; color: #666; width: 160rpx; }
.input {
  flex: 1;
  text-align: right;
  font-size: 26rpx;
  color: #222;
  padding: 0 10rpx;
}

.upload-section {
  margin: 24rpx 0;
}
.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 16rpx;
}
.upload-item {
  margin-bottom: 16rpx;
}
.upload-box {
  height: 200rpx;
  border-radius: 12rpx;
  background: #fafafa;
  border: 1rpx dashed #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin-top: 8rpx;
}
.upload-img { width: 100%; height: 100%; }
.upload-placeholder { color: #999; font-size: 26rpx; }

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
}

.btn.small {
  height: 60rpx;
  font-size: 26rpx;
  margin-top: 0;
}

.btn.primary {
  background: #619ac3;
  color: #fff;
}

.btn:disabled {
  background: #bdbdbd;
  color: #fff;
}

.empty { padding: 40rpx 0; text-align: center; }
.empty-text { color: #666; font-size: 28rpx; display: block; margin-bottom: 20rpx; }

/* 只读信息样式 */
.readonly-info {
  margin-top: 16rpx;
}
.info-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}
.info-label {
  font-size: 26rpx;
  color: #666;
  width: 160rpx;
}
.info-value {
  flex: 1;
  text-align: right;
  font-size: 26rpx;
  color: #222;
}
.uploaded-images {
  display: flex;
  gap: 20rpx;
  margin-top: 16rpx;
}
.uploaded-img {
  width: 150rpx;
  height: 150rpx;
  border-radius: 12rpx;
  background: #f5f5f5;
}
</style>