const pool = require('./config/db');
const merchantModel = require('./databases/user_merchant');
const demandOrderModel = require('./databases/demand_order');

// 批量更新所有商家的统计数据
async function updateAllMerchantsStats() {
  try {
    console.log('开始更新所有商家统计数据...');
    
    // 获取所有商家
    const merchants = await merchantModel.findAll();
    
    console.log(`找到 ${merchants.length} 个商家`);
    
    for (const merchant of merchants) {
      console.log(`处理商家: ${merchant.name} (ID: ${merchant.id})`);
      
      // 计算统计数据
      const stats = await demandOrderModel.getMerchantStats(merchant.id);
      
      console.log(`  统计数据: 发布岗位数=${stats.orderCount}, 总工时=${stats.totalHours}, 评分=${stats.rating}`);
      
      // 更新数据库
      await merchantModel.updateById(merchant.id, {
        rating: stats.rating || 0,
        total_posts: stats.orderCount || 0
      });
      
      console.log(`  更新成功`);
    }
    
    console.log('\n所有商家统计数据更新完成！');
    
    // 显示更新后的结果
    console.log('\n更新后的商家统计数据:');
    const [result] = await pool.query('SELECT id, name, rating, total_posts FROM merchant');
    result.forEach(row => {
      console.log(`${row.id}: ${row.name} - 评分: ${row.rating}, 发布岗位数: ${row.total_posts}`);
    });
    
  } catch (error) {
    console.error('批量更新商家统计数据失败:', error);
  } finally {
    // 关闭数据库连接
    await pool.end();
  }
}

// 执行更新
updateAllMerchantsStats();
