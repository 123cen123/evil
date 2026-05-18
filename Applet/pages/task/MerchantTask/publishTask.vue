<template>
  <view class="publish-container">
    <view class="header-bg">
      <image class="avatar" :src="shopLogo" />
      <text class="shop-name">{{ shopName }}</text>
    </view>
    <view class="form-section">
      <!-- 时间选择区域 -->
      <view class="time-select-section">
        <text class="section-title">用工时间</text>
        
        <!-- 日期选择 -->
        <view class="date-time-row">
          <text class="time-label">日期</text>
          <picker mode="date" @change="onDateChange" :value="timeSelection.date">
            <view class="time-picker-input">
              <text class="time-value">{{ timeSelection.date || '选择日期' }}</text>
              <text class="picker-arrow">></text>
            </view>
          </picker>
        </view>
        
        <!-- 开始时间选择 -->
        <view class="date-time-row">
          <text class="time-label">开始</text>
          <picker mode="time" @change="onStartTimeChange" :value="timeSelection.startTime">
            <view class="time-picker-input">
              <text class="time-value">{{ timeSelection.startTime || '选择时间' }}</text>
              <text class="picker-arrow">></text>
            </view>
          </picker>
        </view>
        
        <!-- 结束时间选择 -->
        <view class="date-time-row">
          <text class="time-label">结束</text>
          <picker mode="time" @change="onEndTimeChange" :value="timeSelection.endTime">
            <view class="time-picker-input">
              <text class="time-value">{{ timeSelection.endTime || '选择时间' }}</text>
              <text class="picker-arrow">></text>
            </view>
          </picker>
        </view>
        
        <!-- 快捷时长选项 -->
        <view class="duration-options">
          <text class="duration-title">快捷时长</text>
          <view class="duration-buttons">
            <view 
              class="duration-btn" 
              :class="{ active: selectedDuration === duration }"
              v-for="duration in durationOptions" 
              :key="duration"
              @click="selectDuration(duration)"
            >
              {{ duration }}小时
            </view>
          </view>
        </view>
        
        <!-- 报名时间提示 -->
        <view class="registration-time-hint" v-if="timeSelection.date">
          <text class="hint-label">报名时间：</text>
          <text class="hint-value">{{ getRegistrationTimeRange() }}</text>
        </view>
        
        <!-- 时间预览 -->
        <view class="time-preview" v-if="getFormattedTimeDisplay()">
          <text class="preview-label">预览：</text>
          <text class="preview-value">{{ getFormattedTimeDisplay() }}</text>
        </view>
      </view>
      
      <view class="form-input">
        <picker mode="region" @change="onWorkRegionChange" :value="workRegion" :custom-item="'全部'">
          <view>{{ workRegionDisplay || '请选择省/市/区' }}</view>
        </picker>
      </view>
      <input class="form-input" v-model="workDetailAddress" placeholder="详细地址（街道/门牌等）" @input="updateWorkLocation" />
      <!-- 获取定位：只保存经纬度到变量，不在页面展示数值 -->
      <view class="location-bar">
        <view class="location-btn" @click="fetchLatLng">
          <text>获取经纬度</text>
        </view>
        <text class="location-status">{{ locationStatusText }}</text>
      </view>
      <input class="form-input" v-model="form.title" placeholder="岗位标题" />
      <textarea class="form-input" v-model="form.description" placeholder="岗位描述" rows="3"></textarea>
      <view class="form-section">
        <text class="section-title">工作类型</text>
        <view class="job-type-options">
          <view 
            class="job-type-tag" 
            :class="{ active: form.job_type === jobType }"
            v-for="jobType in jobTypeOptions" 
            :key="jobType"
            @click="selectJobType(jobType)"
          >
            {{ jobType }}
          </view>
        </view>
        <input class="form-input" v-model="customJobType" placeholder="或输入自定义工作类型" @input="updateCustomJobType" />
      </view>
      <view class="form-input">
        <picker @change="onSalaryTypeChange" :range="salaryOptions">
          <view>{{ form.salary_type || '选择薪资类型' }}</view>
        </picker>
      </view>

      <view class="form-section">
        <text class="section-title">所需技能</text>
        <view class="skill-options">
          <view 
            class="skill-tag" 
            :class="{ active: selectedSkills.includes(skill) }"
            v-for="skill in skillOptions" 
            :key="skill"
            @click="toggleSkill(skill)"
          >
            {{ skill }}
          </view>
        </view>
        <input class="form-input" v-model="customSkill" placeholder="或输入自定义技能" @keyup.enter="addCustomSkill" />
      </view>
      <input class="form-input" v-model="form.required_workers" placeholder="需求人数" type="number" />
      <input class="form-input" v-model="form.hourly_wage" placeholder="时薪(元/小时)" type="number" step="0.01" />
      <button class="publish-btn" @click="handlePublish">发布</button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      shopLogo: '',
      shopName: '',
      form: {
        work_time: '',
        location: '',
        required_workers: '',
        hourly_wage: '',
        title: '',
        description: '',
        job_type: '',
        required_skills: [],
        salary_type: ''
      },
      workRegion: ['', '', ''],
      workDetailAddress: '',
      timeSelection: {
        date: '',
        startTime: '',
        endTime: ''
      },
      selectedDuration: null,
      durationOptions: [4, 6, 8, 10, 12],
      salaryOptions: ['日结', '小时结', '周结'],
      jobTypeOptions: ['临时促销', '派发传单', '餐饮服务', '物流配送', '家政服务'],
      skillOptions: ['沟通能力', '销售经验', '餐饮经验', '物流经验', '家政经验'],
      selectedSkills: [],
      customJobType: '',
      customSkill: '',
      // 位置经纬度（不在页面展示，只在提交时写入数据库）
      locationLat: null,
      locationLng: null
    }
  },
  computed: {
    workRegionDisplay() {
      return (this.workRegion || []).filter(Boolean).join(' ');
    },
    locationStatusText() {
      return this.locationLat !== null && this.locationLng !== null ? '已定位' : '未定位(不影响发布)';
    }
  },
  onShow() {
    // 从本地缓存获取商家信息
    const info = uni.getStorageSync('userInfo') || {};
    this.shopLogo = info.logo || '/static/logo.png';
    this.shopName = info.name || '店铺名';
    
    // 初始化默认日期为今天
    this.initDefaultDate();
    
    // 检查商家实名认证状态
    this.checkVerificationStatus();
  },
  onLoad() {
    this.initDefaultDate();
  },
  methods: {
    // 检查商家实名认证状态
    checkVerificationStatus() {
      const userInfo = uni.getStorageSync('userInfo') || {};
      const userType = uni.getStorageSync('userType') || '';
      
      // 只有商家需要验证
      if (userType !== 'merchant') {
        return;
      }
      
      const merchantId = userInfo.merchant_id || userInfo.id;
      
      if (!merchantId) {
        uni.showToast({ title: '请先登录商家账号', icon: 'none' });
        setTimeout(() => {
          uni.navigateBack();
        }, 1000);
        return;
      }
      
      uni.showLoading({ title: '检查验证状态...' });
      uni.request({
        url: 'http://localhost:3000/api/identity/status',
        method: 'GET',
        data: { user_type: userType, user_id: merchantId },
        success: (res) => {
          uni.hideLoading();
          if (res.data.success) {
            const status = res.data.data.status;
            if (status !== 'approved') {
              uni.showModal({
                title: '实名认证',
                content: '您的身份尚未实名认证通过，无法发布任务。请先完成实名认证。',
                confirmText: '去认证',
                cancelText: '取消',
                success: (modalRes) => {
                  if (modalRes.confirm) {
                    // 修正路径：商家身份验证页面
                    uni.navigateTo({ url: '/pages/index/MerchantIndex/merchant-verification' });
                  } else {
                    uni.navigateBack();
                  }
                }
              });
            }
          } else {
            uni.showToast({ title: '检查验证状态失败', icon: 'none' });
          }
        },
        fail: () => {
          uni.hideLoading();
          uni.showToast({ title: '网络错误', icon: 'none' });
        }
      });
    },
    
    // 初始化默认日期
    onWorkRegionChange(e) {
      this.workRegion = e.detail.value || [];
      this.updateWorkLocation();
    },
    updateWorkLocation() {
      const regionStr = (this.workRegion || []).filter(Boolean).join(' ');
      this.form.location = [regionStr, this.workDetailAddress].filter(Boolean).join(' ');
    },
    
    // 获取经纬度（成功/失败都不阻塞发布；失败会在提交时回落到 0,0）
    fetchLatLng() {
      uni.getLocation({
        type: 'wgs84',
        success: (res) => {
          this.locationLat = res.latitude;
          this.locationLng = res.longitude;
          uni.showToast({ title: '定位成功', icon: 'success' });
        },
        fail: () => {
          uni.showToast({ title: '定位失败，将使用默认坐标', icon: 'none' });
          this.locationLat = null;
          this.locationLng = null;
        }
      });
    },
    initDefaultDate() {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      this.timeSelection.date = `${year}-${month}-${day}`;
    },
    
    // 日期选择变化
    onDateChange(e) {
      this.timeSelection.date = e.detail.value;
      this.updateWorkTime();
    },
    
    // 开始时间选择变化
    onStartTimeChange(e) {
      this.timeSelection.startTime = e.detail.value;
      this.selectedDuration = null; // 清除快捷时长选择
      this.updateWorkTime();
    },
    
    // 结束时间选择变化
    onEndTimeChange(e) {
      this.timeSelection.endTime = e.detail.value;
      this.selectedDuration = null; // 清除快捷时长选择
      this.updateWorkTime();
    },
    
    // 选择工作时长
    selectDuration(hours) {
      this.selectedDuration = hours;
      
      // 如果有开始时间，自动计算结束时间
      if (this.timeSelection.startTime) {
        const [startHour, startMinute] = this.timeSelection.startTime.split(':').map(Number);
        const endHour = startHour + hours;
        const endMinute = startMinute;
        
        // 处理跨天情况
        if (endHour >= 24) {
          // 如果结束时间超过24小时，提示用户
          uni.showToast({ 
            title: `工作时间跨天，结束时间为次日${String(endHour - 24).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`, 
            icon: 'none',
            duration: 3000
          });
          this.timeSelection.endTime = `${String(endHour - 24).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
        } else {
          this.timeSelection.endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
        }
      } else {
        // 如果没有开始时间，设置默认开始时间为9:00
        this.timeSelection.startTime = '09:00';
        const endHour = 9 + hours;
        this.timeSelection.endTime = `${String(endHour).padStart(2, '0')}:00`;
      }
      
      this.updateWorkTime();
    },
    
    // 工作类型选择
    selectJobType(jobType) {
      this.form.job_type = jobType;
      this.customJobType = ''; // 清空自定义输入
    },
    
    // 薪资类型选择
    onSalaryTypeChange(e) {
      this.form.salary_type = this.salaryOptions[e.detail.value];
    },
    
    // 技能选择
    toggleSkill(skill) {
      const index = this.selectedSkills.indexOf(skill);
      if (index > -1) {
        this.selectedSkills.splice(index, 1);
      } else {
        this.selectedSkills.push(skill);
      }
      // 更新表单中的技能数据
      this.form.required_skills = this.selectedSkills;
    },
    
    // 更新自定义工作类型
    updateCustomJobType() {
      if (this.customJobType) {
        this.form.job_type = this.customJobType;
      }
    },
    
    // 添加自定义技能
    addCustomSkill() {
      if (this.customSkill && !this.selectedSkills.includes(this.customSkill)) {
        this.selectedSkills.push(this.customSkill);
        this.form.required_skills = this.selectedSkills;
        this.customSkill = ''; // 清空输入框
      }
    },
    
    // 更新最终的工作时间（字符串格式存储）
    updateWorkTime() {
      if (this.timeSelection.date && this.timeSelection.startTime && this.timeSelection.endTime) {
        // 生成完整的工作时间字符串：日期 开始时间-结束时间
        this.form.work_time = `${this.timeSelection.date} ${this.timeSelection.startTime}-${this.timeSelection.endTime}`;
      } else {
        this.form.work_time = '';
      }
    },
    
    // 获取格式化的时间显示（用于预览）
    getFormattedTimeDisplay() {
      if (!this.timeSelection.date || !this.timeSelection.startTime || !this.timeSelection.endTime) {
        return '';
      }
      
      // 转换为中文日期格式：2025年6月8日 16:00-22:00
      const [year, month, day] = this.timeSelection.date.split('-');
      const startTime = this.timeSelection.startTime;
      const endTime = this.timeSelection.endTime;
      
      return `${year}年${parseInt(month)}月${parseInt(day)}日 ${startTime}-${endTime}`;
    },
    
    // 获取报名时间范围
    getRegistrationTimeRange() {
      if (!this.timeSelection.date) {
        return '请先选择用工日期';
      }
      
      const [year, month, day] = this.timeSelection.date.split('-');
      const workDate = new Date(`${year}-${month}-${day}`);
      
      // 报名开始时间：工作时间前3天
      const registrationStartDate = new Date(workDate.getTime() - (3 * 24 * 60 * 60 * 1000));
      
      // 报名结束时间：工作时间当天
      const registrationEndDate = new Date(workDate.getTime());
      
      const startYear = registrationStartDate.getFullYear();
      const startMonth = String(registrationStartDate.getMonth() + 1).padStart(2, '0');
      const startDay = String(registrationStartDate.getDate()).padStart(2, '0');
      
      const endYear = registrationEndDate.getFullYear();
      const endMonth = String(registrationEndDate.getMonth() + 1).padStart(2, '0');
      const endDay = String(registrationEndDate.getDate()).padStart(2, '0');
      
      return `${startYear}年${startMonth}月${startDay}日 至 ${endYear}年${endMonth}月${endDay}日`;
    },
    
    // 简化的时间选择验证（适配字符串存储）
    validateTimeSelection() {
      const { date, startTime, endTime } = this.timeSelection;
      
      // 1. 检查是否完整选择了时间
      if (!date || !startTime || !endTime) {
        return { valid: false, message: '请完整选择用工时间' };
      }
      
      // 2. 检查开始时间是否早于结束时间
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      
      if (startHour > endHour || (startHour === endHour && startMinute >= endMinute)) {
        return { valid: false, message: '结束时间必须晚于开始时间' };
      }
      
      // 3. 检查工作时长是否合理（1-16小时）
      const workHours = (endHour - startHour) + (endMinute - startMinute) / 60;
      if (workHours > 16) {
        return { valid: false, message: '单次工作时长不能超过16小时' };
      }
      
      if (workHours < 1) {
        return { valid: false, message: '工作时长不能少于1小时' };
      }
      
      // 4. 简单的日期格式检查（可选）
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!datePattern.test(date)) {
        return { valid: false, message: '日期格式不正确' };
      }
      
      const timePattern = /^\d{2}:\d{2}$/;
      if (!timePattern.test(startTime) || !timePattern.test(endTime)) {
        return { valid: false, message: '时间格式不正确' };
      }
      
      return { valid: true, message: '时间选择有效' };
    },
    
    handlePublish() {
      // 处理自定义工作类型
      if (this.customJobType) {
        this.form.job_type = this.customJobType;
      }
      
      // 处理自定义技能
      if (this.customSkill && !this.selectedSkills.includes(this.customSkill)) {
        this.selectedSkills.push(this.customSkill);
        this.form.required_skills = this.selectedSkills;
      }
      
      // 时间验证
      const timeValidation = this.validateTimeSelection();
      if (!timeValidation.valid) {
        uni.showToast({ title: timeValidation.message, icon: 'none' });
        return;
      }
      
      // 基本字段验证
      if (!this.form.title || !this.form.description || !this.form.job_type || !this.form.salary_type || !this.form.location || !this.form.required_workers || !this.form.hourly_wage) {
        uni.showToast({ title: '请填写完整信息', icon: 'none' });
        return;
      }
      if (this.form.required_workers <= 0) {
        uni.showToast({ title: '需求人数必须大于0', icon: 'none' });
        return;
      }
      if (this.form.hourly_wage < 0) {
        uni.showToast({ title: '时薪不能为负数', icon: 'none' });
        return;
      }
      
      // 调用后端接口发布需求单
      const merchantInfo = uni.getStorageSync('userInfo') || {};
      
      // 检查商家信息
      if (!merchantInfo.merchant_id) {
        // 临时处理：如果没有merchant_id但有id，使用id作为merchant_id
        if (merchantInfo.id) {
          merchantInfo.merchant_id = merchantInfo.id;
        } else {
          uni.showToast({ title: '请先登录商家账号', icon: 'none' });
          return;
        }
      }
      
      console.log('商家信息：', merchantInfo);
      console.log('发送数据：', {
        merchant_id: merchantInfo.merchant_id,
        work_time: this.form.work_time,
        location: this.form.location,
        location_lat: this.locationLat !== null && this.locationLat !== undefined ? Number(this.locationLat) : 0,
        location_lng: this.locationLng !== null && this.locationLng !== undefined ? Number(this.locationLng) : 0,
        required_workers: parseInt(this.form.required_workers),
        hourly_wage: parseFloat(this.form.hourly_wage),
        title: this.form.title,
        description: this.form.description,
        job_type: this.form.job_type,
        required_skills: this.form.required_skills,
        salary_type: this.form.salary_type
      });
      
      uni.request({
        url: 'http://localhost:3000/api/demand/create',
        method: 'POST',
        data: {
          merchant_id: merchantInfo.merchant_id,
          work_time: this.form.work_time,
          location: this.form.location,
          location_lat: this.locationLat !== null && this.locationLat !== undefined ? Number(this.locationLat) : 0,
          location_lng: this.locationLng !== null && this.locationLng !== undefined ? Number(this.locationLng) : 0,
          required_workers: parseInt(this.form.required_workers),
          hourly_wage: parseFloat(this.form.hourly_wage),
          title: this.form.title,
          description: this.form.description,
          job_type: this.form.job_type,
          required_skills: this.form.required_skills,
          salary_type: this.form.salary_type
        },
        success: (res) => {
          console.log('后端响应：', res);
          if (res.data.success) {
            uni.showToast({ title: '发布成功', icon: 'success' });
            setTimeout(() => {
              uni.navigateBack();
            }, 800);
          } else {
            console.error('发布失败：', res.data);
            uni.showToast({ title: res.data.message || '发布失败', icon: 'none' });
          }
        },
        fail: (err) => {
          console.error('请求失败：', err);
          uni.showToast({ title: '网络错误', icon: 'none' });
        }
      });
    }
  }
}
</script>

<style scoped>
.publish-container {
  background: #f8f8f8;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.header-bg {
  background: #e0f7fa;
  border-bottom-left-radius: 24rpx;
  border-bottom-right-radius: 24rpx;
  padding: 48rpx 0 32rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  border: 4rpx solid #fff;
  box-shadow: 0 2rpx 8rpx #b2ebf2;
  margin-bottom: 18rpx;
}
.shop-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #222;
}
.form-section {
  background: #fff;
  margin: 30rpx 30rpx 0 30rpx;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 12rpx #f0f0f0;
  padding: 30rpx 24rpx 30rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.form-input {
  width: 100%;
  font-size: 28rpx;
  border-radius: 10rpx;
  padding: 22rpx 18rpx;
  border: 1rpx solid #e0e0e0;
  background: #fafafa;
  color: #222;
  font-weight: bold;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
}
.publish-btn {
  margin: 30rpx auto 40rpx auto;
  width: 80%;
  background: linear-gradient(90deg, #4386e9 0%, #38f9d7 100%);
  color: #fff;
  font-size: 32rpx;
  border-radius: 32rpx;
  padding: 24rpx 0;
  border: none;
  font-weight: bold;
  box-shadow: 0 6rpx 24rpx rgba(67,233,123,0.18);
  letter-spacing: 8rpx;
  transition: box-shadow 0.2s;
  display: block;
}
.publish-btn:active {
  box-shadow: 0 2rpx 8rpx rgba(67,233,123,0.12);
}

/* 时间选择器样式 */
.time-select-section {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

/* 日期时间行样式 */
.date-time-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 16rpx;
  background: #f8f9fa;
  border-radius: 12rpx;
  border: 2rpx solid #e9ecef;
}

.time-label {
  font-size: 28rpx;
  color: #495057;
  font-weight: 500;
  min-width: 80rpx;
}

.time-picker-input {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  margin-left: 20rpx;
  padding: 12rpx 16rpx;
  background: #fff;
  border-radius: 8rpx;
  border: 1rpx solid #dee2e6;
}

.time-value {
  font-size: 26rpx;
  color: #333;
}

.picker-arrow {
  font-size: 24rpx;
  color: #6c757d;
  transform: rotate(90deg);
}

/* 时长选项样式 */
.duration-options {
  margin-top: 16rpx;
}

.duration-title {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 16rpx;
  display: block;
}

.duration-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.duration-btn {
  background: #f8f9fa;
  border: 2rpx solid #dee2e6;
  border-radius: 20rpx;
  padding: 12rpx 20rpx;
  font-size: 24rpx;
  color: #495057;
  transition: all 0.3s ease;
  cursor: pointer;
}

.duration-btn.active {
  background: linear-gradient(90deg, #4386e9 0%, #38f9d7 100%);
  border-color: #4386e9;
  color: #fff;
  box-shadow: 0 4rpx 12rpx rgba(67,134,233,0.3);
}

.duration-btn:active {
  transform: scale(0.95);
}

/* 报名时间提示样式 */
.registration-time-hint {
  background: #f0f9eb;
  border: 2rpx solid #67c23a;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  margin-top: 16rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.hint-label {
  font-size: 26rpx;
  color: #67c23a;
  font-weight: 500;
}

.hint-value {
  font-size: 26rpx;
  color: #389e0d;
  font-weight: bold;
}

/* 时间预览样式 */
.time-preview {
  background: #e3f2fd;
  border: 2rpx solid #2196f3;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-top: 20rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.preview-label {
  font-size: 26rpx;
  color: #1565c0;
  font-weight: 500;
}

.preview-value {
  font-size: 26rpx;
  color: #0d47a1;
  font-weight: bold;
}

/* 定位栏：不展示经纬度，只给出“已定位/未定位”状态 */
.location-bar {
  margin-top: 20rpx;
  background: #f8f9fa;
  border-radius: 12rpx;
  padding: 18rpx 16rpx;
  border: 2rpx solid #e9ecef;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}

.location-btn {
  flex: 1;
  background: linear-gradient(90deg, #4386e9 0%, #38f9d7 100%);
  color: #fff;
  font-size: 28rpx;
  border-radius: 10rpx;
  padding: 16rpx 0;
  text-align: center;
  font-weight: bold;
}

.location-status {
  width: 200rpx;
  font-size: 26rpx;
  color: #888;
  white-space: nowrap;
  text-align: right;
}

/* 工作类型选择样式 */
.job-type-options {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 16rpx;
}

.job-type-tag {
  background: #f8f9fa;
  border: 2rpx solid #dee2e6;
  border-radius: 20rpx;
  padding: 12rpx 24rpx;
  font-size: 24rpx;
  color: #495057;
  transition: all 0.3s ease;
  cursor: pointer;
}

.job-type-tag.active {
  background: linear-gradient(90deg, #4386e9 0%, #38f9d7 100%);
  border-color: #4386e9;
  color: #fff;
  box-shadow: 0 4rpx 12rpx rgba(67,134,233,0.3);
}

.job-type-tag:active {
  transform: scale(0.95);
}

/* 技能选择样式 */
.skill-options {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 16rpx;
}

.skill-tag {
  background: #f8f9fa;
  border: 2rpx solid #dee2e6;
  border-radius: 20rpx;
  padding: 12rpx 24rpx;
  font-size: 24rpx;
  color: #495057;
  transition: all 0.3s ease;
  cursor: pointer;
}

.skill-tag.active {
  background: linear-gradient(90deg, #4386e9 0%, #38f9d7 100%);
  border-color: #4386e9;
  color: #fff;
  box-shadow: 0 4rpx 12rpx rgba(67,134,233,0.3);
}

.skill-tag:active {
  transform: scale(0.95);
}
</style>