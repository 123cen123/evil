import App from './App'

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'
import uniIcons from '@/uni_modules/uni-icons/components/uni-icons/uni-icons.vue'
Vue.config.productionTip = false
App.mpType = 'app'
Vue.component('uni-icons', uniIcons)
const app = new Vue({
  ...App
})
app.$mount()
// #endif

// #ifdef VUE3
import { createSSRApp } from 'vue'
export function createApp() {
  const app = createSSRApp(App)
  return {
    app
  }
}
// #endif