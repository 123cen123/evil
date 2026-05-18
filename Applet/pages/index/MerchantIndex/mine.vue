<template>
  <view class="mine-page">
    <view class="header-bg">
      <view class="user-card" @click="goLogin">
        <view class="avatar">
          <template v-if="userInfo && (userInfo.avatar || userInfo.logo)">
            <image class="avatar-img" :src="avatarUrl" mode="aspectFill" />
          </template>
          <template v-else>
            <view class="avatar-placeholder">
              <uni-icons type="person-filled" size="50" color="#dedede" />
            </view>
          </template>
        </view>
        <view class="user-text">
          <template v-if="userInfo && userType">
            <text class="user-name">{{ displayNameLabel }}{{ displayName }}</text>
            <view class="user-tags">
              <text class="tag">{{ userTypeLabel }}</text>
              <text class="tag" v-if="verificationStatus === 'approved'">已验证</text>
            </view>
            <text class="user-other">{{ displayDescLabel }}{{ displayDesc }}</text>
            <text class="user-phone" v-if="userInfo.phone">📱 {{ userInfo.phone }}</text>
          </template>
          <template v-else>
            <text class="login-text">点击登录 / 注册</text>
            <text class="login-tip">登录后体验更多功能</text>
          </template>
        </view>
        <view class="go-arrow" v-if="!userInfo || !userType">
          <uni-icons type="right" size="20" color="#fff" />
        </view>
      </view>

      <view class="stats-card" v-if="userInfo && userType">
        <view class="stat-item" @click="goTaskV2">
          <text class="stat-num">{{ taskCount }}</text>
          <text class="stat-label">发布任务</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item" @click="goApplications">
          <text class="stat-num">{{ applicationCount }}</text>
          <text class="stat-label">报名人数</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item" @click="goWallet">
          <text class="stat-num">¥{{ walletAmount }}</text>
          <text class="stat-label">账户余额</text>
        </view>
      </view>
    </view>

    <view class="func-section">
      <view class="func-card">
        <view class="func-list">
          <view class="func-list-item" @click="goProfile">
            <view class="func-list-left">
              <view class="func-icon" style="background: #fff;">
                <uni-icons type="shop" size="28" color="#667eea" />
              </view>
              <text>店铺信息</text>
            </view>
            <uni-icons type="right" size="20" color="#ccc" />
          </view>
          
          <view class="func-list-item" @click="goIdentity">
            <view class="func-list-left">
              <view class="func-icon" style="background:#fff ;">
                <uni-icons type="checkmarkempty" size="28" color="#4CAF50" />
              </view>
              <text>商家身份验证</text>
            </view>
            <view class="func-right">
              <uni-icons type="right" size="20" color="#ccc" />
            </view>
          </view>
          
          <view class="func-list-item" @click="goTaskV2">
            <view class="func-list-left">
              <view class="func-icon" style="background: #fff;">
                <uni-icons type="list" size="28" color="#4facfe" />
              </view>
              <text>我发布的任务</text>
            </view>
            <uni-icons type="right" size="20" color="#ccc" />
          </view>
          
          <view class="func-list-item" @click="goTaskV2Page">
            <view class="func-list-left">
              <view class="func-icon" style="background:#fff ;">
                <uni-icons type="calendar" size="28" color="#8E24AA" />
              </view>
              <text>审核与评价</text>
            </view>
            <uni-icons type="right" size="20" color="#ccc" />
          </view>
          
          <view class="func-list-item" @click="goWallet">
            <view class="func-list-left">
              <view class="func-icon" style="background: #fff;">
                <uni-icons type="wallet" size="28" color="#FF9800" />
              </view>
              <text>我的钱包</text>
            </view>
            <uni-icons type="right" size="20" color="#ccc" />
          </view>
          
          <view class="func-list-item" @click="goSetting">
            <view class="func-list-left">
              <view class="func-icon" style="background: #fff;">
                <uni-icons type="gear" size="28" color="#78909C" />
              </view>
              <text>设置</text>
            </view>
            <uni-icons type="right" size="20" color="#ccc" />
          </view>
        </view>
      </view>
    </view>

    <view class="footer-tip">
      <text>邕工帮 · 诚信用工平台</text>
    </view>
    
    <CustomTabBar :current="2" />
  </view>
</template>

<script>
import CustomTabBar from '@/components/MerchantComponents/CustomTabBar.vue'

export default {
  components: { CustomTabBar },
  data() {
    return {
      apiBase: 'http://localhost:3000',
      userInfo: null,
      userType: '',
      taskCount: 0,
      applicationCount: 0,
      walletAmount: '0.00',
      verificationStatus: 'none'
    }
  },
  computed: {
    avatarUrl() {
      if (!this.userInfo) return '';
      return this.userInfo.avatar || this.userInfo.logo || '';
    },
    displayName() {
      if (!this.userInfo) return '';
      if (this.userType === 'merchant') return this.userInfo.name || this.userInfo.shop_name || '';
      if (this.userType === 'worker') return this.userInfo.name || '';
      return '';
    },
    displayDesc() {
      if (!this.userInfo) return '';
      if (this.userType === 'merchant') return this.userInfo.contact || '';
      if (this.userType === 'worker') return this.userInfo.skills || '';
      return '';
    },
    displayNameLabel() {
      if (!this.userInfo) return '';
      if (this.userType === 'merchant') return '';
      if (this.userType === 'worker') return '';
      return '';
    },
    displayDescLabel() {
      if (!this.userInfo) return '';
      if (this.userType === 'merchant') return '联系人：';
      if (this.userType === 'worker') return '技能：';
      return '';
    },
    userTypeLabel() {
      if (!this.userType) return '';
      if (this.userType === 'merchant') return '商家';
      if (this.userType === 'worker') return '零工';
      return '';
    }
  },
  onShow() {
    this.loadUserInfo();
    this.loadStats();
    if (this.userInfo && this.userType === 'merchant') {
      this.loadVerificationStatus();
    }
  },
  methods: {
    loadUserInfo() {
      this.userInfo = uni.getStorageSync('userInfo') || null;
      this.userType = uni.getStorageSync('userType') || '';
    },
    loadStats() {
      if (!this.userInfo || !this.userType || this.userType !== 'merchant') {
        this.taskCount = 0;
        this.applicationCount = 0;
        this.walletAmount = '0.00';
        return;
      }
      
      const merchantId = this.userInfo.merchant_id || this.userInfo.id;
      if (!merchantId) {
        this.taskCount = 0;
        this.applicationCount = 0;
        this.walletAmount = '0.00';
        return;
      }
      
      Promise.all([
        uni.request({
          url: `${this.apiBase}/api/wallet/summary`,
          data: { user_type: 'merchant', user_id: merchantId }
        }),
        uni.request({
          url: `${this.apiBase}/api/demand/list`,
          data: { merchant_id: merchantId }
        }),
        uni.request({
          url: `${this.apiBase}/api/merchant/${merchantId}/applications`,
          data: { group: 'pending_service' }
        })
      ]).then((results) => {
        const walletRes = results[0];
        const demandRes = results[1];
        const appsRes = results[2];
        
        if (walletRes.data && walletRes.data.success) {
          this.walletAmount = Number(walletRes.data.data.balance || 0).toFixed(2);
        } else {
          this.walletAmount = '0.00';
        }
        
        if (demandRes.data && demandRes.data.success) {
          this.taskCount = demandRes.data.data.length || 0;
        } else {
          this.taskCount = 0;
        }
        
        if (appsRes.data && appsRes.data.success) {
          this.applicationCount = appsRes.data.data.length || 0;
        } else {
          this.applicationCount = 0;
        }
      }).catch(e => {
        console.error('获取统计数据失败', e);
        this.taskCount = 0;
        this.applicationCount = 0;
        this.walletAmount = '0.00';
      });
    },
    loadVerificationStatus() {
      const userId = this.userInfo.merchant_id || this.userInfo.id;
      if (!userId) return;
      
      uni.request({
        url: `${this.apiBase}/api/identity/status`,
        method: 'GET',
        data: { user_type: 'merchant', user_id: userId },
        success: (res) => {
          if (res.data && res.data.success) {
            const d = res.data.data || {};
            this.verificationStatus = d.status || 'none';
          }
        },
        fail: (err) => {
          console.log('获取认证状态失败:', err);
        }
      });
    },
    showMenu() {
      uni.showActionSheet({
        itemList: ['关于我们', '意见反馈', '帮助中心'],
        success: (res) => {
          if (res.tapIndex === 0) {
            uni.showToast({ title: '关于我们', icon: 'none' });
          } else if (res.tapIndex === 1) {
            uni.showToast({ title: '意见反馈', icon: 'none' });
          } else if (res.tapIndex === 2) {
            uni.navigateTo({ url: '/pages/help/help' });
          }
        }
      });
    },
    goProfile() {
      uni.navigateTo({ url: '/pages/index/MerchantIndex/merchant-profile' });
    },
    goIdentity() {
      if (!this.userInfo || !this.userType) {
        this.showLoginModal();
        return;
      }
      uni.navigateTo({ url: '/pages/index/MerchantIndex/merchant-verification' });
    },
    goWallet() {
      uni.navigateTo({ url: '/pages/index/MerchantIndex/wallet' });
    },
    goTaskV2() {
      uni.navigateTo({ url: '/pages/task/MerchantTask/task' });
    },
    goTaskV2Page() {
      uni.navigateTo({ url: '/pages/task/MerchantTask/taskV2' });
    },
    goApplications() {
      uni.navigateTo({ url: '/pages/task/MerchantTask/taskV2' });
    },
    goSetting() {
      uni.navigateTo({ url: '/pages/index/MerchantIndex/setting' });
    },
    goLogin() {
      if (!this.userInfo || !this.userType) {
        uni.navigateTo({ url: '/pages/login/login' });
      }
    },
    showLoginModal() {
      uni.showModal({
        title: '请先登录',
        content: '登录后才可以进行此操作',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) uni.navigateTo({ url: '/pages/login/login' });
        }
      });
    }
  }
}
</script>

<style scoped>
.mine-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f0fbfd 20%, #fafafa 100%);
  padding-bottom: 120rpx;
}

.header-bg {
  background: linear-gradient(180deg, #75ccff 0%, #81e2f6 60%, #f0fbfd 100%);
  border-bottom-left-radius: 48rpx;
  border-bottom-right-radius: 48rpx;
  padding-bottom: 60rpx;
  position: relative;
  padding-top: 20rpx;
}

.user-card {
  display: flex;
  align-items: center;
  padding: 60rpx 32rpx 20rpx 32rpx;
  position: relative;
  z-index: 2;
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  margin-right: 28rpx;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.15);
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.user-text {
  flex: 1;
}

.user-name {
  font-size: 36rpx;
  font-weight: bold;
  color: #fff;
  margin-bottom: 12rpx;
  display: block;
  text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.1);
}

.user-tags {
  display: flex;
  gap: 12rpx;
  margin-bottom: 12rpx;
  flex-wrap: wrap;
}

.tag {
  font-size: 22rpx;
  color: #fff;
  background: rgba(255, 255, 255, 0.25);
  padding: 6rpx 16rpx;
  border-radius: 30rpx;
}

.user-other, .user-phone {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.9);
  display: block;
  margin-top: 6rpx;
}

.login-text {
  font-size: 36rpx;
  font-weight: bold;
  color: #fff;
  display: block;
  margin-bottom: 8rpx;
  text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.1);
}

.login-tip {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}

.go-arrow {
  width: 56rpx;
  height: 56rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stats-card {
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: #fff;
  margin: 20rpx 32rpx 0 32rpx;
  border-radius: 32rpx;
  padding: 32rpx 16rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.08);
  position: relative;
  z-index: 3;
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-num {
  font-size: 40rpx;
  font-weight: bold;
  color: #0f59a4;
  display: block;
  margin-bottom: 8rpx;
}

.stat-label {
  font-size: 24rpx;
  color: #888;
}

.stat-divider {
  width: 1rpx;
  height: 50rpx;
  background: #e0e0e0;
}

.func-section {
  padding: 24rpx 0 0 0;
}

.func-card {
  background: #fff;
  overflow: hidden;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.03), 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
  border-radius: 32rpx 32rpx 0 0;
  margin: 0;
}

.func-list {
  background: #fff;
}

.func-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid #f0f0f0;
  transition: all 0.2s ease;
}

.func-list-item:active {
  background: #f8f8f8;
}

.func-list-item:last-child {
  border-bottom: none;
}

.func-list-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.func-list-left text {
  font-size: 30rpx;
  color: #333;
  font-weight: 500;
}

.func-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.func-right {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.status-badge {
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 30rpx;
}

.status-badge.warning {
  background: #fff3e0;
  color: #f39c12;
}

.status-badge.success {
  background: #e8f5e9;
  color: #4caf50;
}

.status-badge.pending {
  background: #e3f2fd;
  color: #2196f3;
}

.footer-tip {
  text-align: center;
  padding: 40rpx 32rpx 20rpx;
  font-size: 22rpx;
  color: #ccc;
}
</style>