<template>
  <view class="job-detail-container">


    <view class="job-content" v-if="jobInfo">
      <!-- 任务标题和商家信息 -->
      <view class="job-header">
        <image class="shop-avatar" src="/static/logo.png" />
        <view class="shop-info">
          <text class="shop-name">{{ jobInfo.shop_name || '商家' }}</text>
          <text class="contact-person">联系人：{{ jobInfo.contact_person || '未提供' }}</text>
        </view>
      </view>
      
      <!-- 任务基本信息 -->
      <view class="job-info-section">
        <text class="section-title">岗位信息</text>
        <view class="info-item">
          <text class="info-label">岗位标题：</text>
          <text class="info-value">{{ jobInfo.title || '未设置' }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">岗位描述：</text>
          <text class="info-value">{{ jobInfo.description || '未设置' }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">工作类型：</text>
          <text class="info-value">{{ jobInfo.job_type || '未设置' }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">任务类型：</text>
          <text :class="['task-type-badge', taskTypeBadgeClass(jobInfo.task_type)]">
            {{ taskTypeLabel(jobInfo.task_type) }}
          </text>
        </view>
        <view class="info-item">
          <text class="info-label">所需技能：</text>
          <view class="skills-container">
            <view class="skill-tag" v-for="(skill, index) in skillsList" :key="index">
              {{ skill }}
            </view>
            <text v-if="skillsList.length === 0" class="no-skills">未设置</text>
          </view>
        </view>
        <view class="info-item">
          <text class="info-label">薪资类型：</text>
          <text class="info-value">{{ jobInfo.salary_type || '未设置' }}</text>
        </view>
      </view>
      
      <!-- 工作时间和地点 -->
      <view class="job-info-section">
        <text class="section-title">工作信息</text>
        <view class="info-item">
          <text class="info-label">用工时间：</text>
          <text class="info-value">{{ formatWorkTime(jobInfo.work_time) }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">工作地点：</text>
          <text class="info-value">{{ jobInfo.location || '未设置' }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">需求人数：</text>
          <text class="info-value">{{ jobInfo.required_workers || 0 }}人</text>
        </view>
        <view class="info-item">
          <text class="info-label">已报名：</text>
          <text class="info-value">{{ jobInfo.accepted_count || 0 }}人</text>
        </view>
        <view class="info-item">
          <text class="info-label">时薪：</text>
          <text class="info-value" style="color: #ff6b6b;">{{ jobInfo.hourly_wage || 0 }}元/小时</text>
        </view>
      </view>
      
      <!-- 报名按钮 -->
      <view class="apply-section" v-if="userType === 'worker'">
        <button 
          :class="['apply-btn', buttonClass]" 
          @click="applyJob"
          :disabled="buttonDisabled"
        >
          {{ buttonText }}
        </button>
      </view>
    </view>
    
    <view class="loading" v-else>
      <text>加载中...</text>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      jobId: '',
      jobInfo: null,
      userInfo: {},
      userType: '',
      applicationStatus: 'not_applied',
      buttonClass: '',
      buttonDisabled: true,
      buttonText: '立即报名'
    };
  },
  computed: {
    skillsList() {
      if (!this.jobInfo || !this.jobInfo.required_skills) return [];
      try {
        if (typeof this.jobInfo.required_skills === 'string') {
          return JSON.parse(this.jobInfo.required_skills);
        } else if (Array.isArray(this.jobInfo.required_skills)) {
          return this.jobInfo.required_skills;
        }
      } catch (e) {
        console.error('解析技能数据失败:', e);
      }
      return [];
    },
    canApply() {
      if (!this.jobInfo) return false;
      // 检查报名状态
      if (this.applicationStatus === 'applied') return false;
      // 检查任务状态
      if (this.jobInfo.status === 2 || this.jobInfo.status === 3) return false;
      // 检查报名时间
      return this.getRegistrationStatus() === 'open';
    }
  },
  onLoad(options) {
    if (options.id) {
      this.jobId = options.id;
      this.loadJobDetail();
    }
    this.userInfo = uni.getStorageSync('userInfo') || {};
    this.userType = uni.getStorageSync('userType') || '';
  },
  methods: {

    loadJobDetail() {
      uni.request({
        url: `http://localhost:3000/api/demand/${this.jobId}`,
        method: 'GET',
        success: (res) => {
          if (res.data.success) {
            this.jobInfo = res.data.data;
            // 检查用户是否已报名
            this.checkApplicationStatus();
          } else {
            uni.showToast({ title: '获取任务详情失败', icon: 'none' });
          }
        },
        fail: () => {
          uni.showToast({ title: '网络错误', icon: 'none' });
        }
      });
    },
    checkApplicationStatus() {
      if (this.userType === 'worker' && this.userInfo.worker_id) {
        uni.request({
          url: `http://localhost:3000/api/demand/list?worker_id=${this.userInfo.worker_id}`,
          method: 'GET',
          success: (res) => {
            if (res.data.success && res.data.data) {
              const job = res.data.data.find(item => item.demand_id == this.jobId);
              if (job) {
                this.applicationStatus = job.is_applied ? 'applied' : 'not_applied';
              }
            }
            this.updateButtonState();
          }
        });
      } else {
        this.updateButtonState();
      }
    },
    updateButtonState() {
      if (this.applicationStatus === 'applied') {
        this.buttonClass = 'applied';
        this.buttonDisabled = true;
        this.buttonText = '已报名';
        return;
      }
      const status = this.getRegistrationStatus();
      if (status === 'closed') {
        this.buttonClass = 'disabled';
        this.buttonDisabled = true;
        this.buttonText = '报名截止';
      } else if (status === 'not_started') {
        this.buttonClass = 'not-started';
        this.buttonDisabled = true;
        this.buttonText = '报名未开始';
      } else {
        this.buttonClass = '';
        this.buttonDisabled = false;
        this.buttonText = '立即报名';
      }
    },
    formatWorkTime(workTime) {
      if (!workTime) return '未设置';
      if (workTime.includes('-') && workTime.split(' ').length === 2) {
        const [datePart, timePart] = workTime.split(' ');
        if (timePart.includes('-')) {
          const [year, month, day] = datePart.split('-');
          return `${year}年${parseInt(month)}月${parseInt(day)}日 ${timePart}`;
        }
      }
      return workTime;
    },
    getRegistrationStatus() {
      if (!this.jobInfo || !this.jobInfo.work_time) return 'unknown';
      const now = new Date();
      const workTimeStr = this.jobInfo.work_time;
      let workDate;
      if (workTimeStr.includes(' ')) {
        const datePart = workTimeStr.split(' ')[0];
        workDate = new Date(datePart + 'T00:00:00.000Z');
      } else {
        workDate = new Date(workTimeStr);
      }
      const startDate = new Date(workDate.getTime() - (3 * 24 * 60 * 60 * 1000));
      if (now < startDate) return 'not_started';
      if (now > workDate) return 'closed';
      return 'open';
    },
    getButtonClass() {
      if (this.applicationStatus === 'applied') return 'applied';
      if (this.getRegistrationStatus() === 'closed') return 'disabled';
      if (this.getRegistrationStatus() === 'not_started') return 'not-started';
      return '';
    },
    getButtonText() {
      if (this.applicationStatus === 'applied') {
        return '已报名';
      }
      if (this.getRegistrationStatus() === 'closed') return '报名截止';
      if (this.getRegistrationStatus() === 'not_started') return '报名未开始';
      return '立即报名';
    },
    taskTypeLabel(t) {
      if (t === 'simple') return '简单任务（上工免审）';
      if (t === 'audit') return '审核任务（上工/下工需商家确认）';
      return '未知任务类型';
    },
    taskTypeBadgeClass(t) {
      if (t === 'simple') return 'task-type-badge--simple';
      if (t === 'audit') return 'task-type-badge--audit';
      return '';
    },
    applyJob() {
      if (!this.userInfo.worker_id || this.userType !== 'worker') {
        uni.showModal({
          title: '请先登录',
          content: '您需要先注册/登录零工账号才能报名',
          confirmText: '去登录',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) {
              uni.navigateTo({ url: '/pages/login/login' });
            }
          }
        });
        return;
      }
      
      // 调用报名接口
      uni.request({
        url: 'http://localhost:3000/api/applications/apply',
        method: 'POST',
        data: {
          job_id: this.jobId,
          worker_id: this.userInfo.worker_id
        },
        success: (res) => {
          if (res.data.success) {
            uni.showToast({ title: '报名成功，待审批', icon: 'success' });
            this.applicationStatus = 'applied';
          } else {
            uni.showToast({ title: res.data.message || '报名失败', icon: 'none' });
          }
        },
        fail: () => {
          uni.showToast({ title: '网络错误', icon: 'none' });
        }
      });
    }
  }
};
</script>

<style scoped>
.job-detail-container {
  background: #f7f7f7;
  min-height: 100vh;
}



.job-content {
  padding: 20rpx;
}

.job-header {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.shop-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  margin-right: 20rpx;
}

.shop-info {
  flex: 1;
}

.shop-name {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
  display: block;
}

.contact-person {
  font-size: 24rpx;
  color: #666;
}

.job-info-section {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.section-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
  display: block;
  border-bottom: 1rpx solid #eee;
  padding-bottom: 12rpx;
}

.info-item {
  display: flex;
  margin-bottom: 16rpx;
  align-items: flex-start;
}

.info-label {
  font-size: 24rpx;
  color: #666;
  min-width: 140rpx;
  flex-shrink: 0;
}

.info-value {
  font-size: 24rpx;
  color: #333;
  flex: 1;
  line-height: 1.4;
}

.skills-container {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.skill-tag {
  background: #e3f2fd;
  border: 1rpx solid #bbdefb;
  border-radius: 16rpx;
  padding: 8rpx 16rpx;
  font-size: 22rpx;
  color: #1976d2;
}

.no-skills {
  font-size: 24rpx;
  color: #999;
}

.task-type-badge {
  display: inline-flex;
  align-items: center;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 700;
  line-height: 1.2;
  color: #666;
  background: #f0f0f0;
}
.task-type-badge--simple {
  color: #2e7d32;
  background: #e8f5e9;
}
.task-type-badge--audit {
  color: #1565c0;
  background: #e3f2fd;
}

.apply-section {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 20rpx;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.1);
}

.apply-btn {
  width: 100%;
  background: linear-gradient(90deg, #4386e9 0%, #38f9d7 100%);
  color: #fff;
  border: none;
  border-radius: 12rpx;
  padding: 24rpx;
  font-size: 28rpx;
  font-weight: bold;
}

.apply-btn.applied {
  background: #9e9e9e;
}

.apply-btn:disabled {
  background: #9e9e9e;
}

.apply-btn.not-started {
  background: #ffc107;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 50vh;
  font-size: 28rpx;
  color: #666;
}
</style>