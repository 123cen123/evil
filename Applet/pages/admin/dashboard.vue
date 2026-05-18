<template>
  <view class="admin-dashboard">
    <!-- 顶部导航栏 -->
    <view class="navbar">
      <text class="title">管理员后台</text>
      <view class="nav-actions">
        <button class="logout-btn" @click="handleLogout">退出登录</button>
      </view>
    </view>

    <!-- 统计卡片 -->
    <view class="stats-container">
      <view class="stat-card">
        <text class="stat-value">{{ stats.totalMerchants || 0 }}</text>
        <text class="stat-label">商家数</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ stats.totalWorkers || 0 }}</text>
        <text class="stat-label">零工数</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ stats.totalOrders || 0 }}</text>
        <text class="stat-label">订单数</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ stats.completedOrders || 0 }}</text>
        <text class="stat-label">已完成</text>
      </view>
    </view>

    <!-- 功能菜单 -->
    <view class="menu-container">
      <view class="menu-item" @click="navigateToIdentityVerification">
        <view class="menu-icon">
          <uni-icons type="contact" size="48" color="#619ac3" />
        </view>
        <text class="menu-label">实名认证审核</text>
        <uni-icons type="right" size="24" color="#999" />
      </view>
      <view class="menu-item">
        <view class="menu-icon">
          <uni-icons type="list" size="48" color="#619ac3" />
        </view>
        <text class="menu-label">订单管理</text>
        <uni-icons type="right" size="24" color="#999" />
      </view>
      <view class="menu-item">
        <view class="menu-icon">
          <uni-icons type="people" size="48" color="#619ac3" />
        </view>
        <text class="menu-label">用户管理</text>
        <uni-icons type="right" size="24" color="#999" />
      </view>
      <view class="menu-item">
        <view class="menu-icon">
          <uni-icons type="stats" size="48" color="#619ac3" />
        </view>
        <text class="menu-label">数据统计</text>
        <uni-icons type="right" size="24" color="#999" />
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      stats: {}
    };
  },
  onLoad() {
    this.getStats();
  },
  methods: {
    async getStats() {
      try {
        const res = await uni.request({
          url: 'http://localhost:3000/api/dashboard/stats',
          method: 'GET'
        });
        if (res.data.success) {
          this.stats = res.data.data;
        }
      } catch (error) {
        console.error('获取统计数据失败:', error);
      }
    },
    navigateToIdentityVerification() {
      uni.navigateTo({
        url: '/pages/admin/identity-verification'
      });
    },
    handleLogout() {
      uni.showModal({
        title: '退出登录',
        content: '确定要退出登录吗？',
        success: (res) => {
          if (res.confirm) {
            uni.removeStorageSync('userInfo');
            uni.removeStorageSync('userType');
            uni.reLaunch({
              url: '/pages/login/login'
            });
          }
        }
      });
    }
  }
};
</script>

<style scoped>
page {
  background: linear-gradient(180deg, #f0fbfd 20%, #fafafa 100%);
  margin: 0;
  padding: 0;
}

.admin-dashboard {
  min-height: 100vh;
  background: linear-gradient(180deg, #f0fbfd 20%, #fafafa 100%);
  padding-bottom: 40rpx;
}

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 30rpx;
  background: transparent;
}

.title {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
}

.logout-btn {
  padding: 12rpx 24rpx;
  background: #619ac3;
  color: #fff;
  border: none;
  border-radius: 12rpx;
  font-size: 24rpx;
  line-height: 1.5;
}

.stats-container {
  display: flex;
  flex-wrap: wrap;
  padding: 0 24rpx;
  gap: 20rpx;
  margin-bottom: 24rpx;
}

.stat-card {
  flex: 1 1 calc(50% - 10rpx);
  background: #fff;
  padding: 30rpx;
  border-radius: 24rpx;
  border: 2rpx solid #e0e0e0;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 48rpx;
  font-weight: 700;
  color: #15559a;
  margin-bottom: 10rpx;
}

.stat-label {
  font-size: 28rpx;
  color: #666;
}

.menu-container {
  background: #fff;
  margin: 0 24rpx;
  border-radius: 24rpx;
  border: 2rpx solid #e0e0e0;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 28rpx 30rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-label {
  flex: 1;
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}
</style>