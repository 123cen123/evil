<template>
  <view class="custom-tabbar">
    <view
      v-for="(item, idx) in tabList"
      :key="idx"
      :class="['tabbar-item', current === idx ? 'active' : '']"
      @click="switchTab(idx)"
    >
      <uni-icons :type="item.icon" :color="current === idx ? activeColor : color" size="26" />
      <text>{{ item.text }}</text>
    </view>
  </view>
</template>

<script>
export default {
  props: {
    current: {
      type: Number,
      default: 0
    }
  },
  data() {
    return {
      color: '#888',
      activeColor: '#0f59a4',
      tabList: [
        { text: '首页', icon: 'home', url: '/pages/index/MerchantIndex/index' },
        { text: '任务', icon: 'calendar', url: '/pages/task/MerchantTask/task' },
        { text: '我的', icon: 'person', url: '/pages/index/MerchantIndex/mine' }
      ]
    }
  },
  methods: {
    switchTab(idx) {
      if (this.current !== idx) {
        uni.reLaunch({ url: this.tabList[idx].url });
      }
    }
  }
}
</script>

<style scoped>
.custom-tabbar {
  position: fixed;
  left: 0;
  bottom: 0;
  width: 100vw;
  height: 100rpx;
  background: linear-gradient(to bottom, #e0f7fa 0%, #fafafa 100%);
  display: flex;
  justify-content: space-around;
  align-items: center;
  border-top: 1rpx solid #e0e0e0;
  z-index: 1000;
  box-shadow: 0 -2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.tabbar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  color: #888;
  transition: all 0.2s ease;
  flex: 1;
}

.tabbar-item.active {
  color: #0f59a4;
}

.tabbar-item text {
  margin-top: 4rpx;
  font-size: 20rpx;
}

.tabbar-item.active text {
  font-weight: 500;
}
</style>