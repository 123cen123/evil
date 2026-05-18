const pool = require('../config/db');
const { generateSalt, hashPassword, verifyPassword } = require('../utils/passwordUtils');

const gigWorkerModel = {
  // 注册零工
  register: async (workerData) => {
    const { name, phone, gender, age, skills, password } = workerData;

    // 简单验证
    if (password.length < 6) {
      throw new Error('密码长度不能小于6位');
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      throw new Error('手机号格式不正确');
    }

    // 处理性别字段，转换为数值
    let genderValue = 0; // 默认未知
    if (gender === '男' || gender === 'male' || gender === 1 || gender === '1') {
      genderValue = 1;
    } else if (gender === '女' || gender === 'female' || gender === 2 || gender === '2') {
      genderValue = 2;
    }

    // 处理技能字段，存储为字符串格式
    let skillsString = null;
    if (skills) {
      if (typeof skills === 'string') {
        // 如果已经是字符串，直接使用
        skillsString = skills;
      } else if (Array.isArray(skills)) {
        // 如果是数组，转换为字符串
        skillsString = skills.join('，');
      } else if (typeof skills === 'object') {
        // 如果是对象，尝试转换为字符串
        try {
          skillsString = JSON.stringify(skills);
        } catch (error) {
          skillsString = String(skills);
        }
      }
    }

    // 生成盐值并加密密码
    const salt = generateSalt();
    const hashedPassword = hashPassword(password, salt);

    const [result] = await pool.query(
      'INSERT INTO gig_worker (name, phone, gender, age, skills, password, salt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, phone, genderValue, age, skillsString, hashedPassword, salt]
    );
    return result;
  },

  // 通过手机号查找零工
  findByPhone: async (phone) => {
    const [rows] = await pool.query('SELECT * FROM gig_worker WHERE phone = ?', [phone]);
    return rows[0];
  },

  findAll: async () => {
    const [rows] = await pool.query('SELECT * FROM gig_worker');
    return rows;
  },

  deleteById: async (id) => {
    const [result] = await pool.query('DELETE FROM gig_worker WHERE id = ?', [id]);
    return result;
  },

  updateById: async (id, data) => {
    const fields = [];
    const values = [];
    
    // 处理性别字段，转换为数值
    if (data.gender !== undefined) {
      let genderValue = 0; // 默认未知
      if (data.gender === '男' || data.gender === 'male' || data.gender === 1 || data.gender === '1') {
        genderValue = 1;
      } else if (data.gender === '女' || data.gender === 'female' || data.gender === 2 || data.gender === '2') {
        genderValue = 2;
      }
      data.gender = genderValue;
    }
    
    // 处理技能字段，存储为字符串格式
    if (data.skills !== undefined) {
      let skillsString = null;
      if (data.skills) {
        if (typeof data.skills === 'string') {
          // 从前端获取到技能字符串
          skillsString = data.skills;
        } else if (Array.isArray(data.skills)) {
          // 如果是数组，转换为字符串
          skillsString = data.skills.join('，');
        } else if (typeof data.skills === 'object') {
          // 如果是对象，尝试转换为字符串
          try {
            skillsString = JSON.stringify(data.skills);
          } catch (error) {
            skillsString = String(data.skills);
          }
        }
      }
      data.skills = skillsString;
    }
    
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
    
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }
    
    if (fields.length === 0) return null;
    values.push(id);
    const [result] = await pool.query(`UPDATE gig_worker SET ${fields.join(', ')} WHERE id = ?`, values);
    return result;
  },
  
  // 通过ID查找零工
  findById: async (id) => {
    const [rows] = await pool.query('SELECT * FROM gig_worker WHERE id = ?', [id]);
    return rows[0];
  },
  
  // 修改密码
  changePassword: async (id, oldPassword, newPassword) => {
    if (newPassword.length < 6) {
      throw new Error('密码长度不能小于6位');
    }
    
    // 验证原密码
    const [rows] = await pool.query('SELECT password, salt FROM gig_worker WHERE id = ?', [id]);
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
    
    const [result] = await pool.query('UPDATE gig_worker SET password = ?, salt = ? WHERE id = ?', [newHashedPassword, newSalt, id]);
    return result;
  },
  
  // 修改手机号
  changePhone: async (id, oldPhone, newPhone) => {
    if (!/^1[3-9]\d{9}$/.test(newPhone)) {
      throw new Error('手机号格式不正确');
    }
    
    // 验证原手机号
    const [rows] = await pool.query('SELECT phone FROM gig_worker WHERE id = ?', [id]);
    if (rows.length === 0) {
      throw new Error('用户不存在');
    }
    if (rows[0].phone !== oldPhone) {
      throw new Error('原手机号错误');
    }
    
    // 检查新手机号是否已被使用
    const [existingRows] = await pool.query('SELECT id FROM gig_worker WHERE phone = ? AND id != ?', [newPhone, id]);
    if (existingRows.length > 0) {
      throw new Error('新手机号已被使用');
    }
    
    const [result] = await pool.query('UPDATE gig_worker SET phone = ? WHERE id = ?', [newPhone, id]);
    return result;
  }
};

module.exports = gigWorkerModel;