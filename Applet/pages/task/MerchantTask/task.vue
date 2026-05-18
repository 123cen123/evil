<template>
  <view class="task-page">
    <!-- 顶部状态栏（身份区分） -->
    <view class="status-bar">
      <template v-if="userType === 'worker'">
        <text v-for="(tab, idx) in workerTabs" :key="tab" :class="['status-item', currentTab === idx ? 'active' : '']" @click="switchTab(idx)">{{ tab }}</text>
      </template>
      <template v-else-if="userType === 'merchant'">
        <text v-for="(tab, idx) in merchantTabs" :key="tab" :class="['status-item', currentTab === idx ? 'active' : '']" @click="switchTab(idx)">{{ tab }}</text>
      </template>
      <template v-else>
        <text class="status-item active">全部</text>
      </template>
    </view>
    <!-- tab内容区分渲染 -->
    <view v-if="userType === 'worker'">
      <view v-if="taskList.length > 0">
        <view class="task-card-detail" v-for="(task, i) in taskList" :key="i">
          <view class="card-header">
            <image class="avatar" src="/static/logo.png" />
            <view class="card-title-box">
              <text class="card-title">{{ task.shopName }}</text>
            </view>
          </view>
          <view class="card-info-row">用工时间：{{ formatWorkTime(task.work_time) }}</view>
          <view class="card-info-row">工作地点：{{ task.location }}</view>
          <view class="card-info-row">需求人数：{{ task.required_workers }}</view>
          <view class="card-info-row">时薪：{{ task.hourly_wage }}元/小时</view>
          <!-- 零工按钮 -->
          <view v-if="userType === 'worker'">
            <view v-if="task.status === 'signed_up'">
              <button class="work-btn" @click="handleWorkAction(task)">申请上工</button>
              <button class="work-btn delete-btn" @click="cancelSignup(task)">取消报名</button>
            </view>
            <button v-else-if="task.status === 'pending_start' || task.status === 'pending'" class="work-btn" disabled>
              待商家确认上工
            </button>
            <button v-else-if="task.status === 'accepted'" class="work-btn" @click="handleWorkAction(task)">
              下工（可拍照）
            </button>
            <button v-else-if="task.status === 'pending_complete'" class="work-btn" disabled>
              待商家确认下工
            </button>
            <button v-else-if="task.status === 'completed' && !task.worker_rating" class="work-btn active-btn" @click="goToRateMerchant(task)">
              评价商家
            </button>
            <button v-else-if="task.status === 'completed' && task.worker_rating" class="work-btn" disabled>已评价</button>
          </view>
          <button v-else-if="!userType" class="work-btn" @click="handleGuestAction(task)">接单</button>
        </view>
      </view>
      <view v-else class="empty-tip">暂无任务</view>
    </view>
    <view v-else-if="userType === 'merchant'">
      <view v-if="taskList.length > 0">
        <view class="task-card-detail" v-for="(task, i) in taskList" :key="i">
          <view class="card-header">
            <image class="avatar" src="/static/logo.png" />
            <view class="card-title-box">
              <text class="card-title">{{ task.title }}</text>
            </view>
          </view>
          <view class="card-info-row">用工时间：{{ formatWorkTime(task.work_time) }}</view>
          <view class="card-info-row">工作地点：{{ task.location }}</view>
          <view class="card-info-row">需求人数：{{ task.required_workers }}</view>
          <view class="card-info-row">时薪：{{ task.hourly_wage }}元/小时</view>
          <view class="card-info-row">已接单：{{ task.accepted_count || 0 }}人</view>
          <view class="card-info-row">状态：{{ task.status }}</view>
          <button v-if="currentTab === 1" class="work-btn active-btn" @click="showQrcode(task)">上工/下工（二维码）</button>
          <view v-else-if="currentTab === 2" class="merchant-ended-actions">
            <button class="work-btn active-btn" @click="goToSettlementDetail(task)">薪资结算</button>
            <button class="work-btn" @click="goToRateWorkers(task)">评价零工</button>
          </view>
          <button v-else-if="currentTab === 0" class="work-btn delete-btn" @click="goCancelTask(task)">取消任务</button>
          <button v-else-if="currentTab === 3" class="work-btn delete-btn" @click="deleteTask(task)">删除订单</button>
          <button v-else class="work-btn" disabled>仅展示</button>
        </view>
      </view>
      <view v-else class="empty-tip">此选项暂无记录</view>
    </view>
    <view v-else>
      <view style="text-align:center;color:#15559a;margin:40px 0;cursor:pointer;" @click="goToLogin">请先登录</view>
    </view>
    <!-- 商家端浮动操作按钮 -->
    <view v-if="userType === 'merchant'" class="floating-actions">
      <button class="floating-btn publish-btn" @click="goPublishTask">
        <uni-icons type="plus" size="20" color="#fff" />
      </button>
      <button class="floating-btn manage-btn">
        <uni-icons type="gear" size="20" color="#fff" />
      </button>
    </view>
    
    <view class="tabbar-holder">
      <!-- ✅ 修改：将 WorkerComponents 改为 MerchantComponents -->
      <CustomTabBar :current="1" />
    </view>
  </view>
</template>

<script>
// ✅ 修改：将导入路径从 WorkerComponents 改为 MerchantComponents
import CustomTabBar from '@/components/MerchantComponents/CustomTabBar.vue'

export default {
  components: { CustomTabBar },
  data() {
    return {
      userType: '',
      currentTab: 0,
      workerTabs: ['待服务', '服务中', '已完成', '已取消', '全部'],
      merchantTabs: ['未开始', '进行中', '已结束', '已取消', '全部'],
      taskList: []
    }
  },
  onShow() {
    this.userType = uni.getStorageSync('userType') || '';
    this.currentTab = this.userType === 'worker' ? 4 : 0;
    this.loadTaskList();
  },
  methods: {
    switchTab(idx) {
      this.currentTab = idx;
      this.loadTaskList();
    },
    getWorkButtonText(task) {
      if (!task) return '';
      if (task.status === 'signed_up') return '申请上工';
      if (task.status === 'pending_start' || task.status === 'pending') return '待商家确认上工';
      if (task.status === 'accepted') return '下工（可拍照）';
      if (task.status === 'pending_complete') return '待商家确认下工';
      if (task.status === 'completed') return '已完成';
      return '待处理';
    },
    handleWorkAction(task) {
      const userInfo = uni.getStorageSync('userInfo') || {};
      const wid = userInfo.worker_id || userInfo.id;
      if (!task || !task.application_id) {
        uni.showToast({ title: '缺少申请单ID', icon: 'none' });
        return;
      }

      if (task.status === 'signed_up') {
        uni.request({
          url: `http://localhost:3000/api/applications/${task.application_id}/request-start`,
          method: 'POST',
          data: { worker_id: wid },
          success: (res) => {
            if (res.data && res.data.success) {
              uni.showToast({ title: res.data.message || '已提交', icon: 'success' });
              this.loadTaskList();
            } else {
              uni.showToast({ title: (res.data && res.data.message) || '提交失败', icon: 'none' });
            }
          },
          fail: () => uni.showToast({ title: '网络错误', icon: 'none' })
        });
        return;
      }

      if (task.status === 'accepted') {
        uni.chooseImage({
          count: 1,
          sizeType: ['compressed'],
          sourceType: ['album', 'camera'],
          success: (pick) => {
            const photo = (pick.tempFilePaths && pick.tempFilePaths[0]) || '';
            uni.request({
              url: `http://localhost:3000/api/applications/${task.application_id}/complete`,
              method: 'POST',
              data: { worker_id: wid, photo_url: photo },
              success: (res) => {
                if (res.data && res.data.success) {
                  uni.showToast({ title: res.data.message || '已提交', icon: 'success' });
                  this.loadTaskList();
                } else {
                  uni.showToast({ title: (res.data && res.data.message) || '提交失败', icon: 'none' });
                }
              },
              fail: () => uni.showToast({ title: '网络错误', icon: 'none' })
            });
          },
          fail: () => {
            uni.request({
              url: `http://localhost:3000/api/applications/${task.application_id}/complete`,
              method: 'POST',
              data: { worker_id: wid, photo_url: '' },
              success: (res) => {
                if (res.data && res.data.success) {
                  uni.showToast({ title: res.data.message || '已提交', icon: 'success' });
                  this.loadTaskList();
                } else {
                  uni.showToast({ title: (res.data && res.data.message) || '提交失败', icon: 'none' });
                }
              },
              fail: () => uni.showToast({ title: '网络错误', icon: 'none' })
            });
          }
        });
      }
    },
    cancelSignup(task) {
      const userInfo = uni.getStorageSync('userInfo') || {};
      const wid = userInfo.worker_id || userInfo.id;
      if (!task || !task.application_id) {
        uni.showToast({ title: '缺少申请单ID', icon: 'none' });
        return;
      }
      uni.request({
        url: `http://localhost:3000/api/applications/${task.application_id}/cancel-signup`,
        method: 'POST',
        data: { worker_id: wid },
        success: (res) => {
          if (res.data && res.data.success) {
            uni.showToast({ title: res.data.message || '已取消报名', icon: 'success' });
            this.loadTaskList();
          } else {
            uni.showToast({ title: (res.data && res.data.message) || '取消失败', icon: 'none' });
          }
        },
        fail: () => uni.showToast({ title: '网络错误', icon: 'none' })
      });
    },
    goToRateMerchant(task) {
      const userInfo = uni.getStorageSync('userInfo') || {};
      const workerId = userInfo.worker_id || userInfo.id;
      if (!task.application_id) {
        uni.request({
          url: `http://localhost:3000/api/applications/by-worker-job?worker_id=${workerId}&job_id=${task.demand_id}`,
          method: 'GET',
          success: (res) => {
            if (res.data && res.data.success) {
              uni.navigateTo({
                url: `/pages/task/WorkerTask/rate?applicationId=${res.data.data.application_id}&jobId=${task.demand_id}&raterType=worker`
              });
            } else {
              uni.showToast({ title: res.data.message || '无法进入评价', icon: 'none' });
            }
          },
          fail: () => uni.showToast({ title: '网络错误', icon: 'none' })
        });
        return;
      }
      uni.navigateTo({
        url: `/pages/task/WorkerTask/rate?applicationId=${task.application_id}&jobId=${task.demand_id}&raterType=worker`
      });
    },
    loadTaskList() {
      const userInfo = uni.getStorageSync('userInfo') || {};
      
      if (this.userType === 'worker') {
        let group = 'all';
        switch (this.currentTab) {
          case 0: group = 'pending_service'; break;
          case 1: group = 'in_service'; break;
          case 2: group = 'done'; break;
          case 3: group = 'cancelled'; break;
          case 4: group = 'all'; break;
        }

        if (userInfo.worker_id || userInfo.id) {
          const workerId = userInfo.worker_id || userInfo.id;
          uni.request({
            url: `http://localhost:3000/api/worker/${workerId}/applications`,
            method: 'GET',
            data: { group },
            success: (res) => {
              if (res.data && res.data.success) {
                this.taskList = (res.data.data || []).map(row => ({
                  ...row,
                  shopName: row.merchant_name || '商家',
                  demand_id: row.job_id
                }));
              } else {
                this.taskList = [];
              }
            },
            fail: () => { this.taskList = []; }
          });
        } else {
          this.taskList = [];
        }
        
      } else if (this.userType === 'merchant') {
        let status = 'all';
        switch (this.currentTab) {
          case 0: status = 'not_started'; break;
          case 1: status = 'in_progress'; break;
          case 2: status = 'completed'; break;
          case 3: status = 'cancelled'; break;
          case 4: status = 'all'; break;
        }

        if (userInfo.merchant_id || userInfo.id) {
          const merchantId = userInfo.merchant_id || userInfo.id;
          uni.request({
            url: `http://localhost:3000/api/merchant/${merchantId}/tasks?status=${status}`,
            method: 'GET',
            success: (res) => {
              if (res.data.success) {
                this.taskList = res.data.data.map(task => ({
                  ...task,
                  title: task.shop_name + '招聘',
                  status: this.getTaskStatus(task)
                }));
              } else {
                this.taskList = [];
              }
            },
            fail: () => { this.taskList = []; }
          });
        } else {
          this.taskList = [];
        }
        
      } else {
        uni.request({
          url: 'http://localhost:3000/api/demand/list',
          method: 'GET',
          success: (res) => {
            if (res.data.success) {
              this.taskList = res.data.data.map(task => ({
                ...task,
                shopName: task.shop_name
              }));
            } else {
              this.taskList = [];
            }
          },
          fail: () => {
            this.taskList = [];
          }
        });
      }
    },
    
    getTaskStatus(task) {
      if (task.accepted_count === 0) {
        return '待接单';
      } else if (task.working_count > 0) {
        return '进行中';
      } else if (task.completed_count >= task.required_workers) {
        return '已完成';
      } else {
        return '招聘中';
      }
    },
    
    formatWorkTime(workTime) {
      if (!workTime) return '';
      if (workTime.includes('-') && workTime.split(' ').length === 2) {
        const [datePart, timePart] = workTime.split(' ');
        if (timePart.includes('-')) {
          const [year, month, day] = datePart.split('-');
          return `${year}年${parseInt(month)}月${parseInt(day)}日 ${timePart}`;
        }
      }
      if (workTime.includes(':')) {
        try {
          const date = new Date(workTime.replace(/-/g, '/'));
          const year = date.getFullYear();
          const month = date.getMonth() + 1;
          const day = date.getDate();
          const hour = String(date.getHours()).padStart(2, '0');
          const minute = String(date.getMinutes()).padStart(2, '0');
          return `${year}年${month}月${day}日 ${hour}:${minute}`;
        } catch (e) {
          return workTime;
        }
      }
      return workTime;
    },
    
    handleGuestAction(task) {
      uni.showModal({
        title: '请先登录',
        content: '您需要先注册/登录零工账号才能接单',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            uni.navigateTo({ url: '/pages/login/login' });
          }
        }
      });
    },
    
    goPublishTask() {
      uni.navigateTo({ url: '/pages/task/MerchantTask/publishTask' });
    },
    showQrcode(task) {
      const qrContent = `task_id=${task.id}&merchant_id=${uni.getStorageSync('userInfo').merchant_id || uni.getStorageSync('userInfo').id}`;
      uni.previewImage({
        urls: [`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrContent)}`],
        current: 0,
        showmenu: false
      });
    },
    goToSettlementDetail(task) {
      uni.navigateTo({
        url: `/pages/task/MerchantTask/settlementDetail?taskId=${task.demand_id}`
      });
    },
    goToRateWorkers(task) {
      uni.navigateTo({
        url: `/pages/task/MerchantTask/rate?jobId=${task.demand_id}`
      });
    },
    goCancelTask(task) {
      uni.navigateTo({
        url: `/pages/task/MerchantTask/cancelTask?taskId=${task.demand_id}`
      });
    },
    deleteTask(task) {
      uni.showModal({
        title: '确认删除',
        content: '确定要删除该订单吗？删除后将无法恢复。',
        confirmText: '删除',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            uni.request({
              url: `http://localhost:3000/api/demand/${task.demand_id}`,
              method: 'DELETE',
              success: (res) => {
                if (res.data.success) {
                  uni.showToast({ title: '删除成功', icon: 'success' });
                  this.loadTaskList();
                } else {
                  uni.showToast({ title: res.data.message || '删除失败', icon: 'none' });
                }
              },
              fail: () => {
                uni.showToast({ title: '网络错误', icon: 'none' });
              }
            });
          }
        }
      });
    },
    goToLogin() {
      uni.navigateTo({ url: '/pages/login/login' });
    }
  }
}
</script>

<style scoped>
.task-page {
  background: linear-gradient(180deg, #f0fbfd 20%, #fafafa 100%);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.status-bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 0 0 0 0;
  height: 48px;
}
.status-item {
  flex: 1;
  text-align: center;
  font-size: 16px;
  color: #888;
  line-height: 48px;
  font-weight: 500;
  cursor: pointer;
}
.status-item.active {
  color: #15559a;
  font-weight: bold;
}
.task-card-detail {
  background: #fff;
  border-radius: 10px;
  margin: 12px 10px 0 10px;
  box-shadow: 0 2px 8px #e0e0e0;
  padding: 14px 14px 18px 14px;
  display: flex;
  flex-direction: column;
  border: 3px solid #e0e0e0;
}
.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  margin-right: 10px;
}
.card-title-box {
  display: flex;
  flex-direction: column;
}
.card-title {
  font-size: 16px;
  font-weight: bold;
  color: #222;
}
.card-info-row {
  font-size: 14px;
  color: #444;
  margin-bottom: 2px;
  margin-left: 2px;
}
.work-btn {
  margin-top: 10px;
  background:#2983bb;
  color: #fff;
  font-size: 15px;
  border-radius: 6px;
  padding: 7px 0;
  width: 60%;
  align-self: center;
  border: none;
}
.work-btn:disabled {
  opacity: 0.6;
  background: #bdbdbd;
  color: #fff;
}
.active-btn {
  background: #2983bb;
  color: #fff;
}

.delete-btn {
  background:#15559a;
  color: #fff;
  font-weight: bold;
}

.merchant-ended-actions{
  display: flex;
  flex-direction: row;
  gap: 12px;
  justify-content: center;
  margin-top: 10px;
}
.tabbar-holder {
  margin-top: auto;
  height: 50rpx;
}

.task-page {
  padding-bottom: 120rpx;
}
.floating-actions {
  position: fixed;
  right: 20px;
  bottom: 120px;
  z-index: 999;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.floating-btn {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s ease;
}
.floating-btn:active {
  transform: scale(0.95);
}
.floating-btn.publish-btn {
  background: #4caf50;
}
.floating-btn.manage-btn {
  background: #15559a;
}
.empty-tip {
  text-align: center;
  color: #bbb;
  margin: 40px 0;
  font-size: 15px;
}
</style>