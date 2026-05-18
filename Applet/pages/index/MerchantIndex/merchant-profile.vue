<template>
  <view class="profile-container">
    <!-- 头像区域：点击可更换，添加融合背景 -->
    <view class="profile-header-wrapper">
      <view class="profile-header">
        <image class="avatar" :src="merchant.avatar || defaultAvatar" @click="changeAvatar" />
        <view class="user-basic">
          <text class="user-name">{{ merchant.name || '暂无商家名称' }}</text>
          <text class="user-phone">{{ merchant.phone || '暂无手机号' }}</text>
        </view>
        <view class="refresh-btn" @click="refreshData">
          <uni-icons type="refreshempty" size="24" color="#619ac3" />
        </view>
      </view>
    </view>

    <view class="profile-stats">
      <view class="stat-item">
        <text class="stat-value">{{ merchant.totalHours || '0' }}</text>
        <text class="stat-label">总工时</text>
      </view>
      <view class="stat-divider"></view>
      <view class="stat-item">
        <text class="stat-value">{{ merchant.orderCount || '0' }}</text>
        <text class="stat-label">发布岗位数</text>
      </view>
      <view class="stat-divider"></view>
      <view class="stat-item">
        <text class="stat-value">{{ merchant.rating || '0' }}</text>
        <text class="stat-label">评分</text>
      </view>
    </view>

    <!-- 详细信息 -->
    <view class="profile-info">
      <view class="info-section-title">基本信息</view>
      
      <view class="info-item">
        <view class="info-left">
          <uni-icons type="shop" size="20" color="#619ac3" />
          <text class="info-label">商家名称</text>
        </view>
        <text class="info-value">{{ merchant.name || '暂无商家名称' }}</text>
      </view>
      
      <view class="info-item">
        <view class="info-left">
          <uni-icons type="location" size="20" color="#619ac3" />
          <text class="info-label">商家地址</text>
        </view>
        <text class="info-value">{{ merchant.address || '暂无商家地址' }}</text>
      </view>
      
      <view class="info-item">
        <view class="info-left">
          <uni-icons type="person" size="20" color="#619ac3" />
          <text class="info-label">联系人</text>
        </view>
        <text class="info-value">{{ merchant.contact || '暂无联系人' }}</text>
      </view>
      
      <view class="info-item">
        <view class="info-left">
          <uni-icons type="phone" size="20" color="#619ac3" />
          <text class="info-label">手机号</text>
        </view>
        <text class="info-value">{{ merchant.phone || '暂无手机号' }}</text>
      </view>
      
      <view class="info-item">
        <view class="info-left">
          <uni-icons type="flag" size="20" color="#619ac3" />
          <text class="info-label">商家类型</text>
        </view>
        <text class="info-value">{{ merchant.business_type || '暂无商家类型' }}</text>
      </view>
      
      <view class="info-item" @click="editDescription">
        <view class="info-left">
          <uni-icons type="chat" size="20" color="#619ac3" />
          <text class="info-label">商家描述</text>
        </view>
        <view class="info-value-with-edit">
          <text class="info-value">{{ merchant.description || '暂无商家描述' }}</text>
          <text class="edit-icon">✏️</text>
        </view>
      </view>
      
      <view class="info-item">
        <view class="info-left">
          <uni-icons type="checkmarkempty" size="20" color="#619ac3" />
          <text class="info-label">状态</text>
        </view>
        <text class="info-value" :class="merchant.status === 1 ? 'status-verified' : 'status-disabled'">
          {{ merchant.status === 1 ? '正常' : '禁用' }}
        </text>
      </view>
      
      <view class="info-item">
        <view class="info-left">
          <uni-icons type="list" size="20" color="#619ac3" />
          <text class="info-label">总发布岗位数</text>
        </view>
        <text class="info-value">{{ merchant.orderCount || 0 }}</text>
      </view>
      
      <view class="info-item">
        <view class="info-left">
          <uni-icons type="calendar" size="20" color="#619ac3" />
          <text class="info-label">注册时间</text>
        </view>
        <text class="info-value">{{ registerTimeText }}</text>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="profile-actions">
      <button class="action-btn" @click="openPasswordPanel">
        <uni-icons type="locked" size="20" color="#fff" />
        <text>修改密码</text>
      </button>
      <view class="logout-text" @click="logout">
        <text>退出登录</text>
      </view>
    </view>

    <!-- 修改密码弹窗面板 -->
    <view class="password-mask" v-if="showPasswordPanel" @click="closePasswordPanel">
      <view class="password-panel" @click.stop>
        <text class="panel-title">修改密码</text>
        <input class="password-input" type="password" v-model="oldPwd" placeholder="请输入旧密码" placeholder-class="placeholder-style" />
        <input class="password-input" type="password" v-model="newPwd" placeholder="请输入新密码" placeholder-class="placeholder-style" />
        <input class="password-input" type="password" v-model="confirmPwd" placeholder="请确认新密码" placeholder-class="placeholder-style" />
        <view class="panel-buttons">
          <button class="cancel-btn" @click="closePasswordPanel">取消</button>
          <button class="submit-btn" @click="submitPasswordChange">确认</button>
        </view>
      </view>
    </view>

    <!-- 编辑商家描述弹窗 -->
    <view class="password-mask" v-if="showDescriptionPanel" @click="closeDescriptionPanel">
      <view class="password-panel" @click.stop>
        <text class="panel-title">编辑商家描述</text>
        <textarea class="description-textarea" v-model="editDescriptionText" placeholder="请输入商家描述" placeholder-class="placeholder-style" />
        <view class="panel-buttons">
          <button class="cancel-btn" @click="closeDescriptionPanel">取消</button>
          <button class="submit-btn" @click="saveDescription">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      merchant: {
        avatar: '',
        name: '',
        phone: '',
        address: '',
        contact: '',
        business_type: '',
        description: '',
        status: 1,
        orderCount: 0,
        totalHours: '',
        rating: ''
      },
      defaultAvatar: 'https://cdn.uviewui.com/uview/album/1.jpg',
      showPasswordPanel: false,
      oldPwd: '',
      newPwd: '',
      confirmPwd: '',
      showDescriptionPanel: false,
      editDescriptionText: ''
    }
  },
  computed: {
    registerTimeText() {
      return this.merchant.registerTime || '暂无注册时间';
    }
  },
  onShow() {
    this.loadMerchantData();
  },
  methods: {
    async loadMerchantData() {
      try {
        const userInfo = uni.getStorageSync('userInfo') || {};
        const userType = uni.getStorageSync('userType') || '';
        
        if (!userInfo.merchant_id && !userInfo.id) {
          uni.showToast({ title: '请先登录', icon: 'none' });
          return;
        }
        
        const merchantId = userInfo.merchant_id || userInfo.id;
        
        const response = await uni.request({
          url: `http://localhost:3000/api/merchant/profile/${merchantId}`,
          method: 'GET'
        });
        
        if (response.data.success) {
          const data = response.data.data;
          this.merchant = {
            ...this.merchant,
            avatar: data.avatar || '',
            name: data.name || data.shop_name || '',
            phone: data.phone || '',
            address: data.address || '',
            contact: data.contact || '',
            business_type: data.business_type || '',
            description: data.description || '',
            status: data.status || 1,
            orderCount: data.orderCount || 0,
            totalHours: data.totalHours || '0',
            rating: data.rating || '0',
            registerTime: data.created_at ? this.formatDate(data.created_at) : ''
          };
        }
      } catch (error) {
        console.error('加载商家数据失败:', error);
        uni.showToast({ title: '数据加载失败', icon: 'none' });
      }
    },
    
    formatDate(dateString) {
      if (!dateString) return '';
      try {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      } catch (e) {
        return dateString;
      }
    },
    
    async refreshData() {
      uni.showLoading({ title: '刷新中...' });
      try {
        await this.loadMerchantData();
        uni.showToast({ title: '刷新成功', icon: 'success' });
      } catch (error) {
        uni.showToast({ title: '刷新失败', icon: 'none' });
      } finally {
        uni.hideLoading();
      }
    },

    changeAvatar() {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const tempFile = res.tempFilePaths[0];
          this.uploadAvatar(tempFile);
        },
        fail: (err) => {
          console.error('选择图片失败', err);
          uni.showToast({ title: '取消选择', icon: 'none' });
        }
      });
    },

    async uploadAvatar(filePath) {
      uni.showLoading({ title: '上传中...' });
      try {
        const userInfo = uni.getStorageSync('userInfo') || {};
        const userType = uni.getStorageSync('userType') || '';
        let url = '';

        if (userType === 'merchant' && (userInfo.merchant_id || userInfo.id)) {
          const merchantId = userInfo.merchant_id || userInfo.id;
          url = `http://localhost:3000/api/merchant/avatar/${merchantId}`;
        } else {
          uni.hideLoading();
          uni.showToast({ title: '用户信息错误', icon: 'none' });
          return;
        }

        const uploadRes = await new Promise((resolve, reject) => {
          uni.uploadFile({
            url: url,
            filePath: filePath,
            name: 'avatar',
            success: (res) => {
              if (res.statusCode === 200) {
                try {
                  const data = JSON.parse(res.data);
                  resolve(data);
                } catch (e) {
                  reject(e);
                }
              } else {
                reject(new Error('上传失败'));
              }
            },
            fail: reject
          });
        });

        if (uploadRes.success) {
          this.merchant.avatar = uploadRes.data.avatarUrl || uploadRes.data.avatar;
          uni.showToast({ title: '头像更新成功', icon: 'success' });
          this.loadMerchantData();
        } else {
          uni.showToast({ title: uploadRes.message || '上传失败', icon: 'none' });
        }
      } catch (error) {
        console.error('上传头像失败', error);
        uni.showToast({ title: '上传失败', icon: 'none' });
      } finally {
        uni.hideLoading();
      }
    },

    openPasswordPanel() {
      this.oldPwd = '';
      this.newPwd = '';
      this.confirmPwd = '';
      this.showPasswordPanel = true;
    },

    closePasswordPanel() {
      this.showPasswordPanel = false;
    },

    editDescription() {
      this.editDescriptionText = this.merchant.description || '';
      this.showDescriptionPanel = true;
    },

    closeDescriptionPanel() {
      this.showDescriptionPanel = false;
    },

    async saveDescription() {
      uni.showLoading({ title: '保存中...' });
      try {
        const userInfo = uni.getStorageSync('userInfo') || {};
        const userType = uni.getStorageSync('userType') || '';
        let url = '';
        const requestData = {
          description: this.editDescriptionText
        };

        if (userType === 'merchant' && (userInfo.merchant_id || userInfo.id)) {
          const merchantId = userInfo.merchant_id || userInfo.id;
          url = `http://localhost:3000/api/merchant/update/${merchantId}`;
        } else {
          uni.hideLoading();
          uni.showToast({ title: '用户信息错误', icon: 'none' });
          return;
        }

        const response = await uni.request({
          url: url,
          method: 'PUT',
          data: requestData,
        });

        if (response.data.success) {
          uni.showToast({ title: '保存成功', icon: 'success' });
          this.merchant.description = this.editDescriptionText;
          this.closeDescriptionPanel();
        } else {
          uni.showToast({ title: response.data.message || '保存失败', icon: 'none' });
        }
      } catch (error) {
        console.error('保存商家描述失败', error);
        uni.showToast({ title: '网络错误', icon: 'none' });
      } finally {
        uni.hideLoading();
      }
    },

    async submitPasswordChange() {
      if (!this.oldPwd) {
        uni.showToast({ title: '请输入旧密码', icon: 'none' });
        return;
      }
      if (!this.newPwd) {
        uni.showToast({ title: '请输入新密码', icon: 'none' });
        return;
      }
      if (this.newPwd.length < 6) {
        uni.showToast({ title: '新密码至少6位', icon: 'none' });
        return;
      }
      if (this.newPwd !== this.confirmPwd) {
        uni.showToast({ title: '两次新密码不一致', icon: 'none' });
        return;
      }

      uni.showLoading({ title: '提交中...' });

      try {
        const userInfo = uni.getStorageSync('userInfo') || {};
        const userType = uni.getStorageSync('userType') || '';
        let url = '';
        const requestData = {
          oldPassword: this.oldPwd,
          newPassword: this.newPwd
        };

        if (userType === 'merchant' && (userInfo.merchant_id || userInfo.id)) {
          const merchantId = userInfo.merchant_id || userInfo.id;
          url = `http://localhost:3000/api/merchant/change-password/${merchantId}`;
        } else {
          uni.hideLoading();
          uni.showToast({ title: '用户信息错误', icon: 'none' });
          return;
        }

        const response = await uni.request({
          url: url,
          method: 'PUT',
          data: requestData,
        });

        if (response.data.success) {
          uni.showToast({ title: '密码修改成功', icon: 'success' });
          this.closePasswordPanel();
        } else {
          uni.showToast({ title: response.data.message || '修改失败', icon: 'none' });
        }
      } catch (error) {
        console.error('修改密码失败', error);
        uni.showToast({ title: '网络错误', icon: 'none' });
      } finally {
        uni.hideLoading();
      }
    },

    logout() {
      uni.clearStorageSync();
      uni.reLaunch({ url: '/pages/login/login' });
    }
  }
}
</script>

<style scoped>
.profile-container {
  background: linear-gradient(180deg, #e8f4f8 0%, #f5f9fc 40%, #fafafa 100%);
  min-height: 100vh;
  padding-bottom: 60rpx;
}

/* 头像区域包装器 - 添加渐变融合背景 */
.profile-header-wrapper {
  background: linear-gradient(135deg, #619ac3 0%, #7bb3d6 30%, #b8d9ef 70%, #f0fbfd 100%);
  border-bottom-left-radius: 48rpx;
  border-bottom-right-radius: 48rpx;
  margin-bottom: 20rpx;
  padding-top: 20rpx;
}

/* 头像区域 - 白色半透明卡片效果，与背景融合 */
.profile-header {
  display: flex;
  align-items: center;
  padding: 50rpx 32rpx 60rpx 32rpx;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(8px);
  border-radius: 32rpx;
  margin: 0 24rpx 30rpx 24rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  margin-right: 28rpx;
  border: 4rpx solid #fff;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.15);
  object-fit: cover;
  background: #fff;
}

.user-basic {
  flex: 1;
}

.user-name {
  font-size: 36rpx;
  font-weight: bold;
  color: #1a2c3e;
  margin-bottom: 8rpx;
  display: block;
}

.user-phone {
  font-size: 26rpx;
  color: #666;
}

.refresh-btn {
  width: 60rpx;
  height: 60rpx;
  background: rgba(97, 154, 195, 0.15);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 统计数据卡片 */
.profile-stats {
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: #fff;
  margin: 0 20rpx 20rpx 20rpx;
  border-radius: 24rpx;
  padding: 24rpx 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-value {
  font-size: 40rpx;
  font-weight: bold;
  color: #619ac3;
  display: block;
  margin-bottom: 8rpx;
}

.stat-label {
  font-size: 24rpx;
  color: #888;
}

.stat-divider {
  width: 1rpx;
  height: 40rpx;
  background: #e8e8e8;
}

/* 详细信息卡片 */
.profile-info {
  background: #fff;
  margin: 0 20rpx 24rpx 20rpx;
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.info-section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1a2c3e;
  margin-bottom: 24rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.info-item:last-child {
  border-bottom: none;
}

.info-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.info-label {
  font-size: 28rpx;
  color: #666;
}

.info-value {
  font-size: 28rpx;
  color: #333;
  max-width: 60%;
  text-align: right;
}

.info-value-with-edit {
  display: flex;
  align-items: center;
  gap: 12rpx;
  max-width: 60%;
}

.edit-icon {
  font-size: 24rpx;
  color: #619ac3;
  padding: 4rpx 8rpx;
}

.status-verified {
  color: #4caf50;
  font-weight: 500;
}

.status-disabled {
  color: #f44336;
  font-weight: 500;
}

/* 操作按钮 */
.profile-actions {
  margin: 0 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  width: 60%;
  padding: 20rpx 0;
  font-size: 28rpx;
  border-radius: 48rpx;
  border: none;
  font-weight: 500;
  background: #619ac3;
  color: #fff;
}

.logout-text {
  padding: 16rpx 0;
  text-align: center;
}

.logout-text text {
  font-size: 26rpx;
  color: #999;
  text-decoration: underline;
}

/* 弹窗样式 */
.password-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.password-panel {
  width: 600rpx;
  background-color: #fff;
  border-radius: 32rpx;
  padding: 40rpx;
  box-sizing: border-box;
}

.panel-title {
  display: block;
  text-align: center;
  font-size: 34rpx;
  font-weight: bold;
  margin-bottom: 30rpx;
  color: #1a2c3e;
}

.password-input {
  width: 100%;
  height: 88rpx;
  border: 2rpx solid #e8e8e8;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  padding: 0 24rpx;
  box-sizing: border-box;
  font-size: 28rpx;
  background: #fafafa;
}

.password-input:focus {
  border-color: #619ac3;
  background: #fff;
}

.description-textarea {
  width: 100%;
  height: 200rpx;
  border: 2rpx solid #e8e8e8;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  padding: 20rpx;
  box-sizing: border-box;
  font-size: 28rpx;
  background: #fafafa;
}

.placeholder-style {
  color: #aaa;
  font-size: 26rpx;
}

.panel-buttons {
  display: flex;
  gap: 20rpx;
  margin-top: 30rpx;
}

.cancel-btn {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  background: #f5f5f5;
  color: #666;
  border-radius: 48rpx;
  font-size: 28rpx;
  border: none;
}

.submit-btn {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  background: #619ac3;
  color: #fff;
  border-radius: 48rpx;
  font-size: 28rpx;
  border: none;
}
</style>