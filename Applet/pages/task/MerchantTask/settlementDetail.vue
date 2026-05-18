<template>
  <view class="settlement-detail">
    <!-- 零工薪资结算列表 -->
    <view class="settlement-list">
      
      <view v-if="settlementList.length > 0">
        <!-- 全选按钮 -->
        <view class="select-all">
          <view class="checkbox" @click="toggleSelectAll" :class="{ 'checked': isAllSelected }">
            <text v-if="isAllSelected">✓</text>
          </view>
          <text class="select-all-text">全选</text>
          <text class="selected-count">已选 {{ selectedCount }}/{{ settlementList.length }}</text>
        </view>
        
        <view class="settlement-item" v-for="(item, index) in settlementList" :key="index">
          <view class="item-header">
            <view class="checkbox" @click="toggleSelect(item)" :class="{ 'checked': item.selected && (item.status !== '已支付' && item.status !== 'paid') }">
              <text v-if="item.selected && (item.status !== '已支付' && item.status !== 'paid')">✓</text>
            </view>
            <view class="worker-info">
              <text class="worker-name">{{ item.empname }}</text>
              <text class="worker-phone">{{ item.phone }}</text>
            </view>
            <view class="status-badge" :class="{ 'paid': item.status === '已支付' || item.status === 'paid' }">
              {{ item.status === '已支付' || item.status === 'paid' ? '已结算' : '待结算' }}
            </view>
          </view>
          <view class="item-info">
            <view class="info-row">
              <text class="info-label">上工时间</text>
              <text class="info-value">{{ item.starttime }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">下工时间</text>
              <text class="info-value">{{ item.endtime }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">工作时长</text>
              <text class="info-value">{{ item.working_hour }}小时</text>
            </view>
            <view class="info-row">
              <text class="info-label">应发薪水</text>
              <text class="info-value salary">{{ item.amount }}元</text>
            </view>
          </view>
        </view>
      </view>
      
      <view v-else class="empty-tip">
        <text>该任务暂无结算信息</text>
      </view>
    </view>
    
    <!-- 底部结算按钮 -->
    <view class="bottom-bar">
      <view class="total-amount">
        <text class="total-label">合计</text>
        <text class="total-value">¥{{ totalAmount.toFixed(2) }}</text>
      </view>
      <button class="settlement-btn" @click="confirmSettle" :disabled="selectedCount === 0">
        结算 ({{ selectedCount }})
      </button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      settlementList: [],
      taskId: null
    };
  },
  computed: {
    selectedCount() {
      return (this.settlementList || []).filter(item => item.selected && (item.status === '待支付' || item.status === 'unpaid')).length;
    },
    isAllSelected() {
      const unpaidItems = (this.settlementList || []).filter(item => item.status === '待支付' || item.status === 'unpaid');
      return unpaidItems.length > 0 && unpaidItems.every(item => item.selected);
    },
    totalAmount() {
      return (this.settlementList || []).filter(item => item.selected && (item.status === '待支付' || item.status === 'unpaid'))
        .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    }
  },
  onLoad(options) {
    const taskId = options.taskId;
    this.taskId = taskId;
    this.loadSettlementList(taskId);
  },
  methods: {
    loadSettlementList(taskId) {
      const userInfo = uni.getStorageSync('userInfo') || {};
      const merchantId = userInfo.merchant_id || userInfo.id;
      uni.request({
        url: `http://localhost:3000/api/settlement/report?demand_id=${taskId}&merchant_id=${merchantId}`,
        method: 'GET',
        success: (res) => {
          if (res.data.success) {
            this.settlementList = (res.data.data || []).map(item => ({
              ...item,
              selected: item.status === '待支付' || item.status === 'unpaid'
            }));
          }
        },
        fail: () => {
          uni.showToast({ title: '获取结算数据失败', icon: 'none' });
        }
      });
    },
    toggleSelectAll() {
      const newSelectedState = !this.isAllSelected;
      this.settlementList = this.settlementList.map(item => {
        if (item.status === '待支付' || item.status === 'unpaid') {
          return { ...item, selected: newSelectedState };
        }
        return item;
      });
    },
    toggleSelect(item) {
      if (item.status === '已支付' || item.status === 'paid') return;
      item.selected = !item.selected;
    },
    getTransactionStorageKey() {
      const userType = uni.getStorageSync('userType') || '';
      const info = uni.getStorageSync('userInfo') || {};
      const uid = info.worker_id || info.merchant_id || info.id || '';
      return `transactionHistory:${userType}:${uid}`;
    },
    confirmSettle() {
      const userType = uni.getStorageSync('userType') || '';
      const userInfo = uni.getStorageSync('userInfo') || {};
      const merchantId = userInfo.merchant_id || userInfo.id;
      if (userType !== 'merchant' || !merchantId) {
        uni.showToast({ title: '请使用商家账号操作结算', icon: 'none' });
        return;
      }
      const total = this.totalAmount;
      if (!total || total <= 0) {
        uni.showToast({ title: '请选择要结算的零工', icon: 'none' });
        return;
      }

      const selectedItems = this.settlementList.filter(item => item.selected && (item.status === '待支付' || item.status === 'unpaid'));
      const orderIds = selectedItems.map(item => item.orderid);

      uni.showModal({
        title: '确认结算',
        content: `本次结算总额：¥${total.toFixed(2)}\n共${selectedItems.length}人`,
        confirmText: '确认结算',
        cancelText: '取消',
        success: (confirmRes) => {
          if (!confirmRes.confirm) return;
          
          uni.showModal({
            title: '输入钱包密码',
            content: '',
            editable: true,
            placeholderText: '请输入6位数字钱包密码',
            confirmText: '确认',
            cancelText: '取消',
            success: (passwordRes) => {
              if (!passwordRes.confirm) return;
              const password = (passwordRes.content || '').trim();
              if (!password) {
                uni.showToast({ title: '请输入钱包密码', icon: 'none' });
                return;
              }
              if (!/^\d{6}$/.test(password)) {
                uni.showToast({ title: '请输入6位数字密码', icon: 'none' });
                return;
              }
              uni.showLoading({ title: '结算中...' });
              uni.request({
                url: 'http://localhost:3000/api/settlement/pay',
                method: 'POST',
                data: {
                  demand_id: this.taskId,
                  merchant_id: merchantId,
                  payment_method: '现金',
                  wallet_password: password,
                  order_ids: orderIds
                },
                success: (res) => {
                  uni.hideLoading();
                  if (!res.data || !res.data.success) {
                    uni.showToast({ title: (res.data && res.data.message) || '结算失败', icon: 'none' });
                    return;
                  }
                  uni.showToast({ title: '结算成功', icon: 'success' });
                  this.loadSettlementList(this.taskId);

                  uni.request({
                    url: 'http://localhost:3000/api/wallet/summary',
                    method: 'GET',
                    data: { user_type: 'merchant', user_id: merchantId },
                    success: (wRes) => {
                      if (wRes.data && wRes.data.success && wRes.data.data) {
                        const d = wRes.data.data;
                        const prev = uni.getStorageSync('userInfo') || {};
                        uni.setStorageSync('userInfo', {
                          ...prev,
                          balance: Number(d.balance) || 0,
                          totalIncome: Number(d.totalIncome) || 0,
                          totalWithdraw: Number(d.totalWithdraw) || 0,
                          frozen: Number(d.frozen) || 0
                        });
                      }
                    }
                  });
                },
                fail: () => {
                  uni.hideLoading();
                  uni.showToast({ title: '网络错误', icon: 'none' });
                }
              });
            }
          });
        }
      });
    },
  }
};
</script>

<style scoped>
/* 页面整体背景 - 柔和渐变 */
.settlement-detail {
  min-height: 100vh;
  background: linear-gradient(180deg, #f0fbfd 0%, #fafafa 100%);
  padding-bottom: 120rpx;
}

/* 结算列表容器 */
.settlement-list {
  margin: 24rpx 24rpx 24rpx 24rpx;
  border-radius: 24rpx;
  overflow: hidden;
  background: #ffffff;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.04), 0 2rpx 6rpx rgba(0, 0, 0, 0.02);
}

/* 全选栏 */
.select-all {
  display: flex;
  align-items: center;
  padding: 24rpx 28rpx;
  background: #f8fafc;
  border-bottom: 1rpx solid #eef2f6;
}

.checkbox {
  width: 36rpx;
  height: 36rpx;
  border: 2rpx solid #cbd5e1;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
  transition: all 0.2s ease;
  background: #ffffff;
}

.checkbox.checked {
  background: #619ac3;
  border-color: #619ac3;
  color: #ffffff;
  font-size: 22rpx;
  font-weight: bold;
}

.select-all-text {
  flex: 1;
  font-size: 28rpx;
  font-weight: 500;
  color: #334155;
}

.selected-count {
  font-size: 24rpx;
  color: #94a3b8;
  background: #f1f5f9;
  padding: 6rpx 16rpx;
  border-radius: 30rpx;
}

/* 结算项卡片 */
.settlement-item {
  padding: 28rpx;
  border-bottom: 1rpx solid #f0f4f8;
  transition: background 0.2s ease;
}

.settlement-item:active {
  background: #fafcff;
}

.settlement-item:last-child {
  border-bottom: none;
}

/* 头部区域 */
.item-header {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
  flex-wrap: wrap;
}

.item-header .checkbox {
  margin-right: 16rpx;
  flex-shrink: 0;
}

/* 工人信息区域 */
.worker-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-right: 16rpx;
}

.worker-name {
  font-size: 30rpx;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.3;
}

.worker-phone {
  font-size: 24rpx;
  color: #94a3b8;
  margin-top: 4rpx;
}

/* 状态标签 */
.status-badge {
  padding: 6rpx 16rpx;
  border-radius: 40rpx;
  font-size: 22rpx;
  font-weight: 500;
  background: #f1f5f9;
  color: #64748b;
  flex-shrink: 0;
}

.status-badge.paid {
  background: #e8f5e9;
  color: #2e7d32;
}

/* 详情信息区域 */
.item-info {
  margin-left: 52rpx;
}

.info-row {
  display: flex;
  align-items: baseline;
  margin-bottom: 12rpx;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-label {
  width: 130rpx;
  font-size: 26rpx;
  color: #94a3b8;
  flex-shrink: 0;
}

.info-value {
  flex: 1;
  font-size: 26rpx;
  color: #334155;
}

.salary {
  color: #f97316;
  font-weight: 700;
  font-size: 28rpx;
}

/* 空状态 */
.empty-tip {
  text-align: center;
  padding: 80rpx 40rpx;
  color: #94a3b8;
  font-size: 28rpx;
}

/* 底部栏 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(20rpx);
  padding: 20rpx 28rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* 合计金额 */
.total-amount {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}

.total-label {
  font-size: 28rpx;
  color: #64748b;
}

.total-value {
  font-size: 40rpx;
  font-weight: 800;
  color: #f97316;
  letter-spacing: -1rpx;
}

/* 结算按钮 - 颜色改为 #619ac3 */
.settlement-btn {
  width: 240rpx;
  background: #619ac3;
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 600;
  border-radius: 48rpx;
  padding: 20rpx 0;
  border: none;
  box-shadow: 0 6rpx 16rpx rgba(97, 154, 195, 0.3);
  transition: all 0.2s ease;
}

.settlement-btn:active {
  transform: scale(0.96);
  background: #5082a6;
  opacity: 0.9;
}

.settlement-btn:disabled {
  background: #cbd5e1;
  box-shadow: none;
  transform: none;
}

button::after {
  border: none;
}
</style>