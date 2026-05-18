<template>
  <view class="merchant-home-container">
    <!-- 头像区域 - 左上角水平布局 -->
    <view class="avatar-section" @click="goToMine">
      <view class="avatar-wrapper">
        <image 
          v-if="merchantAvatar" 
          class="avatar-large" 
          :src="merchantAvatar" 
          mode="aspectFill"
        />
        <view v-else class="avatar-large-placeholder">
          <uni-icons type="person-filled" size="50" color="#999999" />
        </view>
      </view>
      <view class="avatar-info">
        <text class="avatar-name" v-if="userInfo && userInfo.name">{{ userInfo.name }}</text>
        <text class="avatar-tip" v-else>点击登录 / 注册</text>
      </view>
    </view>

    <!-- 商家快捷入口 -->
    <view class="quick-entry">
      <view class="entry-item" @click="goPublishTask">
        <view class="icon-wrapper" style="background: #4a90e2;">
          <uni-icons type="plus-filled" size="32" color="#fff" />
        </view>
        <text>发布招工</text>
      </view>
      <view class="entry-item" @click="goMyTasks">
        <view class="icon-wrapper" style="background: #55c7a2;">
          <uni-icons type="list" size="32" color="#fff" />
        </view>
        <text>我的招工</text>
      </view>
      <view class="entry-item" @click="goApplications">
        <view class="icon-wrapper" style="background: #fca938;">
          <uni-icons type="person-filled" size="32" color="#fff" />
        </view>
        <text>报名管理</text>
      </view>
      <view class="entry-item" @click="goWallet">
        <view class="icon-wrapper" style="background: #f7b6a9;">
          <uni-icons type="wallet" size="32" color="#fff" />
        </view>
        <text>钱包</text>
      </view>
    </view>

    <!-- 新手商家必读攻略卡片 -->
    <view class="content-cards">
      <view class="card">
        <view class="card-header">
          <view class="title">📘 新手商家必读攻略</view>
          <view class="badge">攻略合集</view>
        </view>
        <view class="guide-list">
          <view class="guide-item" @click="showToast('如何快速发布零工岗位')">
            <view class="guide-icon">📌</view>
            <view class="guide-info">
              <text class="guide-title">如何快速发布第一个零工岗位？</text>
              <text class="guide-desc">3步搞定，24h内匹配优质工人</text>
            </view>
          </view>
          <view class="guide-item" @click="showToast('签到签退考勤管理')">
            <view class="guide-icon">✅</view>
            <view class="guide-info">
              <text class="guide-title">签到签退 · 考勤管理技巧</text>
              <text class="guide-desc">扫码确认到店离店，规范用工</text>
            </view>
          </view>
          <view class="guide-item" @click="showToast('提升报名转化率')">
            <view class="guide-icon">🚀</view>
            <view class="guide-info">
              <text class="guide-title">提升报名转化率的小妙招</text>
              <text class="guide-desc">完善店铺信息，增加曝光</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 快速管理卡片 -->
      <view class="card">
        <view class="card-header">
          <view class="title">⚡ 快速管理</view>
          <view class="more-link" @click="showToast('更多工具开发中')">更多工具 →</view>
        </view>
        <view class="progress-buttons">
          <view class="progress-btn" @click="goPublishTask">➕ 创建任务</view>
          <view class="progress-btn" @click="showToast('签到签退功能')">📅 签到签退</view>
        </view>
        <view class="progress-buttons" style="margin-top: 10rpx;">
          <view class="progress-btn" @click="goPublishTask">⚡ 快速发布需求</view>
          <view class="progress-btn" @click="showToast('扫码确定到店离店')">📷 扫码确定到店离店</view>
        </view>
        <view class="tips-text">
          🧾 支持按小时/按天计费，灵活雇佣
        </view>
      </view>

      <!-- 我的订单卡片 -->
      <view class="card">
        <view class="card-header">
          <view class="title">📦 我的订单</view>
          <view class="more-link" @click="showToast('全部订单')">全部订单 →</view>
        </view>
        <view class="order-stats">
          <view class="stat-item" @click="showToast('等待支付订单')">
            <text class="stat-num">3</text>
            <text class="stat-label">等待支付</text>
          </view>
          <view class="stat-item" @click="showToast('延时订单')">
            <text class="stat-num">1</text>
            <text class="stat-label">延时订单</text>
          </view>
          <view class="stat-item" @click="showToast('异常处理')">
            <text class="stat-num">2</text>
            <text class="stat-label">异常处理</text>
          </view>
        </view>
        <!-- 日期选择 -->
        <view class="task-days">
          <view class="day-item" :class="{ active: activeDay === 'today' }" @click="activeDay = 'today'">今天</view>
          <view class="day-item" :class="{ active: activeDay === 'tomorrow' }" @click="activeDay = 'tomorrow'">明天</view>
          <view class="day-item" :class="{ active: activeDay === 'after' }" @click="activeDay = 'after'">后天</view>
        </view>
        <view class="task-progress-info" @click="goTaskProgress">
          <view class="progress-row">
            <text>📋 暂无进行中的任务</text>
            <text class="more-link">查看任务进度 →</text>
          </view>
        </view>
        <view class="recommend-task" @click="showToast('推荐任务详情')">
          <text>📢 推荐任务：</text>
          <text>附近商家急招搬运工，已报名6人</text>
        </view>
      </view>

      <!-- 任务进度卡片 -->
      <view class="card">
        <view class="card-header">
          <view class="title">📋 任务进度</view>
          <view class="more-link" @click="showToast('历史记录')">历史记录</view>
        </view>
        <view class="task-list">
          <view class="task-item" @click="showToast('任务详情')">
            <view class="task-icon">🚧</view>
            <view class="task-content">
              <text class="task-name">明天 · 西餐厅后厨帮工</text>
              <text class="task-status processing">处理中</text>
              <text class="task-detail">已完成报名筛选，待商家确认</text>
            </view>
          </view>
          <view class="task-item" @click="showToast('任务详情')">
            <view class="task-icon">✅</view>
            <view class="task-content">
              <text class="task-name">今天 · 展会搬运工</text>
              <text class="task-status done">已完成</text>
              <text class="task-detail">已签到离店，待评价</text>
            </view>
          </view>
        </view>
        <view class="more-progress" @click="showToast('全部任务进度')">
          <text class="more-link">查看全部任务进度 →</text>
        </view>
      </view>
    </view>

    <!-- 底部导航栏 -->
    <CustomTabBar :current="0" />
  </view>
</template>

<script>
import CustomTabBar from '@/components/MerchantComponents/CustomTabBar.vue'

export default {
  name: 'MerchantHomePage',
  components: { CustomTabBar },
  data() {
    return {
      activeDay: 'today',
      merchantAvatar: '',
      userInfo: null,
      userType: ''
    }
  },
  onShow() {
    this.loadUserInfo();
  },
  methods: {
    loadUserInfo() {
      this.userInfo = uni.getStorageSync('userInfo') || null;
      this.userType = uni.getStorageSync('userType') || '';
      if (this.userInfo && this.userType === 'merchant') {
        this.merchantAvatar = this.userInfo.avatar || this.userInfo.logo || '';
      } else {
        this.merchantAvatar = '';
      }
    },
    showToast(msg) {
      uni.showToast({
        title: msg,
        icon: 'none',
        duration: 1500
      });
    },
    goToMine() {
      uni.reLaunch({ 
        url: '/pages/index/MerchantIndex/mine'
      });
    },
    goPublishTask() {
      uni.navigateTo({ url: '/pages/task/MerchantTask/publishTask' });
    },
    goMyTasks() {
      uni.navigateTo({ url: '/pages/task/MerchantTask/task' });
    },
    goApplications() {
      uni.navigateTo({ url: '/pages/task/MerchantTask/taskV2' });
    },
    goWallet() {
      uni.navigateTo({ url: '/pages/index/MerchantIndex/wallet' });
    },
    goSetting() {
      uni.navigateTo({ url: '/pages/index/MerchantIndex/setting' });
    },
    goTaskProgress() {
      uni.navigateTo({ url: '/pages/task/MerchantTask/taskProgress' });
    },
    showMenu() {
      uni.showActionSheet({
        itemList: ['关于我们', '意见反馈', '帮助中心'],
        success: (res) => {
          if (res.tapIndex === 0) {
            this.showToast('关于我们');
          } else if (res.tapIndex === 1) {
            this.showToast('意见反馈');
          } else if (res.tapIndex === 2) {
            uni.navigateTo({ url: '/pages/help/help' });
          }
        }
      });
    }
  }
}
</script>

<style scoped>
.merchant-home-container {
  background: linear-gradient(180deg, #f0fbfd 20%, #fafafa 100%);
  min-height: 100vh;
  padding-bottom: 100rpx;
}

/* 头像区域 - 可自行修改 padding 和 margin 来拉长区域 */
.avatar-section {
  display: flex;
  align-items: center;
  /* 修改下方 padding 值可以拉长该区域，例如改为 40rpx 或 50rpx */
  padding: 30rpx 30rpx 20rpx 30rpx;
  /* 可增加 margin-bottom 来增加与下方内容的间距 */
  margin-bottom: 0;
  background: #f0fbfd;
}

.avatar-section {
  padding: 50rpx 30rpx 40rpx 30rpx;
  margin-bottom: 20rpx;
}

.avatar-wrapper {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.1);
  margin-right: 24rpx;
  border: 4rpx solid #fff;
}

.avatar-large {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-large-placeholder {
  width: 100%;
  height: 100%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.avatar-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  /* 可增加 padding 来拉高信息区域 */
  padding: 8rpx 0;
}

.avatar-name {
  font-size: 36rpx;
  font-weight: bold;
  color: #2c3e50;
  /* 可增加 margin-bottom 来增加与下方元素的间距 */
  margin-bottom: 0;
}

.avatar-tip {
  font-size: 28rpx;
  color: #999999;
  font-weight: 500;
}

/* 快捷入口 */
.quick-entry {
  display: flex;
  justify-content: space-around;
  padding: 30rpx 20rpx;
  margin: 0 20rpx;
  background: #fff;
  border-radius: 30rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
}

.entry-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 24rpx;
  color: #333;
  gap: 12rpx;
  font-weight: 500;
}

.icon-wrapper {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

/* 卡片区域 */
.content-cards {
  padding: 20rpx 20rpx 30rpx;
}

.card {
  background: #fff;
  border-radius: 28rpx;
  margin-bottom: 24rpx;
  padding: 28rpx 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.03);
  border: 1px solid #f0f0f0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.card-header .title {
  font-weight: 600;
  font-size: 32rpx;
  color: #1f2937;
}

.badge {
  background: #ffefe5;
  color: #e67e22;
  font-size: 20rpx;
  padding: 6rpx 16rpx;
  border-radius: 30rpx;
  font-weight: 500;
}

.more-link {
  font-size: 24rpx;
  color: #3b82f6;
}

/* 攻略列表 */
.guide-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.guide-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: #f9fafc;
  padding: 16rpx 20rpx;
  border-radius: 20rpx;
}

.guide-icon {
  width: 56rpx;
  height: 56rpx;
  background: #eef2ff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
}

.guide-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.guide-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 6rpx;
}

.guide-desc {
  font-size: 22rpx;
  color: #7e8b9c;
}

/* 快速管理按钮 */
.progress-buttons {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
}

.progress-btn {
  flex: 1;
  background: #f1f5f9;
  border-radius: 48rpx;
  padding: 20rpx 0;
  text-align: center;
  font-size: 26rpx;
  font-weight: 500;
  color: #2d3a4b;
}

.tips-text {
  font-size: 22rpx;
  color: #7f8c8d;
  margin-top: 20rpx;
  text-align: center;
  background: #f8f9fe;
  padding: 12rpx;
  border-radius: 30rpx;
}

/* 订单统计 */
.order-stats {
  display: flex;
  justify-content: space-between;
  text-align: center;
  margin: 16rpx 0 20rpx;
}

.stat-item {
  flex: 1;
  border-right: 1px solid #edf2f7;
}

.stat-item:last-child {
  border-right: none;
}

.stat-num {
  font-size: 40rpx;
  font-weight: 700;
  color: #1f2937;
  display: block;
}

.stat-label {
  font-size: 24rpx;
  color: #5f6c84;
  margin-top: 8rpx;
  display: block;
}

/* 日期选择 */
.task-days {
  display: flex;
  gap: 16rpx;
  margin: 16rpx 0;
}

.day-item {
  flex: 1;
  text-align: center;
  padding: 14rpx 0;
  border-radius: 48rpx;
  background: #f8fafc;
  font-size: 26rpx;
  color: #405470;
}

.day-item.active {
  background: #3b82f6;
  color: white;
  font-weight: 500;
}

/* 任务进度信息 */
.task-progress-info {
  background: #f9fafb;
  border-radius: 20rpx;
  padding: 20rpx;
  margin: 16rpx 0;
}

.progress-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.recommend-task {
  background: #fef7e0;
  border-radius: 20rpx;
  padding: 16rpx 20rpx;
  font-size: 24rpx;
  color: #b45f1b;
}

/* 任务列表 */
.task-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.task-item {
  display: flex;
  gap: 16rpx;
  padding: 16rpx 0;
  border-bottom: 1px solid #f0f0f0;
}

.task-item:last-child {
  border-bottom: none;
}

.task-icon {
  width: 64rpx;
  height: 64rpx;
  background: #f0f3f9;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
}

.task-content {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8rpx;
}

.task-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #1f2937;
  width: 100%;
}

.task-status {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
  margin-left: 8rpx;
}

.task-status.processing {
  background: #fff3e0;
  color: #f97316;
}

.task-status.done {
  background: #e0f7ea;
  color: #2ecc71;
}

.task-detail {
  font-size: 22rpx;
  color: #8e9aaf;
  width: 100%;
}

.more-progress {
  margin-top: 16rpx;
  text-align: center;
  padding-top: 12rpx;
}
</style>