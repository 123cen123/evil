const pool = require('../config/db');

class Interactions {
  static async create({ worker_id, job_id, interaction_type, rating, comment }) {
    const [result] = await pool.query(
      'INSERT INTO interactions (worker_id, job_id, interaction_type, rating, comment) VALUES (?, ?, ?, ?, ?)',
      [worker_id, job_id, interaction_type, rating || null, comment || null]
    );
    return result;
  }
}

module.exports = Interactions;

