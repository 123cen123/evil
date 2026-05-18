const pool = require('../config/db');

const WORKER_GROUPS = {
  pending_service: ['signed_up', 'pending_start', 'pending'],
  in_service: ['accepted', 'pending_complete'],
  done: ['completed'],
  cancelled: ['rejected', 'cancelled']
};

const MERCHANT_GROUPS = {
  pending_service: ['pending_start', 'pending_complete', 'pending'],
  pending: ['pending_start', 'pending_complete', 'pending'],
  in_service: ['accepted'],
  done: ['completed'],
  cancelled: ['rejected', 'cancelled']
};

function buildInClause(arr) {
  return arr.map(() => '?').join(',');
}

class Applications {
  static async findById(applicationId) {
    const [rows] = await pool.query('SELECT * FROM applications WHERE application_id = ? LIMIT 1', [applicationId]);
    return rows[0] || null;
  }

  static async findByWorkerAndJob(workerId, jobId) {
    const [rows] = await pool.query(
      'SELECT * FROM applications WHERE worker_id = ? AND job_id = ? LIMIT 1',
      [workerId, jobId]
    );
    return rows[0] || null;
  }

  /** 招工市场报名：无需商家审核 */
  static async createSignedUp(workerId, jobId) {
    const [result] = await pool.query(
      'INSERT INTO applications (worker_id, job_id, status) VALUES (?, ?, ?)',
      [workerId, jobId, 'signed_up']
    );
    return result;
  }

  static async cancelSignup(applicationId, workerId) {
    const [result] = await pool.query(
      `UPDATE applications SET status = 'cancelled' WHERE application_id = ? AND worker_id = ? AND status = 'signed_up'`,
      [applicationId, workerId]
    );
    return result;
  }

  static async setPendingStart(applicationId, workerId) {
    const [result] = await pool.query(
      `UPDATE applications SET status = 'pending_start', start_request_time = CURRENT_TIMESTAMP 
       WHERE application_id = ? AND worker_id = ? AND status = 'signed_up'`,
      [applicationId, workerId]
    );
    return result;
  }

  static async setAcceptedFromStart(applicationId) {
    const [result] = await pool.query(
      `UPDATE applications SET status = 'accepted', accept_time = CURRENT_TIMESTAMP 
       WHERE application_id = ? AND status IN ('pending_start','pending')`,
      [applicationId]
    );
    return result;
  }

  static async setAcceptedDirect(applicationId, workerId) {
    const [result] = await pool.query(
      `UPDATE applications SET status = 'accepted', accept_time = CURRENT_TIMESTAMP 
       WHERE application_id = ? AND worker_id = ? AND status = 'signed_up'`,
      [applicationId, workerId]
    );
    return result;
  }

  static async rejectStart(applicationId) {
    const [result] = await pool.query(
      `UPDATE applications SET status = 'signed_up', start_request_time = NULL 
       WHERE application_id = ? AND status = 'pending_start'`,
      [applicationId]
    );
    return result;
  }

  static async approveLegacyPending(applicationId) {
    const [result] = await pool.query(
      `UPDATE applications SET status = 'accepted', accept_time = CURRENT_TIMESTAMP 
       WHERE application_id = ? AND status = 'pending'`,
      [applicationId]
    );
    return result;
  }

  static async rejectLegacy(applicationId) {
    const [result] = await pool.query(
      'UPDATE applications SET status = ? WHERE application_id = ? AND status = ?',
      ['rejected', applicationId, 'pending']
    );
    return result;
  }

  static async requestComplete(applicationId, workerId, photoUrl) {
    const [result] = await pool.query(
      `UPDATE applications SET status = 'pending_complete', complete_photo_url = ? 
       WHERE application_id = ? AND worker_id = ? AND status = 'accepted'`,
      [photoUrl || null, applicationId, workerId]
    );
    return result;
  }

  static async approveComplete(applicationId) {
    const [result] = await pool.query(
      `UPDATE applications SET status = 'completed', complete_time = CURRENT_TIMESTAMP 
       WHERE application_id = ? AND status = 'pending_complete'`,
      [applicationId]
    );
    return result;
  }

  static async rejectComplete(applicationId) {
    const [result] = await pool.query(
      `UPDATE applications SET status = 'accepted', complete_photo_url = NULL 
       WHERE application_id = ? AND status = 'pending_complete'`,
      [applicationId]
    );
    return result;
  }

  static async approve(applicationId) {
    const [r1] = await pool.query(
      `UPDATE applications SET status = 'accepted', accept_time = CURRENT_TIMESTAMP 
       WHERE application_id = ? AND status IN ('pending_start','pending')`,
      [applicationId]
    );
    if (r1.affectedRows > 0) return r1;
    return r1;
  }

  static async reject(applicationId) {
    const [r1] = await pool.query(
      `UPDATE applications SET status = 'signed_up', start_request_time = NULL 
       WHERE application_id = ? AND status = 'pending_start'`,
      [applicationId]
    );
    if (r1.affectedRows > 0) return r1;
    const [r2] = await pool.query(
      'UPDATE applications SET status = ? WHERE application_id = ? AND status = ?',
      ['rejected', applicationId, 'pending']
    );
    return r2;
  }

  static async complete(applicationId) {
    const [result] = await pool.query(
      'UPDATE applications SET status = ?, complete_time = CURRENT_TIMESTAMP WHERE application_id = ? AND status = ?',
      ['completed', applicationId, 'accepted']
    );
    return result;
  }

  static async rateByWorker(applicationId, rating, comment) {
    const [result] = await pool.query(
      'UPDATE applications SET worker_rating = ?, worker_comment = ? WHERE application_id = ?',
      [rating, comment || null, applicationId]
    );
    return result;
  }

  static async rateByMerchant(applicationId, rating, comment) {
    const [result] = await pool.query(
      'UPDATE applications SET merchant_rating = ?, merchant_comment = ? WHERE application_id = ?',
      [rating, comment || null, applicationId]
    );
    return result;
  }

  static async listForWorker(workerId, group, taskType) {
    const params = [workerId];
    let where = 'a.worker_id = ?';

    const g = group && group !== 'all' ? group : 'all';
    if (g !== 'all') {
      if (WORKER_GROUPS[g]) {
        where += ` AND a.status IN (${buildInClause(WORKER_GROUPS[g])})`;
        params.push(...WORKER_GROUPS[g]);
      } else {
        where += ' AND a.status = ?';
        params.push(g);
      }
    }

    if (taskType && taskType !== 'all') {
      where += ' AND d.task_type = ?';
      params.push(taskType);
    }

    const [rows] = await pool.query(
      `
      SELECT 
        a.*,
        d.work_time,
        d.location,
        d.required_workers,
        d.hourly_wage,
        d.merchant_id,
        d.title as job_title,
        d.task_type,
        m.name as merchant_name,
        m.contact as merchant_contact,
        m.phone as merchant_phone
      FROM applications a
      JOIN demand_order d ON a.job_id = d.demand_id
      LEFT JOIN merchant m ON d.merchant_id = m.id
      WHERE ${where}
      ORDER BY a.apply_time DESC
      `,
      params
    );
    return rows;
  }

  /** 兼容旧接口：按单一 status 筛选 */
  static async listForWorkerSingleStatus(workerId, status, taskType) {
    const params = [workerId, status];
    let where = 'a.worker_id = ? AND a.status = ?';
    if (taskType && taskType !== 'all') {
      where += ' AND d.task_type = ?';
      params.push(taskType);
    }
    const [rows] = await pool.query(
      `
      SELECT 
        a.*,
        d.work_time,
        d.location,
        d.required_workers,
        d.hourly_wage,
        d.merchant_id,
        d.title as job_title,
        d.task_type,
        m.name as merchant_name,
        m.contact as merchant_contact,
        m.phone as merchant_phone
      FROM applications a
      JOIN demand_order d ON a.job_id = d.demand_id
      LEFT JOIN merchant m ON d.merchant_id = m.id
      WHERE ${where}
      ORDER BY a.apply_time DESC
      `,
      params
    );
    return rows;
  }

  static async listForMerchant(merchantId, group, jobId, taskType) {
    const params = [merchantId];
    let where = 'd.merchant_id = ?';
    if (jobId) {
      where += ' AND d.demand_id = ?';
      params.push(jobId);
    }

    const g = group && group !== 'all' ? group : 'all';
    if (g !== 'all') {
      if (MERCHANT_GROUPS[g]) {
        where += ` AND a.status IN (${buildInClause(MERCHANT_GROUPS[g])})`;
        params.push(...MERCHANT_GROUPS[g]);
      } else {
        where += ' AND a.status = ?';
        params.push(g);
      }
    }

    if (taskType && taskType !== 'all') {
      where += ' AND d.task_type = ?';
      params.push(taskType);
    }

    const [rows] = await pool.query(
      `
      SELECT 
        a.*,
        d.work_time,
        d.location,
        d.required_workers,
        d.hourly_wage,
        d.title,
        d.task_type,
        w.name as worker_name,
        w.phone as worker_phone
      FROM applications a
      JOIN demand_order d ON a.job_id = d.demand_id
      LEFT JOIN gig_worker w ON a.worker_id = w.id
      WHERE ${where}
      ORDER BY a.apply_time DESC
      `,
      params
    );
    return rows;
  }
}

module.exports = Applications;
