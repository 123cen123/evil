const pool = require('../config/db');
const { generateSalt, hashPassword, verifyPassword } = require('../utils/passwordUtils');

const merchantModel = {
  // 注册商家
  register: async (merchantData) => {
    const { shop_name, shop_address, contact_person, phone, password } = merchantData;

    // 简单验证
    if (password.length < 6) {
      throw new Error('密码长度不能小于6位');
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      throw new Error('手机号格式不正确');
    }

    // 生成盐值并加密密码
    const salt = generateSalt();
    const hashedPassword = hashPassword(password, salt);

    // 注意：表字段为 name, address, contact, phone, password, salt, 
    // business_type, location_lat, location_lng 等
    // 这里为缺少的必填字段添加默认值，你可以根据业务调整
    const [result] = await pool.query(
      `INSERT INTO merchant 
       (name, address, contact, phone, password, salt, business_type, location_lat, location_lng) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        shop_name,                // 对应 name 字段
        shop_address,             // 对应 address 字段
        contact_person,           // 对应 contact 字段
        phone, 
        hashedPassword, 
        salt,
        '未分类',                 // business_type 默认值
        0.0,                      // location_lat 默认值
        0.0                       // location_lng 默认值
      ]
    );
    return result;
  },

  // 通过手机号查找商家
  findByPhone: async (phone) => {
    const [rows] = await pool.query('SELECT * FROM merchant WHERE phone = ?', [phone]);
    return rows[0];
  },

  findAll: async () => {
    const [rows] = await pool.query('SELECT * FROM merchant');
    return rows;
  },

  deleteById: async (id) => {
    const [result] = await pool.query('DELETE FROM merchant WHERE id = ?', [id]);
    return result;
  },

  updateById: async (id, data) => {
    const fields = [];
    const values = [];
    
    // 如果包含密码，需要加密处理
    if (data.password) {
      if (data.password.length < 6) {
        throw new Error('密码长度不能小于6位');
      }
      const salt = generateSalt();
      const hashedPassword = hashPassword(data.password, salt);
      fields.push('password = ?, salt = ?');
      values.push(hashedPassword, salt);
      delete data.password;
    }
    
    // 注意：传入的 data 中的字段名必须与数据库表字段名一致
    // 例如：如果你要更新地址，应该用 address 而不是 shop_address
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }
    
    if (fields.length === 0) return null;
    values.push(id);
    const [result] = await pool.query(`UPDATE merchant SET ${fields.join(', ')} WHERE id = ?`, values);
    return result;
  },
  
  // 通过ID查找商家
  findById: async (id) => {
    const [rows] = await pool.query('SELECT * FROM merchant WHERE id = ?', [id]);
    return rows[0];
  },
  
  // 修改密码
  changePassword: async (id, oldPassword, newPassword) => {
    if (newPassword.length < 6) {
      throw new Error('密码长度不能小于6位');
    }
    
    // 验证原密码
    const [rows] = await pool.query('SELECT password, salt FROM merchant WHERE id = ?', [id]);
    if (rows.length === 0) {
      throw new Error('用户不存在');
    }
    
    const { password: hashedPassword, salt } = rows[0];
    if (!verifyPassword(oldPassword, hashedPassword, salt)) {
      throw new Error('原密码错误');
    }
    
    // 生成新的盐值和密码
    const newSalt = generateSalt();
    const newHashedPassword = hashPassword(newPassword, newSalt);
    
    const [result] = await pool.query('UPDATE merchant SET password = ?, salt = ? WHERE id = ?', [newHashedPassword, newSalt, id]);
    return result;
  },
  
  // 修改手机号
  changePhone: async (id, oldPhone, newPhone) => {
    if (!/^1[3-9]\d{9}$/.test(newPhone)) {
      throw new Error('手机号格式不正确');
    }
    
    // 验证原手机号
    const [rows] = await pool.query('SELECT phone FROM merchant WHERE id = ?', [id]);
    if (rows.length === 0) {
      throw new Error('用户不存在');
    }
    if (rows[0].phone !== oldPhone) {
      throw new Error('原手机号错误');
    }
    
    // 检查新手机号是否已被使用
    const [existingRows] = await pool.query('SELECT id FROM merchant WHERE phone = ? AND id != ?', [newPhone, id]);
    if (existingRows.length > 0) {
      throw new Error('新手机号已被使用');
    }
    
    const [result] = await pool.query('UPDATE merchant SET phone = ? WHERE id = ?', [newPhone, id]);
    return result;
  },
  
  // 更新商家描述
  updateDescription: async (id, description) => {
    const [result] = await pool.query('UPDATE merchant SET description = ? WHERE id = ?', [description, id]);
    return result;
  }
};

module.exports = merchantModel;