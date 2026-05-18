const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DATABASE || 'user_management',
  timezone: 'local',
  dateStrings: false,
  charset: 'utf8mb4'
};

const pool = mysql.createPool(dbConfig);

// 在连接池创建后设置时区
pool.on('connection', (connection) => {
  connection.query('SET time_zone = "+08:00"');
});

module.exports = pool;