<template>
	<view class="home-container">
		<view class="navbar fixed-top">
			<text class="time">{{ currentTime }}</text>
			<view class="location-container">
				<view class="location-info" v-if="location" @click="refreshLocation">
					<uni-icons type="location" size="20" color="#4a90e2" />
					<text class="location-text">{{ locationText || '已定位' }}</text>
					<uni-icons type="refreshempty" size="14" color="#4a90e2" style="margin-left: 4rpx;" />
				</view>
				<view class="location-info location-info--error" v-else-if="locationError" @click="refreshLocation">
					<uni-icons type="location" size="20" color="#ff6b6b" />
					<text class="location-text location-text--error">{{ loadingText || '定位失败' }}</text>
					<text class="retry-text" v-if="loadingText !== 'H5暂不支持'">点击重试</text>
				</view>
				<view class="location-info location-info--loading" v-else>
					<uni-icons type="location" size="20" color="#999" />
					<text class="location-text location-text--loading">{{ loadingText || '定位中...' }}</text>
				</view>
			</view>
			<view class="nav-icons">
				<uni-icons type="more-filled" size="24" @click="showMenu" />
				<uni-icons type="gear-filled" size="24" @click="goSetting" />
			</view>
		</view>

		<view class="title-section">
			<text class="main-title">邕工帮</text>
		</view>

		<!-- 轮播器 -->
		<view class="banner-container">
			<swiper 
				class="banner-swiper" 
				:indicator-dots="true" 
				:autoplay="true" 
				:interval="2000"
				:circular="true"
				:previous-margin="'60rpx'"
				:next-margin="'60rpx'"
				indicator-color="rgba(255,255,255,0.5)"
				indicator-active-color="#ffffff"
				@change="onSwiperChange"
			>
				<swiper-item v-for="(banner, index) in banners" :key="index">
					<view class="swiper-item-wrapper" :class="{'active': currentBannerIndex === index}">
						<image 
							:src="banner.src" 
							class="banner-image"
							:mode="banner.mode || 'aspectFill'"
							@load="onImageLoad" 
						></image>
					</view>
				</swiper-item>
			</swiper>
		</view>
		
		<!-- 快捷入口 -->
		<view class="quick-entry">
			<view class="entry-item" @click="goRegisterShop">
				<uni-icons type="shop" size="30" color="#0f59a4"/>
				<text>商家注册</text>
			</view>
			<view class="entry-item" @click="goRegisterWorker">
				<uni-icons type="person" size="30" color="#0f59a4"/>
				<text>零工注册</text>
			</view>
			<view class="entry-item" @click="goHelp">
				<uni-icons type="help" size="30" color="#0f59a4"/>
				<text>帮助中心</text>
			</view>
			<view class="entry-item" @click="goAll">
				<uni-icons type="more-filled" size="30" color="#0f59a4"/>
				<text>全部</text>
			</view>
		</view>

		<!-- 招工市场 - 推荐系统智能推荐 -->
		<view class="market-section">
			<view class="section-title">
				智能推荐岗位
				<text class="recommend-badge" v-if="experimentInfo">AI推荐</text>
			</view>
			
			<!-- 加载状态 -->
			<view v-if="loading" class="loading-container">
				<view class="loading-spinner"></view>
				<text class="loading-text">正在为您智能推荐...</text>
			</view>
			
			<!-- 推荐列表 -->
			<view class="job-list" v-else>
				<view class="job-card" v-for="(job, index) in jobList" :key="job.demand_id || index" @click="goJobDetail(job)">
					<image class="job-avatar" src="/static/logo.png" />
					<view class="job-info">
						<view class="job-header">
							<text class="job-title">{{ job.shop_name || '招聘' }}</text>
							<view class="tags-container">
								<text v-if="job._tagType === 'tag-upcoming'" :class="['tag', 'tag-upcoming']">{{ job._tagText }}</text>
								<text v-if="job._distance" class="tag tag-distance">距您{{ job._distance }}km</text>
								<text v-if="job._score" class="tag tag-score">推荐度{{ Math.round(job._score * 100) }}%</text>
							</view>
						</view>
						<view class="job-detail">用工时间：{{ formatWorkTime(job.work_time) }}</view>
						<view class="job-detail">地址：{{ job.location }}</view>
						<view class="job-detail">需求人数：{{ job.accepted_count || 0 }}/{{ job.required_workers }}人</view>
						<view class="job-detail salary-info">
							<text class="salary-amount">{{ formatSalary(job) }}</text>
						</view>
						<view v-if="job._recommend_reason" class="job-detail recommend-reason">
							<text class="reason-icon">💡</text> {{ job._recommend_reason }}
						</view>
					</view>
					<button 
						:class="['apply-btn', job._calcButtonClass]"
						@click.stop="applyJob(job)"
						:disabled="job._calcDisabled"
					>
						{{ getButtonText(job) }}
					</button>
				</view>
				
				<view v-if="jobList.length === 0 && !loading" class="no-jobs">
					<text>暂无推荐岗位</text>
					<text class="retry-hint" @click="loadJobList">点击重试</text>
				</view>
			</view>
		</view>

		<!-- 底部导航栏 -->
		<CustomTabBar :current="0" />
	</view>
</template>

<script>
import CustomTabBar from '@/components/WorkerComponents/CustomTabBar.vue'

// #ifdef MP-WEIXIN
const QQMapWX = require('../../../libs/qqmap-wx-jssdk.min.js')
// #endif

// 推荐系统API地址
const RECOMMEND_API_URL = 'http://localhost:5000/api/recommend/jobs'

export default {
	name: 'HomePage',
	components: { CustomTabBar },
	data() {
		return {
			jobList: [],
			currentTime: '',
			currentBannerIndex: 0,
			banners: [
				{ src: '/static/banner1.png', mode: 'aspectFill' },
				{ src: '/static/banner2.png', mode: 'aspectFill' },
				{ src: '/static/banner3.png', mode: 'aspectFill' },
				{ src: '/static/banner4.png', mode: 'aspectFill' },
				{ src: '/static/banner5.png', mode: 'aspectFill' },
			],
			systemInfo: null,
			location: null,
			locationError: false,
			locationText: '',
			loadingText: '定位中...',
			isLocating: false,
			isFromCache: false,
			timer: null,
			experimentInfo: null,
			loading: false  // 加载状态
		}
	},
	onLoad() {
		this.getSystemInfo();
	},
	onShow() {
		this.loadJobList();
		this.startTimeUpdate();
		this.checkCachedLocation();
	},
	onHide() {
		this.stopTimeUpdate();
	},
	onUnload() {
		this.stopTimeUpdate();
	},
	methods: {
		// ========== 推荐系统核心方法 ==========
		
		/**
		 * 加载推荐岗位列表（由推荐系统提供）
		 */
		loadJobList() {
			// 获取用户信息
			const userInfo = uni.getStorageSync('userInfo') || {};
			const userType = uni.getStorageSync('userType') || '';
			
			// 检查定位
			if (!this.location || !this.location.latitude || !this.location.longitude) {
				console.log('等待定位完成...');
				// 如果已经有缓存的定位，先使用缓存
				const cachedLocation = uni.getStorageSync('cachedLocation');
				if (cachedLocation && cachedLocation.latitude) {
					this.location = cachedLocation;
					this.locationText = uni.getStorageSync('cachedAddress') || '已定位';
					this.doLoadRecommendJobs(userInfo, userType);
				} else {
					// 没有定位，等待1秒后重试
					setTimeout(() => {
						if (this.location && this.location.latitude) {
							this.doLoadRecommendJobs(userInfo, userType);
						} else {
							// 使用默认位置（南宁市中心坐标）
							console.log('使用默认位置');
							this.doLoadRecommendJobs(userInfo, userType, 22.8167, 108.3167);
						}
					}, 1500);
				}
				return;
			}
			
			this.doLoadRecommendJobs(userInfo, userType);
		},
		
		/**
		 * 执行推荐请求
		 */
		doLoadRecommendJobs(userInfo, userType, defaultLat = null, defaultLng = null) {
			this.loading = true;
			
			const lat = defaultLat || this.location.latitude;
			const lng = defaultLng || this.location.longitude;
			const workerId = (userType === 'worker' && userInfo.worker_id) ? userInfo.worker_id : null;
			
			// 构建请求参数
			const requestData = {
				location: {
					lat: lat,
					lng: lng
				},
				limit: 20
			};
			
			// 如果有工人ID，则传递（用于个性化推荐）
			if (workerId) {
				requestData.worker_id = workerId;
			}
			
			console.log('请求推荐系统:', RECOMMEND_API_URL, requestData);
			
			uni.request({
				url: RECOMMEND_API_URL,
				method: 'POST',
				header: {
					'Content-Type': 'application/json'
				},
				data: requestData,
				timeout: 10000,
				success: (res) => {
					console.log('推荐系统响应:', res.data);
					
					if (res.data && res.data.success) {
						// 保存实验信息
						if (res.data.experiment_info) {
							this.experimentInfo = res.data.experiment_info;
						}
						
						// 转换推荐结果为岗位列表
						if (res.data.jobs && res.data.jobs.length > 0) {
							this.jobList = this.transformRecommendJobs(res.data.jobs);
							console.log(`成功加载 ${this.jobList.length} 条推荐岗位`);
						} else {
							console.log('推荐系统返回空列表');
							this.jobList = [];
							this.showEmptyTip();
						}
					} else {
						console.error('推荐系统返回失败:', res.data);
						this.jobList = [];
						this.showErrorTip('推荐服务异常');
					}
				},
				fail: (err) => {
					console.error('推荐系统请求失败:', err);
					this.jobList = [];
					this.showErrorTip('网络连接失败');
				},
				complete: () => {
					this.loading = false;
				}
			});
		},
		
		/**
		 * 转换推荐系统返回的数据格式
		 */
		transformRecommendJobs(recommendJobs) {
			return recommendJobs.map((job, index) => {
				const jobInfo = job.job_info || {};
				
				// 计算报名状态
				const status = this.calcRegistrationStatusForJob(jobInfo);
				
				// 确定按钮样式
				let buttonClass = '';
				if (status === 'applied') buttonClass = 'applied';
				else if (status === 'closed') buttonClass = 'disabled';
				else if (status === 'not_started') buttonClass = 'not-started';
				
				// 标签类型
				const tagType = status === 'not_started' ? 'tag-upcoming' : '';
				const tagText = status === 'not_started' ? '即将开始' : '';
				
				// 计算时薪（如果日结则除以8小时）
				let hourlyWage = null;
				let displaySalary = jobInfo.salary;
				let displaySalaryType = jobInfo.salary_type;
				
				if (jobInfo.salary_type === '日结' && jobInfo.salary) {
					hourlyWage = Math.round(jobInfo.salary / 8);
					displaySalary = `${jobInfo.salary}元/天 (约${hourlyWage}元/小时)`;
				} else if (jobInfo.salary_type === '小时' && jobInfo.salary) {
					displaySalary = `${jobInfo.salary}元/小时`;
				}
				
				return {
					// 原始数据
					demand_id: job.job_id,
					shop_name: jobInfo.merchant_name || '商家招聘',
					work_time: jobInfo.start_time,
					location: jobInfo.address || '待定地址',
					required_workers: jobInfo.required_count || 1,
					accepted_count: jobInfo.current_count || 0,
					salary: jobInfo.salary,
					salary_type: jobInfo.salary_type,
					hourly_wage: hourlyWage,
					display_salary: displaySalary,
					job_type: jobInfo.job_type,
					description: jobInfo.description,
					merchant_rating: jobInfo.merchant_rating,
					
					// 推荐系统额外信息
					_recommend_score: job.score,
					_recommend_reason: job.reason,
					_distance: job.distance ? job.distance.toFixed(1) : null,
					
					// 状态信息（需要后续接口查询，先默认false）
					is_applied: false,
					application_status: null,
					
					// 计算属性
					_calcStatus: status,
					_calcButtonClass: buttonClass,
					_calcDisabled: status !== 'open',
					_tagType: tagType,
					_tagText: tagText
				};
			});
		},
		
		/**
		 * 计算岗位报名状态
		 */
		calcRegistrationStatusForJob(jobInfo) {
			// 如果有报名信息就返回已报名
			// 实际应该从后端查询，这里先返回开放状态
			if (!jobInfo.start_time) return 'open';
			
			const now = new Date();
			const workTimeStr = jobInfo.start_time;
			let workDate;
			
			if (workTimeStr && workTimeStr.includes('T')) {
				workDate = new Date(workTimeStr);
			} else if (workTimeStr && workTimeStr.includes(' ')) {
				const datePart = workTimeStr.split(' ')[0];
				workDate = new Date(datePart + 'T00:00:00');
			} else if (workTimeStr) {
				workDate = new Date(workTimeStr);
			} else {
				return 'open';
			}
			
			// 报名开始时间（用工前3天）
			const startDate = new Date(workDate.getTime() - (3 * 24 * 60 * 60 * 1000));
			
			if (now < startDate) return 'not_started';
			if (now > workDate) return 'closed';
			return 'open';
		},
		
		/**
		 * 格式化薪资显示
		 */
		formatSalary(job) {
			if (job.display_salary) return job.display_salary;
			if (job.salary) {
				if (job.salary_type === '日结') {
					return `${job.salary}元/天`;
				} else if (job.salary_type === '小时') {
					return `${job.salary}元/小时`;
				}
				return `${job.salary}元`;
			}
			return '面议';
		},
		
		/**
		 * 显示空提示
		 */
		showEmptyTip() {
			uni.showToast({
				title: '暂无推荐岗位',
				icon: 'none',
				duration: 2000
			});
		},
		
		/**
		 * 显示错误提示
		 */
		showErrorTip(msg) {
			uni.showToast({
				title: msg || '推荐服务暂不可用',
				icon: 'none',
				duration: 2000
			});
		},
		
		// ========== 定位相关方法 ==========
		
		refreshLocation() {
			this.getLocation();
			// 重新加载推荐
			setTimeout(() => {
				this.loadJobList();
			}, 1000);
		},
		
		getLocation() {
			if (this.isLocating) {
				console.log('定位正在进行中，跳过重复调用');
				return;
			}
			
			let platform = '';
			try {
				const systemInfo = uni.getSystemInfoSync();
				platform = systemInfo.platform || '';
			} catch (e) {
				console.log('获取系统信息失败:', e);
			}
			
			const hasWindow = typeof window !== 'undefined' && window.document;
			const isWechat = platform === 'mp-weixin';
			const isH5Browser = hasWindow && !isWechat;
			
			if (isH5Browser) {
				this.isLocating = false;
				this.locationError = true;
				this.loadingText = 'H5暂不支持';
				this.locationText = '请使用微信';
				return;
			}
			
			this.isLocating = true;
			this.location = null;
			this.locationError = false;
			this.loadingText = '定位中...';
			
			const timeoutId = setTimeout(() => {
				if (this.isLocating) {
					this.isLocating = false;
					this.locationError = true;
					this.loadingText = '定位超时';
					uni.showToast({ title: '定位超时，请检查GPS或网络', icon: 'none', duration: 2000 });
				}
			}, 15000);
			
			// #ifdef APP-PLUS
			this.getLocationInfo(timeoutId);
			// #endif
			
			// #ifdef MP-WEIXIN
			uni.getSetting({
				success: (res) => {
					const authStatus = res.authSetting['scope.userLocation'];
					if (authStatus === true) {
						this.getLocationInfo(timeoutId);
					} else if (authStatus === false) {
						clearTimeout(timeoutId);
						this.isLocating = false;
						this.locationError = true;
						this.loadingText = '授权被拒绝';
						uni.showModal({
							title: '定位授权被拒绝',
							content: '您之前拒绝了定位权限，请在设置中打开',
							confirmText: '去设置',
							cancelText: '取消',
							success: (res) => {
								if (res.confirm) {
									uni.openSetting({
										success: (settingRes) => {
											if (settingRes.authSetting['scope.userLocation']) {
												this.getLocation();
											}
										}
									});
								}
							}
						});
					} else {
						this.loadingText = '请求授权...';
						uni.authorize({
							scope: 'scope.userLocation',
							success: () => {
								this.getLocationInfo(timeoutId);
							},
							fail: (err) => {
								clearTimeout(timeoutId);
								this.isLocating = false;
								this.locationError = false;
								this.loadingText = '定位未开启';
								this.locationText = '点击开启定位';
							}
						});
					}
				},
				fail: (err) => {
					clearTimeout(timeoutId);
					this.isLocating = false;
					this.locationError = true;
					this.loadingText = '获取设置失败';
					uni.showToast({ title: '获取定位设置失败', icon: 'none' });
				}
			});
			// #endif
		},
		
		getLocationInfo(timeoutId) {
			this.loadingText = '获取位置...';
			
			// #ifdef APP-PLUS
			if (typeof plus !== 'undefined') {
				plus.navigator.closeSplashscreen();
				const system = uni.getSystemInfoSync();
				if (system.platform === 'android') {
					plus.android.requestPermissions(
						'android.permission.ACCESS_FINE_LOCATION',
						(result) => {
							if (result.granted.indexOf('android.permission.ACCESS_FINE_LOCATION') !== -1) {
								this.doGetLocation(timeoutId);
							} else {
								clearTimeout(timeoutId);
								this.isLocating = false;
								this.locationError = true;
								this.loadingText = '定位权限被拒绝';
								this.locationText = '点击开启定位';
							}
						},
						(error) => {
							this.doGetLocation(timeoutId);
						}
					);
					return;
				}
			}
			// #endif
			
			this.doGetLocation(timeoutId);
		},
		
		doGetLocation(timeoutId) {
			// #ifdef APP-PLUS
			const locationType = 'wgs84';
			// #endif
			// #ifdef MP-WEIXIN
			const locationType = 'gcj02';
			// #endif
			// #ifdef H5
			const locationType = 'gcj02';
			// #endif
			
			uni.getLocation({
				type: locationType,
				isHighAccuracy: true,
				highAccuracyExpireTime: 10000,
				success: (res) => {
					clearTimeout(timeoutId);
					this.isLocating = false;
					this.location = {
						latitude: res.latitude,
						longitude: res.longitude
					};
					this.locationError = false;
					
					const cachedLocation = uni.getStorageSync('cachedLocation');
					const cachedAddress = uni.getStorageSync('cachedAddress');
					if (cachedLocation && cachedAddress && cachedAddress !== '已定位' && cachedAddress !== '定位中...' && cachedAddress !== '定位未开启') {
						const dist = this.calcDistance(res.latitude, res.longitude, cachedLocation.latitude, cachedLocation.longitude);
						if (dist < 500) {
							this.locationText = cachedAddress;
							this.cacheLocation();
							if (!this.isFromCache) {
								uni.showToast({ title: '定位成功', icon: 'success', duration: 1500 });
							}
							this.updateUserLocation(this.location);
							return;
						}
					}
					
					this.getLocationName(res.latitude, res.longitude);
					this.cacheLocation();
					if (!this.isFromCache) {
						uni.showToast({ title: '定位成功', icon: 'success', duration: 1500 });
					}
					this.updateUserLocation(this.location);
				},
				fail: (err) => {
					clearTimeout(timeoutId);
					this.isLocating = false;
					this.locationError = true;
					this.loadingText = '定位失败';
					this.locationText = '';
					console.log('定位失败:', JSON.stringify(err));
					uni.showToast({ title: '定位失败: ' + (err.errMsg || '未知错误'), icon: 'none', duration: 2000 });
				}
			});
		},
		
		calcDistance(lat1, lng1, lat2, lng2) {
			const R = 6371000;
			const dLat = (lat2 - lat1) * Math.PI / 180;
			const dLng = (lng2 - lng1) * Math.PI / 180;
			const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
				Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
				Math.sin(dLng / 2) * Math.sin(dLng / 2);
			const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
			return R * c;
		},
		
		updateUserLocation(location) {
			const userInfo = uni.getStorageSync('userInfo') || {};
			const userType = uni.getStorageSync('userType') || '';
			if (!userInfo.id || !userType) return;
			
			uni.request({
				url: 'http://localhost:3000/api/user/location',
				method: 'POST',
				data: {
					user_id: userInfo.id,
					user_type: userType,
					latitude: location.latitude,
					longitude: location.longitude
				}
			});
		},
		
		checkCachedLocation() {
			const cachedLocation = uni.getStorageSync('cachedLocation');
			const cachedAddress = uni.getStorageSync('cachedAddress');
			const cacheTime = uni.getStorageSync('locationCacheTime');
			const CACHE_VALID_TIME = 2 * 60 * 60 * 1000;
			const now = Date.now();
			
			const isValidAddress = cachedAddress && cachedAddress !== '已定位' && cachedAddress !== '定位中...' && cachedAddress !== '定位未开启' && cachedAddress !== '定位失败';
			if (cachedLocation && isValidAddress && cacheTime && (now - cacheTime < CACHE_VALID_TIME)) {
				this.location = cachedLocation;
				this.locationText = cachedAddress;
				this.locationError = false;
				this.isFromCache = true;
			} else {
				if (cachedAddress && !isValidAddress) {
					uni.removeStorageSync('cachedAddress');
					uni.removeStorageSync('cachedLocation');
					uni.removeStorageSync('locationCacheTime');
				}
				this.isFromCache = false;
				this.getLocation();
			}
		},
		
		cacheLocation() {
			const isValid = this.locationText && this.locationText !== '已定位' && this.locationText !== '定位中...' && this.locationText !== '定位未开启' && this.locationText !== '定位失败' && this.locationText !== '定位超时';
			if (isValid && this.location) {
				uni.setStorageSync('cachedLocation', this.location);
				uni.setStorageSync('cachedAddress', this.locationText);
				uni.setStorageSync('locationCacheTime', Date.now());
			}
		},
		
		getLocationName(latitude, longitude) {
			console.log('[定位] 开始获取地址名称:', latitude, longitude);
			
			// #ifdef APP-PLUS
			this.getLocationNameByAPI(latitude, longitude);
			// #endif
			
			// #ifdef MP-WEIXIN
			const qqmap = new QQMapWX({
				key: 'FH3BZ-V5UL3-JFZ3G-RDS6T-VKEPH-7AFWR'
			});
			
			let addressResolved = false;
			
			qqmap.reverseGeocoder({
				location: {
					latitude: latitude,
					longitude: longitude
				},
				success: (res) => {
					console.log('[定位] 地址解析成功:', JSON.stringify(res));
					if (res.status === 0 && res.result) {
						addressResolved = true;
						const addr = res.result.address_component;
						let locationName = '';
						if (res.result.formatted_addresses && res.result.formatted_addresses.recommend) {
							locationName = res.result.formatted_addresses.recommend;
						} else {
							locationName = (addr.city || '') + (addr.district || '');
						}
						console.log('[定位] 解析出地址:', locationName);
						this.locationText = locationName || '已定位';
						this.cacheLocation();
					} else {
						console.warn('[定位] 返回status非0:', res.status, res.message);
						if (!addressResolved) {
							this.locationText = '已定位';
							this.cacheLocation();
						}
					}
				},
				fail: (err) => {
					console.error('[定位] SDK地址解析失败:', JSON.stringify(err));
					if (addressResolved) {
						console.log('[定位] 已有成功结果，忽略fail回调');
						return;
					}
					if (err.status === 121) {
						const cachedAddress = uni.getStorageSync('cachedAddress');
						if (cachedAddress && cachedAddress !== '已定位') {
							console.log('[定位] 配额不足但有缓存地址，使用缓存:', cachedAddress);
							this.locationText = cachedAddress;
						} else {
							this.locationText = '已定位';
						}
						this.cacheLocation();
					} else if (err.status === 112 || err.status === 101) {
						this.locationText = '已定位';
						this.cacheLocation();
					} else {
						console.log('[定位] 尝试降级方案...');
						this.getLocationNameByAPI(latitude, longitude);
					}
				}
			});
			// #endif
			
			// #ifdef H5
			this.getLocationNameByAPI(latitude, longitude);
			// #endif
		},
		
		getLocationNameByAPI(latitude, longitude) {
			const key = 'FH3BZ-V5UL3-JFZ3G-RDS6T-VKEPH-7AFWR';
			
			// #ifdef APP-PLUS
			const coordType = '1';
			// #endif
			// #ifdef MP-WEIXIN
			const coordType = '2';
			// #endif
			// #ifdef H5
			const coordType = '2';
			// #endif
			
			const url = 'https://apis.map.qq.com/ws/geocoder/v1/?location=' + latitude + ',' + longitude + '&key=' + key + '&get_poi=0&coord_type=' + coordType;
			
			uni.request({
				url: url,
				method: 'GET',
				success: (res) => {
					if (res.statusCode === 200 && res.data && res.data.status === 0) {
						const result = res.data.result;
						const address = result.address_component;
						let locationName = '';
						if (result.formatted_addresses && result.formatted_addresses.recommend) {
							locationName = result.formatted_addresses.recommend;
						} else if (address) {
							locationName = (address.city || '') + (address.district || '');
						}
						this.locationText = locationName || '已定位';
						this.cacheLocation();
					} else {
						this.locationText = '已定位';
					}
				},
				fail: (err) => {
					this.locationText = '已定位';
				}
			});
		},
		
		// ========== 页面交互方法 ==========
		
		onSwiperChange(e) {
			this.currentBannerIndex = e.detail.current;
		},
		
		showMenu() {
			uni.showActionSheet({
				itemList: ['关于我们', '意见反馈', '分享应用'],
				success: (res) => {
					switch(res.tapIndex) {
						case 0:
							uni.showModal({
								title: '关于我们',
								content: '邕工帮 - 连接零工与商家的平台',
								showCancel: false
							});
							break;
						case 1:
							uni.showModal({
								title: '意见反馈',
								content: '请发送邮件至: support@zhaohuome.com',
								showCancel: false
							});
							break;
						case 2:
							uni.showToast({ title: '分享功能开发中', icon: 'none' });
							break;
					}
				}
			});
		},
		
		goSetting() {
			uni.navigateTo({
				url: '/pages/index/WorkerIndex/setting'
			});
		},
		
		goRegisterShop() {
			uni.navigateTo({
				url: '/pages/index/MerchantIndex/registerShop'
			});
		},
		
		goRegisterWorker() {
			uni.navigateTo({
				url: '/pages/index/WorkerIndex/registerWorker'
			});
		},
		
		goHelp() {
			uni.navigateTo({
				url: '/pages/help/help'
			});
		},
		
		goAll() {
			uni.showActionSheet({
				itemList: ['商家注册', '零工注册', '帮助中心', '任务中心', '我的'],
				success: (res) => {
					switch(res.tapIndex) {
						case 0:
							this.goRegisterShop(); 
							break;
						case 1:
							this.goRegisterWorker(); 
							break;
						case 2:
							this.goHelp(); 
							break;
						case 3:
							uni.navigateTo({ url: '/pages/task/WorkerTask/task' }); 
							break;
						case 4:
							uni.navigateTo({ url: '/pages/index/WorkerIndex/mine' }); 
							break;
					}
				}
			});
		},
		
		goJobDetail(job) {
			if (job.demand_id) {
				uni.navigateTo({
					url: `/pages/task/WorkerTask/job-detail?id=${job.demand_id}`
				});
			}
		},
		
		getSystemInfo() {
			uni.getSystemInfo({
				success: (res) => {
					this.systemInfo = res;
				}
			});
		},
		
		onImageLoad(e) {
			console.log('轮播图加载完成');
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
		
		getRegistrationDateRange(workTime) {
			if (!workTime) return '';
			let workDate;
			if (workTime.includes('T')) {
				workDate = new Date(workTime);
			} else if (workTime.includes(' ')) {
				const datePart = workTime.split(' ')[0];
				workDate = new Date(datePart + 'T00:00:00.000Z');
			} else {
				workDate = new Date(workTime);
			}
			const startDate = new Date(workDate.getTime() - (3 * 24 * 60 * 60 * 1000));
			const endDate = new Date(workDate.getTime() + (24 * 60 * 60 * 1000) - 1);
			const formatDate = (date) => {
				const year = date.getFullYear();
				const month = String(date.getMonth() + 1).padStart(2, '0');
				const day = String(date.getDate()).padStart(2, '0');
				return `${year}-${month}-${day}`;
			};
			return `${formatDate(startDate)} - ${formatDate(endDate)}`;
		},
		
		getButtonText(job) {
			const status = job._calcStatus;
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
			if (workTime.includes('T')) {
				const date = new Date(workTime);
				return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
			}
			if (workTime.includes('-') && workTime.split(' ').length === 2) {
				const [datePart, timePart] = workTime.split(' ');
				const [year, month, day] = datePart.split('-');
				return `${year}年${parseInt(month)}月${parseInt(day)}日 ${timePart}`;
			}
			return workTime;
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
		
		applyJob(job) {
			if (job.is_applied) {
				uni.showToast({ title: '您已经报名过了', icon: 'none' });
				return;
			}
			
			const status = job._calcStatus;
			if (status === 'closed') {
				uni.showToast({ title: '报名已截止', icon: 'none' });
				return;
			}
			
			if (status === 'not_started') {
				uni.showToast({ title: '报名尚未开始', icon: 'none' });
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
							uni.showToast({ title: res.data.message || '报名失败', icon: 'none' });
						}
					},
					fail: () => {
						uni.showToast({ title: '网络错误', icon: 'none' });
					}
				});
			});
		}
	}
}
</script>

<style scoped>
.home-container {
	background: linear-gradient(180deg, #f0fbfd 20%, #fafafa 100%);
	min-height: 100vh;
	padding-bottom: 100rpx;
}
.navbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12rpx 30rpx 8rpx 30rpx;
	background: #f0fbfd;
	z-index: 1000;
}

.location-container {
	flex: 1;
	display: flex;
	justify-content: center;
}

.location-info {
	display: flex;
	align-items: center;
	gap: 6rpx;
	padding: 4rpx 12rpx;
	background: rgba(74, 144, 226, 0.1);
	border-radius: 16rpx;
}

.location-info--error {
	background: rgba(255, 107, 107, 0.1);
}

.location-info--loading {
	background: rgba(153, 153, 153, 0.1);
}

.location-text {
	font-size: 20rpx;
	color: #4a90e2;
	font-weight: 500;
}

.location-text--error {
	color: #ff6b6b;
}

.location-text--loading {
	color: #999;
}

.retry-text {
	font-size: 18rpx;
	color: #ff6b6b;
	margin-left: 8rpx;
}

.navbar.fixed-top {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.03);
}

.title-section {
	padding: 4rpx 30rpx 16rpx 30rpx; 
	background: #f0fbfd;
	text-align: center;
}

.main-title {
	font-size: 44rpx;
	font-weight: bold;
	color: #2c3e50;
	display: block;
	letter-spacing: 2rpx;
	text-align: center; 
}

.banner-container {
	width: 100%;
	padding: 0 20rpx;
	box-sizing: border-box;
	margin-bottom: 20rpx;
}

.banner-swiper {
	width: 100%;
	height: 360rpx;
	border-radius: 16rpx;
	background: transparent;
}

.swiper-item-wrapper {
	width: 100%;
	height: 100%;
	transition: all 0.3s ease;
	transform: scale(0.85);
	opacity: 0.8;
	border-radius: 16rpx;
	overflow: hidden;
}

.swiper-item-wrapper.active {
	transform: scale(1);
	opacity: 1;
	box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.15);
}

.banner-image {
	width: 100%;
	height: 100%;
	display: block;
	border-radius: 16rpx;
}

.quick-entry {
	display: flex;
	justify-content: space-around;
	padding: 20rpx 0 10rpx 0;
	margin-bottom: 20rpx;
}

.entry-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	font-size: 24rpx;
	color: #333;
	gap: 12rpx; 
	font-weight: 600;
}

.entry-item .uni-icons {
	background:#fffef9;
	border-radius: 50%;
	padding: 16rpx;
	width: 48rpx;
	height: 48rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-weight:500;
	font-size: 40rpx;
	text-shadow: 0 0 1.5px currentColor;
}

.market-section {
	margin: 0 20rpx;
	border-radius: 12rpx;
	padding: 20rpx;
	background: transparent;
}

.section-title {
	font-size: 28rpx;
	font-weight: bold;
	margin-bottom: 10rpx;
	display: flex;
	align-items: center;
	gap: 12rpx;
}

.recommend-badge {
	font-size: 20rpx;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: white;
	padding: 4rpx 12rpx;
	border-radius: 20rpx;
	font-weight: normal;
}

.loading-container {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 80rpx 0;
}

.loading-spinner {
	width: 60rpx;
	height: 60rpx;
	border: 4rpx solid #e0e0e0;
	border-top-color: #4a90e2;
	border-radius: 50%;
	animation: spin 1s linear infinite;
}

@keyframes spin {
	to { transform: rotate(360deg); }
}

.loading-text {
	margin-top: 20rpx;
	color: #999;
	font-size: 24rpx;
}

.job-list {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

.job-card {
	display: flex;
	align-items: flex-start;
	background: #ffffff;
	border-radius: 10rpx;
	padding: 16rpx;
	position: relative;
	border: 4rpx solid #0f59a4;
	box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05);
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
	flex-wrap: wrap;
	gap: 8rpx;
}

.job-title {
	font-size: 26rpx;
	font-weight: bold;
}

.tags-container {
	display: flex;
	gap: 10rpx;
	flex-wrap: wrap;
}

.tag {
	font-size: 18rpx;
	padding: 2rpx 10rpx;
	border-radius: 20rpx;
	font-weight: 500;
}

.tag-upcoming {
	background: #ffa502;
	color: #fff;
}

.tag-distance {
	background: #4a90e2;
	color: #fff;
}

.tag-score {
	background: #2ecc71;
	color: #fff;
}

.job-detail {
	font-size: 22rpx;
	color: #555;
	margin-top: 4rpx;
}

.salary-info {
	margin-top: 6rpx;
}

.salary-amount {
	color: #e67e22;
	font-weight: bold;
	font-size: 24rpx;
}

.recommend-reason {
	color: #666;
	background: #f8f9fa;
	padding: 6rpx 10rpx;
	border-radius: 8rpx;
	margin-top: 8rpx;
}

.reason-icon {
	margin-right: 6rpx;
}

.apply-btn {
	background: #4a90e2;
	color: #fff;
	border: none;
	border-radius: 8rpx;
	padding: 4rpx 48rpx;
	font-size: 27rpx;
	position: absolute;
	right: 16rpx;
	bottom: 16rpx;
}

.apply-btn.applied {
	background: #9e9e9e;
	color: #fff;
}

.apply-btn.disabled {
	background: #ccc;
	color: #999;
	cursor: not-allowed;
}

.apply-btn.not-started {
	background: #ff9800;
	color: #fff;
	cursor: not-allowed;
}

.apply-btn:disabled {
	background: #9e9e9e;
	color: #fff;
}

.no-jobs {
	text-align: center;
	color: #999;
	padding: 40rpx 0;
	font-size: 24rpx;
}

.retry-hint {
	display: block;
	margin-top: 16rpx;
	color: #4a90e2;
	text-decoration: underline;
}

@media (min-width: 768px) {
	.market-section {
		margin: 0 40rpx;
	}
	
	.job-card {
		padding: 24rpx;
	}
	
	.job-title {
		font-size: 30rpx !important;
	}
	
	.job-detail {
		font-size: 24rpx !important;
	}
	
	.apply-btn {
		padding: 8rpx 24rpx !important;
		font-size: 26rpx !important;
	}
}

@media (max-width: 375px) {
	.navbar {
		padding: 10rpx 24rpx 6rpx 24rpx;
	}
	.title-section {
		padding: 6rpx 24rpx 12rpx 24rpx;
	}
	.main-title {
		font-size: 40rpx;
	}
	.banner-swiper {
		height: 320rpx;
	}
}
</style>