const pool = require('../config/db');

// 生成订单编号：SD + 今天日期 + 四位随机数字
const generateOrderNumber = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const randomNum = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  const orderNumber = `SD${dateStr}${randomNum}`;
  console.log('生成的订单编号:', orderNumber);
  return orderNumber;
};

class DemandOrder {
  // 创建新订单
  static async create(demandData) {
    const {
      merchant_id,
      work_time,
      location,
      required_workers,
      hourly_wage,
      location_lat,
      location_lng,
      title,
      description,
      job_type,
      required_skills,
      salary_type
    } = demandData;
    
    // 生成订单编号
    const demand_no = generateOrderNumber();

    // 数据库为 NOT NULL，因此这里兜底到 0
    const latNum = location_lat !== undefined && location_lat !== null && location_lat !== '' ? Number(location_lat) : 0;
    const lngNum = location_lng !== undefined && location_lng !== null && location_lng !== '' ? Number(location_lng) : 0;
    const locationLat = Number.isFinite(latNum) ? latNum : 0;
    const locationLng = Number.isFinite(lngNum) ? lngNum : 0;
    
    // 处理技能数据，确保是有效的JSON
    let skillsJson = '[]';
    if (required_skills && Array.isArray(required_skills)) {
      skillsJson = JSON.stringify(required_skills);
    } else if (required_skills && typeof required_skills === 'string') {
      try {
        JSON.parse(required_skills);
        skillsJson = required_skills;
      } catch (e) {
        skillsJson = '[]';
      }
    }
    
    // 插入时为所有字段提供值，包括可能的必需字段
    const [result] = await pool.query(
      'INSERT INTO demand_order (merchant_id, demand_no, work_time, location, required_workers, hourly_wage, shop_name, title, description, job_type, required_skills, location_lat, location_lng, salary_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [merchant_id, demand_no, work_time, location, required_workers, hourly_wage, '', title || '', description || '', job_type || '', skillsJson, locationLat, locationLng, salary_type || '小时结']
    );
    
    console.log('订单创建成功，自增ID:', result.insertId, '订单编号:', demand_no);
    // 返回插入结果和生成的ID及订单号
    return { 
      ...result, 
      demand_id: result.insertId,   // 数据库自增的数字ID
      demand_no                     // 字符串订单号
    };
  }

  // 获取所有订单
  static async findAll() {
    const [rows] = await pool.query('SELECT * FROM demand_order');
    return rows;
  }

  // 根据自增ID查询
  static async findById(demand_id) {
    const [rows] = await pool.query('SELECT * FROM demand_order WHERE demand_id = ?', [demand_id]);
    return rows[0];
  }

  // 根据订单号查询（新增方法）
  static async findByOrderNo(demand_no) {
    const [rows] = await pool.query('SELECT * FROM demand_order WHERE demand_no = ?', [demand_no]);
    return rows[0];
  }

  // 根据自增ID更新
  static async updateById(demand_id, demandData) {
    const { work_time, location, required_workers, hourly_wage } = demandData;
    const [result] = await pool.query(
      'UPDATE demand_order SET work_time = ?, location = ?, required_workers = ?, hourly_wage = ? WHERE demand_id = ?',
      [work_time, location, required_workers, hourly_wage, demand_id]
    );
    return result;
  }

  // 根据自增ID删除
  static async deleteById(demand_id) {
    const [result] = await pool.query('DELETE FROM demand_order WHERE demand_id = ?', [demand_id]);
    return result;
  }
  
  // 获取商家统计数据（无需修改）
  static async getMerchantStats(merchantId) {
    try {
      const [orderCountResult] = await pool.query(
        'SELECT COUNT(*) as count FROM demand_order WHERE merchant_id = ?',
        [merchantId]
      );
      const orderCount = orderCountResult[0].count;
      
      const [hoursResult] = await pool.query(
        `SELECT 
          SUM(
            CASE 
              WHEN work_time LIKE '%09:00-19:00%' THEN 10
              WHEN work_time LIKE '%08:00-18:00%' THEN 10
              WHEN work_time LIKE '%09:00-18:00%' THEN 9
              ELSE 8
            END * required_workers
          ) as totalHours
        FROM demand_order 
        WHERE merchant_id = ?`,
        [merchantId]
      );
      const totalHours = hoursResult[0].totalHours || 0;
      
      let rating = 0;
      if (orderCount >= 20) rating = 5;
      else if (orderCount >= 15) rating = 4;
      else if (orderCount >= 10) rating = 3;
      else if (orderCount >= 5) rating = 2;
      else if (orderCount >= 1) rating = 1;
      
      return {
        orderCount,
        totalHours,
        rating
      };
    } catch (error) {
      console.error('计算商家统计数据失败:', error);
      return {
        orderCount: 0,
        totalHours: 0,
        rating: 0
      };
    }
  }
}

module.exports = DemandOrder;