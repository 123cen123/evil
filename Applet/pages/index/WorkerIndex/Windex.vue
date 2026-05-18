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

		<!-- 轮播器放在了单独一个卡片里 - 堆叠式轮播图 -->
		<view class="banner-container">
			<swiper <template>
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
				<uni-icons type="shop" size="28" />
				<text>商家注册</text>
			</view>
			<view class="entry-item" @click="goRegisterWorker">
				<uni-icons type="person" size="28" />
				<text>零工注册</text>
			</view>
			<view class="entry-item" @click="goHelp">
				<uni-icons type="help" size="28" />
				<text>帮助中心</text>
			</view>
			<view class="entry-item" @click="goAll">
				<uni-icons type="more-filled" size="28" />
				<text>全部</text>
			</view>
		</view>

		<!-- 招工市场 -->
		<view class="market-section">
			<view class="section-title">招工市场</view>
			<view class="job-list">
				<view class="job-card" v-for="(job, index) in jobList" :key="index" @click="goJobDetail(job)">
					<image class="job-avatar" src="/static/logo.png" />
					<view class="job-info">
						<view class="job-header">
							<text class="job-title">{{ job.shop_name || '招聘' }}</text>
							<view class="tags-container">
								<text v-if="job._tagType === 'tag-upcoming'" :class="['tag', 'tag-upcoming']">{{ job._tagText }}</text>
							</view>
						</view>
						<view class="job-detail">报名日期：{{ getRegistrationDateRange(job.work_time) }}</view>
						<view class="job-detail">用工时间：{{ formatWorkTime(job.work_time) }}</view>
						<view class="job-detail">地址：{{ job.location }}</view>
						<view class="job-detail">需求人数：{{ job.accepted_count || 0 }}/{{ job.required_workers }}人</view>
						<view class="job-detail">薪水：{{ job.hourly_wage }}元/小时</view>
					</view>
					<button 
						:class="['apply-btn', job._calcButtonClass]"
						@click.stop="applyJob(job)"
						:disabled="job._calcDisabled"
					>
						{{ getButtonText(job) }}
					</button>
				</view>
				<view v-if="jobList.length === 0" class="no-jobs">
					<text>暂无招工信息</text>
				</view>
			</view>
		</view>

		<!-- 底部导航栏 -->
		<CustomTabBar :current="0" />
	</view>
</template>

<script>
import CustomTabBar from '@/components/CustomTabBar.vue'

let QQMapWX = null
try {
	QQMapWX = require('../../libs/qqmap-wx-jssdk.min.js')
} catch (e) {
	console.error('腾讯地图SDK引入失败:', e)
	QQMapWX = function() {}
	QQMapWX.prototype.reverseGeocoder = function() {}
}

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
			timer: null
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
		// 获取定位信息
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
		},
		
		getLocationInfo(timeoutId) {
			this.loadingText = '获取位置...';
			uni.getLocation({
				type: 'gcj02',
				isHighAccuracy: true,
				highAccuracyExpireTime: 8000,
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
					if (cachedLocation && cachedAddress) {
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
					uni.showToast({ title: '定位失败', icon: 'none', duration: 2000 });
				}
			});
		},
		
		refreshLocation() {
			this.getLocation();
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
		
		// ========== 跳转方法 - 已根据 pages.json 修正 ==========
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
		// ========================================
		
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
		
		checkCachedLocation() {
			const cachedLocation = uni.getStorageSync('cachedLocation');
			const cachedAddress = uni.getStorageSync('cachedAddress');
			const cacheTime = uni.getStorageSync('locationCacheTime');
			const CACHE_VALID_TIME = 2 * 60 * 60 * 1000;
			const now = Date.now();
			
			if (cachedLocation && cachedAddress && cacheTime && (now - cacheTime < CACHE_VALID_TIME)) {
				this.location = cachedLocation;
				this.locationText = cachedAddress;
				this.locationError = false;
				this.isFromCache = true;
			} else {
				this.isFromCache = false;
				this.getLocation();
			}
		},
		
		cacheLocation() {
			uni.setStorageSync('cachedLocation', this.location);
			uni.setStorageSync('cachedAddress', this.locationText);
			uni.setStorageSync('locationCacheTime', Date.now());
		},
		
		getLocationName(latitude, longitude) {
			if (!QQMapWX || typeof QQMapWX !== 'function') {
				this.locationText = '已定位';
				this.cacheLocation();
				return;
			}
			
			try {
				const qqmap = new QQMapWX({
					key: 'FH3BZ-V5UL3-JFZ3G-RDS6T-VKEPH-7AFWR'
				});
				
				let addressResolved = false;
				
				qqmap.reverseGeocoder({
					location: { latitude, longitude },
					success: (res) => {
						if (res.status === 0 && res.result) {
							addressResolved = true;
							const addr = res.result.address_component;
							let locationName = '';
							if (res.result.formatted_addresses && res.result.formatted_addresses.recommend) {
								locationName = res.result.formatted_addresses.recommend;
							} else {
								locationName = (addr.city || '') + (addr.district || '');
							}
							this.locationText = locationName || '已定位';
							this.cacheLocation();
						} else {
							if (!addressResolved) {
								this.locationText = '已定位';
								this.cacheLocation();
							}
						}
					},
					fail: (err) => {
						if (addressResolved) return;
						this.locationText = '已定位';
						this.cacheLocation();
					}
				});
			} catch (err) {
				this.locationText = '已定位';
				this.cacheLocation();
			}
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
			const formatDate = (date) => {
				const year = date.getFullYear();
				const month = String(date.getMonth() + 1).padStart(2, '0');
				const day = String(date.getDate()).padStart(2, '0');
				return `${year}-${month}-${day}`;
			};
			return `${formatDate(startDate)} - ${formatDate(endDate)}`;
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
		
		loadJobList() {
			const userInfo = uni.getStorageSync('userInfo') || {};
			const userType = uni.getStorageSync('userType') || '';
			
			let url = 'http://localhost:3000/api/demand/list';
			if (userType === 'worker' && userInfo.worker_id) {
				url += `?worker_id=${userInfo.worker_id}`;
			}
			
			uni.request({
				url: url,
				method: 'GET',
				success: (res) => {
					if (res.data.success) {
						this.jobList = res.data.data.slice(0, 20).map(job => {
							const status = this.calcRegistrationStatus(job);
							let buttonClass = '';
							if (status === 'applied') buttonClass = 'applied';
							else if (status === 'closed') buttonClass = 'disabled';
							else if (status === 'not_started') buttonClass = 'not-started';
							const tagType = status === 'not_started' ? 'tag-upcoming' : '';
							const tagText = status === 'not_started' ? '即将开始' : '';
							return {
								...job,
								_calcStatus: status,
								_calcButtonClass: buttonClass,
								_calcDisabled: status !== 'open',
								_tagType: tagType,
								_tagText: tagText
							};
						});
					} else {
						this.jobList = [];
					}
				},
				fail: () => {
					this.jobList = [];
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
		
		formatWorkTime(workTime) {
			if (!workTime) return '';
			if (workTime.includes('-') && workTime.split(' ').length === 2) {
				const [datePart, timePart] = workTime.split(' ');
				const [year, month, day] = datePart.split('-');
				return `${year}年${parseInt(month)}月${parseInt(day)}日 ${timePart}`;
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
		},
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
	.navbar-placeholder {
		height: 72rpx;
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
	@media (min-width: 768px) {
		.navbar {
			padding: 16rpx 40rpx 12rpx 40rpx;
		}
		.navbar-placeholder {
			height: 80rpx;
		}
		.title-section {
			padding: 12rpx 40rpx 20rpx 40rpx;
		}
		.main-title {
			font-size: 52rpx;
		}
	}
	
	@media (max-width: 375px) {
		.navbar {
			padding: 10rpx 24rpx 6rpx 24rpx;
		}
		.navbar-placeholder {
			height: 64rpx;
		}
		.title-section {
			padding: 6rpx 24rpx 12rpx 24rpx;
		}
		.main-title {
			font-size: 40rpx;
		}
	}
	
	.navbar .time {
		font-size: 24rpx;
		color: #666;
	}
	
	.nav-icons {
		display: flex;
		gap: 16rpx;
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
	
	@media (max-width: 768px) {
		.banner-swiper {
			height: 320rpx;
		}
	}
	
	@media (min-width: 768px) and (max-width: 1024px) {
		.banner-container {
			padding: 0 40rpx;
		}
		
		.banner-swiper {
			border-radius: 24rpx;
			height: 400rpx;
		}
	}
	
	@media (min-width: 1024px) {
		.home-container {
			max-width: 1200px;
			margin: 0 auto;
		}
		
		.banner-container {
			padding: 0 60rpx;
		}
		
		.banner-swiper {
			border-radius: 32rpx;
			height: 450rpx;
		}
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
		background:#93b5cf;
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
		border: 4rpx solid #b2bbbe;
		box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05);
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
		margin-top: 2rpx;
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
</style>
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
				<uni-icons type="shop" size="28" />
				<text>商家注册</text>
			</view>
			<view class="entry-item" @click="goRegisterWorker">
				<uni-icons type="person" size="28" />
				<text>零工注册</text>
			</view>
			<view class="entry-item" @click="goHelp">
				<uni-icons type="help" size="28" />
				<text>帮助中心</text>
			</view>
			<view class="entry-item" @click="goAll">
				<uni-icons type="more-filled" size="28" />
				<text>全部</text>
			</view>
		</view>

		<!-- 招工市场 -->
		<view class="market-section">
			<view class="section-title">招工市场</view>
			<view class="job-list">
				<view class="job-card" v-for="(job, index) in jobList" :key="index" @click="goJobDetail(job)">
					<image class="job-avatar" src="/static/logo.png" />
					<view class="job-info">
						<view class="job-header">
							<text class="job-title">{{ job.shop_name || '招聘' }}</text>
							<!-- 标签区域 - 只显示"即将开始"标签 -->
							<view class="tags-container">
								<text v-if="job._tagType === 'tag-upcoming'" :class="['tag', 'tag-upcoming']">{{ job._tagText }}</text>
							</view>
						</view>
						<view class="job-detail">报名日期：{{ getRegistrationDateRange(job.work_time) }}</view>
						<view class="job-detail">用工时间：{{ formatWorkTime(job.work_time) }}</view>
						<view class="job-detail">地址：{{ job.location }}</view>
						<view class="job-detail">需求人数：{{ job.accepted_count || 0 }}/{{ job.required_workers }}人</view>
						<view class="job-detail">薪水：{{ job.hourly_wage }}元/小时</view>
					</view>
					<button 
						:class="['apply-btn', job._calcButtonClass]"
						@click.stop="applyJob(job)"
						:disabled="job._calcDisabled"
					>
						{{ getButtonText(job) }}
					</button>
				</view>
				<view v-if="jobList.length === 0" class="no-jobs">
					<text>暂无招工信息</text>
				</view>
			</view>
		</view>

		<!-- 底部导航栏 -->
		<CustomTabBar :current="0" />
	</view>
</template>

<script>
import CustomTabBar from '@/components/CustomTabBar.vue'
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
			isFromCache: false
		}
	},
	onLoad() {
		this.getSystemInfo();
	},
	onShow() {
		this.loadJobList();
		this.startTimeUpdate();
		// 检查是否有缓存的定位，有则直接使用，否则重新获取
		this.checkCachedLocation();
	},
	onHide() {
		this.stopTimeUpdate();
	},
	onUnload() {
		this.stopTimeUpdate();
	},
	methods: {
		// 获取定位信息
		getLocation() {
			// 防止重复调用
			if (this.isLocating) {
				console.log('定位正在进行中，跳过重复调用');
				return;
			}
			
			// 检测运行环境
			let platform = '';
			let uniPlatform = '';
			try {
				const systemInfo = uni.getSystemInfoSync();
				platform = systemInfo.platform || '';
				uniPlatform = systemInfo.uniPlatform || '';
			} catch (e) {
				console.log('获取系统信息失败:', e);
			}
			
			// 判断是否是非微信的 H5 浏览器环境
			// 只要有 window 对象且不是微信小程序，就认为是 H5 浏览器
			const hasWindow = typeof window !== 'undefined' && window.document;
			const isWechat = platform === 'mp-weixin';
			const isH5Browser = hasWindow && !isWechat;
			
			console.log('运行环境:', { platform, uniPlatform, hasWindow, isH5Browser, isWechat });
			
			// H5 浏览器环境下，直接显示定位失败（浏览器安全限制）
			if (isH5Browser) {
				console.log('H5 浏览器环境，跳过定位（浏览器安全限制）');
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
			console.log('=== 开始获取定位 ===');
			
			// 设置定位超时保护（15秒）
			const timeoutId = setTimeout(() => {
				if (this.isLocating) {
					console.error('定位超时（15秒）');
					this.isLocating = false;
					this.locationError = true;
					this.loadingText = '定位超时';
					uni.showToast({ title: '定位超时，请检查GPS或网络', icon: 'none', duration: 2000 });
				}
			}, 15000);
			
			// 先检查定位授权
			uni.getSetting({
				success: (res) => {
					console.log('获取设置成功:', res.authSetting);
					const authStatus = res.authSetting['scope.userLocation'];
					
					// authStatus: true=已授权, false=已拒绝, undefined=未请求过
					if (authStatus === true) {
						// 已有授权，直接获取定位
						console.log('已有定位授权');
						this.getLocationInfo(timeoutId);
					} else if (authStatus === false) {
						// 用户之前拒绝了授权，显示提示引导去设置
						console.log('用户之前拒绝了定位授权');
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
											console.log('设置页面返回:', settingRes.authSetting);
											if (settingRes.authSetting['scope.userLocation']) {
												console.log('用户在设置中打开了定位权限');
												this.getLocation();
											} else {
												console.log('用户在设置中未打开定位权限');
											}
										}
									});
								}
							}
						});
					} else {
						// 未请求过授权，先请求授权
						console.log('未请求过定位授权，先请求授权');
						this.loadingText = '请求授权...';
						uni.authorize({
							scope: 'scope.userLocation',
							success: () => {
								console.log('定位授权成功');
								this.getLocationInfo(timeoutId);
							},
							fail: (err) => {
								clearTimeout(timeoutId);
								this.isLocating = false;
								console.error('定位授权失败:', err);
								// 授权失败，使用默认位置（不显示错误）
								this.locationError = false;
								this.loadingText = '定位未开启';
								this.locationText = '点击开启定位';
								// 不弹窗打扰用户，让用户自己选择是否开启
							}
						});
					}
				},
				fail: (err) => {
					clearTimeout(timeoutId);
					this.isLocating = false;
					console.error('获取设置失败:', err);
					this.locationError = true;
					this.loadingText = '获取设置失败';
					uni.showToast({ title: '获取定位设置失败', icon: 'none' });
				}
			});
		},
		
		// 实际获取定位信息
		getLocationInfo(timeoutId) {
			this.loadingText = '获取位置...';
			uni.getLocation({
				type: 'gcj02', // 使用国测局坐标，兼容性更好
				isHighAccuracy: true, // 开启高精度
				highAccuracyExpireTime: 8000, // 高精度定位超时8秒
					success: (res) => {
						clearTimeout(timeoutId);
						this.isLocating = false;
						const newLat = res.latitude;
						const newLng = res.longitude;
						this.location = {
							latitude: newLat,
							longitude: newLng
						};
						this.locationError = false;
						console.log('[定位] 定位成功:', this.location);
						
						// 检查是否和缓存位置接近（距离<500米），如果是则复用缓存地址，节省API配额
						const cachedLocation = uni.getStorageSync('cachedLocation');
						const cachedAddress = uni.getStorageSync('cachedAddress');
						if (cachedLocation && cachedAddress) {
							const dist = this.calcDistance(newLat, newLng, cachedLocation.latitude, cachedLocation.longitude);
							console.log('[定位] 与缓存位置距离:', dist.toFixed(0), '米');
							if (dist < 500) {
								console.log('[定位] 位置变化小，复用缓存地址:', cachedAddress);
								this.locationText = cachedAddress;
								this.cacheLocation();
								if (!this.isFromCache) {
									uni.showToast({ title: '定位成功', icon: 'success', duration: 1500 });
								}
								this.updateUserLocation(this.location);
								return;
							}
						}
						
						// 位置变化较大或无缓存，请求地址解析
						this.getLocationName(newLat, newLng);
						// 缓存定位结果
						this.cacheLocation();
						// 只在非缓存状态下显示提示
					if (!this.isFromCache) {
						uni.showToast({ title: '定位成功', icon: 'success', duration: 1500 });
					}
						this.updateUserLocation(this.location);
					},
				fail: (err) => {
					clearTimeout(timeoutId);
					this.isLocating = false;
					console.error('定位失败:', err);
					this.locationError = true;
					this.loadingText = '定位失败';
					this.locationText = '';
					
					// 根据错误类型给出不同提示
					let errorMsg = '定位失败';
					if (err.errCode === 1) {
						errorMsg = '定位权限被拒绝';
					} else if (err.errCode === 2) {
						errorMsg = '网络异常，请检查网络';
					} else if (err.errCode === 3) {
						errorMsg = '定位超时，请重试';
					} else if (err.errMsg && err.errMsg.includes('auth')) {
						errorMsg = '请授权定位权限';
					}
					
					uni.showToast({ title: errorMsg, icon: 'none', duration: 2000 });
				}
			});
		},
		
		// 手动刷新定位
		refreshLocation() {
			console.log('[定位] 用户手动刷新定位');
			this.getLocation();
		},
		
		// 计算两个经纬度之间的距离（米）
		calcDistance(lat1, lng1, lat2, lng2) {
			const R = 6371000; // 地球半径（米）
			const dLat = (lat2 - lat1) * Math.PI / 180;
			const dLng = (lng2 - lng1) * Math.PI / 180;
			const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
				Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
				Math.sin(dLng / 2) * Math.sin(dLng / 2);
			const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
			return R * c;
		},
		
		// 更新用户定位到服务器
		updateUserLocation(location) {
			const userInfo = uni.getStorageSync('userInfo') || {};
			const userType = uni.getStorageSync('userType') || '';
			
			console.log('更新用户定位 - userInfo:', userInfo);
			console.log('更新用户定位 - userType:', userType);
			console.log('更新用户定位 - location:', location);
			
			if (!userInfo.id || !userType) {
				console.log('更新用户定位 - 缺少用户信息，跳过更新');
				return;
			}
			
			console.log('开始调用定位更新API...');
			
			uni.request({
				url: 'http://localhost:3000/api/user/location',
				method: 'POST',
				data: {
					user_id: userInfo.id,
					user_type: userType,
					latitude: location.latitude,
					longitude: location.longitude
				},
				success: (res) => {
					console.log('定位更新API响应:', res);
					if (res.data.success) {
						console.log('定位更新成功');
						uni.showToast({ title: '定位已更新到服务器', icon: 'success' });
					} else {
						console.error('定位更新失败:', res.data.message);
						uni.showToast({ title: '定位更新失败: ' + res.data.message, icon: 'none' });
					}
				},
				fail: (err) => {
					console.error('定位更新请求失败:', err);
					uni.showToast({ title: '网络错误，定位更新失败', icon: 'none' });
				}
			});
		},
		onSwiperChange(e) {
			this.currentBannerIndex = e.detail.current;
		},
		// 获取标签类型 - 只返回即将开始的标签
		getTagType(job) {
			const status = this.getRegistrationStatus(job);
			if (status === 'not_started') return 'tag-upcoming';
			return '';
		},
		
		// 获取标签文本
		getTagText(job) {
			const status = this.getRegistrationStatus(job);
			if (status === 'not_started') return '即将开始';
			return '';
		},
		
		// 显示更多菜单
		showMenu() {
			uni.showActionSheet({
				itemList: ['关于我们', '意见反馈', '分享应用'],
				success: (res) => {
					switch(res.tapIndex) {
						case 0:
							uni.showModal({
								title: '关于我们',
								content: '找活么 - 连接零工与商家的平台',
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
		
		// 跳转设置页面
		goSetting() {
			uni.navigateTo({
				url: '/pages/index/setting'
			});
		},
		
		getSystemInfo() {
			uni.getSystemInfo({
				success: (res) => {
					this.systemInfo = res;
					console.log('设备信息:', res.windowWidth, res.windowHeight);
				}
			});
		},
		
		onImageLoad(e) {
			console.log('轮播图加载完成');
		},
		
		// 检查是否有缓存的定位
		checkCachedLocation() {
			const cachedLocation = uni.getStorageSync('cachedLocation');
			const cachedAddress = uni.getStorageSync('cachedAddress');
			const cacheTime = uni.getStorageSync('locationCacheTime');
			
			// 缓存有效期 2 小时（节省API配额）
			const CACHE_VALID_TIME = 2 * 60 * 60 * 1000;
			const now = Date.now();
			
			if (cachedLocation && cachedAddress && cacheTime && (now - cacheTime < CACHE_VALID_TIME)) {
				console.log('[定位] 使用缓存的定位:', cachedAddress);
				this.location = cachedLocation;
				this.locationText = cachedAddress;
				this.locationError = false;
				this.isFromCache = true;
			} else {
				console.log('[定位] 缓存过期或无缓存，重新获取定位');
				this.isFromCache = false;
				this.getLocation();
			}
		},
		
		// 缓存定位结果
		cacheLocation() {
			uni.setStorageSync('cachedLocation', this.location);
			uni.setStorageSync('cachedAddress', this.locationText);
			uni.setStorageSync('locationCacheTime', Date.now());
			console.log('[定位] 结果已缓存:', this.locationText);
			console.log('定位结果已缓存');
		},
		
		// 获取位置名称
		getLocationName(latitude, longitude) {
			console.log('[定位] 开始获取地址名称:', latitude, longitude);
			
			const QQMapWX = require('../../libs/qqmap-wx-jssdk.min.js');
			const qqmap = new QQMapWX({
				key: 'FH3BZ-V5UL3-JFZ3G-RDS6T-VKEPH-7AFWR'
			});
			
			// 标记是否已成功获取地址，防止fail回调覆盖
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
						// 如果已经成功过，不要覆盖
						if (!addressResolved) {
							this.locationText = '已定位';
							this.cacheLocation();
						}
					}
				},
				fail: (err) => {
					console.error('[定位] SDK地址解析失败:', JSON.stringify(err));
					// 如果已经成功获取地址，不再覆盖
					if (addressResolved) {
						console.log('[定位] 已有成功结果，忽略fail回调');
						return;
					}
					// 如果是121配额问题，但之前可能成功过，检查是否有缓存
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
						// 其他错误，降级用WebService API再试
						console.log('[定位] 尝试降级方案...');
						this.getLocationNameByAPI(latitude, longitude);
					}
				}
			});
		},
		
		// WebService API降级方案
		getLocationNameByAPI(latitude, longitude) {
			const key = 'FH3BZ-V5UL3-JFZ3G-RDS6T-VKEPH-7AFWR';
			const url = 'https://apis.map.qq.com/ws/geocoder/v1/?location=' + latitude + ',' + longitude + '&key=' + key + '&get_poi=0';
			
			console.log('[定位] 降级方案请求URL:', url);
			
			uni.request({
				url: url,
				method: 'GET',
				success: (res) => {
					console.log('[定位] 降级方案响应:', res.statusCode, JSON.stringify(res.data));
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
						console.error('[定位] 降级方案也失败:', res.data);
						this.locationText = '已定位';
						this.cacheLocation();
					}
				},
				fail: (err) => {
					console.error('[定位] 降级方案网络错误:', err);
					this.locationText = '已定位';
					this.cacheLocation();
				}
			});
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
		
		isWithinRegistrationPeriod(createdAt) {
			if (!createdAt) return false;
			
			const now = new Date();
			const createdDate = new Date(createdAt);
			const startDate = new Date(createdDate.getTime() - (3 * 24 * 60 * 60 * 1000));
			
			return now >= startDate && now <= createdDate;
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
			
			if (now < startDate) {
				return 'not_started';
			}
			if (now > workDate) {
				return 'closed';
			}
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
			
			const formatDate = (date) => {
				const year = date.getFullYear();
				const month = String(date.getMonth() + 1).padStart(2, '0');
				const day = String(date.getDate()).padStart(2, '0');
				return `${year}-${month}-${day}`;
			};
			
			return `报名时间：${formatDate(startDate)} 至 ${formatDate(workDate)}`;
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
			
			const formatDate = (date) => {
				const year = date.getFullYear();
				const month = String(date.getMonth() + 1).padStart(2, '0');
				const day = String(date.getDate()).padStart(2, '0');
				return `${year}-${month}-${day}`;
			};
			
			return `${formatDate(startDate)} - ${formatDate(endDate)}`;
		},
		
		canApplyJob(job) {
			if (job.is_applied) return false;
			return this.getRegistrationStatus(job) === 'open';
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
		
		loadJobList() {
			const userInfo = uni.getStorageSync('userInfo') || {};
			const userType = uni.getStorageSync('userType') || '';
			
			let url = 'http://localhost:3000/api/demand/list';
			if (userType === 'worker' && userInfo.worker_id) {
				url += `?worker_id=${userInfo.worker_id}`;
			}
			
			uni.request({
				url: url,
				method: 'GET',
				success: (res) => {
					if (res.data.success) {
						this.jobList = res.data.data.slice(0, 20).map(job => {
							const status = this.calcRegistrationStatus(job);
							let buttonClass = '';
							if (status === 'applied') buttonClass = 'applied';
							else if (status === 'closed') buttonClass = 'disabled';
							else if (status === 'not_started') buttonClass = 'not-started';
							const tagType = status === 'not_started' ? 'tag-upcoming' : '';
							const tagText = status === 'not_started' ? '即将开始' : '';
							return {
								...job,
								_calcStatus: status,
								_calcButtonClass: buttonClass,
								_calcDisabled: status !== 'open',
								_tagType: tagType,
								_tagText: tagText
							};
						});
					} else {
						console.error('获取招工列表失败：', res.data.message);
						this.jobList = [];
					}
				},
				fail: (err) => {
					console.error('请求失败：', err);
					this.jobList = [];
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
		
		getTimeAgo(createTime) {
			if (!createTime) return '';
			
			try {
				const now = new Date();
				const created = new Date(createTime);
				const diffMs = now - created;
				const diffMinutes = Math.floor(diffMs / (1000 * 60));
				const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
				const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
				
				if (diffMinutes < 1) return '刚刚';
				if (diffMinutes < 60) return `${diffMinutes}分钟前`;
				if (diffHours < 24) return `${diffHours}小时前`;
				if (diffDays < 7) return `${diffDays}天前`;
				return created.toLocaleDateString();
			} catch (e) {
				return '';
			}
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
			
			console.log('首页报名 - job数据:', job);
			console.log('首页报名 - userInfo:', userInfo);
			console.log('首页报名 - userType:', userType);
			
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
								uni.navigateTo({ url: '/pages/index/identityVerification' });
							}
						}
					});
					return;
				}

				const requestData = {
					demand_id: job.demand_id,
					worker_id: userInfo.worker_id
				};
				console.log('首页报名 - 发送数据:', requestData);

				uni.request({
					url: 'http://localhost:3000/api/applications/apply',
					method: 'POST',
					data: {
						job_id: job.demand_id,
						worker_id: userInfo.worker_id
					},
					success: (res) => {
						console.log('首页报名 - 响应:', res.data);
						if (res.data.success) {
							uni.showToast({ title: '报名成功，待审批', icon: 'success' });
							job.is_applied = 1;
							setTimeout(() => {
								uni.reLaunch({ url: '/pages/task/task' });
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
											uni.navigateTo({ url: '/pages/index/identityVerification' });
										}
									}
								});
								return;
							}
							uni.showToast({ title: res.data.message || '报名失败', icon: 'none' });
						}
					},
					fail: (err) => {
						console.error('首页报名 - 请求失败:', err);
						uni.showToast({ title: '网络错误', icon: 'none' });
					}
				});
			});
		},
		
		goRegisterShop() {
			uni.navigateTo({
				url: '/pages/index/registerShop'
			});
		},
		goRegisterWorker() {
			uni.navigateTo({
				url: '/pages/index/registerWorker'
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
							this.goRegisterShop(); break;
						case 1:
							this.goRegisterWorker(); break;
						case 2:
							this.goHelp(); break;
						case 3:
							uni.navigateTo({ url: '/pages/task/task' }); break;
						case 4:
							uni.navigateTo({ url: '/pages/index/mine' }); break;
					}
				}
			});
		},
		
		// 跳转到岗位详情页
		goJobDetail(job) {
			if (job.demand_id) {
				uni.navigateTo({
					url: `/pages/task/job-detail?id=${job.demand_id}`
				});
			}
		},
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
	.navbar-placeholder {
		height: 72rpx;
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
	@media (min-width: 768px) {
		.navbar {
			padding: 16rpx 40rpx 12rpx 40rpx;
		}
		.navbar-placeholder {
			height: 80rpx;
		}
		.title-section {
			padding: 12rpx 40rpx 20rpx 40rpx;
		}
		.main-title {
			font-size: 52rpx;
		}
	}
	
	@media (max-width: 375px) {
		.navbar {
			padding: 10rpx 24rpx 6rpx 24rpx;
		}
		.navbar-placeholder {
			height: 64rpx;
		}
		.title-section {
			padding: 6rpx 24rpx 12rpx 24rpx;
		}
		.main-title {
			font-size: 40rpx;
		}
	}
	
	.navbar .time {
		font-size: 24rpx;
		color: #666;
	}
	
	.nav-icons {
		display: flex;
		gap: 16rpx;
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
	
	/* 堆叠式轮播图样式 */
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
	
	@media (max-width: 768px) {
		.banner-swiper {
			height: 320rpx;
		}
	}
	
	@media (min-width: 768px) and (max-width: 1024px) {
		.banner-container {
			padding: 0 40rpx;
		}
		
		.banner-swiper {
			border-radius: 24rpx;
			height: 400rpx;
		}
	}
	
	@media (min-width: 1024px) {
		.home-container {
			max-width: 1200px;
			margin: 0 auto;
		}
		
		.banner-container {
			padding: 0 60rpx;
		}
		
		.banner-swiper {
			border-radius: 32rpx;
			height: 450rpx;
		}
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
		background:#93b5cf;
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
		border: 4rpx solid #b2bbbe;
		box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05);
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
	
	/* 标签样式 */
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
		margin-top: 2rpx;
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
</style>