<template>
  <view class="wallet-detail-container">
    <!-- 添加状态栏占位，与 wallet 保持一致 -->
    <view class="status-bar-placeholder"></view>
    
    <view class="wallet-header">
      <text class="wallet-title"> </text><!-- 钱包明细 -->
    </view>
    
    <!-- 日期筛选 - 样式与 wallet 的 action-btn 保持一致 -->
    <view class="date-filter-section">
      <picker mode="date" fields="month" :start="startDate" :end="endDate" :value="pickerValue" @change="handleDateChange">
        <view class="date-filter-btn">
          {{ selectedDate || '选择月份' }}<span class="arrow-symbol">﹀</span>
        </view>
      </picker>
    </view>
    
    <!-- 明细列表 - 使用与 wallet-recent 一致的卡片样式 -->
    <view class="detail-list">
      <view class="detail-item" v-for="(item, index) in detailList" :key="index">
        <view class="detail-info">
          <text class="detail-type">{{ item.type }}</text>
          <text class="detail-time">{{ item.time }}</text>
        </view>
        <text :class="item.amount > 0 ? 'income' : 'expense'">
          {{ item.amount > 0 ? '+' : '' }}{{ item.amount }}元
        </text>
      </view>
      <view v-if="detailList.length === 0" class="empty-detail">暂无交易记录</view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      startDate: '',
      endDate: '',
      selectedDate: '',
      pickerValue: '',
      detailList: []
    }
  },
  onShow() {
    // 设置日期范围
    const today = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(today.getMonth() - 3);
    this.startDate = this.formatDate(threeMonthsAgo);
    this.endDate = this.formatDate(today);
    
    // 设置默认选中当前月份
    if (!this.pickerValue) {
      this.pickerValue = this.formatDate(today);
      this.selectedDate = this.formatYearMonth(today);
    }
    
    // 加载明细数据
    this.loadDetailList();
  },
  methods: {
    // 与 wallet.vue 保持一致：按账号维度隔离保存交易记录
    getTransactionStorageKey() {
      const userType = uni.getStorageSync('userType') || '';
      const info = uni.getStorageSync('userInfo') || {};
      const uid = info.merchant_id || info.id || '';
      return `transactionHistory:${userType}:${uid}`;
    },
    // 日期格式化
    formatDate(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },
    // 年月格式化
    formatYearMonth(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${year}年${month}月`;
    },
    // 格式化时间（与 wallet 保持一致）
    formatTxTime(createdAt) {
      if (!createdAt) return '';
      try {
        const d = new Date(createdAt);
        return d.toLocaleString();
      } catch (e) {
        return String(createdAt);
      }
    },
    // 加载明细数据（优先服务端）
    loadDetailList() {
      const userType = uni.getStorageSync('userType') || '';
      const info = uni.getStorageSync('userInfo') || {};
      const userId = info.merchant_id || info.id;
      if (!userType || !userId) {
        this.detailList = [];
        return;
      }
      uni.request({
        url: 'http://localhost:3000/api/wallet/transactions',
        method: 'GET',
        data: { user_type: userType, user_id: userId, limit: 200 },
        success: (res) => {
          if (res.data && res.data.success && Array.isArray(res.data.data)) {
            this.detailList = res.data.data.map((t) => ({
              type: t.tx_type === 'recharge' ? '充值' : t.tx_type === 'withdraw' ? '提现' : t.tx_type,
              amount: Number(t.amount),
              time: this.formatTxTime(t.created_at)
            }));
            uni.setStorageSync(this.getTransactionStorageKey(), this.detailList);
          } else {
            this.detailList = uni.getStorageSync(this.getTransactionStorageKey()) || [];
          }
        },
        fail: () => {
          this.detailList = uni.getStorageSync(this.getTransactionStorageKey()) || [];
        }
      });
    },
    // 处理日期选择
    handleDateChange(e) {
      const selectedDate = e.detail.value;
      const date = new Date(selectedDate);
      this.selectedDate = this.formatYearMonth(date);
    },
  }
}
</script>

<style scoped>
/* 与 wallet 页面保持一致的背景渐变 */
page {
  background: linear-gradient(180deg, #f0fbfd 20%, #fafafa 100%);
  margin: 0;
  padding: 0;
}

.wallet-detail-container {
  background: linear-gradient(180deg, #f0fbfd 20%, #fafafa 100%);
  min-height: 100vh;
  padding-bottom: 40rpx;
}

/* 状态栏占位 - 与 wallet 保持一致 */
.status-bar-placeholder {
  height: env(safe-area-inset-top);
  background: transparent;
}


.wallet-title {
  font-size: 34rpx;
  font-weight: bold;
  color: #222;
}

/* 日期筛选区域 - 使用与 action-btn 一致的样式 */
.date-filter-section {
  margin: 32rpx 24rpx 0 24rpx;
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.date-filter-btn {
  width: 200rpx;
  padding: 22rpx 0;
  font-size: 28rpx;
  border-radius: 12rpx;
  color: black;
  font-weight: bold;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}

.arrow-symbol {
  display: inline-block;
  font-size: 28rpx;
  line-height: 1;
}

/* 明细列表 - 使用与 wallet-recent 一致的卡片样式 */
.detail-list {
  background: #fff;
  margin: 32rpx 24rpx 0 24rpx;
  border-radius: 24rpx;
  border: 2rpx solid #e0e0e0;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
  padding: 18rpx 24rpx 18rpx 24rpx;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #eee;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-info {
  flex: 1;
}

.detail-type {
  font-size: 28rpx;
  color: #333;
  font-weight: bold;
  margin-bottom: 8rpx;
  display: block;
}

.detail-time {
  font-size: 22rpx;
  color: #888;
}

.income {
  font-size: 28rpx;
  color: #4caf50;
  font-weight: bold;
}

.expense {
  font-size: 28rpx;
  color: #f44336;
  font-weight: bold;
}

.empty-detail {
  text-align: center;
  color: #bbb;
  font-size: 24rpx;
  padding: 40rpx 0;
}
</style>