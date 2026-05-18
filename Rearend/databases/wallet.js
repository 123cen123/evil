const pool = require('../config/db');

class Wallet {
  static async getOrCreateRow(userType, userId) {
    const ut = userType === 'merchant' ? 'merchant' : 'worker';
    const uid = Number(userId);
    const [rows] = await pool.query(
      'SELECT * FROM user_wallet WHERE user_type = ? AND user_id = ? LIMIT 1',
      [ut, uid]
    );
    if (rows[0]) return rows[0];
    await pool.query(
      'INSERT INTO user_wallet (user_type, user_id, balance, total_income, total_withdraw, frozen) VALUES (?, ?, 0, 0, 0, 0)',
      [ut, uid]
    );
    const [again] = await pool.query(
      'SELECT * FROM user_wallet WHERE user_type = ? AND user_id = ? LIMIT 1',
      [ut, uid]
    );
    return again[0];
  }

  static async getSummary(userType, userId) {
    const row = await this.getOrCreateRow(userType, userId);
    return {
      balance: Number(row.balance),
      totalIncome: Number(row.total_income),
      totalWithdraw: Number(row.total_withdraw),
      frozen: Number(row.frozen)
    };
  }

  static async recharge(userType, userId, amount, remark) {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) throw new Error('充值金额无效');
    const ut = userType === 'merchant' ? 'merchant' : 'worker';
    const uid = Number(userId);
    await this.getOrCreateRow(ut, uid);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [rows] = await conn.query(
        'SELECT balance, total_income FROM user_wallet WHERE user_type = ? AND user_id = ? FOR UPDATE',
        [ut, uid]
      );
      const b = Number(rows[0].balance);
      const ti = Number(rows[0].total_income);
      const nb = b + amt;
      const nti = ti + amt;
      await conn.query(
        'UPDATE user_wallet SET balance = ?, total_income = ? WHERE user_type = ? AND user_id = ?',
        [nb, nti, ut, uid]
      );
      await conn.query(
        'INSERT INTO wallet_transaction (user_type, user_id, tx_type, amount, balance_after, remark) VALUES (?, ?, ?, ?, ?, ?)',
        [ut, uid, 'recharge', amt, nb, remark || '充值']
      );
      await conn.commit();
      return { balance: nb, totalIncome: nti };
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  static async withdraw(userType, userId, amount, remark) {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) throw new Error('提现金额无效');
    const ut = userType === 'merchant' ? 'merchant' : 'worker';
    const uid = Number(userId);
    await this.getOrCreateRow(ut, uid);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [rows] = await conn.query(
        'SELECT balance, total_withdraw FROM user_wallet WHERE user_type = ? AND user_id = ? FOR UPDATE',
        [ut, uid]
      );
      const b = Number(rows[0].balance);
      const tw = Number(rows[0].total_withdraw);
      if (b < amt) throw new Error('余额不足');
      const nb = b - amt;
      const ntw = tw + amt;
      await conn.query(
        'UPDATE user_wallet SET balance = ?, total_withdraw = ? WHERE user_type = ? AND user_id = ?',
        [nb, ntw, ut, uid]
      );
      await conn.query(
        'INSERT INTO wallet_transaction (user_type, user_id, tx_type, amount, balance_after, remark) VALUES (?, ?, ?, ?, ?, ?)',
        [ut, uid, 'withdraw', -amt, nb, remark || '提现']
      );
      await conn.commit();
      return { balance: nb, totalWithdraw: ntw };
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  static async listTransactions(userType, userId, limit = 200) {
    const ut = userType === 'merchant' ? 'merchant' : 'worker';
    const uid = Number(userId);
    const lim = Math.min(Number(limit) || 200, 500);
    const [rows] = await pool.query(
      `SELECT id, tx_type, amount, balance_after, remark, created_at
       FROM wallet_transaction WHERE user_type = ? AND user_id = ?
       ORDER BY created_at DESC, id DESC LIMIT ?`,
      [ut, uid, lim]
    );
    return rows;
  }
}

module.exports = Wallet;
