<template>
  <view class="webview-container">
    <web-view :src="url"></web-view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      url: ''
    };
  },
  onLoad(options) {
    if (options.url) {
      this.url = options.url;
    }
  }
};
</script>

<style scoped>
page {
  background:linear-gradient(180deg, #f0fbfd 20%, #fafafa 100%);
}

.webview-container {
  width: 100%;
  height: 100vh;
}
</style>