const crypto = require('crypto');
const pool = require('../config/db');

const PEPPER = process.env.ID_CARD_PEPPER || 'linggong-id-card-pe_DEV_CHANGE_ME';

function normalizeIdCard(raw) {
  return String(raw || '').replace(/\s/g, '').toUpperCase();
}

function hashDupKey(normalizedId) {
  return crypto.createHash('sha256').update(PEPPER + normalizedId, 'utf8').digest('hex');
}

function hashWithSalt(normalizedId, saltHex) {
  return crypto.createHash('sha256').update(saltHex + normalizedId, 'utf8').digest('hex');
}

class IdentityVerification {
  static async findByUser(userType, userId) {
    const [rows] = await pool.query(
      'SELECT * FROM identity_verification WHERE user_type = ? AND user_id = ? LIMIT 1',
      [userType, userId]
    );
    return rows[0] || null;
  }

  static async isApproved(userType, userId) {
    const [rows] = await pool.query(
      'SELECT status FROM identity_verification WHERE user_type = ? AND user_id = ? LIMIT 1',
      [userType, userId]
    );
    return rows.length > 0 && rows[0].status === 'approved';
  }

  static async submit({ user_type, user_id, real_name, id_card_number, id_card_front, id_card_back, business_license, permit, merchant_name, contact_phone, address }) {
    // 商家验证可以不需要身份证号码
    let normalized = '';
    let dupKey = null;
    let salt = null;
    let enc = null;
    let tail = null;
    
    if (id_card_number) {
      normalized = normalizeIdCard(id_card_number);
      if (!/^\d{17}[\dX]$/.test(normalized)) {
        const err = new Error('身份证号码格式不正确');
        err.code = 'BAD_ID_CARD';
        throw err;
      }
      
      const [otherDup] = await pool.query(
        `SELECT id FROM identity_verification 
         WHERE id_card_dup_key = ? AND NOT (user_type = ? AND user_id = ?) LIMIT 1`,
        [hashDupKey(normalized), user_type, Number(user_id)]
      );
      if (otherDup.length > 0) {
        const err = new Error('该身份证号已被使用');
        err.code = 'ER_DUP_ENTRY';
        throw err;
      }
      
      salt = crypto.randomBytes(16).toString('hex');
      enc = hashWithSalt(normalized, salt);
      tail = normalized.slice(-4);
      dupKey = hashDupKey(normalized);
    }

    const existing = await this.findByUser(user_type, user_id);
    // 即使认证已经通过，也允许更新信息
    if (existing && existing.status === 'approved') {
      // 不抛出错误，允许继续更新
    }

    const [result] = await pool.query(
      `
      INSERT INTO identity_verification
        (user_type, user_id, real_name,
         id_card_number, id_card_tail, id_card_salt, id_card_enc, id_card_dup_key,
         id_card_front, id_card_back, business_license, permit, merchant_name, contact_phone, address,
         status, submitted_at, reviewed_at, reviewer_id, review_comment)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, NULL, NULL, NULL)
      ON DUPLICATE KEY UPDATE
        real_name = VALUES(real_name),
        id_card_number = VALUES(id_card_number),
        id_card_tail = VALUES(id_card_tail),
        id_card_salt = VALUES(id_card_salt),
        id_card_enc = VALUES(id_card_enc),
        id_card_dup_key = VALUES(id_card_dup_key),
        id_card_front = VALUES(id_card_front),
        id_card_back = VALUES(id_card_back),
        business_license = VALUES(business_license),
        permit = VALUES(permit),
        merchant_name = VALUES(merchant_name),
        contact_phone = VALUES(contact_phone),
        address = VALUES(address),
        status = 'pending',
        submitted_at = CURRENT_TIMESTAMP,
        reviewed_at = NULL,
        reviewer_id = NULL,
        review_comment = NULL
      `,
      [
        user_type,
        Number(user_id),
        real_name,
        normalized || null,
        tail || null,
        salt || null,
        enc || null,
        dupKey || null,
        id_card_front || null,
        id_card_back || null,
        business_license || null,
        permit || null,
        merchant_name || null,
        contact_phone || null,
        address || null
      ]
    );
    return result;
  }
}

module.exports = IdentityVerification;
