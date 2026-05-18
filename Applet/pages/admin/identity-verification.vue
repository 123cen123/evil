<template>
  <view class="identity-verification">
    <!-- 顶部导航栏 -->
    <view class="navbar">
      <text class="title">实名认证审核</text>
      <view class="nav-actions">
        <button class="refresh-btn" @click="fetchVerificationList">刷新</button>
      </view>
    </view>

    <!-- 状态筛选 -->
    <view class="filter-container">
      <view 
        class="filter-item" 
        :class="{ active: filterStatus === 'all' }" 
        @click="filterStatus = 'all'; fetchVerificationList()"
      >
        全部
      </view>
      <view 
        class="filter-item" 
        :class="{ active: filterStatus === 'pending' }" 
        @click="filterStatus = 'pending'; fetchVerificationList()"
      >
        待审核
      </view>
      <view 
        class="filter-item" 
        :class="{ active: filterStatus === 'approved' }" 
        @click="filterStatus = 'approved'; fetchVerificationList()"
      >
        已通过
      </view>
      <view 
        class="filter-item" 
        :class="{ active: filterStatus === 'rejected' }" 
        @click="filterStatus = 'rejected'; fetchVerificationList()"
      >
        已拒绝
      </view>
    </view>

    <!-- 审核列表 -->
    <view class="list-container">
      <view v-if="loading" class="loading">加载中...</view>
      <view v-else-if="verifications.length === 0" class="empty">暂无数据</view>
      <view v-else class="verification-item" v-for="item in filteredVerifications" :key="item.id">
        <view class="item-header">
          <text class="user-info">{{ item.user_type === 'merchant' ? '商家' : '零工' }} - ID: {{ item.user_id || '未知' }}</text>
          <text class="status" :class="{ 'status-pending': item.status === 'pending', 'status-approved': item.status === 'approved', 'status-rejected': item.status === 'rejected' || !item.status }">
            {{ item.status === 'pending' ? '待审核' : item.status === 'approved' ? '已通过' : '已拒绝' }}
          </text>
        </view>
        <view class="item-content">
          <view class="info-row">
            <text class="label">真实姓名:</text>
            <text class="value">{{ item.real_name || '未填写' }}</text>
          </view>
          <view class="info-row">
            <text class="label">身份证号:</text>
            <text class="value">{{ formatIdCard(item.id_card_number) }}</text>
          </view>
          <view class="info-row">
            <text class="label">提交时间:</text>
            <text class="value">{{ formatDate(item.submitted_at) }}</text>
          </view>
          <view class="info-row" v-if="item.reviewed_at">
            <text class="label">审核时间:</text>
            <text class="value">{{ formatDate(item.reviewed_at) }}</text>
          </view>
          <view class="info-row" v-if="item.review_comment">
            <text class="label">审核意见:</text>
            <text class="value">{{ item.review_comment }}</text>
          </view>
        </view>
        <view class="item-images" v-if="item.id_card_front || item.id_card_back">
          <text class="label">身份证照片:</text>
          <view class="images-container">
            <view class="image-item" v-if="item.id_card_front">
              <image :src="item.id_card_front" mode="aspectFit" @click="previewImage(item.id_card_front)" />
              <text class="image-label">正面</text>
            </view>
            <view class="image-item" v-if="item.id_card_back">
              <image :src="item.id_card_back" mode="aspectFit" @click="previewImage(item.id_card_back)" />
              <text class="image-label">反面</text>
            </view>
          </view>
        </view>
        <view class="item-images" v-if="item.business_license || item.permit">
          <text class="label">商家证件:</text>
          <view class="images-container">
            <view class="image-item" v-if="item.business_license">
              <image :src="item.business_license" mode="aspectFit" @click="previewImage(item.business_license)" />
              <text class="image-label">营业执照</text>
            </view>
            <view class="image-item" v-if="item.permit">
              <image :src="item.permit" mode="aspectFit" @click="previewImage(item.permit)" />
              <text class="image-label">营业许可证</text>
            </view>
          </view>
        </view>
        <view class="item-actions" v-if="item.status === 'pending'">
          <button class="approve-btn" @click="handleApprove(item.id)">通过</button>
          <button class="reject-btn" @click="showRejectModal(item.id)">拒绝</button>
        </view>
      </view>
    </view>
    
    <!-- 拒绝原因输入弹窗 -->
    <view class="reject-modal" v-if="showRejectInput">
      <view class="modal-content">
        <text class="modal-title">请输入拒绝原因</text>
        <textarea 
          class="reject-reason" 
          v-model="rejectReason" 
          placeholder="请输入拒绝原因（选填）"
          maxlength="200"
        />
        <view class="modal-actions">
          <button class="cancel-btn" @click="cancelReject">取消</button>
          <button class="confirm-btn" @click="confirmReject">确认拒绝</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      verifications: [],
      loading: false,
      filterStatus: 'all',
      showRejectInput: false,
      currentRejectId: null,
      rejectReason: ''
    };
  },
  onLoad() {
    this.fetchVerificationList();
  },
  onPullDownRefresh() {
    this.fetchVerificationList();
    setTimeout(() => {
      uni.stopPullDownRefresh();
    }, 1000);
  },
  computed: {
    filteredVerifications() {
      if (!this.verifications || this.verifications.length === 0) {
        return [];
      }
      if (this.filterStatus === 'all') {
        return this.verifications;
      }
      return this.verifications.filter(item => item && item.status === this.filterStatus);
    }
  },
  methods: {
    async fetchVerificationList() {
      this.loading = true;
      try {
        const baseUrl = process.env.NODE_ENV === 'development' 
          ? 'http://localhost:3000' 
          : 'https://your-api-domain.com';
        
        const res = await uni.request({
          url: `${baseUrl}/api/admin/identity/list`,
          method: 'GET',
          header: {
            'content-type': 'application/json'
          }
        });
        
        if (res.data && res.data.success) {
          this.verifications = Array.isArray(res.data.data) ? res.data.data : [];
        } else {
          uni.showToast({ 
            title: res.data?.message || '获取数据失败', 
            icon: 'none' 
          });
        }
      } catch (error) {
        console.error('获取实名认证列表失败:', error);
        uni.showToast({ 
          title: '网络错误，请检查网络连接', 
          icon: 'none',
          duration: 2000
        });
      } finally {
        this.loading = false;
      }
    },
    
    formatDate(dateStr) {
      if (!dateStr) return '未知';
      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      } catch (e) {
        return dateStr;
      }
    },
    
    formatIdCard(idCard) {
      if (!idCard) return '未填写';
      return idCard;
    },
    
    handleApprove(id) {
      if (!id) {
        uni.showToast({ title: '参数错误', icon: 'none' });
        return;
      }
      
      uni.showModal({
        title: '确认通过',
        content: '确定要通过该实名认证申请吗？',
        success: async (res) => {
          if (res.confirm) {
            await this.submitReview(id, 'approved');
          }
        }
      });
    },
    
    showRejectModal(id) {
      if (!id) {
        uni.showToast({ title: '参数错误', icon: 'none' });
        return;
      }
      this.currentRejectId = id;
      this.rejectReason = '';
      this.showRejectInput = true;
    },
    
    cancelReject() {
      this.showRejectInput = false;
      this.currentRejectId = null;
      this.rejectReason = '';
    },
    
    async confirmReject() {
      if (this.currentRejectId) {
        await this.submitReview(this.currentRejectId, 'rejected', this.rejectReason);
        this.cancelReject();
      }
    },
    
    async submitReview(id, status, reviewComment = '') {
      try {
        const baseUrl = process.env.NODE_ENV === 'development' 
          ? 'http://localhost:3000' 
          : 'https://your-api-domain.com';
        
        const response = await uni.request({
          url: `${baseUrl}/api/admin/identity/review`,
          method: 'POST',
          header: {
            'content-type': 'application/json'
          },
          data: {
            id,
            status,
            review_comment: status === 'rejected' 
              ? (reviewComment || '审核未通过') 
              : ''
          }
        });
        
        if (response.data && response.data.success) {
          uni.showToast({ 
            title: status === 'approved' ? '审核通过' : '已拒绝', 
            icon: 'success' 
          });
          this.fetchVerificationList();
        } else {
          uni.showToast({ 
            title: response.data?.message || '操作失败', 
            icon: 'none' 
          });
        }
      } catch (error) {
        console.error('审核失败:', error);
        uni.showToast({ 
          title: '网络错误，请重试', 
          icon: 'none' 
        });
      }
    },
    
    previewImage(url) {
      if (!url) {
        uni.showToast({ title: '图片不存在', icon: 'none' });
        return;
      }
      uni.previewImage({
        urls: [url],
        fail: (err) => {
          console.error('预览图片失败:', err);
          uni.showToast({ title: '图片加载失败', icon: 'none' });
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

.identity-verification {
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

.refresh-btn {
  padding: 12rpx 24rpx;
  background: #619ac3;
  color: #fff;
  border: none;
  border-radius: 12rpx;
  font-size: 24rpx;
  line-height: 1.5;
}

.filter-container {
  display: flex;
  background: #fff;
  margin: 0 24rpx 24rpx 24rpx;
  border-radius: 24rpx;
  border: 2rpx solid #e0e0e0;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
  padding: 8rpx 0;
}

.filter-item {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  font-size: 28rpx;
  color: #666;
  position: relative;
  border-radius: 20rpx;
}

.filter-item.active {
  color: #15559a;
  font-weight: 600;
  background: #e8f4f8;
}

.list-container {
  padding: 0 24rpx;
}

.loading,
.empty {
  text-align: center;
  padding: 100rpx 0;
  color: #999;
  font-size: 32rpx;
}

.verification-item {
  background: #fff;
  border-radius: 24rpx;
  border: 2rpx solid #e0e0e0;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
  padding: 30rpx;
  margin-bottom: 24rpx;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.user-info {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.status {
  font-size: 28rpx;
  font-weight: 500;
  padding: 6rpx 18rpx;
  border-radius: 24rpx;
}

.status-pending {
  background-color: #fff3cd;
  color: #856404;
}

.status-approved {
  background-color: #d4edda;
  color: #155724;
}

.status-rejected {
  background-color: #f8d7da;
  color: #721c24;
}

.item-content {
  margin-bottom: 20rpx;
}

.info-row {
  display: flex;
  margin-bottom: 16rpx;
}

.label {
  width: 150rpx;
  font-size: 28rpx;
  color: #666;
}

.value {
  flex: 1;
  font-size: 28rpx;
  color: #333;
  word-break: break-all;
}

.item-images {
  margin-bottom: 20rpx;
}

.images-container {
  display: flex;
  gap: 20rpx;
  margin-top: 12rpx;
}

.image-item {
  flex: 1;
}

.image-item image {
  width: 100%;
  height: 200rpx;
  border-radius: 12rpx;
  background-color: #f5f5f5;
}

.image-label {
  display: block;
  text-align: center;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #666;
}

.item-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #f0f0f0;
}

.approve-btn,
.reject-btn {
  flex: 1;
  padding: 18rpx 0;
  border: none;
  border-radius: 12rpx;
  font-size: 28rpx;
  font-weight: 500;
  line-height: 1.5;
}

.approve-btn {
  background: #619ac3;
  color: #fff;
}

.reject-btn {
  background: #f44336;
  color: #fff;
}

/* 拒绝原因弹窗样式 */
.reject-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  width: 80%;
  background-color: #fff;
  border-radius: 24rpx;
  padding: 40rpx;
  border: 2rpx solid #e0e0e0;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.15);
}

.modal-title {
  display: block;
  font-size: 34rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 30rpx;
  text-align: center;
}

.reject-reason {
  width: 100%;
  height: 200rpx;
  padding: 20rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 12rpx;
  font-size: 28rpx;
  box-sizing: border-box;
  margin-bottom: 30rpx;
  background: #fafafa;
}

.reject-reason:focus {
  border-color: #619ac3;
  outline: none;
  background: #fff;
}

.modal-actions {
  display: flex;
  gap: 20rpx;
}

.cancel-btn,
.confirm-btn {
  flex: 1;
  padding: 20rpx 0;
  border: none;
  border-radius: 12rpx;
  font-size: 28rpx;
  line-height: 1.5;
  font-weight: 500;
}

.cancel-btn {
  background-color: #f5f5f5;
  color: #666;
}

.confirm-btn {
  background-color: #619ac3;
  color: #fff;
}
</style>