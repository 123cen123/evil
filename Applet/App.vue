<script>
	export default {
		onLaunch: function() {
			console.log('App Launch')
			// 检查是否首次启动
			const hasLaunched = uni.getStorageSync('hasLaunched')
			if (!hasLaunched) {
				// 首次启动显示引导页
				uni.reLaunch({
					url: '/pages/guide/index'
				})
				uni.setStorageSync('hasLaunched', true)
			} else {
				// 非首次启动直接进入首页
				uni.reLaunch({
					url: '/pages/index/WorkerIndex/index'
				})
			}
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style>
	/*每个页面公共css */
	page {
		background: linear-gradient(180deg, #f0fbfd 20%, #fafafa 100%);
		margin: 0;
		padding: 0;
	}

	* {
		box-sizing: border-box;
	}

	a {
		text-decoration: none;
		color: inherit;
	}

	button {
		border: none;
		outline: none;
		background: none;
	}

	input {
		border: none;
		outline: none;
		background: none;
	}
</style>
