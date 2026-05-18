<template>
  <view>
    <!-- 原有内容全部放入此view内 -->
    <view class="market-container">
      <!-- 顶部导航栏 -->
      <view class="navbar">
        <text class="time">{{ currentTime }}</text>
        <text class="title"> </text>
        <view class="nav-icons">
          <uni-icons type="more-filled" size="24" />
          <uni-icons type="gear-filled" size="24" />
        </view>
      </view>
      <!-- 搜索栏 -->
      <view class="search-bar">
        <input class="search-input" v-model="search" placeholder="搜索" />
        <text class="search-cancel" @click="search = ''">取消</text>
      </view>
      <!-- 筛选栏 -->
      <view class="filter-bar">
        <picker :range="regionOptions" :value="regionIndex" class="filter-item" @change="onRegionChange">
          <view>{{ regionOptions[regionIndex] }}(地点)</view>
        </picker>
        <picker :range="timeOptions" :value="timeIndex" class="filter-item" @change="onTimeChange">
          <view>{{ timeOptions[timeIndex] }}(时间)</view>
        </picker>
        <picker :range="salaryOptions" :value="salaryIndex" class="filter-item" @change="onSalaryChange">
          <view>{{ salaryOptions[salaryIndex] }}(薪水)</view>
        </picker>
        <text class="filter-more" @click="showMoreFilters">更多筛选</text>
      </view>
      
      <!-- 更多筛选弹窗 -->
      <view v-if="showMoreFiltersPopup" class="more-filters-overlay" @click="hideMoreFilters">
        <view class="more-filters" @click.stop>
          <view class="filter-header">
            <text class="filter-title">更多筛选</text>
            <text class="filter-close" @click="hideMoreFilters">关闭</text>
          </view>
          <view class="filter-content">
            <view class="filter-section">
              <text class="section-title">薪水范围</text>
              <view class="salary-range">
                <input 
                  class="salary-input" 
                  v-model="salaryRange.min" 
                  placeholder="最低时薪" 
                  type="number"
                />
                <text class="salary-separator">-</text>
                <input 
                  class="salary-input" 
                  v-model="salaryRange.max" 
                  placeholder="最高时薪" 
                  type="number"
                />
              </view>
            </view>
            <view class="filter-section">
              <text class="section-title">需求人数</text>
              <view class="people-range">
                <input 
                  class="people-input" 
                  v-model="peopleRange.min" 
                  placeholder="最少人数" 
                  type="number"
                />
                <text class="people-separator">-</text>
                <input 
                  class="people-input" 
                  v-model="peopleRange.max" 
                  placeholder="最多人数" 
                  type="number"
                />
              </view>
            </view>
            <view class="filter-section">
              <text class="section-title">工作日期</text>
              <view class="date-range">
                <picker 
                  mode="date" 
                  :value="dateRange.start" 
                  @change="onStartDateChange"
                  class="date-picker"
                >
                  <view class="date-input">{{ dateRange.start || '开始日期' }}</view>
                </picker>
                <text class="date-separator">至</text>
                <picker 
                  mode="date" 
                  :value="dateRange.end" 
                  @change="onEndDateChange"
                  class="date-picker"
                >
                  <view class="date-input">{{ dateRange.end || '结束日期' }}</view>
                </picker>
              </view>
            </view>
          </view>
          <view class="filter-actions">
            <button class="filter-reset" @click="resetFilters">重置</button>
            <button class="filter-apply" @click="applyMoreFilters">应用筛选</button>
          </view>
        </view>
      </view>
      <!-- 岗位列表 -->
      <view class="job-list">
        <view class="job-card" v-for="(job, idx) in filteredJobs" :key="idx" @click="goJobDetail(job)">
          <image class="job-avatar" src="/static/logo.png" />
          <view class="job-info">
            <view class="job-header">
              <view class="job-title-section">
                <text class="job-title">{{ job.shop_name || job.title || '招聘' }}</text>
                <view class="tags-container">
                  <text v-if="job._tagType === 'tag-upcoming'" :class="['tag', job._tagType]">{{ job._tagText }}</text>
                </view>
              </view>
              <text class="job-wage">{{ job.hourly_wage }}元/小时</text>
            </view>
            <view class="job-detail">报名日期：{{ getRegistrationDateRange(job.work_time) }}</view>
            <view class="job-detail">用工时间：{{ formatWorkTime(job.work_time) }}</view>
            <view class="job-detail">工作地点：{{ job.location }}</view>
            <view class="job-detail">需求人数：{{ job.accepted_count || 0 }}/{{ job.required_workers }}人</view>
            <view class="job-detail">时薪：{{ job.hourly_wage }}元/小时</view>
          </view>
          <button 
            :class="['apply-btn', job._buttonClass]" 
            @click.stop="applyJob(job)"
            :disabled="job._disabled"
          >
            {{ job._buttonText }}
          </button>
        </view>
      </view>
    </view>
    <CustomTabBar :current="1" />
  </view>
</template>

<script>
import CustomTabBar from '@/components/WorkerComponents/CustomTabBar.vue'
export default {
  components: { CustomTabBar },
  onShow() {
    this.loadLocations();
    this.loadJobs();
    this.startTimeUpdate();
  },
  onHide() {
    this.stopTimeUpdate();
  },
  onUnload() {
    this.stopTimeUpdate();
  },
  methods: {
    getTagType(job) {
      const status = this.getRegistrationStatus(job);
      if (status === 'not_started') return 'tag-upcoming';
      return '';
    },
    
    getTagText(job) {
      const status = this.getRegistrationStatus(job);
      if (status === 'not_started') return '即将开始';
      return '';
    },
    
    checkIdentityApproved(workerId) {
      return new Promise((resolve) => {
        uni.request({
          url: 'http://localhost:3000/api/identity/status',
          method: 'GET',
          data: { user_type: 'worker', user_id: workerId },
          success: (res) => {
            if (res.data && res.data.success) {
              resolve(res.data.data && res.data.data.status === 'approved');
            } else {
              resolve(false);
            }
          },
          fail: () => resolve(false)
        });
      });
    },
    
    updateTime() {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      this.currentTime = `${hours}:${minutes}`;
    },
    
    startTimeUpdate() {
      this.updateTime();
      if (this.timer) clearInterval(this.timer);
      this.timer = setInterval(() => {
        this.updateTime();
      }, 1000);
    },
    
    stopTimeUpdate() {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    },
    
    loadLocations() {
      uni.request({
        url: 'http://localhost:3000/api/locations',
        method: 'GET',
        success: (res) => {
          if (res.data.success && res.data.data.length > 0) {
            this.regionOptions = ['全部', ...res.data.data];
            console.log('成功加载地点数据:', this.regionOptions);
          } else {
            console.error('获取地点列表失败：', res.data.message);
            this.regionOptions = ['全部', '青秀区', '西乡塘区', '江南区', '兴宁区', '良庆区', '邕宁区'];
          }
        },
        fail: (err) => {
          console.error('请求地点列表失败：', err);
          this.regionOptions = ['全部', '青秀区', '西乡塘区', '江南区', '兴宁区', '良庆区', '邕宁区'];
        }
      });
    },
    
    loadJobs() {
      const userInfo = uni.getStorageSync('userInfo') || {};
      const userType = uni.getStorageSync('userType') || '';
      
      let url = 'http://localhost:3000/api/demand/list';
      let params = [];
      
      if (this.currentFilters.region && this.currentFilters.region !== '全部') {
        params.push(`region=${encodeURIComponent(this.currentFilters.region)}`);
      }
      if (this.currentFilters.time_filter && this.currentFilters.time_filter !== '全部') {
        params.push(`time_filter=${encodeURIComponent(this.currentFilters.time_filter)}`);
      }
      if (this.currentFilters.salary_min) {
        params.push(`salary_min=${this.currentFilters.salary_min}`);
      }
      if (this.currentFilters.salary_max) {
        params.push(`salary_max=${this.currentFilters.salary_max}`);
      }
      
      if (userType === 'worker' && userInfo.worker_id) {
        params.push(`worker_id=${userInfo.worker_id}`);
      }
      
      if (params.length > 0) {
        url += '?' + params.join('&');
      }
      
      console.log('筛选请求URL:', url);
      
      uni.request({
        url: url,
        method: 'GET',
        success: (res) => {
          if (res.data.success) {
            this.jobs = res.data.data.map(job => {
              const status = this.calcRegistrationStatus(job);
              let buttonClass = '';
              if (status === 'applied') buttonClass = 'applied';
              else if (status === 'closed') buttonClass = 'disabled';
              else if (status === 'not_started') buttonClass = 'not-started';
              const tagType = status === 'not_started' ? 'tag-upcoming' : '';
              const tagText = status === 'not_started' ? '即将开始' : '';
              let buttonText = '报名';
              if (status === 'applied') {
                if (job.application_status === 'pending') buttonText = '待审批';
                else if (job.application_status === 'accepted') buttonText = '已通过';
                else if (job.application_status === 'completed') buttonText = '已完成';
                else if (job.application_status === 'rejected') buttonText = '已驳回';
                else buttonText = '已报名';
              } else if (status === 'closed') {
                buttonText = '报名截止';
              } else if (status === 'not_started') {
                buttonText = '报名未开始';
              }
              return {
                ...job,
                title: job.shop_name || '招聘',
                _status: status,
                _buttonClass: buttonClass,
                _buttonText: buttonText,
                _disabled: status !== 'open',
                _tagType: tagType,
                _tagText: tagText
              };
            });
          } else {
            console.error('获取招工列表失败：', res.data.message);
            this.jobs = [];
          }
        },
        fail: (err) => {
          console.error('请求失败：', err);
          this.jobs = [];
        }
      });
    },
    
    calcRegistrationStatus(job) {
      if (job.is_applied) return 'applied';
      if (!job.work_time) return 'unknown';
      const now = new Date();
      const workTimeStr = job.work_time;
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
    
    getRegistrationStatus(job) {
      if (job.is_applied) return 'applied';
      if (!job.work_time) return 'unknown';
      const now = new Date();
      const workTimeStr = job.work_time;
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

    getRegistrationTimeInfo(workTime) {
      if (!workTime) return '';
      let workDate;
      if (workTime.includes(' ')) {
        const datePart = workTime.split(' ')[0];
        workDate = new Date(datePart + 'T00:00:00.000Z');
      } else {
        workDate = new Date(workTime);
      }
      const startDate = new Date(workDate.getTime() - (3 * 24 * 60 * 60 * 1000));
      const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      return `报名时间：${fmt(startDate)} 至 ${fmt(workDate)}`;
    },

    getRegistrationDateRange(workTime) {
      if (!workTime) return '';
      let workDate;
      if (workTime.includes(' ')) {
        const datePart = workTime.split(' ')[0];
        workDate = new Date(datePart + 'T00:00:00.000Z');
      } else {
        workDate = new Date(workTime);
      }
      const startDate = new Date(workDate.getTime() - (3 * 24 * 60 * 60 * 1000));
      const endDate = new Date(workDate.getTime() + (24 * 60 * 60 * 1000) - 1);
      const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      return `${fmt(startDate)} - ${fmt(endDate)}`;
    },

    getButtonClass(job) {
      const status = this.getRegistrationStatus(job);
      if (status === 'applied') return 'applied';
      if (status === 'closed') return 'disabled';
      if (status === 'not_started') return 'not-started';
      return '';
    },

    getButtonText(job) {
      const status = this.getRegistrationStatus(job);
      if (status === 'applied') {
        if (job.application_status === 'pending') return '待审批';
        if (job.application_status === 'accepted') return '已通过';
        if (job.application_status === 'completed') return '已完成';
        if (job.application_status === 'rejected') return '已驳回';
        return '已报名';
      }
      if (status === 'closed') return '报名截止';
      if (status === 'not_started') return '报名未开始';
      return '报名';
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
    
    applyJob(job) {
      if (job.is_applied) {
        uni.showToast({ title: '您已经报名过了', icon: 'none' });
        return;
      }
      const status = this.getRegistrationStatus(job);
      if (status === 'closed') {
        uni.showModal({
          title: '报名已截止',
          content: this.getRegistrationTimeInfo(job.work_time),
          confirmText: '知道了',
          showCancel: false
        });
        return;
      }
      if (status === 'not_started') {
        uni.showModal({
          title: '报名未开始',
          content: this.getRegistrationTimeInfo(job.work_time),
          confirmText: '知道了',
          showCancel: false
        });
        return;
      }
      if (status !== 'open') {
        uni.showToast({ title: '当前无法报名', icon: 'none' });
        return;
      }
      
      const userInfo = uni.getStorageSync('userInfo') || {};
      const userType = uni.getStorageSync('userType') || '';
      
      if (!userInfo.worker_id || userType !== 'worker') {
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

      this.checkIdentityApproved(userInfo.worker_id).then((ok) => {
        if (!ok) {
          uni.showModal({
            title: '需要实名认证',
            content: '报名需要先完成实名认证并审核通过',
            confirmText: '去实名',
            cancelText: '取消',
            success: (mRes) => {
              if (mRes.confirm) {
                uni.navigateTo({ url: '/pages/index/WorkerIndex/identityVerification' });
              }
            }
          });
          return;
        }

        uni.request({
          url: 'http://localhost:3000/api/applications/apply',
          method: 'POST',
          data: {
            job_id: job.demand_id,
            worker_id: userInfo.worker_id
          },
          success: (res) => {
            if (res.data.success) {
              uni.showToast({ title: '报名成功，待审批', icon: 'success' });
              job.is_applied = 1;
              setTimeout(() => {
                uni.reLaunch({ url: '/pages/task/WorkerTask/task' });
              }, 800);
            } else {
              if (res.statusCode === 403 || res.data.code === 'IDENTITY_NOT_APPROVED') {
                uni.showModal({
                  title: '需要实名认证',
                  content: res.data.message || '报名需要先完成实名认证并审核通过',
                  confirmText: '去实名',
                  cancelText: '取消',
                  success: (mRes) => {
                    if (mRes.confirm) {
                      uni.navigateTo({ url: '/pages/index/WorkerIndex/identityVerification' });
                    }
                  }
                });
                return;
              }
              uni.showToast({ title: res.data.message || '报名失败', icon: 'none' });
            }
          },
          fail: () => {
            uni.showToast({ title: '网络错误', icon: 'none' });
          }
        });
      });
    },
    
    onRegionChange(e) {
      const newIndex = e.detail.value;
      this.regionIndex = newIndex;
      this.currentFilters.region = this.regionOptions[newIndex];
      console.log('区域筛选变化:', this.currentFilters.region);
      this.loadJobs();
    },
    
    onTimeChange(e) {
      const newIndex = e.detail.value;
      this.timeIndex = newIndex;
      this.currentFilters.time_filter = this.timeOptions[newIndex];
      console.log('时间筛选变化:', this.currentFilters.time_filter);
      this.loadJobs();
    },
    
    onSalaryChange(e) {
      const newIndex = e.detail.value;
      this.salaryIndex = newIndex;
      const selectedSalary = this.salaryOptions[newIndex];
      if (selectedSalary === '全部') {
        this.currentFilters.salary_min = '';
        this.currentFilters.salary_max = '';
      } else {
        const value = parseFloat(selectedSalary.replace(/[^\d.]/g, ''));
        this.currentFilters.salary_min = value;
        this.currentFilters.salary_max = value;
      }
      console.log('薪水筛选变化:', this.currentFilters);
      this.loadJobs();
    },
    
    showMoreFilters() {
      this.showMoreFiltersPopup = true;
    },
    
    hideMoreFilters() {
      this.showMoreFiltersPopup = false;
    },
    
    onStartDateChange(e) {
      this.dateRange.start = e.detail.value;
      this.currentFilters.date_start = e.detail.value;
    },
    
    onEndDateChange(e) {
      this.dateRange.end = e.detail.value;
      this.currentFilters.date_end = e.detail.value;
    },
    
    resetFilters() {
      this.regionIndex = 0;
      this.timeIndex = 0;
      this.salaryIndex = 0;
      this.salaryRange = { min: '', max: '' };
      this.peopleRange = { min: '', max: '' };
      this.dateRange = { start: '', end: '' };
      this.currentFilters = {
        region: '全部',
        time_filter: '全部',
        salary_min: '',
        salary_max: '',
        people_min: '',
        people_max: '',
        date_start: '',
        date_end: ''
      };
      this.loadJobs();
    },
    
    applyMoreFilters() {
      this.currentFilters.salary_min = this.salaryRange.min || '';
      this.currentFilters.salary_max = this.salaryRange.max || '';
      this.currentFilters.people_min = this.peopleRange.min || '';
      this.currentFilters.people_max = this.peopleRange.max || '';
      this.currentFilters.date_start = this.dateRange.start || '';
      this.currentFilters.date_end = this.dateRange.end || '';
      
      this.hideMoreFilters();
      this.loadJobs();
    },
    
    goJobDetail(job) {
      if (job.demand_id) {
        uni.navigateTo({
          url: `/pages/task/WorkerTask/job-detail?id=${job.demand_id}`
        });
      }
    }
  },
  data() {
    return {
      search: '',
      currentTime: '',
      regionOptions: ['全部'],
      regionIndex: 0,
      timeOptions: ['全部', '今天', '明天', '本周'],
      timeIndex: 0,
      salaryOptions: ['全部', '15元/小时', '20元/小时', '30元/小时', '50元/小时', '100元/小时'],
      salaryIndex: 0,
      jobs: [],
      salaryRange: { min: '', max: '' },
      peopleRange: { min: '', max: '' },
      dateRange: { start: '', end: '' },
      currentFilters: {
        region: '全部',
        time_filter: '全部',
        salary_min: '',
        salary_max: '',
        people_min: '',
        people_max: '',
        date_start: '',
        date_end: ''
      },
      showMoreFiltersPopup: false,
      timer: null
    }
  },
  computed: {
    filteredJobs() {
      const keyword = (this.search || '').trim();
      if (!keyword) return this.jobs;
      return this.jobs.filter(j => {
        const text = `${j.shop_name || ''} ${j.location || ''} ${j.work_time || ''}`;
        return text.toLowerCase().includes(keyword.toLowerCase());
      });
    }
  }
}
</script>

<style scoped>
.market-container {
  background:linear-gradient(180deg, #f0fbfd 20%, #fafafa 100%);
  min-height: 100vh;
  padding-bottom: 100rpx;
}
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 30rpx 10rpx 30rpx;
  position: sticky;
  top: 0;
  z-index: 10;
}
.navbar .title {
  font-size: 36rpx;
  font-weight: bold;
}
.navbar .time {
  font-size: 24rpx;
  color: #333;
}
.nav-icons {
  display: flex;
  gap: 10rpx;
}
.search-bar {
  display: flex;
  align-items: center;
  padding: 16rpx 20rpx;
}
.search-input {
  flex: 1;
  font-size: 26rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  padding: 10rpx 18rpx;
  border: none;
  color: #333;
}
.search-cancel {
  color: #1a94bc;
  font-size: 26rpx;
  margin-left: 18rpx;
}
.filter-bar {
  display: flex;
  align-items: center;
  padding: 24rpx 20rpx;
  font-size: 24rpx;
  color: #333;
  gap: 16rpx;
}
.filter-item {
  flex: 1;
  min-width: 140rpx;
  text-align: center;
  padding: 12rpx 16rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  border: 1rpx solid #e0e0e0;
  font-size: 22rpx;
  line-height: 1.2;
  word-break: keep-all;
}
.filter-more {
  color: #126bae;
  padding: 12rpx 16rpx;
  background:#eef7f2;
  border-radius: 8rpx;
  border: 1rpx solid #126bae;
  white-space: nowrap;
  font-size: 22rpx;
  font-weight: 500;
}
.job-wage {
  font-size: 20rpx;
  font-weight: bold;
  color: #126bae;
  flex-shrink: 0;
}
.job-list {
  margin: 20rpx 10rpx 0 10rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.job-card {
  display: flex;
  align-items: flex-start;
  background: #fff;
  border-radius: 10rpx;
  padding: 16rpx;
  position: relative;
  box-shadow: 0 2rpx 8rpx #e0e0e0s;
  border: 4rpx solid #0f59a4;
}
.job-avatar {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  margin-right: 16rpx;
}
.job-info {
  flex: 1;
}
.job-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}
.job-title {
  font-size: 26rpx;
  font-weight: bold;
}
.tags-container {
  display: flex;
  gap: 10rpx;
}
.tag {
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
  font-weight: 500;
}
.tag-upcoming {
  background: #ffa502;
  color: #fff;
}
.job-detail {
  font-size: 22rpx;
  color: #555;
  margin-top: 6rpx;
}
.apply-btn {
  background: #90caf9;
  color: #fff;
  border: none;
  border-radius: 8rpx;
  padding: 4rpx 37rpx;
  font-size: 25rpx;
  position: absolute;
  right: 16rpx;
  bottom: 16rpx;
}
.apply-btn.applied {
  background: #9e9e9e;
  color: #fff;
}
.apply-btn:disabled {
  background: #9e9e9e;
  color: #fff;
}

/* 更多筛选弹窗样式 */
.more-filters-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}

.more-filters {
  background: #fff;
  border-radius: 20rpx 20rpx 0 0;
  padding: 40rpx 30rpx 140rpx 30rpx;
  max-height: 75vh;
  width: 100%;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #ccc transparent;
}

.more-filters::-webkit-scrollbar {
  width: 6rpx;
}

.more-filters::-webkit-scrollbar-track {
  background: transparent;
}

.more-filters::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3rpx;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #eee;
}

.filter-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.filter-close {
  color: #999;
  font-size: 28rpx;
  padding: 10rpx;
  border-radius: 8rpx;
}

.filter-close:active {
  background: #f5f5f5;
}

.filter-content {
  margin-bottom: 40rpx;
}

.filter-section {
  margin-bottom: 40rpx;
}

.filter-more{
	color: #126bae;
	padding: 12rpx 16rpx;
	background: #f5f5f5;
	border: 1rpx solid #126bae ;
	white-space: nowrap;
	font-size: 22rpx;
	font-weight: 500;
	
}

.section-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
  display: block;
}

.salary-range,
.people-range,
.date-range {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.salary-input,
.people-input {
  flex: 1;
  border: 1rpx solid #ddd;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 26rpx;
  background: #f9f9f9;
  text-align: center;
}

.salary-input:focus,
.people-input:focus {
  border-color: #4a90e2;
  background: #fff;
}

.salary-separator,
.people-separator,
.date-separator {
  color: #666;
  font-size: 28rpx;
  font-weight: bold;
  padding: 0 10rpx;
}

.date-picker {
  flex: 1;
}

.date-input {
  border: 1rpx solid #ddd;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 26rpx;
  background: #f9f9f9;
  color: #333;
  text-align: center;
}

.date-input:active {
  border-color: #4a90e2;
  background: #fff;
}

.filter-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 40rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #eee;
}

.filter-reset,
.filter-apply {
  flex: 1;
  padding: 24rpx;
  border-radius: 12rpx;
  font-size: 28rpx;
  border: none;
  font-weight: bold;
}

.filter-reset {
  background: #f5f5f5;
  color: #666;
}

.filter-reset:active {
  background: #e0e0e0;
}

.filter-apply {
  background: #4a90e2;
  color: #fff;
}

.filter-apply:active {
  background: #3a7bc8;
}
</style>