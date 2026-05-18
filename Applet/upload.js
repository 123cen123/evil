const ci = require('miniprogram-ci')
const path = require('path')

// 小程序配置
const PROJECT_PATH = __dirname  // 当前目录
const PRIVATE_KEY_PATH = path.join(__dirname, 'private.key')  // 把下载的密钥文件改名放这里
const APPID = 'wx5f3c959b6569ce28'

async function upload() {
  try {
    const project = new ci.Project({
      appid: APPID,
      type: 'miniProgram',
      projectPath: PROJECT_PATH,
      privateKeyPath: PRIVATE_KEY_PATH,
      ignores: ['node_modules/**/*', 'upload.js', '*.key'],
    })

    console.log('开始上传...')
    const result = await ci.upload({
      project,
      version: '1.0.' + Date.now().toString().slice(-4),
      desc: '测试版本 ' + new Date().toLocaleString(),
      setting: {
        es6: true,
        es7: true,
        minify: true,
        codeProtect: false,
      },
    })

    console.log('上传成功！')
    console.log('体验版二维码已生成，请在微信公众平台查看')
  } catch (err) {
    console.error('上传失败:', err.message)
    if (err.message.includes('private.key')) {
      console.log('\n请把下载的密钥文件改名为 private.key 放到项目根目录')
    }
  }
}

upload()
