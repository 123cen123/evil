const crypto = require('crypto');

/**
 * 生成随机盐值
 * @returns {string} 64位随机盐值
 */
const generateSalt = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * 对密码进行加盐加密
 * @param {string} password 原始密码
 * @param {string} salt 盐值
 * @returns {string} 加密后的密码
 */
const hashPassword = (password, salt) => {
  const hash = crypto.createHmac('sha256', salt);
  hash.update(password);
  return hash.digest('hex');
};

/**
 * 验证密码
 * @param {string} password 原始密码
 * @param {string} hashedPassword 加密后的密码
 * @param {string} salt 盐值
 * @returns {boolean} 是否匹配
 */
const verifyPassword = (password, hashedPassword, salt) => {
  const hash = crypto.createHmac('sha256', salt);
  hash.update(password);
  const newHash = hash.digest('hex');
  return newHash === hashedPassword;
};

module.exports = {
  generateSalt,
  hashPassword,
  verifyPassword
};