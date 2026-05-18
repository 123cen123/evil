<template>
  <view class="guide-container">
    <swiper 
      :indicator-dots="true" 
      indicator-color="rgba(255,255,255,0.5)"
      indicator-active-color="#ffffff"
      :current="current"
      @change="onSwiperChange"
      class="guide-swiper"
    >
      <swiper-item v-for="(item, index) in guides" :key="index">
        <view class="guide-page">
          <view class="guide-content">
            <image :src="item.image" class="guide-image" mode="aspectFit"></image>
            <text class="guide-title">{{ item.title }}</text>
            <text class="guide-desc">{{ item.desc }}</text>
            
            <!-- 最后一页显示两个并排按钮 + 稍后登录 -->
            <view v-if="isLastPage" class="button-group">
              <view class="double-buttons">
                <button class="btn-hire" @click="goToMerchantLogin">我要招聘</button>
                <button class="btn-work" @click="goToWorkerLogin">我要找工作</button>
              </view>
              <text class="later-login" @click="goToWorkerHome">稍后登录</text>
            </view>
          </view>
        </view>
      </swiper-item>
    </swiper>
  </view>
</template>

<script>
export default {
  data() {
    return {
      current: 0,
      timer: null,
      guides: [
        {
          image: '/static/img1.png',
          title: '发现附近好工作',
          desc: '海量兼职、全职岗位，实时更新',
        },
        {
          image: '/static/img2.png',
          title: '一键接单 快速结算',
          desc: '任务完成立即到账，提现无门槛',
        },
        {
          image: '/static/img3.png',
          title: '商家安心招工',
          desc: '实名认证，保障双方权益',
        }
      ]
    }
  },
  computed: {
    isLastPage() {
      return this.current === this.guides.length - 1
    }
  },
  onLoad() {
    this.startAutoPlay()
  },
  onUnload() {
    if (this.timer) {
      clearInterval(this.timer)
    }
  },
  methods: {
    onSwiperChange(e) {
      this.current = e.detail.current
      this.resetTimer()
    },
    startAutoPlay() {
      this.timer = setInterval(() => {
        let next = this.current + 1
        if (next < this.guides.length) {
          this.current = next
        }
      }, 2000)
    },
    resetTimer() {
      if (this.timer) {
        clearInterval(this.timer)
        this.startAutoPlay()
      }
    },
    // 我要招聘 - 跳转商家注册页
    goToMerchantLogin() {
      if (this.timer) {
        clearInterval(this.timer)
      }
      uni.reLaunch({
        url: '/pages/index/MerchantIndex/registerShop'
      })
    },
    // 我要找工作 - 跳转零工注册页
    goToWorkerLogin() {
      if (this.timer) {
        clearInterval(this.timer)
      }
      uni.reLaunch({
        url: '/pages/index/WorkerIndex/registerWorker'
      })
    },
    // 稍后登录 - 根据已登录用户类型跳转对应首页
    goToWorkerHome() {
      if (this.timer) {
        clearInterval(this.timer)
      }
      
      // 检查用户是否已经登录
      const userInfo = uni.getStorageSync('userInfo') || null;
      const userType = uni.getStorageSync('userType') || '';
      
      let targetUrl = '/pages/index/WorkerIndex/index'; // 默认跳转到零工首页
      
      // 如果已登录，根据用户类型跳转
      if (userInfo && userType) {
        if (userType === 'merchant') {
          targetUrl = '/pages/index/MerchantIndex/index';
        } else if (userType === 'worker') {
          targetUrl = '/pages/index/WorkerIndex/index';
        }
      }
      
      uni.reLaunch({
        url: targetUrl
      })
    }
  }
}
</script>

<style scoped>
.guide-container {
  width: 100%;
  height: 100vh;
  position: relative;
}

.guide-swiper {
  width: 100%;
  height: 100%;
}

.guide-page {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #f0fbfd 20%, #fafafa 100%);
}

.guide-content {
  text-align: center;
  padding: 0 40rpx;
}
.guide-image {
  width: 600rpx;
  height: 600rpx;
  margin-bottom: 40rpx;
}
.guide-title {
  display: block;
  font-size: 56rpx;
  font-weight: bold;
  color: #4a90e2;
  margin-bottom: 30rpx;
}

.guide-desc {
  display: block;
  font-size: 32rpx;
  color: #4a90e2;
  margin-bottom: 80rpx;
}

/* 按钮组样式 */
.button-group {
  margin-top: 40rpx;
  width: 100%;
}

/* 两个按钮并排 */
.double-buttons {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 30rpx;
  margin-bottom: 40rpx;
}

.btn-hire {
  flex: 1;
  background-color: #4a90e2;
  color: #ffffff;
  border-radius: 50rpx;
  font-size: 32rpx;
  height: 88rpx;
  line-height: 88rpx;
  border: none;
}

.btn-work {
  flex: 1;
  background-color: transparent;
  color:#4a90e2;
  border-radius: 50rpx;
  font-size: 32rpx;
  height: 88rpx;
  line-height: 88rpx;
  border: 2rpx solid #4a90e2;;
}

.later-login {
  display: block;
  font-size: 28rpx;
  color: #999999;
  text-decoration: underline;
  padding: 20rpx 0;
}

/* 适配不同屏幕尺寸 */
@media (max-height: 667px) {
  .guide-image {
    width: 450rpx;
    height: 450rpx;
    margin-bottom: 30rpx;
  }
  
  .guide-title {
    font-size: 48rpx;
    margin-bottom: 20rpx;
  }
  
  .guide-desc {
    font-size: 28rpx;
    margin-bottom: 60rpx;
  }
}

/* 确保容器占满屏幕 */
page {
  height: 100%;
  margin: 0;
  padding: 0;
}

.guide-container,
.guide-swiper,
.guide-page {
  height: 100%;
  overflow: hidden;
}

/* 按钮样式优化 */
.button-group {
  margin-top: 30rpx;
}

.double-buttons {
  gap: 20rpx;
  margin-bottom: 30rpx;
}

.btn-hire,
.btn-work {
  height: 80rpx;
  line-height: 80rpx;
  font-size: 28rpx;
}
</style>