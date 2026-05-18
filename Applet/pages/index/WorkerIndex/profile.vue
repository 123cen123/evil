<template>
  <view class="profile-container">
    <!-- 个人信息卡片（头像、手机号、总工时等都在一个框里） -->
    <view class="info-card">
      <view class="profile-header">
        <image class="avatar" :src="user.avatar || defaultAvatar" @click="changeAvatar" />
        <view class="user-basic">
          <text class="user-name">{{ nameText }}</text>
          <text class="user-phone">{{ phoneText }}</text>
        </view>
        <view class="refresh-btn" @click="refreshData">
          <text class="refresh-icon">↻</text>
        </view>
      </view>

      <view class="profile-stats">
        <view class="stat-item">
          <text class="stat-label">总工时</text>
          <text class="stat-value">{{ totalHoursText }}</text>
        </view>
        <view class="stat-item">
          <text class="stat-label">接单数量</text>
          <text class="stat-value">{{ orderCountText }}</text>
        </view>
        <view class="stat-item">
          <text class="stat-label">星级</text>
          <text class="stat-value">{{ ratingText }}</text>
        </view>
      </view>
    </view>

    <!-- 详细信息 -->
    <view class="profile-info">
      <view class="info-item"><text class="info-label">性别</text><text class="info-value">{{ genderText }}</text></view>
      <view class="info-item"><text class="info-label">年龄</text><text class="info-value">{{ ageText }}</text></view>
      <view class="info-item"><text class="info-label">技能特长</text><text class="info-value">{{ skillsText }}</text></view>
      <view class="info-item"><text class="info-label">注册时间</text><text class="info-value">{{ registerTimeText }}</text></view>
      <view class="info-item"><text class="info-label">实名认证</text><text class="info-value" :class="user.verified ? 'verified' : 'unverified'">{{ verifiedText }}</text></view>
    </view>

    <!-- 操作按钮 -->
    <view class="profile-actions">
      <button class="action-btn" @click="openPasswordPanel">修改密码</button>
      <button class="action-btn logout" @click="logout">退出登录</button>
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
  </view>
</template>

<script>
export default {
  data() {
    return {
      user: {
        avatar: '',
        name: '',
        phone: '',
        gender: '',
        age: '',
        skills: '',
        totalHours: '',
        orderCount: '',
        rating: '',
        registerTime: '',
        verified: false
      },
      defaultAvatar: 'https://cdn.uviewui.com/uview/album/1.jpg',
      showPasswordPanel: false,
      oldPwd: '',
      newPwd: '',
      confirmPwd: ''
    }
  },
  computed: {
    genderText() {
      if (!this.user.gender) return '暂无性别';
      if (this.user.gender === 'male') return '男';
      if (this.user.gender === 'female') return '女';
      return this.user.gender;
    },
    nameText() {
      return this.user.name || '暂无姓名';
    },
    phoneText() {
      return this.user.phone || '暂无手机号';
    },
    ageText() {
      return this.user.age || '暂无年龄';
    },
    skillsText() {
      if (!this.user.skills) {
        return '暂无技能特长';
      }
      if (Array.isArray(this.user.skills)) {
        return this.user.skills.join('，');
      }
      if (typeof this.user.skills === 'string' && this.user.skills.startsWith('[')) {
        try {
          const skillsArray = JSON.parse(this.user.skills);
          if (Array.isArray(skillsArray)) {
            return skillsArray.join('，');
          }
        } catch (error) {}
      }
      return this.user.skills;
    },
    totalHoursText() {
      return this.user.totalHours !== '' ? this.user.totalHours : '暂无总工时';
    },
    orderCountText() {
      return this.user.orderCount !== '' ? this.user.orderCount : '暂无接单数量';
    },
    ratingText() {
      return this.user.rating !== '' ? this.user.rating : '暂无星级';
    },
    registerTimeText() {
      return this.user.registerTime || '暂无注册时间';
    },
    verifiedText() {
      return this.user.verified ? '已认证' : '未认证';
    }
  },
  onShow() {
    this.loadUserData();
  },
  methods: {
    async loadUserData() {
      try {
        const userInfo = uni.getStorageSync('userInfo') || {};
        const userType = uni.getStorageSync('userType') || '';
        
        if (!userInfo.worker_id && !userInfo.merchant_id) {
          uni.showToast({ title: '请先登录', icon: 'none' });
          return;
        }
        
        if (userType === 'worker') {
          await this.loadWorkerData(userInfo.worker_id);
        } else if (userType === 'merchant') {
          await this.loadMerchantData(userInfo.merchant_id);
        }
      } catch (error) {
        console.error('加载用户数据失败:', error);
        uni.showToast({ title: '数据加载失败', icon: 'none' });
      }
    },
    
    async loadWorkerData(workerId) {
      try {
        const response = await uni.request({
          url: `http://localhost:3000/api/worker/profile/${workerId}`,
          method: 'GET'
        });
        
        if (response.data.success) {
          const data = response.data.data;
          this.user = {
            ...this.user,
            avatar: data.avatar || '',
            name: data.name || '',
            phone: data.phone || '',
            gender: data.gender || '',
            age: data.age || '',
            skills: data.skills || '',
            totalHours: data.totalHours || '0',
            orderCount: data.orderCount || '0',
            rating: data.rating || '0',
            registerTime: data.created_at ? this.formatDate(data.created_at) : '',
            verified: data.verified || false
          };
        }
      } catch (error) {
        console.error('加载零工数据失败:', error);
      }
    },
    
    async loadMerchantData(merchantId) {
      try {
        const response = await uni.request({
          url: `http://localhost:3000/api/merchant/profile/${merchantId}`,
          method: 'GET'
        });
        
        if (response.data.success) {
          const data = response.data.data;
          this.user = {
            ...this.user,
            avatar: data.avatar || '',
            name: data.shop_name || '',
            phone: data.phone || '',
            gender: '',
            age: '',
            skills: '',
            totalHours: data.totalHours || '0',
            orderCount: data.orderCount || '0',
            rating: data.rating || '0',
            registerTime: data.created_at ? this.formatDate(data.created_at) : '',
            verified: data.verified || false
          };
        }
      } catch (error) {
        console.error('加载商家数据失败:', error);
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
        await this.loadUserData();
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

        if (userType === 'worker' && userInfo.worker_id) {
          url = `http://localhost:3000/api/worker/avatar/${userInfo.worker_id}`;
        } else if (userType === 'merchant' && userInfo.merchant_id) {
          url = `http://localhost:3000/api/merchant/avatar/${userInfo.merchant_id}`;
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
          this.user.avatar = uploadRes.data.avatarUrl || uploadRes.data.avatar;
          uni.showToast({ title: '头像更新成功', icon: 'success' });
          this.loadUserData();
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

        if (userType === 'worker' && userInfo.worker_id) {
          url = `http://localhost:3000/api/worker/change-password/${userInfo.worker_id}`;
        } else if (userType === 'merchant' && userInfo.merchant_id) {
          url = `http://localhost:3000/api/merchant/change-password/${userInfo.merchant_id}`;
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
page {
  background:linear-gradient(180deg, #f0fbfd 20%, #fafafa 100%);
  margin: 0;
  padding: 0;
}

.profile-container {
  background:linear-gradient(180deg, #f0fbfd 20%, #fafafa 100%);
  min-height: 100vh;
  padding-top: 0;
  margin-top: 0;
  padding-bottom: 40rpx;
}

.info-card {
  background: #fff;
  border-radius: 24rpx;
  margin: 20rpx;
  overflow: hidden;
  border: 2rpx solid #e0e0e0;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
}

.profile-header {
  display: flex;
  align-items: center;
  padding: 40rpx 30rpx 20rpx 30rpx;
  position: relative;
}

.avatar {
  width: 110rpx;
  height: 110rpx;
  border-radius: 50%;
  margin-right: 28rpx;
  border: 4rpx solid #e0e0e0;
  object-fit: cover;
  cursor: pointer;
}

.user-basic {
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex: 1;
}

.user-name {
  font-size: 34rpx;
  font-weight: bold;
  color: #222;
  margin-bottom: 8rpx;
}

.user-phone {
  font-size: 26rpx;
  color: #888;
}

.refresh-btn {
  position: absolute;
  right: 30rpx;
  top: 50%;
  transform: translateY(-50%);
  width: 60rpx;
  height: 60rpx;
  background: #f0f0f0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.refresh-icon {
  font-size: 32rpx;
  color: #666;
}

.profile-stats {
  display: flex;
  justify-content: space-around;
  padding: 24rpx 0 30rpx 0;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 24rpx;
  color: #888;
  margin-bottom: 6rpx;
}

.stat-value {
  font-size: 30rpx;
  font-weight: bold;
  color: #15559a;
}
.profile-info {
  background: #fff;
  margin: 20rpx;
  border-radius: 24rpx;
  padding: 18rpx 30rpx 10rpx 30rpx;
  border: 2rpx solid #e0e0e0;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 26rpx;
  color: #666;
}

.info-value {
  font-size: 26rpx;
  color: #222;
}

.verified {
  color: #4caf50;
  font-weight: bold;
}

.unverified {
  color: #0f95b0;
  font-weight: bold;
}

.profile-actions {
  margin: 40rpx 30rpx 0 30rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.action-btn {
  width: 100%;
  padding: 22rpx 0;
  font-size: 28rpx;
  border-radius: 10rpx;
  border: none;
  font-weight: bold;
  background: #619ac3;
  color: white;
}

.logout {
  background: #619ac3;
}

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
  border-radius: 20rpx;
  padding: 40rpx;
  box-sizing: border-box;
}

.panel-title {
  display: block;
  text-align: center;
  font-size: 34rpx;
  font-weight: bold;
  margin-bottom: 30rpx;
  color: #333;
}

.password-input {
  width: 100%;
  height: 80rpx;
  border: 1rpx solid #ddd;
  border-radius: 10rpx;
  margin-bottom: 20rpx;
  padding: 0 20rpx;
  box-sizing: border-box;
  font-size: 28rpx;
}

.placeholder-style {
  color: #aaa;
  font-size: 26rpx;
}

.panel-buttons {
  display: flex;
  justify-content: space-between;
  margin-top: 30rpx;
}

.cancel-btn {
  width: 45%;
  height: 70rpx;
  line-height: 70rpx;
  background: #f5f5f5;
  color: #666;
  border-radius: 10rpx;
  font-size: 28rpx;
}

.submit-btn {
  width: 45%;
  height: 70rpx;
  line-height: 70rpx;
  background: #2474b5;
  color: #fff;
  border-radius: 10rpx;
  font-size: 28rpx;
}
</style>