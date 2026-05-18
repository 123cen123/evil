<template>
  <view class="wallet-container">
    <view class="status-bar-placeholder"></view>    
    <view class="wallet-balance-section">
      <view class="balance-row">
        <text class="balance-label">可提现金额</text>
        <view class="balance-value-row">
          <text class="currency">￥</text>
          <text class="balance-value">{{ balance }}</text>
        </view>
      </view>
      
      <view class="wallet-stats">
        <view class="stat-item">
          <text class="stat-label">累计收入</text>
          <text class="stat-value">￥{{ totalIncome }}</text>
        </view>
        <view class="stat-item">
          <text class="stat-label">累计提现</text>
          <text class="stat-value">￥{{ totalWithdraw }}</text>
        </view>
        <view class="stat-item">
          <text class="stat-label">冻结金额</text>
          <text class="stat-value">￥{{ frozen }}</text>
        </view>
      </view>
    </view>

    <view class="wallet-actions">
      <button class="action-btn" @click="handleRecharge">充值</button>
      <button class="action-btn" @click="handleWithdraw">提现</button>
      <button class="action-btn detail" @click="navigateToDetail">钱包明细</button>
    </view>

    <view class="wallet-recent">
      <text class="recent-title">最近一笔交易</text>
      <view v-if="recentTransaction" class="recent-row">
        <text class="recent-type">{{ recentTransaction.type }}</text>
        <text class="recent-amount">￥{{ recentTransaction.amount }}</text>
        <text class="recent-time">{{ recentTransaction.time }}</text>
      </view>
      <view v-else class="recent-row-empty">暂无交易记录</view>
    </view>

    <view class="wallet-tip">预计1-2个工作日到账，请勿泄露账户信息。</view>

    <!-- 充值弹窗 -->
    <view class="modal-mask" v-if="showRechargePanel" @click="showRechargePanel = false">
      <view class="modal-content" @click.stop>
        <text class="modal-title">充值</text>
        
        <view class="recharge-amounts">
          <view class="amount-item" v-for="amount in rechargeAmounts" :key="amount" @click="selectRechargeAmount(amount)">
            <text :class="selectedRechargeAmount === amount ? 'amount-selected' : ''">{{ amount }}元</text>
          </view>
        </view>
        
        <view class="custom-amount">
          <text class="label">自定义金额</text>
          <input
            type="number"
            v-model="customRechargeAmount"
            placeholder="请输入金额"
            placeholder-class="placeholder-style"
            class="wallet-input"
            @click.stop
          />
        </view>
        
        <view class="payment-methods">
          <text class="label">支付方式</text>
          <view class="method-item" v-for="method in paymentMethods" :key="method.value" @click="selectedPaymentMethod = method.value">
            <text :class="selectedPaymentMethod === method.value ? 'method-selected' : ''">{{ method.label }}</text>
          </view>
        </view>
        
        <view class="modal-buttons">
          <button class="cancel-btn" @click="showRechargePanel = false">取消</button>
          <button class="confirm-btn" @click="checkPasswordBeforeRecharge">确认充值</button>
        </view>
      </view>
    </view>

    <!-- 提现弹窗 -->
    <view class="modal-mask" v-if="showWithdrawPanel" @click="showWithdrawPanel = false">
      <view class="modal-content" @click.stop>
        <text class="modal-title">提现</text>
        
        <view class="withdraw-amount">
          <text class="label">提现金额</text>
          <input
            type="number"
            v-model="withdrawAmount"
            placeholder="请输入金额"
            placeholder-class="placeholder-style"
            class="wallet-input"
            @click.stop
          />
          <text class="balance-tip">可提现金额：￥{{ balance }}</text>
        </view>
        
        <view class="modal-buttons">
          <button class="cancel-btn" @click="showWithdrawPanel = false">取消</button>
          <button class="confirm-btn" @click="checkPasswordBeforeWithdraw">提交申请</button>
        </view>
      </view>
    </view>

    <!-- 密码设置弹窗 -->
    <view class="modal-mask" v-if="showSetPasswordPanel" @click="showSetPasswordPanel = false">
      <view class="modal-content" @click.stop>
        <text class="modal-title">{{ isFirstTime ? '设置钱包密码' : '修改钱包密码' }}</text>
        <view class="password-section">
          <text class="label">6位数字密码</text>
          <input
            type="password"
            v-model="walletPassword"
            placeholder="请输入6位数字密码"
            placeholder-class="placeholder-style"
            class="wallet-input"
            maxlength="6"
            @click.stop
          />
        </view>
        <view class="password-section">
          <text class="label">确认密码</text>
          <input
            type="password"
            v-model="confirmWalletPassword"
            placeholder="请再次输入密码"
            placeholder-class="placeholder-style"
            class="wallet-input"
            maxlength="6"
            @click.stop
          />
        </view>
        <view class="modal-buttons">
          <button class="cancel-btn" @click="showSetPasswordPanel = false">取消</button>
          <button class="confirm-btn" @click="setWalletPassword">确认设置</button>
        </view>
      </view>
    </view>

    <!-- 密码验证弹窗 -->
    <view class="modal-mask" v-if="showVerifyPasswordPanel" @click="showVerifyPasswordPanel = false">
      <view class="modal-content" @click.stop>
        <text class="modal-title">请输入钱包密码</text>
        <view class="password-section">
          <text class="label">6位数字密码</text>
          <input
            type="password"
            v-model="verifyPassword"
            placeholder="请输入钱包密码"
            placeholder-class="placeholder-style"
            class="wallet-input"
            maxlength="6"
            @click.stop
          />
        </view>
        <view class="modal-buttons">
          <button class="cancel-btn" @click="closeVerifyPasswordPanel">取消</button>
          <button class="confirm-btn" @click="verifyWalletPassword">确认验证</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      userType: '',
      balance: 0,
      totalIncome: 0,
      totalWithdraw: 0,
      frozen: 0,
      recentTransaction: null,
      transactionHistory: [],
      // 充值相关
      showRechargePanel: false,
      rechargeAmounts: [50, 100, 200, 500, 1000],
      selectedRechargeAmount: null,
      customRechargeAmount: '',
      paymentMethods: [
        { label: '微信支付', value: 'wechat' },
        { label: '支付宝', value: 'alipay' }
      ],
      selectedPaymentMethod: 'wechat',
      // 提现相关
      showWithdrawPanel: false,
      withdrawAmount: '',
      // 密码相关
      showSetPasswordPanel: false,
      showVerifyPasswordPanel: false,
      walletPassword: '',
      confirmWalletPassword: '',
      verifyPassword: '',
      isFirstTime: false,
      currentOperation: '', // 'recharge' 或 'withdraw'
    }
  },
  onShow() {
    this.userType = uni.getStorageSync('userType') || '';
    this.loadFromLocalStorage();
    this.loadWalletFromServer();
  },
  methods: {
    loadFromLocalStorage() {
      const info = uni.getStorageSync('userInfo') || {};
      this.balance = info.balance || 0;
      this.totalIncome = info.totalIncome || 0;
      this.totalWithdraw = info.totalWithdraw || 0;
      this.frozen = info.frozen || 0;
      this.recentTransaction = info.recentTransaction || null;
      const transactionKey = this.getTransactionStorageKey();
      this.transactionHistory = uni.getStorageSync(transactionKey) || [];
    },
    loadWalletFromServer() {
      const userType = uni.getStorageSync('userType') || '';
      const info = uni.getStorageSync('userInfo') || {};
      const userId = info.merchant_id || info.id;
      if (!userType || !userId) {
        this.balance = 0;
        this.totalIncome = 0;
        this.totalWithdraw = 0;
        this.frozen = 0;
        return;
      }
      uni.request({
        url: 'http://localhost:3000/api/wallet/summary',
        method: 'GET',
        data: { user_type: userType, user_id: userId },
        success: (res) => {
          if (res.data && res.data.success && res.data.data) {
            const d = res.data.data;
            this.balance = Number(d.balance) || 0;
            this.totalIncome = Number(d.totalIncome) || 0;
            this.totalWithdraw = Number(d.totalWithdraw) || 0;
            this.frozen = Number(d.frozen) || 0;
            const prev = uni.getStorageSync('userInfo') || {};
            uni.setStorageSync('userInfo', {
              ...prev,
              balance: this.balance,
              totalIncome: this.totalIncome,
              totalWithdraw: this.totalWithdraw,
              frozen: this.frozen
            });
          } else {
            const prev = uni.getStorageSync('userInfo') || {};
            this.balance = prev.balance || 0;
            this.totalIncome = prev.totalIncome || 0;
            this.totalWithdraw = prev.totalWithdraw || 0;
            this.frozen = prev.frozen || 0;
          }
          this.syncTransactionsFromServer();
        },
        fail: () => {
          const info = uni.getStorageSync('userInfo') || {};
          this.balance = info.balance || 0;
          this.totalIncome = info.totalIncome || 0;
          this.totalWithdraw = info.totalWithdraw || 0;
          this.frozen = info.frozen || 0;
        }
      });
    },
    syncTransactionsFromServer() {
      const userType = uni.getStorageSync('userType') || '';
      const info = uni.getStorageSync('userInfo') || {};
      const userId = info.merchant_id || info.id;
      if (!userType || !userId) return;
      uni.request({
        url: 'http://localhost:3000/api/wallet/transactions',
        method: 'GET',
        data: { user_type: userType, user_id: userId, limit: 200 },
        success: (res) => {
          if (!res.data || !res.data.success || !Array.isArray(res.data.data)) return;
          this.transactionHistory = res.data.data.map((t) => ({
            type: t.tx_type === 'recharge' ? '充值' : t.tx_type === 'withdraw' ? '提现' : t.tx_type,
            amount: Number(t.amount),
            time: this.formatTxTime(t.created_at)
          }));
          this.recentTransaction = this.transactionHistory[0] || null;
          uni.setStorageSync(this.getTransactionStorageKey(), this.transactionHistory);
          const prev = uni.getStorageSync('userInfo') || {};
          uni.setStorageSync('userInfo', { ...prev, recentTransaction: this.recentTransaction });
        }
      });
    },
    formatTxTime(createdAt) {
      if (!createdAt) return '';
      try {
        const d = new Date(createdAt);
        return d.toLocaleString();
      } catch (e) {
        return String(createdAt);
      }
    },
    getTransactionStorageKey() {
      const userType = uni.getStorageSync('userType') || '';
      const info = uni.getStorageSync('userInfo') || {};
      const uid = info.merchant_id || info.id || '';
      return `transactionHistory:${userType}:${uid}`;
    },
    selectRechargeAmount(amount) {
      this.selectedRechargeAmount = amount;
      this.customRechargeAmount = '';
    },
    handleRecharge() {
      this.showRechargePanel = true;
    },
    handleWithdraw() {
      this.showWithdrawPanel = true;
    },
    checkPasswordStatus() {
      const userType = uni.getStorageSync('userType');
      const info = uni.getStorageSync('userInfo');
      const userId = info.merchant_id || info.id;
      
      uni.request({
        url: `http://localhost:3000/api/wallet/password/status`,
        method: 'GET',
        data: {
          user_type: userType,
          user_id: userId
        },
        success: (res) => {
          if (res.data.success) {
            if (res.data.data.hasPassword) {
              this.showVerifyPasswordPanel = true;
            } else {
              this.isFirstTime = true;
              this.showSetPasswordPanel = true;
            }
          } else {
            uni.showToast({ title: res.data.message || '检查密码状态失败', icon: 'none' });
          }
        },
        fail: () => {
          uni.showToast({ title: '网络错误', icon: 'none' });
        }
      });
    },
    setWalletPassword() {
      if (!this.walletPassword || this.walletPassword.length !== 6 || !/^\d+$/.test(this.walletPassword)) {
        uni.showToast({ title: '请输入6位数字密码', icon: 'none' });
        return;
      }
      if (this.walletPassword !== this.confirmWalletPassword) {
        uni.showToast({ title: '两次输入的密码不一致', icon: 'none' });
        return;
      }
      
      const userType = uni.getStorageSync('userType');
      const info = uni.getStorageSync('userInfo');
      const userId = info.merchant_id || info.id;
      
      uni.request({
        url: `http://localhost:3000/api/wallet/password/set`,
        method: 'POST',
        data: {
          user_type: userType,
          user_id: userId,
          password: this.walletPassword
        },
        success: (res) => {
          if (res.data.success) {
            uni.showToast({ title: '密码设置成功', icon: 'success' });
            this.showSetPasswordPanel = false;
            if (this.currentOperation === 'recharge') {
              this.showRechargePanel = true;
            } else if (this.currentOperation === 'withdraw') {
              this.showWithdrawPanel = true;
            }
          } else {
            uni.showToast({ title: res.data.message || '设置密码失败', icon: 'none' });
          }
        },
        fail: () => {
          uni.showToast({ title: '网络错误', icon: 'none' });
        }
      });
    },
    closeVerifyPasswordPanel() {
      this.showVerifyPasswordPanel = false;
      this.verifyPassword = '';
    },
    verifyWalletPassword() {
      if (!this.verifyPassword || this.verifyPassword.length !== 6 || !/^\d+$/.test(this.verifyPassword)) {
        uni.showToast({ title: '请输入6位数字密码', icon: 'none' });
        return;
      }
      
      const userType = uni.getStorageSync('userType');
      const info = uni.getStorageSync('userInfo');
      const userId = info.merchant_id || info.id;
      
      uni.request({
        url: `http://localhost:3000/api/wallet/password/verify`,
        method: 'POST',
        data: {
          user_type: userType,
          user_id: userId,
          password: this.verifyPassword
        },
        success: (res) => {
          if (res.data.success) {
            uni.showToast({ title: '密码验证通过', icon: 'success' });
            this.showVerifyPasswordPanel = false;
            this.verifyPassword = '';
            if (this.currentOperation === 'recharge') {
              this.confirmRecharge();
            } else if (this.currentOperation === 'withdraw') {
              this.confirmWithdraw();
            }
          } else {
            uni.showToast({ title: res.data.message || '密码错误', icon: 'none' });
          }
        },
        fail: () => {
          uni.showToast({ title: '网络错误', icon: 'none' });
        }
      });
    },
    checkPasswordBeforeRecharge() {
      const amount = this.selectedRechargeAmount || this.customRechargeAmount;
      if (!amount || amount <= 0) {
        uni.showToast({ title: '请选择充值金额', icon: 'none' });
        return;
      }
      this.checkPasswordStatusBeforeOperation('recharge');
    },
    checkPasswordBeforeWithdraw() {
      if (!this.withdrawAmount || this.withdrawAmount <= 0) {
        uni.showToast({ title: '请输入提现金额', icon: 'none' });
        return;
      }
      if (parseFloat(this.withdrawAmount) > this.balance) {
        uni.showToast({ title: '提现金额超过可提现余额', icon: 'none' });
        return;
      }
      this.checkPasswordStatusBeforeOperation('withdraw');
    },
    checkPasswordStatusBeforeOperation(operation) {
      const userType = uni.getStorageSync('userType');
      const info = uni.getStorageSync('userInfo');
      const userId = info.merchant_id || info.id;
      
      uni.request({
        url: `http://localhost:3000/api/wallet/password/status`,
        method: 'GET',
        data: {
          user_type: userType,
          user_id: userId
        },
        success: (res) => {
          if (res.data.success) {
            if (res.data.data.hasPassword) {
              this.currentOperation = operation;
              this.showVerifyPasswordPanel = true;
            } else {
              this.currentOperation = operation;
              this.isFirstTime = true;
              this.showSetPasswordPanel = true;
            }
          } else {
            uni.showToast({ title: res.data.message || '检查密码状态失败', icon: 'none' });
          }
        },
        fail: () => {
          uni.showToast({ title: '网络错误', icon: 'none' });
        }
      });
    },
    confirmRecharge() {
      const amount = this.selectedRechargeAmount || this.customRechargeAmount;
      if (!amount || amount <= 0) {
        uni.showToast({ title: '请选择充值金额', icon: 'none' });
        return;
      }
      const userType = uni.getStorageSync('userType');
      const info = uni.getStorageSync('userInfo') || {};
      const userId = info.merchant_id || info.id;
      uni.request({
        url: 'http://localhost:3000/api/wallet/recharge',
        method: 'POST',
        data: {
          user_type: userType,
          user_id: userId,
          amount: parseFloat(amount)
        },
        success: (res) => {
          if (res.data && res.data.success) {
            uni.showToast({ title: '充值成功', icon: 'success' });
            this.loadWalletFromServer();
            this.showRechargePanel = false;
            this.selectedRechargeAmount = null;
            this.customRechargeAmount = '';
            this.selectedPaymentMethod = 'wechat';
          } else {
            uni.showToast({ title: (res.data && res.data.message) || '充值失败', icon: 'none' });
          }
        },
        fail: () => uni.showToast({ title: '网络错误', icon: 'none' })
      });
    },
    confirmWithdraw() {
      if (!this.withdrawAmount || this.withdrawAmount <= 0) {
        uni.showToast({ title: '请输入提现金额', icon: 'none' });
        return;
      }
      if (parseFloat(this.withdrawAmount) > this.balance) {
        uni.showToast({ title: '提现金额超过可提现余额', icon: 'none' });
        return;
      }
      const userType = uni.getStorageSync('userType');
      const info = uni.getStorageSync('userInfo') || {};
      const userId = info.merchant_id || info.id;
      uni.request({
        url: 'http://localhost:3000/api/wallet/withdraw',
        method: 'POST',
        data: {
          user_type: userType,
          user_id: userId,
          amount: parseFloat(this.withdrawAmount)
        },
        success: (res) => {
          if (res.data && res.data.success) {
            uni.showToast({ title: '提现成功', icon: 'success' });
            this.loadWalletFromServer();
            this.showWithdrawPanel = false;
            this.withdrawAmount = '';
          } else {
            uni.showToast({ title: (res.data && res.data.message) || '提现失败', icon: 'none' });
          }
        },
        fail: () => uni.showToast({ title: '网络错误', icon: 'none' })
      });
    },
    navigateToDetail() {
      uni.navigateTo({
        url: '/pages/index/MerchantIndex/walletDetail'
      });
    }
  }
}
</script>

<style scoped>
page {
  background: linear-gradient(180deg, #f0fbfd 20%, #fafafa 100%);
  margin: 0;
  padding: 0;
}

.status-bar-placeholder {
  height: env(safe-area-inset-top);
  background: transparent;
}

.wallet-container {
  background: linear-gradient(180deg, #f0fbfd 20%, #fafafa 100%);
  min-height: 100vh;
  padding-bottom: 40rpx;
}

.wallet-balance-section {
  background: #fff;
  margin: 32rpx 24rpx 0 24rpx;
  border-radius: 24rpx;
  border: 2rpx solid #e0e0e0;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
  padding: 30rpx 24rpx 18rpx 24rpx;
}

.balance-row {
  text-align: center;
  margin-bottom: 18rpx;
}

.balance-label {
  font-size: 28rpx;
  color: #666;
  font-weight: bold;
}

.balance-value-row {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  margin-top: 10rpx;
}

.currency {
  font-size: 32rpx;
  color: #15559a;
  margin-right: 4rpx;
}

.balance-value {
  font-size: 48rpx;
  color: #222;
  font-weight: bold;
}

.wallet-stats {
  display: flex;
  justify-content: space-between;
  margin-top: 18rpx;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 22rpx;
  color: #888;
  margin-bottom: 4rpx;
}

.stat-value {
  font-size: 26rpx;
  color: #15559a;
  font-weight: bold;
}

.wallet-actions {
  margin: 32rpx 24rpx 0 24rpx;
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.action-btn {
  width: 100%;
  padding: 22rpx 0;
  font-size: 28rpx;
  border-radius: 12rpx;
  border: none;
  font-weight: bold;
  background: #619ac3;
  color: white;
}

.action-btn.detail {
  background: #619ac3;
  color: white;
}

.wallet-recent {
  background: #fff;
  margin: 32rpx 24rpx 0 24rpx;
  border-radius: 24rpx;
  border: 2rpx solid #e0e0e0;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
  padding: 18rpx 24rpx 18rpx 24rpx;
}

.recent-title {
  font-size: 26rpx;
  color: #666;
  font-weight: bold;
  margin-bottom: 10rpx;
}

.recent-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 24rpx;
  color: #333;
  margin-top: 6rpx;
}

.recent-row-empty {
  color: #bbb;
  font-size: 24rpx;
  text-align: center;
  margin-top: 8rpx;
}

.wallet-tip {
  margin: 24rpx 24rpx 0 24rpx;
  font-size: 22rpx;
  color: #888;
  text-align: center;
}

.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.modal-content {
  background: #fff;
  border-radius: 24rpx;
  width: 80%;
  max-width: 560rpx;
  padding: 32rpx 28rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.15);
  pointer-events: auto;
  z-index: 10000;
}

.modal-title {
  font-size: 34rpx;
  font-weight: bold;
  color: #222;
  text-align: center;
  margin-bottom: 30rpx;
}

.recharge-amounts {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 30rpx;
}

.amount-item {
  flex: 1 1 calc(33.333% - 16rpx);
  padding: 20rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 12rpx;
  text-align: center;
  font-size: 26rpx;
  color: #333;
  cursor: pointer;
  background: #fff;
}

.amount-selected {
  color: #15559a;
  font-weight: bold;
}

.amount-item .amount-selected {
  border-color: #15559a;
  background: #f0f9ff;
}

.custom-amount {
  margin-bottom: 30rpx;
}

.custom-amount .label {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 12rpx;
  display: block;
}

.wallet-input {
  width: 100%;
  height: 88rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  box-sizing: border-box;
  background: #fafafa;
  transition: border-color 0.2s ease, background 0.2s ease;
  pointer-events: auto;
  user-select: text;
  -webkit-user-select: text;
  position: relative;
  z-index: 10001;
}

.wallet-input:focus {
  border-color: #619ac3;
  background: #fff;
  outline: none;
}

.placeholder-style {
  color: #aaa;
  font-size: 26rpx;
}

.balance-tip {
  font-size: 22rpx;
  color: #888;
  margin-top: 8rpx;
  display: block;
}

.payment-methods {
  margin-bottom: 30rpx;
}

.payment-methods .label {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 12rpx;
  display: block;
}

.method-item {
  padding: 20rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 12rpx;
  margin-bottom: 12rpx;
  font-size: 26rpx;
  color: #333;
  cursor: pointer;
  box-sizing: border-box;
  background: #fff;
}

.method-selected {
  color: #15559a;
  font-weight: bold;
}

.method-item.method-selected {
  border-color: #15559a;
  background: #f0f9ff;
}

.modal-buttons {
  display: flex;
  gap: 16rpx;
  margin-top: 30rpx;
}

.cancel-btn {
  flex: 1;
  padding: 20rpx;
  font-size: 28rpx;
  border: 2rpx solid #ddd;
  border-radius: 12rpx;
  background: #fff;
  color: #666;
}

.confirm-btn {
  flex: 1;
  padding: 20rpx;
  font-size: 28rpx;
  border: none;
  border-radius: 12rpx;
  background: #619ac3;
  color: #fff;
  font-weight: bold;
}

/* 密码相关样式 */
.password-section {
  margin-bottom: 30rpx;
}

.password-section .label {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 12rpx;
  display: block;
}
</style>