const pool = require('../config/db');

// 时区调整函数：添加8小时以修复服务器时区问题
const adjustTimezone = (dateTimeStr) => {
  if (!dateTimeStr) return dateTimeStr;
  
  try {
    // 解析传入的时间字符串
    const date = new Date(dateTimeStr);
    
    // 添加8小时以修复时区问题
    const adjustedDate = new Date(date.getTime() + (8 * 60 * 60 * 1000));
    
    // 获取调整后的时间
    const year = adjustedDate.getFullYear();
    const month = String(adjustedDate.getMonth() + 1).padStart(2, '0');
    const day = String(adjustedDate.getDate()).padStart(2, '0');
    const hours = String(adjustedDate.getHours()).padStart(2, '0');
    const minutes = String(adjustedDate.getMinutes()).padStart(2, '0');
    const seconds = String(adjustedDate.getSeconds()).padStart(2, '0');
    
    // 返回调整后的时间格式 YYYY-MM-DD HH:MM:SS
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.error('时区调整函数 - 错误:', error);
    return dateTimeStr; // 如果出错，返回原值
  }
};

class OrderAccept {
  static async create(acceptData) {
    const { demand_id, worker_id, start_work_time, end_work_time } = acceptData;
    const [result] = await pool.query(
      'INSERT INTO order_accept (demand_id, worker_id, start_work_time, end_work_time) VALUES (?, ?, ?, ?)',
      [demand_id, worker_id, adjustTimezone(start_work_time), adjustTimezone(end_work_time)]
    );
    return result;
  }

  static async findAll() {
    const [rows] = await pool.query('SELECT * FROM order_accept');
    return rows;
  }

  static async findById(id) {
    const [rows] = await pool.query('SELECT * FROM order_accept WHERE id = ?', [id]);
    return rows[0];
  }

  static async updateById(id, acceptData) {
    const { start_work_time, end_work_time } = acceptData;
    const [result] = await pool.query(
      'UPDATE order_accept SET start_work_time = ?, end_work_time = ? WHERE id = ?',
      [adjustTimezone(start_work_time), adjustTimezone(end_work_time), id]
    );
    return result;
  }

  static async deleteById(id) {
    const [result] = await pool.query('DELETE FROM order_accept WHERE id = ?', [id]);
    return result;
  }
  
  // 获取零工统计数据
  static async getWorkerStats(workerId) {
    try {
      // 计算接单数量
      const [orderCountResult] = await pool.query(
        'SELECT COUNT(*) as count FROM order_accept WHERE worker_id = ?',
        [workerId]
      );
      const orderCount = orderCountResult[0].count;
      
      // 计算总工时（基于开始和结束时间）
      const [hoursResult] = await pool.query(
        `SELECT 
          SUM(
            TIMESTAMPDIFF(HOUR, start_work_time, end_work_time)
          ) as totalHours
        FROM order_accept 
        WHERE worker_id = ? AND start_work_time IS NOT NULL AND end_work_time IS NOT NULL`,
        [workerId]
      );
      const totalHours = hoursResult[0].totalHours || 0;
      
      // 计算星级（基于接单数量，简单算法）
      let rating = 0;
      if (orderCount >= 50) rating = 5;
      else if (orderCount >= 30) rating = 4;
      else if (orderCount >= 20) rating = 3;
      else if (orderCount >= 10) rating = 2;
      else if (orderCount >= 1) rating = 1;
      
      return {
        orderCount,
        totalHours,
        rating
      };
    } catch (error) {
      console.error('计算零工统计数据失败:', error);
      return {
        orderCount: 0,
        totalHours: 0,
        rating: 0
      };
    }
  }
}

module.exports = OrderAccept;