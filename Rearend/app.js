const express = require('express');
const cors = require('cors');
const multer = require('multer');// 引入头像文件上传相关模块
const path = require('path');
const pool = require('./config/db');
const merchantModel = require('./databases/user_merchant');
const gigWorkerModel = require('./databases/user_gig_worker');
const demandOrderModel = require('./databases/demand_order');
const orderAcceptModel = require('./databases/order_accept');
const identityVerificationModel = require('./databases/identity_verification');
const applicationsModel = require('./databases/applications');
const interactionsModel = require('./databases/interactions');
const walletModel = require('./databases/wallet');

const app = express();
const PORT = 3000;

// 时区调整函数：添加8小时以修复服务器时区问题
const adjustTimezone = (dateTimeStr) => {
  console.log('时区调整函数 - 输入:', dateTimeStr);
  console.log('时区调整函数 - 输入类型:', typeof dateTimeStr);
  
  if (!dateTimeStr) {
    console.log('时区调整函数 - 输入为空，直接返回');
    return dateTimeStr;
  }
  
  try {
    // 解析传入的时间字符串
    const date = new Date(dateTimeStr);
    console.log('时区调整函数 - 解析后的Date对象:', date);
    console.log('时区调整函数 - 原始时间:', dateTimeStr);
    
    // 添加8小时以修复时区问题
    const adjustedDate = new Date(date.getTime() + (8 * 60 * 60 * 1000));
    console.log('时区调整函数 - 调整后Date对象:', adjustedDate);
    
    // 获取调整后的时间
    const year = adjustedDate.getFullYear();
    const month = String(adjustedDate.getMonth() + 1).padStart(2, '0');
    const day = String(adjustedDate.getDate()).padStart(2, '0');
    const hours = String(adjustedDate.getHours()).padStart(2, '0');
    const minutes = String(adjustedDate.getMinutes()).padStart(2, '0');
    const seconds = String(adjustedDate.getSeconds()).padStart(2, '0');
    
    const result = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    console.log('时区调整函数 - 最终结果:', result);
    
    // 返回调整后的时间格式 YYYY-MM-DD HH:MM:SS
    return result;
  } catch (error) {
    console.error('时区调整函数 - 错误:', error);
    return dateTimeStr; // 如果出错，返回原值
  }
};

// 配置文件上传
const uploadDir = path.join(__dirname, 'uploads', 'avatars');
// 确保上传目录存在
const fs = require('fs');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// 实名认证图片上传配置
const identityUploadDir = path.join(__dirname, 'uploads', 'identity');
if (!fs.existsSync(identityUploadDir)) {
  fs.mkdirSync(identityUploadDir, { recursive: true });
}
const identityStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, identityUploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'id-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const uploadIdentity = multer({ storage: identityStorage });

app.use(cors());
app.use(express.json());

// ===================== 通用：密码校验（用于敏感操作二次确认） =====================
// 商家验密：密码必须与登录密码一致
app.post('/api/merchant/verify-password', async (req, res) => {
  try {
    const { merchant_id, password } = req.body || {};
    if (!merchant_id || !password) {
      return res.status(400).json({ success: false, message: '缺少 merchant_id 或 password' });
    }
    const merchant = await merchantModel.findById(Number(merchant_id));
    if (!merchant) {
      return res.status(404).json({ success: false, message: '商家不存在' });
    }
    const { verifyPassword } = require('./utils/passwordUtils');
    const ok = verifyPassword(String(password), merchant.password, merchant.salt);
    if (!ok) {
      return res.status(401).json({ success: false, message: '密码错误' });
    }
    res.json({ success: true, message: '密码验证通过' });
  } catch (error) {
    console.error('商家验密失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 零工头像上传
app.post('/api/worker/avatar/:workerId', upload.single('avatar'), async (req, res) => {
  try {
    const { workerId } = req.params;
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请选择图片' });
    }
    // 生成可访问的 URL
    const avatarUrl = `http://localhost:3000/uploads/avatars/${req.file.filename}`;
    
    // 更新数据库
    await pool.query('UPDATE gig_worker SET avatar = ? WHERE id = ?', [avatarUrl, workerId]);
    
    res.json({ success: true, data: { avatarUrl } });
  } catch (error) {
    console.error('头像上传失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 商家头像上传
app.post('/api/merchant/avatar/:merchantId', upload.single('avatar'), async (req, res) => {
  try {
    const { merchantId } = req.params;
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请选择图片' });
    }
    const avatarUrl = `http://localhost:3000/uploads/avatars/${req.file.filename}`;
    await pool.query('UPDATE merchant SET avatar = ? WHERE id = ?', [avatarUrl, merchantId]);
    res.json({ success: true, data: { avatarUrl } });
  } catch (error) {
    console.error('头像上传失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 静态文件服务（让头像可以被访问）
app.use('/uploads', express.static('uploads'));

// ===================== 实名认证接口 =====================
// 上传身份证照片（前端使用 uni.uploadFile）
app.post('/api/identity/upload', uploadIdentity.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请选择图片' });
    }
    const url = `http://localhost:3000/uploads/identity/${req.file.filename}`;
    res.json({ success: true, data: { url } });
  } catch (error) {
    console.error('实名认证图片上传失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

function _incrementDemandAccepted(demandId) {
  return pool.query(
    `UPDATE demand_order SET accepted_count = IFNULL(accepted_count,0) + 1 
     WHERE demand_id = ? AND IFNULL(accepted_count,0) < required_workers`,
    [demandId]
  );
}

async function _afterEnterService(appRow) {
  const jobId = Number(appRow.job_id);
  const workerId = Number(appRow.worker_id);
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const t = adjustTimezone(now);
  const [rows] = await pool.query(
    'SELECT id, start_work_time FROM order_accept WHERE demand_id = ? AND worker_id = ? LIMIT 1',
    [jobId, workerId]
  );
  // 如果接单记录已存在（audit 预占/锁定时创建），则只更新时间，不重复扣减名额
  if (rows.length === 0) {
    const [inc] = await _incrementDemandAccepted(jobId);
    if (inc.affectedRows === 0) throw new Error('任务名额已满');
    await pool.query(
      `INSERT INTO order_accept (demand_id, worker_id, start_work_time, end_work_time, status) VALUES (?, ?, ?, NULL, ?)`,
      [jobId, workerId, t, '服务中']
    );
    return;
  }
  if (!rows[0].start_work_time) {
    await pool.query(
      `UPDATE order_accept SET start_work_time = ?, status = ? WHERE id = ?`,
      [t, '服务中', rows[0].id]
    );
  }
}

async function _afterCompleteService(appRow) {
  const jobId = Number(appRow.job_id);
  const workerId = Number(appRow.worker_id);
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const t = adjustTimezone(now);
  await pool.query(
    `UPDATE order_accept SET end_work_time = ?, status = ? WHERE demand_id = ? AND worker_id = ?`,
    [t, '已完成', jobId, workerId]
  );
}

// ===================== 报名/审批/互评（applications + interactions） =====================
// 零工报名：无需商家审核 -> signed_up
app.post('/api/applications/apply', async (req, res) => {
  try {
    const { worker_id, job_id } = req.body || {};
    if (!worker_id || !job_id) {
      return res.status(400).json({ success: false, message: '缺少 worker_id 或 job_id' });
    }

    const [activeApps] = await pool.query(
      `SELECT application_id, job_id FROM applications 
       WHERE worker_id = ? AND status IN ('accepted','pending_complete') LIMIT 1`,
      [Number(worker_id)]
    );
    if (activeApps.length > 0 && String(activeApps[0].job_id) !== String(job_id)) {
      return res.status(400).json({
        success: false,
        code: 'WORKER_HAS_ACTIVE_APPLICATION',
        message: '您当前还有进行中的任务，结束后才能报名其他岗位',
        data: { active_job_id: activeApps[0].job_id }
      });
    }

    const approved = await identityVerificationModel.isApproved('worker', Number(worker_id));
    if (!approved) {
      return res.status(403).json({
        success: false,
        code: 'IDENTITY_NOT_APPROVED',
        message: '请先完成实名认证并审核通过后再报名'
      });
    }

    const existing = await applicationsModel.findByWorkerAndJob(Number(worker_id), Number(job_id));
    if (existing) {
      return res.json({ success: true, data: existing, message: '已报名' });
    }

    await applicationsModel.createSignedUp(Number(worker_id), Number(job_id));
    try {
      await pool.query('UPDATE demand_order SET apply_count = IFNULL(apply_count,0) + 1 WHERE demand_id = ?', [
        Number(job_id)
      ]);
    } catch (e) {
      /* apply_count 列不存在时可忽略 */
    }
    await interactionsModel.create({
      worker_id: Number(worker_id),
      job_id: Number(job_id),
      interaction_type: 'apply'
    });

    const created = await applicationsModel.findByWorkerAndJob(Number(worker_id), Number(job_id));
    res.status(201).json({ success: true, data: created, message: '报名成功' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: '您已经报名过了' });
    }
    console.error('报名失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 零工取消报名（仅 signed_up）
app.post('/api/applications/:id/cancel-signup', async (req, res) => {
  try {
    const { id } = req.params;
    const { worker_id } = req.body || {};
    if (!worker_id) return res.status(400).json({ success: false, message: '缺少 worker_id' });
    const row = await applicationsModel.findById(Number(id));
    if (!row) return res.status(404).json({ success: false, message: '记录不存在' });
    if (Number(row.worker_id) !== Number(worker_id)) {
      return res.status(403).json({ success: false, message: '无权操作' });
    }
    const r = await applicationsModel.cancelSignup(Number(id), Number(worker_id));
    if (r.affectedRows === 0) return res.status(400).json({ success: false, message: '仅“已报名”状态可取消' });
    res.json({ success: true, message: '已取消报名' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// 申请上工：simple 直接服务中；audit -> pending_start
app.post('/api/applications/:id/request-start', async (req, res) => {
  try {
    const { id } = req.params;
    const { worker_id } = req.body || {};
    if (!worker_id) return res.status(400).json({ success: false, message: '缺少 worker_id' });
    const appRow = await applicationsModel.findById(Number(id));
    if (!appRow) return res.status(404).json({ success: false, message: '申请记录不存在' });
    if (Number(appRow.worker_id) !== Number(worker_id)) {
      return res.status(403).json({ success: false, message: '无权操作' });
    }
    if (appRow.status !== 'signed_up') {
      return res.status(400).json({ success: false, message: '当前状态不可申请上工' });
    }
    const [activeApps] = await pool.query(
      `SELECT application_id FROM applications WHERE worker_id = ? AND status IN ('accepted','pending_complete') AND application_id <> ? LIMIT 1`,
      [Number(worker_id), Number(id)]
    );
    if (activeApps.length > 0) {
      return res.status(400).json({ success: false, message: '您还有其他进行中的任务' });
    }
    const [dRows] = await pool.query('SELECT task_type, demand_id FROM demand_order WHERE demand_id = ?', [
      Number(appRow.job_id)
    ]);
    const demand = dRows[0];
    const tType = demand && demand.task_type === 'simple' ? 'simple' : 'audit';
    if (tType === 'simple') {
      const r = await applicationsModel.setAcceptedDirect(Number(id), Number(worker_id));
      if (r.affectedRows === 0) return res.status(400).json({ success: false, message: '上工失败' });
      const updated = await applicationsModel.findById(Number(id));
      try {
        await _afterEnterService(updated);
      } catch (e) {
        await pool.query(`UPDATE applications SET status = 'signed_up', accept_time = NULL WHERE application_id = ?`, [
          Number(id)
        ]);
        await pool.query(
          `UPDATE demand_order SET accepted_count = GREATEST(IFNULL(accepted_count,0)-1,0) WHERE demand_id = ?`,
          [Number(appRow.job_id)]
        );
        throw e;
      }
      return res.json({ success: true, message: '已开始服务' });
    }

    // audit：需要“锁定名额 + 创建接单记录（start_work_time 为空）+ 待审批”
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const demandId = Number(appRow.job_id);
      const wid = Number(worker_id);

      const [oaRows] = await conn.query(
        'SELECT id, start_work_time FROM order_accept WHERE demand_id = ? AND worker_id = ? LIMIT 1 FOR UPDATE',
        [demandId, wid]
      );

      if (!oaRows || oaRows.length === 0) {
        const [inc] = await conn.query(
          `UPDATE demand_order SET accepted_count = IFNULL(accepted_count,0) + 1
           WHERE demand_id = ? AND IFNULL(accepted_count,0) < required_workers`,
          [demandId]
        );
        if (inc.affectedRows === 0) throw new Error('任务名额已满');

        await conn.query(
          `INSERT INTO order_accept (demand_id, worker_id, start_work_time, end_work_time, status)
           VALUES (?, ?, NULL, NULL, ?)`,
          [demandId, wid, '待审批']
        );
      }

      const [upd] = await conn.query(
        `UPDATE applications
         SET status = 'pending_start', start_request_time = CURRENT_TIMESTAMP
         WHERE application_id = ? AND worker_id = ? AND status = 'signed_up'`,
        [Number(id), wid]
      );
      if (upd.affectedRows === 0) throw new Error('提交失败');

      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    res.json({ success: true, message: '已提交上工申请，等待商家确认' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// 商家查看报名列表：group=pending_service|in_service|done|cancelled|all
app.get('/api/merchant/:merchant_id/applications', async (req, res) => {
  try {
    const { merchant_id } = req.params;
    const { group, status = 'all', job_id, task_type } = req.query;
    const g = group || (status !== 'all' ? status : 'all');
    const rows = await applicationsModel.listForMerchant(
      Number(merchant_id),
      g,
      job_id ? Number(job_id) : null,
      task_type
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('获取商家报名列表失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 商家通过上工（pending_start / 兼容旧 pending）
app.post('/api/applications/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const appRow = await applicationsModel.findById(Number(id));
    if (!appRow) {
      return res.status(404).json({ success: false, message: '申请记录不存在' });
    }
    const prev = appRow.status;
    const [activeApps] = await pool.query(
      `SELECT application_id, job_id FROM applications WHERE worker_id = ? AND status IN ('accepted','pending_complete') AND application_id <> ? LIMIT 1`,
      [Number(appRow.worker_id), Number(id)]
    );
    if (activeApps.length > 0) {
      return res.status(400).json({
        success: false,
        code: 'WORKER_HAS_ACTIVE_APPLICATION',
        message: '该零工当前还有进行中的任务',
        data: { active_job_id: activeApps[0].job_id }
      });
    }
    let r = await applicationsModel.approve(Number(id));
    if (r.affectedRows === 0) {
      r = await applicationsModel.approveLegacyPending(Number(id));
    }
    if (r.affectedRows === 0) {
      return res.status(400).json({ success: false, message: '审批失败：当前状态不可通过上工' });
    }
    const updated = await applicationsModel.findById(Number(id));
    if (['pending_start', 'pending'].includes(prev)) {
      try {
        await _afterEnterService(updated);
      } catch (e) {
        await pool.query(
          `UPDATE applications SET status = ?, accept_time = NULL, start_request_time = NULL WHERE application_id = ?`,
          [prev === 'pending' ? 'pending' : 'pending_start', Number(id)]
        );
        console.error(e);
        return res.status(400).json({ success: false, message: e.message });
      }
    }
    res.json({ success: true, message: '已通过上工' });
  } catch (error) {
    console.error('审批通过失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 商家驳回上工
app.post('/api/applications/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const appRow = await applicationsModel.findById(Number(id));
    if (!appRow) return res.status(404).json({ success: false, message: '申请记录不存在' });
    const prev = appRow.status;

    const r = await applicationsModel.reject(Number(id));
    if (r.affectedRows === 0) {
      return res.status(400).json({ success: false, message: '驳回失败' });
    }

    // audit：释放预占名额（删除待审批的接单记录，accepted_count 回退）
    if (['pending_start', 'pending'].includes(prev)) {
      const demandId = Number(appRow.job_id);
      const wid = Number(appRow.worker_id);
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [del] = await conn.query(
          'DELETE FROM order_accept WHERE demand_id = ? AND worker_id = ? AND start_work_time IS NULL',
          [demandId, wid]
        );
        if (del.affectedRows > 0) {
          await conn.query(
            'UPDATE demand_order SET accepted_count = GREATEST(IFNULL(accepted_count,0)-1,0) WHERE demand_id = ?',
            [demandId]
          );
        }
        await conn.commit();
      } catch (e) {
        await conn.rollback();
        throw e;
      } finally {
        conn.release();
      }
    }

    res.json({ success: true, message: '已驳回' });
  } catch (error) {
    console.error('驳回失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 零工任务列表
app.get('/api/worker/:worker_id/applications', async (req, res) => {
  try {
    const { worker_id } = req.params;
    const { group, status = 'all', task_type } = req.query;
    let rows;
    if (group) {
      rows = await applicationsModel.listForWorker(Number(worker_id), group, task_type);
    } else if (status && status !== 'all') {
      rows = await applicationsModel.listForWorkerSingleStatus(Number(worker_id), status, task_type);
    } else {
      rows = await applicationsModel.listForWorker(Number(worker_id), 'all', task_type);
    }
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('获取零工报名列表失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 零工下工申请 -> pending_complete
app.post('/api/applications/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { worker_id, photo_url } = req.body || {};
    if (!worker_id) return res.status(400).json({ success: false, message: '缺少 worker_id' });
    const appRow = await applicationsModel.findById(Number(id));
    if (!appRow) {
      return res.status(404).json({ success: false, message: '申请记录不存在' });
    }
    if (Number(appRow.worker_id) !== Number(worker_id)) {
      return res.status(403).json({ success: false, message: '无权操作' });
    }
    const r = await applicationsModel.requestComplete(Number(id), Number(worker_id), photo_url);
    if (r.affectedRows === 0) {
      return res.status(400).json({ success: false, message: '仅服务中可申请下工' });
    }
    res.json({ success: true, message: '已提交下工申请，等待商家确认' });
  } catch (error) {
    console.error('下工申请失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 商家确认下工 -> 已完成
app.post('/api/applications/:id/approve-complete', async (req, res) => {
  try {
    const { id } = req.params;
    const appRow = await applicationsModel.findById(Number(id));
    if (!appRow) return res.status(404).json({ success: false, message: '申请记录不存在' });
    const r = await applicationsModel.approveComplete(Number(id));
    if (r.affectedRows === 0) {
      return res.status(400).json({ success: false, message: '当前状态不可确认完工' });
    }
    const updated = await applicationsModel.findById(Number(id));
    await _afterCompleteService(updated);
    await interactionsModel.create({
      worker_id: updated.worker_id,
      job_id: updated.job_id,
      interaction_type: 'complete'
    });
    res.json({ success: true, message: '已确认完工' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 商家驳回下工
app.post('/api/applications/:id/reject-complete', async (req, res) => {
  try {
    const { id } = req.params;
    const r = await applicationsModel.rejectComplete(Number(id));
    if (r.affectedRows === 0) {
      return res.status(400).json({ success: false, message: '操作失败' });
    }
    res.json({ success: true, message: '已退回，请零工继续服务' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 互评：零工评价商家 / 商家评价零工
app.post('/api/applications/:id/rate', async (req, res) => {
  try {
    const { id } = req.params;
    const { rater_type, rating, comment } = req.body || {};
    if (!rater_type || !['worker', 'merchant'].includes(rater_type)) {
      return res.status(400).json({ success: false, message: 'rater_type 必须是 worker 或 merchant' });
    }
    const rateNum = Number(rating);
    if (!rateNum || rateNum < 1 || rateNum > 5) {
      return res.status(400).json({ success: false, message: 'rating 必须是 1-5' });
    }

    const appRow = await applicationsModel.findById(Number(id));
    if (!appRow) {
      return res.status(404).json({ success: false, message: '申请记录不存在' });
    }

    if (rater_type === 'worker') {
      await applicationsModel.rateByWorker(Number(id), rateNum, comment);
    } else {
      await applicationsModel.rateByMerchant(Number(id), rateNum, comment);
    }

    await interactionsModel.create({
      worker_id: appRow.worker_id,
      job_id: appRow.job_id,
      interaction_type: 'rating',
      rating: rateNum,
      comment
    });

    res.json({ success: true, message: '评价成功' });
  } catch (error) {
    console.error('评价失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 查询实名认证状态
app.get('/api/identity/status', async (req, res) => {
  try {
    const { user_type, user_id } = req.query;
    if (!user_type || !user_id) {
      return res.status(400).json({ success: false, message: '缺少 user_type 或 user_id' });
    }
    const record = await identityVerificationModel.findByUser(user_type, Number(user_id));
    if (!record) {
      return res.json({ success: true, data: { exists: false, status: 'none' } });
    }
    res.json({
      success: true,
      data: {
        exists: true,
        status: record.status,
        real_name: record.real_name,
        id_card_number: record.id_card_tail
          ? `**************${record.id_card_tail}`
          : record.id_card_number
          ? String(record.id_card_number).replace(/^(.{3}).*(.{2})$/, '$1*************$2')
          : '',
        id_card_front: record.id_card_front,
        id_card_back: record.id_card_back,
        business_license: record.business_license,
        permit: record.permit,
        merchant_name: record.merchant_name,
        contact_phone: record.contact_phone,
        address: record.address,
        submitted_at: record.submitted_at,
        reviewed_at: record.reviewed_at,
        review_comment: record.review_comment || ''
      }
    });
  } catch (error) {
    console.error('获取实名认证状态失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 提交实名认证（创建/重新提交）
app.post('/api/identity/submit', async (req, res) => {
  try {
    const { user_type, user_id, real_name, id_card_number, id_card_front, id_card_back, business_license, permit, merchant_name, contact_phone, address } = req.body || {};
    if (!user_type || !user_id) {
      return res.status(400).json({ success: false, message: '缺少 user_type 或 user_id' });
    }
    if (!real_name) {
      return res.status(400).json({ success: false, message: '真实姓名不能为空' });
    }
    
    // 商家验证可以不需要身份证号码，但需要营业执照
    if (user_type === 'merchant') {
      if (!business_license) {
        return res.status(400).json({ success: false, message: '营业执照不能为空' });
      }
    } else {
      // 非商家必须提供身份证号码
      if (!id_card_number || !/^\d{17}[\dXx]$/.test(id_card_number)) {
        return res.status(400).json({ success: false, message: '身份证号码格式不正确' });
      }
    }

    await identityVerificationModel.submit({
      user_type,
      user_id: Number(user_id),
      real_name,
      id_card_number: id_card_number ? id_card_number.toUpperCase() : '',
      id_card_front,
      id_card_back,
      business_license,
      permit,
      merchant_name,
      contact_phone,
      address
    });

    res.json({ success: true, message: '提交成功，等待审核' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: '该身份证号已被使用' });
    }
    console.error('提交实名认证失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 商家注册接口
app.post('/api/merchant/register', async (req, res) => {
  try {
    const result = await merchantModel.register(req.body);
    
    // 注册成功后，查询并返回完整的商家信息
    const merchantInfo = await merchantModel.findByPhone(req.body.phone);
    if (merchantInfo) {
      // 不返回密码
      delete merchantInfo.password;
      res.status(201).json({ 
        success: true, 
        data: { 
          merchant_id: merchantInfo.id, // 重要：确保返回merchant_id
          ...merchantInfo 
        },
        message: '注册成功' 
      });
    } else {
      res.status(201).json({ success: true, data: result, message: '注册成功' });
    }
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// 测试性别转换接口
app.post('/api/test/gender-conversion', (req, res) => {
  try {
    console.log('接收到测试请求:', req.body);
    
    // 处理性别字段，转换为数值
    let genderValue = 0; // 默认未知
    if (req.body.gender !== undefined && req.body.gender !== null) {
      if (req.body.gender === '男' || req.body.gender === 'male' || req.body.gender === 1 || req.body.gender === '1') {
        genderValue = 1;
      } else if (req.body.gender === '女' || req.body.gender === 'female' || req.body.gender === 2 || req.body.gender === '2') {
        genderValue = 2;
      }
    }
    
    console.log('转换后的性别值:', genderValue);
    res.json({ success: true, data: { originalGender: req.body.gender, convertedGender: genderValue } });
  } catch (error) {
    console.error('测试失败:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// 零工注册接口
app.post('/api/worker/register', async (req, res) => {
  try {
    console.log('接收到零工注册请求:', req.body);
    
    // 处理性别字段，转换为数值
    let genderValue = 0; // 默认未知
    if (req.body.gender !== undefined && req.body.gender !== null) {
      if (req.body.gender === '男' || req.body.gender === 'male' || req.body.gender === 1 || req.body.gender === '1') {
        genderValue = 1;
      } else if (req.body.gender === '女' || req.body.gender === 'female' || req.body.gender === 2 || req.body.gender === '2') {
        genderValue = 2;
      }
    }
    req.body.gender = genderValue;
    console.log('转换后的性别值:', req.body.gender);
    
    const result = await gigWorkerModel.register(req.body);
    
    // 注册成功后，查询并返回完整的零工信息
    const workerInfo = await gigWorkerModel.findByPhone(req.body.phone);
    if (workerInfo) {
      // 不返回密码和盐值
      delete workerInfo.password;
      delete workerInfo.salt;
      res.status(201).json({ 
        success: true, 
        data: { 
          worker_id: workerInfo.id, // 重要：确保返回worker_id
          ...workerInfo 
        },
        message: '注册成功' 
      });
    } else {
      res.status(201).json({ success: true, data: result, message: '注册成功' });
    }
  } catch (error) {
    console.error('零工注册失败:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// 商家登录接口
app.post('/api/merchant/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    const merchant = await merchantModel.findByPhone(phone);

    if (!merchant) {
      return res.status(404).json({ success: false, message: '商家不存在' });
    }

    // 使用密码验证函数
    const { generateSalt, hashPassword, verifyPassword } = require('./utils/passwordUtils');
    if (!verifyPassword(password, merchant.password, merchant.salt)) {
      return res.status(401).json({ success: false, message: '密码错误' });
    }

    // 不返回密码和盐值
    delete merchant.password;
    delete merchant.salt;
    
    res.json({ success: true, data: merchant });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 零工登录接口
app.post('/api/worker/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    const worker = await gigWorkerModel.findByPhone(phone);

    if (!worker) {
      return res.status(404).json({ success: false, message: '零工不存在' });
    }

    // 使用密码验证函数
    const { generateSalt, hashPassword, verifyPassword } = require('./utils/passwordUtils');
    if (!verifyPassword(password, worker.password, worker.salt)) {
      return res.status(401).json({ success: false, message: '密码错误' });
    }

    // 不返回密码和盐值，并添加worker_id字段
    delete worker.password;
    delete worker.salt;
    
    res.json({ 
      success: true, 
      data: { 
        worker_id: worker.id, // 重要：确保返回worker_id
        ...worker 
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 商家列表接口
app.get('/api/merchant/list', async (req, res) => {
  try {
    const merchants = await merchantModel.findAll();
    // 移除密码和盐值
    const safeMerchants = merchants.map(merchant => {
      const { password, salt, ...safeMerchant } = merchant;
      return safeMerchant;
    });
    res.json({ success: true, data: safeMerchants });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 零工列表接口
app.get('/api/worker/list', async (req, res) => {
  try {
    const workers = await gigWorkerModel.findAll();
    // 移除密码和盐值
    const safeWorkers = workers.map(worker => {
      const { password, salt, ...safeWorker } = worker;
      return safeWorker;
    });
    res.json({ success: true, data: safeWorkers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 删除商家
app.delete('/api/merchant/:id', async (req, res) => {
  try {
    const result = await merchantModel.deleteById(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 修改商家
app.put('/api/merchant/:id', async (req, res) => {
  try {
    const result = await merchantModel.updateById(req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 删除零工
app.delete('/api/worker/:id', async (req, res) => {
  try {
    const result = await gigWorkerModel.deleteById(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 修改零工
app.put('/api/worker/:id', async (req, res) => {
  try {
    const result = await gigWorkerModel.updateById(req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 创建需求单接口
app.post('/api/demand/create', async (req, res) => {
  try {
    const { merchant_id, work_time, location, required_workers, hourly_wage } = req.body;
    
    // 数据验证
    if (!merchant_id) {
      return res.status(400).json({ success: false, message: '商家ID不能为空' });
    }
    if (!work_time) {
      return res.status(400).json({ success: false, message: '用工时间不能为空' });
    }
    if (!location) {
      return res.status(400).json({ success: false, message: '工作地点不能为空' });
    }
    if (!required_workers || required_workers <= 0) {
      return res.status(400).json({ success: false, message: '需求人数必须大于0' });
    }
    if (hourly_wage === undefined || hourly_wage === null || hourly_wage < 0) {
      return res.status(400).json({ success: false, message: '时薪不能为负数' });
    }
    
    console.log('创建需求单数据：', req.body); // 添加日志
    
    const result = await demandOrderModel.create(req.body);
    res.status(201).json({ success: true, data: result, message: '需求单创建成功' });
  } catch (error) {
    console.error('创建需求单错误：', error); // 添加错误日志
    res.status(400).json({ success: false, message: error.message });
  }
});

// 获取所有可用地点接口
app.get('/api/locations', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT DISTINCT location FROM demand_order WHERE location IS NOT NULL AND location != "" ORDER BY location');
    const locations = rows.map(row => row.location);
    res.json({ success: true, data: locations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取需求单列表接口（包含商家信息）
app.get('/api/demand/list', async (req, res) => {
  try {
    const { worker_id, merchant_id, region, time_filter, salary_min, salary_max } = req.query; // 添加筛选参数
    
    console.log('筛选参数:', { worker_id, merchant_id, region, time_filter, salary_min, salary_max });
    
    // 联表查询，获取需求单和对应的商家信息
    let query = `
      SELECT 
        d.*,
        m.name as shop_name,
        m.contact as contact_person,
        (SELECT COUNT(*) FROM applications a1 WHERE a1.job_id = d.demand_id AND a1.status IN ('accepted','completed')) as accepted_count
    `;
    
    // 如果提供了worker_id，则检查该用户是否已报名 + 返回申请状态
    if (worker_id) {
      query += `,
        (SELECT COUNT(*) FROM applications a2 WHERE a2.job_id = d.demand_id AND a2.worker_id = ?) as is_applied,
        (SELECT a3.status FROM applications a3 WHERE a3.job_id = d.demand_id AND a3.worker_id = ? LIMIT 1) as application_status
      `;
    }
    
    query += `
      FROM demand_order d 
      LEFT JOIN merchant m ON d.merchant_id = m.id
    `;
    
    // 构建WHERE条件
    let whereConditions = [];
    let params = [];

    // 商家筛选（如果提供了merchant_id）
    if (merchant_id) {
      whereConditions.push('d.merchant_id = ?');
      params.push(merchant_id);
    }
    
    // 区域筛选
    if (region && region !== '全部') {
      whereConditions.push('d.location LIKE ?');
      params.push(`%${region}%`);
    }
    
    // 时间筛选
    if (time_filter && time_filter !== '全部') {
      const now = new Date();
      let startDate, endDate;
      
      switch (time_filter) {
        case '今天':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
          break;
        case '明天':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
          break;
        case '本周':
          const dayOfWeek = now.getDay();
          const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToMonday);
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (7 - dayOfWeek));
          break;
      }
      
      if (startDate && endDate) {
        whereConditions.push('DATE(d.work_time) BETWEEN ? AND ?');
        params.push(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]);
      }
    }
    
    // 薪水筛选
    if (salary_min && salary_min !== '' && salary_min !== '全部') {
      const minValue = parseFloat(salary_min);
      if (!isNaN(minValue)) {
        whereConditions.push('d.hourly_wage >= ?');
        params.push(minValue);
      }
    }
    
    if (salary_max && salary_max !== '' && salary_max !== '全部') {
      const maxValue = parseFloat(salary_max);
      if (!isNaN(maxValue)) {
        whereConditions.push('d.hourly_wage <= ?');
        params.push(maxValue);
      }
    }

    // 取消任务不展示在市场/游客列表
    whereConditions.push('COALESCE(d.status, 1) <> 3');
    
    // 添加WHERE子句
    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    // 如果提供了worker_id，添加到参数数组（两次占位）
    if (worker_id) {
      params.unshift(worker_id, worker_id);
    }
    
    query += ' ORDER BY d.created_at DESC';
    
    console.log('最终SQL查询:', query);
    console.log('查询参数:', params);
    
    const [rows] = await pool.query(query, params);
    
    // 如果没有提供worker_id，为所有记录添加is_applied/application_status默认值
    if (!worker_id) {
      rows.forEach(row => {
        row.is_applied = 0;
        row.application_status = null;
      });
    }
    
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 取消任务：仅商家可取消未开始任务（记录原因，进入已取消）
app.post('/api/demand/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { merchant_id, reason } = req.body || {};
    if (!merchant_id) return res.status(400).json({ success: false, message: '缺少 merchant_id' });
    if (!reason || !String(reason).trim()) return res.status(400).json({ success: false, message: '请输入取消原因' });

    const [rows] = await pool.query('SELECT demand_id, merchant_id, work_time, status FROM demand_order WHERE demand_id = ? LIMIT 1', [Number(id)]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: '需求单不存在' });
    const demand = rows[0];
    if (Number(demand.merchant_id) !== Number(merchant_id)) {
      return res.status(403).json({ success: false, message: '无权取消该任务' });
    }
    if (Number(demand.status) === 3) {
      return res.json({ success: true, message: '任务已取消' });
    }

    // 仅允许取消“未开始”的任务（按用工开始时间判断）
    const parseWorkStart = (workTimeStr) => {
      if (!workTimeStr) return null;
      const s = String(workTimeStr);
      if (s.includes(' ') && s.includes('-')) {
        const [datePart, timePart] = s.split(' ');
        if (timePart && timePart.includes('-')) {
          const [startHm] = timePart.split('-');
          const d = new Date(`${datePart}T${startHm}:00`);
          if (!isNaN(d.getTime())) return d;
        }
      }
      const d = new Date(s.replace(/-/g, '/'));
      return isNaN(d.getTime()) ? null : d;
    };
    const start = parseWorkStart(demand.work_time);
    if (!start) {
      return res.status(400).json({ success: false, message: '用工时间格式无法识别，暂无法取消' });
    }
    if (new Date() >= start) {
      return res.status(400).json({ success: false, message: '任务已开始，无法取消' });
    }

    await pool.query(
      'UPDATE demand_order SET status = 3, cancel_reason = ?, cancel_time = CURRENT_TIMESTAMP WHERE demand_id = ?',
      [String(reason).trim(), Number(id)]
    );
    res.json({ success: true, message: '取消成功' });
  } catch (error) {
    console.error('取消任务失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取需求单详情接口
app.get('/api/demand/:id', async (req, res) => {
  try {
    const demandId = Number(req.params.id);
    const [rows] = await pool.query(`
      SELECT 
        d.*,
        m.name as shop_name,
        m.contact as contact_person,
        (SELECT COUNT(*) 
         FROM applications a 
         WHERE a.job_id = d.demand_id 
           AND a.status IN ('accepted','completed')
        ) as accepted_count
      FROM demand_order d
      LEFT JOIN merchant m ON d.merchant_id = m.id
      WHERE d.demand_id = ?
      LIMIT 1
    `, [demandId]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: '需求单不存在' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 更新需求单接口
app.put('/api/demand/:id', async (req, res) => {
  try {
    const result = await demandOrderModel.updateById(req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 删除需求单接口
app.delete('/api/demand/:id', async (req, res) => {
  try {
    const result = await demandOrderModel.deleteById(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 创建接单接口
app.post('/api/accept/create', async (req, res) => {
  try {
    const result = await orderAcceptModel.create(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// 获取接单列表接口
app.get('/api/accept/list', async (req, res) => {
  try {
    const accepts = await orderAcceptModel.findAll();
    res.json({ success: true, data: accepts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取接单详情接口
app.get('/api/accept/:id', async (req, res) => {
  try {
    const accept = await orderAcceptModel.findById(req.params.id);
    if (!accept) {
      return res.status(404).json({ success: false, message: '接单记录不存在' });
    }
    res.json({ success: true, data: accept });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 更新接单接口
app.put('/api/accept/:id', async (req, res) => {
  try {
    const result = await orderAcceptModel.updateById(req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 删除接单接口
app.delete('/api/accept/:id', async (req, res) => {
  try {
    const result = await orderAcceptModel.deleteById(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 零工接单接口
app.post('/api/order/accept', async (req, res) => {
  try {
    console.log('接单请求 - 请求体:', req.body);
    const { demand_id, worker_id } = req.body;
    
    console.log('接单请求 - demand_id:', demand_id, 'worker_id:', worker_id);
    
    // 验证必需参数
    if (!demand_id || !worker_id) {
      console.log('接单请求 - 参数缺失');
      return res.status(400).json({ 
        success: false, 
        message: '缺少必需参数 demand_id 或 worker_id',
        received: { demand_id, worker_id }
      });
    }

    // 实名认证校验（必须已通过）
    const approved = await identityVerificationModel.isApproved('worker', Number(worker_id));
    if (!approved) {
      return res.status(403).json({
        success: false,
        code: 'IDENTITY_NOT_APPROVED',
        message: '请先完成实名认证并审核通过后再报名'
      });
    }

    // 同一时间只允许接一单：未下工（end_work_time 为空）前禁止再接其他单
    // 包含：已接单但未上工、已上工但未下工 两种情况
    const [activeAccept] = await pool.query(
      'SELECT id, demand_id, start_work_time, end_work_time FROM order_accept WHERE worker_id = ? AND end_work_time IS NULL LIMIT 1',
      [worker_id]
    );
    if (activeAccept.length > 0 && String(activeAccept[0].demand_id) !== String(demand_id)) {
      return res.status(400).json({
        success: false,
        code: 'WORKER_HAS_ACTIVE_ORDER',
        message: '您当前还有未下工的任务，完成/下工后才能接下一单',
        data: {
          active_demand_id: activeAccept[0].demand_id,
          start_work_time: activeAccept[0].start_work_time
        }
      });
    }

    // 任务是否已取消：取消后禁止接单（demand_order.status=3）
    const [demandRows] = await pool.query(
      'SELECT demand_id, status FROM demand_order WHERE demand_id = ? LIMIT 1',
      [demand_id]
    );
    if (demandRows.length === 0) {
      return res.status(404).json({ success: false, message: '需求单不存在' });
    }
    if (Number(demandRows[0].status) === 3) {
      return res.status(400).json({ success: false, code: 'DEMAND_CANCELLED', message: '该任务已取消，无法接单' });
    }
    
    // 检查是否已经接过这个单
    const [existingAccept] = await pool.query(
      'SELECT * FROM order_accept WHERE demand_id = ? AND worker_id = ?',
      [demand_id, worker_id]
    );
    
    if (existingAccept.length > 0) {
      console.log('接单请求 - 已经接过这个单');
      return res.status(400).json({ success: false, message: '您已经接过这个单了' });
    }
    
    // 创建接单记录
    const result = await orderAcceptModel.create({
      demand_id,
      worker_id,
      start_work_time: null,
      end_work_time: null
    });

    // 同步/创建 applications 记录（用于互评闭环）
    // 如果已存在（uk_worker_job），则更新为 accepted
    await pool.query(
      `INSERT INTO applications (worker_id, job_id, status, accept_time)
       VALUES (?, ?, 'accepted', CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE status='accepted', accept_time=CURRENT_TIMESTAMP`,
      [Number(worker_id), Number(demand_id)]
    );
    
    console.log('接单请求 - 创建成功:', result);
    res.status(201).json({ success: true, message: '接单成功', data: result });
  } catch (error) {
    console.error('接单请求 - 错误:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ success: false, message: '您已经接过这个单了' });
    } else {
      res.status(500).json({ success: false, message: error.message });
    }
  }
});

// 上工接口
app.post('/api/order/start-work', async (req, res) => {
  try {
    const { demand_id, worker_id, start_work_time } = req.body;
    
    console.log('上工接口 - 原始时间:', start_work_time);
    console.log('上工接口 - 时间类型:', typeof start_work_time);
    
    // 查找接单记录
    const [acceptRecords] = await pool.query(
      'SELECT * FROM order_accept WHERE demand_id = ? AND worker_id = ?',
      [demand_id, worker_id]
    );
    
    if (acceptRecords.length === 0) {
      return res.status(404).json({ success: false, message: '未找到接单记录' });
    }
    
    const acceptRecord = acceptRecords[0];
    
    if (acceptRecord.start_work_time) {
      return res.status(400).json({ success: false, message: '您已经上工了' });
    }
    
    // 时区调整
    const adjustedTime = adjustTimezone(start_work_time);
    console.log('上工接口 - 调整后时间:', adjustedTime);
    
    // 更新上工时间
    await pool.query(
      'UPDATE order_accept SET start_work_time = ? WHERE id = ?',
      [adjustedTime, acceptRecord.id]
    );
    
    res.json({ success: true, message: '上工成功' });
  } catch (error) {
    console.error('上工接口错误:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 用户定位更新接口
app.post('/api/user/location', async (req, res) => {
  try {
    const { user_id, user_type, latitude, longitude } = req.body;
    
    if (!user_id || !user_type || !latitude || !longitude) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }
    
    let table, idField;
    if (user_type === 'merchant') {
      table = 'merchant';
      idField = 'id';
    } else if (user_type === 'worker') {
      table = 'gig_worker';
      idField = 'id';
    } else {
      return res.status(400).json({ success: false, message: '无效的用户类型' });
    }
    
    const [result] = await pool.query(
      `UPDATE ${table} SET location_lat = ?, location_lng = ? WHERE ${idField} = ?`,
      [latitude, longitude, user_id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    res.json({ success: true, message: '定位更新成功' });
  } catch (error) {
    console.error('定位更新失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 零工下工接口
app.post('/api/order/end-work', async (req, res) => {
  try {
    const { demand_id, worker_id, end_work_time } = req.body;
    
    console.log('下工接口 - 原始时间:', end_work_time);
    console.log('下工接口 - 时间类型:', typeof end_work_time);
    
    // 查找接单记录
    const [acceptRecords] = await pool.query(
      'SELECT * FROM order_accept WHERE demand_id = ? AND worker_id = ?',
      [demand_id, worker_id]
    );
    
    if (acceptRecords.length === 0) {
      return res.status(404).json({ success: false, message: '未找到接单记录' });
    }
    
    const acceptRecord = acceptRecords[0];
    
    if (!acceptRecord.start_work_time) {
      return res.status(400).json({ success: false, message: '您还没有上工' });
    }
    
    if (acceptRecord.end_work_time) {
      return res.status(400).json({ success: false, message: '您已经下工了' });
    }
    
    // 时区调整
    const adjustedTime = adjustTimezone(end_work_time);
    console.log('下工接口 - 调整后时间:', adjustedTime);
    
    // 更新下工时间
    await pool.query(
      'UPDATE order_accept SET end_work_time = ? WHERE id = ?',
      [adjustedTime, acceptRecord.id]
    );

    // 同步 applications 完成状态（用于互评闭环）
    await pool.query(
      `UPDATE applications 
       SET status = 'completed', complete_time = CURRENT_TIMESTAMP
       WHERE worker_id = ? AND job_id = ?`,
      [Number(worker_id), Number(demand_id)]
    );
    
    res.json({ success: true, message: '下工成功' });
  } catch (error) {
    console.error('下工接口错误:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取零工的任务列表
app.get('/api/worker/:worker_id/tasks', async (req, res) => {
  try {
    const { worker_id } = req.params;
    const { status = 'all' } = req.query;
    
    let whereClause = '';
    let params = [worker_id];
    
    // 根据状态过滤（取消任务走 demand_order.status=3）
    switch (status) {
      case 'pending':  // 待服务
        whereClause = 'AND COALESCE(d.status,1) <> 3 AND oa.start_work_time IS NULL';
        break;
      case 'working':  // 服务中
        whereClause = 'AND COALESCE(d.status,1) <> 3 AND oa.start_work_time IS NOT NULL AND oa.end_work_time IS NULL';
        break;
      case 'completed': // 已完成
        whereClause = 'AND COALESCE(d.status,1) <> 3 AND oa.start_work_time IS NOT NULL AND oa.end_work_time IS NOT NULL';
        break;
      case 'cancelled': // 已取消
        whereClause = 'AND COALESCE(d.status,1) = 3';
        break;
      default: // 全部
        whereClause = '';
    }
    
    const [rows] = await pool.query(`
      SELECT 
        d.*,
        m.name as shop_name,
        oa.start_work_time,
        oa.end_work_time,
        a.application_id,
        a.status as application_status,
        a.worker_rating,
        a.merchant_rating,
        a.worker_comment,
        a.merchant_comment
      FROM order_accept oa
      JOIN demand_order d ON oa.demand_id = d.demand_id
      LEFT JOIN merchant m ON d.merchant_id = m.id
      LEFT JOIN applications a ON a.worker_id = oa.worker_id AND a.job_id = oa.demand_id
      WHERE oa.worker_id = ? ${whereClause}
      ORDER BY oa.id DESC
    `, params);
    
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取商家的任务列表
app.get('/api/merchant/:merchant_id/tasks', async (req, res) => {
  try {
    const { merchant_id } = req.params;
    const { status = 'all' } = req.query;
    
    console.log(`获取商家任务列表 - merchant_id: ${merchant_id}, status: ${status}`);
    
    const params = [merchant_id];
    const [rows] = await pool.query(`
      SELECT 
        d.*,
        m.name as shop_name,
        (SELECT COUNT(*) FROM order_accept WHERE demand_id = d.demand_id) as accepted_count,
        (SELECT COUNT(*) FROM order_accept WHERE demand_id = d.demand_id AND start_work_time IS NOT NULL) as working_count,
        (SELECT COUNT(*) FROM order_accept WHERE demand_id = d.demand_id AND end_work_time IS NOT NULL) as completed_count,
        (SELECT JSON_ARRAYAGG(JSON_OBJECT('worker_id', w.id, 'name', w.name, 'phone', w.phone)) 
         FROM order_accept oa 
         LEFT JOIN gig_worker w ON oa.worker_id = w.id 
         WHERE oa.demand_id = d.demand_id) as workers
      FROM demand_order d 
      LEFT JOIN merchant m ON d.merchant_id = m.id
      WHERE d.merchant_id = ?
      ORDER BY d.created_at DESC
    `, params);

    // 用工时间分组：未开始=开始前；进行中=用工时间内；已结束=结束后
    const now = new Date();
    const parseWorkRange = (workTimeStr) => {
      if (!workTimeStr) return { start: null, end: null };
      // 新格式: "YYYY-MM-DD 09:00-19:00"
      if (typeof workTimeStr === 'string' && workTimeStr.includes(' ') && workTimeStr.includes('-')) {
        const [datePart, timePart] = workTimeStr.split(' ');
        if (timePart && timePart.includes('-') && timePart.length <= 20) {
          const [startHm, endHm] = timePart.split('-');
          const start = new Date(`${datePart}T${startHm}:00`);
          const end = new Date(`${datePart}T${endHm}:00`);
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) return { start, end };
        }
      }
      // 旧格式: "YYYY-MM-DD HH:MM:SS"
      const dt = new Date(String(workTimeStr).replace(/-/g, '/'));
      if (!isNaN(dt.getTime())) {
        const start = dt;
        const end = new Date(dt.getTime() + 8 * 60 * 60 * 1000); // 默认按8小时估算
        return { start, end };
      }
      return { start: null, end: null };
    };

    let filtered = rows;
    if (status && status !== 'all') {
      filtered = rows.filter((t) => {
        // 已取消：demand_order.status=3
        if (status === 'cancelled') return Number(t.status) === 3;
        // 其他页签不展示已取消
        if (Number(t.status) === 3) return false;

        const { start, end } = parseWorkRange(t.work_time);
        if (!start || !end) return false;
        if (status === 'not_started') return now < start;
        if (status === 'in_progress') return now >= start && now <= end;
        if (status === 'completed') return now > end;
        return true;
      });
    } else {
      // 全部：包含取消与未取消
      filtered = rows;
    }
    
    console.log(`商家任务查询结果 - 找到 ${filtered.length} 条记录`);
    res.json({ success: true, data: filtered });
  } catch (error) {
    console.error('获取商家任务列表错误:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 订单报表接口
app.get('/api/order/report', async (req, res) => {
  try {
    // 联表查询需求单和商家信息，返回订单报表数据
    // 使用DATE_FORMAT强制格式化时间，确保返回正确的格式
    const [rows] = await pool.query(`
      SELECT 
        d.demand_id as orderid,
        DATE_FORMAT(d.created_at, '%Y-%m-%d %H:%i:%s') as retime,
        d.work_time as work_timme,
        m.name as merchant,
        d.required_workers as people,
        d.hourly_wage,
        CASE 
          WHEN EXISTS(SELECT 1 FROM order_accept oa WHERE oa.demand_id = d.demand_id AND oa.start_work_time IS NOT NULL AND oa.end_work_time IS NULL) THEN '进行中'
          WHEN EXISTS(SELECT 1 FROM order_accept oa WHERE oa.demand_id = d.demand_id AND oa.end_work_time IS NOT NULL) THEN '已完成'
          WHEN EXISTS(SELECT 1 FROM order_accept oa WHERE oa.demand_id = d.demand_id) THEN '报名中'
          ELSE '报名中'
        END as status,
        COALESCE((SELECT COUNT(*) FROM order_accept WHERE demand_id = d.demand_id), 0) as ygong,
        ROUND(d.required_workers * d.hourly_wage, 2) as hour
      FROM demand_order d 
      LEFT JOIN merchant m ON d.merchant_id = m.id
      ORDER BY d.created_at DESC
    `);

    // 直接返回数据库原始数据，不进行时区转换
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('获取订单报表数据失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 订单明细接口
app.get('/api/order/detail', async (req, res) => {
  try {
    // 联表查询接单记录、需求单、商家和零工信息
    // 使用LEFT JOIN确保即使没有接单记录也能显示需求单信息
    // 使用DATE_FORMAT强制格式化时间，确保返回正确的格式
    const [rows] = await pool.query(`
      SELECT 
        d.demand_id as orderid,
        DATE_FORMAT(d.created_at, '%Y-%m-%d %H:%i:%s') as retime,
        m.name as merchant,
        d.required_workers as hour,
        d.hourly_wage,
        COALESCE(w.name, '未分配') as empname,
        COALESCE(w.phone, '未分配') as phone,
        DATE_FORMAT(oa.start_work_time, '%Y-%m-%d %H:%i:%s') as starttime,
        DATE_FORMAT(oa.end_work_time, '%Y-%m-%d %H:%i:%s') as endtime,
        CASE 
          WHEN oa.end_work_time IS NOT NULL THEN '已完成'
          WHEN oa.start_work_time IS NOT NULL THEN '进行中'
          WHEN oa.id IS NOT NULL THEN '已接单'
          ELSE '未接单'
        END as status
      FROM demand_order d
      LEFT JOIN order_accept oa ON d.demand_id = oa.demand_id
      LEFT JOIN merchant m ON d.merchant_id = m.id
      LEFT JOIN gig_worker w ON oa.worker_id = w.id
      ORDER BY d.created_at DESC
    `);

    // 直接返回数据库原始数据，不进行时区转换
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('获取订单明细数据失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 结算报表接口
app.get('/api/settlement/report', async (req, res) => {
  try {
    const { demand_id, merchant_id } = req.query;
    
    // 构建SQL查询
    let query = `
      SELECT 
        oa.id as orderid,
        d.demand_id as demand_id,
        m.name as merchant,
        w.name as empname,
        w.phone,
        ROUND(TIMESTAMPDIFF(MINUTE, oa.start_work_time, COALESCE(oa.end_work_time, NOW())) / 60, 2) as working_hour,
        d.hourly_wage,
        DATE_FORMAT(oa.start_work_time, '%Y-%m-%d %H:%i:%s') as starttime,
        DATE_FORMAT(COALESCE(oa.end_work_time, NOW()), '%Y-%m-%d %H:%i:%s') as endtime,
        ROUND((TIMESTAMPDIFF(MINUTE, oa.start_work_time, COALESCE(oa.end_work_time, NOW())) / 60) * d.hourly_wage, 2) as amount,
        CASE WHEN s.status = 'paid' THEN '已支付' ELSE '待支付' END as status,
        COALESCE(s.payment_method, '现金') as paymentMethod
      FROM order_accept oa
      JOIN demand_order d ON oa.demand_id = d.demand_id
      LEFT JOIN merchant m ON d.merchant_id = m.id
      LEFT JOIN gig_worker w ON oa.worker_id = w.id
      LEFT JOIN settlement s 
        ON s.demand_id = d.demand_id 
       AND s.worker_id = oa.worker_id
       AND s.merchant_id = d.merchant_id
      WHERE oa.start_work_time IS NOT NULL
    `;
    const params = [];
    
    // 如果提供了demand_id参数，添加过滤条件
    if (demand_id) {
      query += ` AND d.demand_id = ?`;
      params.push(Number(demand_id));
    }

    // 仅查询指定商家的任务结算
    if (merchant_id) {
      query += ` AND d.merchant_id = ?`;
      params.push(Number(merchant_id));
    }
    
    query += ' ORDER BY oa.end_work_time DESC';
    
    // 执行查询
    const [rows] = await pool.query(query, params);

    // 直接返回数据库原始数据，不进行时区转换
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('获取结算报表数据失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 更新结算状态接口
app.put('/api/settlement/:orderid', async (req, res) => {
  try {
    const { orderid } = req.params;
    const { status, payment_method } = req.body;
    
    // 注意：这里只是模拟更新，实际项目中可能需要在order_accept表中添加payment_status字段
    // 目前只返回成功响应
    res.json({ success: true, message: '结算状态更新成功' });
  } catch (error) {
    console.error('更新结算状态失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 商家结算并扣减钱包（并给零工发放钱包）
app.post('/api/settlement/pay', async (req, res) => {
  try {
    const { demand_id, merchant_id, payment_method, wallet_password, order_ids } = req.body || {};
    if (!demand_id || !merchant_id || !wallet_password) {
      return res.status(400).json({ success: false, message: '缺少 demand_id / merchant_id / wallet_password' });
    }

    const demandId = Number(demand_id);
    const merchantId = Number(merchant_id);
    const payMethod = payment_method || '现金';

    // 验证钱包密码（仅商家）
    const [pwdRows] = await pool.query(
      'SELECT password, salt FROM wallet_password WHERE merchant_id = ?',
      [merchantId]
    );
    if (!pwdRows || pwdRows.length === 0) {
      return res.status(401).json({ success: false, message: '未设置钱包密码' });
    }
    const { verifyPassword } = require('./utils/passwordUtils');
    const ok = verifyPassword(String(wallet_password), pwdRows[0].password, pwdRows[0].salt);
    if (!ok) {
      return res.status(401).json({ success: false, message: '密码错误' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 构建查询条件
      let query = `
        SELECT 
          oa.worker_id,
          oa.start_work_time,
          oa.end_work_time,
          ROUND(TIMESTAMPDIFF(MINUTE, oa.start_work_time, COALESCE(oa.end_work_time, NOW())) / 60, 2) AS working_hour,
          d.hourly_wage,
          ROUND((TIMESTAMPDIFF(MINUTE, oa.start_work_time, COALESCE(oa.end_work_time, NOW())) / 60) * d.hourly_wage, 2) AS amount
        FROM order_accept oa
        JOIN demand_order d ON oa.demand_id = d.demand_id
        LEFT JOIN settlement s 
          ON s.demand_id = d.demand_id
         AND s.worker_id = oa.worker_id
         AND s.merchant_id = d.merchant_id
         AND s.status = 'paid'
        WHERE d.demand_id = ?
          AND d.merchant_id = ?
          AND oa.start_work_time IS NOT NULL
          AND s.id IS NULL
      `;
      let queryParams = [demandId, merchantId];

      // 如果提供了order_ids，添加到查询条件
      if (order_ids && Array.isArray(order_ids) && order_ids.length > 0) {
        // 过滤掉非数字和NaN值
        const validOrderIds = order_ids.filter(id => !isNaN(id) && id > 0);
        if (validOrderIds.length > 0) {
          query += ' AND oa.id IN (?)';
          queryParams.push(validOrderIds);
        }
      }

      // 找出未支付的完成订单明细（按 worker 维度）
      const [rows] = await conn.query(query, queryParams);

      if (!rows || rows.length === 0) {
        await conn.rollback();
        return res.status(200).json({ success: false, message: '暂无未支付结算' });
      }

      const unpaidPayments = rows.map(r => ({
        workerId: Number(r.worker_id),
        startTime: r.start_work_time,
        endTime: r.end_work_time || new Date(),
        workingHour: Number(r.working_hour || 0),
        hourlyWage: Number(r.hourly_wage || 0),
        amount: Number(Number(r.amount || 0).toFixed(2))
      }));

      const totalAmount = Number(
        unpaidPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0).toFixed(2)
      );
      if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: '结算金额无效' });
      }

      // 确保钱包行存在（upsert）
      await conn.query(
        `INSERT INTO user_wallet (user_type, user_id, balance, total_income, total_withdraw, frozen)
         VALUES ('merchant', ?, 0, 0, 0, 0)
         ON DUPLICATE KEY UPDATE balance = balance`,
        [merchantId]
      );
      for (const p of unpaidPayments) {
        await conn.query(
          `INSERT INTO user_wallet (user_type, user_id, balance, total_income, total_withdraw, frozen)
           VALUES ('worker', ?, 0, 0, 0, 0)
           ON DUPLICATE KEY UPDATE balance = balance`,
          [p.workerId]
        );
      }

      // 扣减商家钱包（withdraw）
      const [merchantWalletRows] = await conn.query(
        `SELECT balance, total_withdraw 
         FROM user_wallet 
         WHERE user_type = 'merchant' AND user_id = ? 
         FOR UPDATE`,
        [merchantId]
      );
      const merchantBalance = Number(merchantWalletRows[0].balance);
      if (merchantBalance < totalAmount) {
        throw new Error('余额不足');
      }

      const newMerchantBalance = Number((merchantBalance - totalAmount).toFixed(2));
      const newMerchantTotalWithdraw = Number(
        (Number(merchantWalletRows[0].total_withdraw) + totalAmount).toFixed(2)
      );

      await conn.query(
        `UPDATE user_wallet 
         SET balance = ?, total_withdraw = ?
         WHERE user_type = 'merchant' AND user_id = ?`,
        [newMerchantBalance, newMerchantTotalWithdraw, merchantId]
      );

      await conn.query(
        `INSERT INTO wallet_transaction
          (user_type, user_id, tx_type, amount, balance_after, remark)
         VALUES
          ('merchant', ?, 'withdraw', ?, ?, ?)`,
        [merchantId, -totalAmount, newMerchantBalance, `结算(任务${demandId})`]
      );

      // 给零工发放钱包（recharge + 写入 settlement paid）
      for (const p of unpaidPayments) {
        const [workerWalletRows] = await conn.query(
          `SELECT balance, total_income 
           FROM user_wallet
           WHERE user_type = 'worker' AND user_id = ?
           FOR UPDATE`,
          [p.workerId]
        );

        const workerBalance = Number(workerWalletRows[0].balance);
        const newWorkerBalance = Number((workerBalance + p.amount).toFixed(2));
        const newWorkerTotalIncome = Number(
          (Number(workerWalletRows[0].total_income) + p.amount).toFixed(2)
        );

        await conn.query(
          `UPDATE user_wallet 
           SET balance = ?, total_income = ?
           WHERE user_type = 'worker' AND user_id = ?`,
          [newWorkerBalance, newWorkerTotalIncome, p.workerId]
        );

        await conn.query(
          `INSERT INTO wallet_transaction
            (user_type, user_id, tx_type, amount, balance_after, remark)
           VALUES
            ('worker', ?, 'recharge', ?, ?, ?)`,
          [p.workerId, p.amount, newWorkerBalance, `结算收入(任务${demandId})`]
        );

        await conn.query(
          `INSERT INTO settlement
            (demand_id, worker_id, merchant_id, working_hour, hourly_wage, amount, start_time, end_time, status, payment_method)
           VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?)`,
          [
            demandId,
            p.workerId,
            merchantId,
            p.workingHour,
            p.hourlyWage,
            p.amount,
            p.startTime,
            p.endTime,
            payMethod
          ]
        );
      }

      await conn.commit();

      return res.json({
        success: true,
        message: '结算成功',
        data: {
          totalAmount,
          merchantBalance: newMerchantBalance,
          paidCount: unpaidPayments.length
        }
      });
    } catch (err) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: err.message || '结算失败' });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('settlement/pay 错误:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 商家查看某任务已完成的接单/下工人员（用于互评）
app.get('/api/merchant/:merchant_id/job/:job_id/completed-applications', async (req, res) => {
  try {
    const { merchant_id, job_id } = req.params;
    const [rows] = await pool.query(
      `
      SELECT 
        a.application_id,
        a.job_id,
        a.worker_id,
        a.worker_rating,
        a.worker_comment,
        a.merchant_rating,
        a.merchant_comment,
        a.status,
        w.name as worker_name,
        w.phone as worker_phone
      FROM applications a
      JOIN demand_order d ON a.job_id = d.demand_id
      LEFT JOIN gig_worker w ON a.worker_id = w.id
      WHERE d.merchant_id = ? AND a.job_id = ? AND a.status = 'completed'
      ORDER BY a.complete_time DESC
      `,
      [Number(merchant_id), Number(job_id)]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('获取可评价零工列表失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 根据 worker_id + job_id 获取 applications（用于零工跳转评价）
app.get('/api/applications/by-worker-job', async (req, res) => {
  try {
    const { worker_id, job_id } = req.query;
    if (!worker_id || !job_id) return res.status(400).json({ success: false, message: '缺少 worker_id 或 job_id' });
    const row = await applicationsModel.findByWorkerAndJob(Number(worker_id), Number(job_id));
    if (!row) return res.status(404).json({ success: false, message: '未找到申请记录' });
    res.json({ success: true, data: row });
  } catch (error) {
    console.error('查询申请记录失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 零工修改密码接口
app.put('/api/worker/change-password/:workerId', async (req, res) => {
  try {
    const { workerId } = req.params;
    const { oldPassword, newPassword } = req.body;
    
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: '原密码和新密码不能为空' });
    }
    
    const result = await gigWorkerModel.changePassword(workerId, oldPassword, newPassword);
    res.json({ success: true, message: '密码修改成功' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// 商家修改密码接口
app.put('/api/merchant/change-password/:merchantId', async (req, res) => {
  try {
    const { merchantId } = req.params;
    const { oldPassword, newPassword } = req.body;
    
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: '原密码和新密码不能为空' });
    }
    
    const result = await merchantModel.changePassword(merchantId, oldPassword, newPassword);
    res.json({ success: true, message: '密码修改成功' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// 零工修改手机号接口
app.put('/api/worker/change-phone/:workerId', async (req, res) => {
  try {
    const { workerId } = req.params;
    const { oldPhone, newPhone } = req.body;
    
    if (!oldPhone || !newPhone) {
      return res.status(400).json({ success: false, message: '原手机号和新手机号不能为空' });
    }
    
    const result = await gigWorkerModel.changePhone(workerId, oldPhone, newPhone);
    res.json({ success: true, message: '手机号修改成功' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// 商家修改手机号接口
app.put('/api/merchant/change-phone/:merchantId', async (req, res) => {
  try {
    const { merchantId } = req.params;
    const { oldPhone, newPhone } = req.body;
    
    if (!oldPhone || !newPhone) {
      return res.status(400).json({ success: false, message: '原手机号和新手机号不能为空' });
    }
    
    const result = await merchantModel.changePhone(merchantId, oldPhone, newPhone);
    res.json({ success: true, message: '手机号修改成功' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// 钱包密码相关接口

// 检查用户是否设置了钱包密码
app.get('/api/wallet/password/status', async (req, res) => {
  try {
    const { user_type, user_id } = req.query;
    
    if (!user_type || !user_id) {
      return res.status(400).json({ success: false, message: '缺少用户类型或用户ID' });
    }
    
    let query, params;
    if (user_type === 'merchant') {
      query = 'SELECT id FROM wallet_password WHERE merchant_id = ?';
      params = [user_id];
    } else if (user_type === 'worker') {
      query = 'SELECT id FROM wallet_password WHERE worker_id = ?';
      params = [user_id];
    } else {
      return res.status(400).json({ success: false, message: '无效的用户类型' });
    }
    
    const [rows] = await pool.query(query, params);
    
    res.json({ 
      success: true, 
      data: { 
        hasPassword: rows.length > 0 
      } 
    });
  } catch (error) {
    console.error('检查钱包密码状态失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 设置钱包密码
app.post('/api/wallet/password/set', async (req, res) => {
  try {
    const { user_type, user_id, password } = req.body;
    
    if (!user_type || !user_id || !password) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }
    
    if (password.length !== 6 || !/^\d+$/.test(password)) {
      return res.status(400).json({ success: false, message: '密码必须是6位数字' });
    }
    
    const { generateSalt, hashPassword } = require('./utils/passwordUtils');
    const salt = generateSalt();
    const hashedPassword = hashPassword(password, salt);
    
    // 检查是否已存在密码
    let checkQuery, checkParams;
    if (user_type === 'merchant') {
      checkQuery = 'SELECT id FROM wallet_password WHERE merchant_id = ?';
      checkParams = [user_id];
    } else if (user_type === 'worker') {
      checkQuery = 'SELECT id FROM wallet_password WHERE worker_id = ?';
      checkParams = [user_id];
    } else {
      return res.status(400).json({ success: false, message: '无效的用户类型' });
    }
    
    const [existing] = await pool.query(checkQuery, checkParams);
    
    if (existing.length > 0) {
      // 更新密码
      let updateQuery, updateParams;
      if (user_type === 'merchant') {
        updateQuery = 'UPDATE wallet_password SET password = ?, salt = ? WHERE merchant_id = ?';
        updateParams = [hashedPassword, salt, user_id];
      } else {
        updateQuery = 'UPDATE wallet_password SET password = ?, salt = ? WHERE worker_id = ?';
        updateParams = [hashedPassword, salt, user_id];
      }
      await pool.query(updateQuery, updateParams);
    } else {
      // 插入新密码
      let insertQuery, insertParams;
      if (user_type === 'merchant') {
        insertQuery = 'INSERT INTO wallet_password (merchant_id, password, salt) VALUES (?, ?, ?)';
        insertParams = [user_id, hashedPassword, salt];
      } else {
        insertQuery = 'INSERT INTO wallet_password (worker_id, password, salt) VALUES (?, ?, ?)';
        insertParams = [user_id, hashedPassword, salt];
      }
      await pool.query(insertQuery, insertParams);
    }
    
    res.json({ success: true, message: '密码设置成功' });
  } catch (error) {
    console.error('设置钱包密码失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 验证钱包密码
app.post('/api/wallet/password/verify', async (req, res) => {
  try {
    const { user_type, user_id, password } = req.body;
    
    if (!user_type || !user_id || !password) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }
    
    let query, params;
    if (user_type === 'merchant') {
      query = 'SELECT password, salt FROM wallet_password WHERE merchant_id = ?';
      params = [user_id];
    } else if (user_type === 'worker') {
      query = 'SELECT password, salt FROM wallet_password WHERE worker_id = ?';
      params = [user_id];
    } else {
      return res.status(400).json({ success: false, message: '无效的用户类型' });
    }
    
    const [rows] = await pool.query(query, params);
    
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: '未设置钱包密码' });
    }
    
    const { password: hashedPassword, salt } = rows[0];
    const { verifyPassword } = require('./utils/passwordUtils');
    const isCorrect = verifyPassword(password, hashedPassword, salt);
    
    if (!isCorrect) {
      return res.status(401).json({ success: false, message: '密码错误' });
    }
    
    res.json({ success: true, message: '密码验证通过' });
  } catch (error) {
    console.error('验证钱包密码失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 钱包余额与流水（持久化到 user_wallet / wallet_transaction）
app.get('/api/wallet/summary', async (req, res) => {
  try {
    const { user_type, user_id } = req.query;
    if (!user_type || !user_id) {
      return res.status(400).json({ success: false, message: '缺少参数' });
    }
    const s = await walletModel.getSummary(user_type, user_id);
    res.json({ success: true, data: s });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
});

app.get('/api/wallet/transactions', async (req, res) => {
  try {
    const { user_type, user_id, limit } = req.query;
    if (!user_type || !user_id) {
      return res.status(400).json({ success: false, message: '缺少参数' });
    }
    const rows = await walletModel.listTransactions(user_type, user_id, limit);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post('/api/wallet/recharge', async (req, res) => {
  try {
    const { user_type, user_id, amount } = req.body || {};
    if (!user_type || !user_id || amount == null) {
      return res.status(400).json({ success: false, message: '缺少参数' });
    }
    const out = await walletModel.recharge(user_type, user_id, amount, '充值');
    res.json({ success: true, data: out });
  } catch (e) {
    console.error(e);
    res.status(400).json({ success: false, message: e.message });
  }
});

app.post('/api/wallet/withdraw', async (req, res) => {
  try {
    const { user_type, user_id, amount } = req.body || {};
    if (!user_type || !user_id || amount == null) {
      return res.status(400).json({ success: false, message: '缺少参数' });
    }
    const out = await walletModel.withdraw(user_type, user_id, amount, '提现');
    res.json({ success: true, data: out });
  } catch (e) {
    console.error(e);
    res.status(400).json({ success: false, message: e.message });
  }
});

// 零工个人中心数据接口
app.get('/api/worker/profile/:workerId', async (req, res) => {
  try {
    const { workerId } = req.params;
    
    // 获取基本信息
    const workerInfo = await gigWorkerModel.findById(workerId);
    if (!workerInfo) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    // 移除密码和盐值
    const { password, salt, ...safeWorkerInfo } = workerInfo;
    
    // 处理技能数据，确保返回字符串格式
    if (safeWorkerInfo.skills) {
      if (Array.isArray(safeWorkerInfo.skills)) {
        // 如果是数组，转换为字符串
        safeWorkerInfo.skills = safeWorkerInfo.skills.join('，');
      } else if (typeof safeWorkerInfo.skills === 'string' && safeWorkerInfo.skills.startsWith('[')) {
        // 如果是 JSON 字符串，尝试解析并转换为字符串
        try {
          const skillsArray = JSON.parse(safeWorkerInfo.skills);
          if (Array.isArray(skillsArray)) {
            safeWorkerInfo.skills = skillsArray.join('，');
          }
        } catch (error) {
          // 如果解析失败，保持原样
        }
      }
    }
    
    // 计算统计数据
    const stats = await orderAcceptModel.getWorkerStats(workerId);
    
    const isVerified = await identityVerificationModel.isApproved('worker', Number(workerId));

    const profileData = {
      ...safeWorkerInfo,
      totalHours: stats.totalHours || 0,
      orderCount: stats.orderCount || 0,
      rating: stats.rating || 0,
      verified: isVerified
    };
    
    res.json({ success: true, data: profileData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});




// 商家个人中心数据接口
app.get('/api/merchant/profile/:merchantId', async (req, res) => {
  try {
    const { merchantId } = req.params;
    
    // 获取基本信息
    const merchantInfo = await merchantModel.findById(merchantId);
    if (!merchantInfo) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    // 移除密码和盐值
    const { password, salt, ...safeMerchantInfo } = merchantInfo;
    
    // 计算统计数据
    const stats = await demandOrderModel.getMerchantStats(merchantId);
    
    // 更新商家统计数据到数据库
    await merchantModel.updateById(merchantId, {
      rating: stats.rating || 0,
      total_posts: stats.orderCount || 0
    });
    
    const isVerified = await identityVerificationModel.isApproved('merchant', Number(merchantId));

    const profileData = {
      ...safeMerchantInfo,
      totalHours: stats.totalHours || 0,
      orderCount: stats.orderCount || 0,
      rating: stats.rating || 0,
      verified: isVerified
    };
    
    res.json({ success: true, data: profileData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 更新商家信息接口
app.put('/api/merchant/update/:merchantId', async (req, res) => {
  try {
    const { merchantId } = req.params;
    const { description } = req.body;
    
    console.log('更新商家描述请求:', req.params, req.body);
    
    // 检查商家是否存在
    const merchantInfo = await merchantModel.findById(merchantId);
    console.log('商家信息:', merchantInfo);
    
    if (!merchantInfo) {
      console.log('商家不存在:', merchantId);
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    // 更新商家描述
    const result = await merchantModel.updateDescription(merchantId, description);
    console.log('更新结果:', result);
    
    res.json({ success: true, message: '更新成功' });
  } catch (error) {
    console.error('更新商家描述错误:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 测试更新商家描述接口（GET请求）
app.get('/api/merchant/test-update/:merchantId', async (req, res) => {
  try {
    const { merchantId } = req.params;
    const { description } = req.query;
    
    console.log('测试更新商家描述请求:', req.params, req.query);
    
    // 检查商家是否存在
    const merchantInfo = await merchantModel.findById(merchantId);
    console.log('商家信息:', merchantInfo);
    
    if (!merchantInfo) {
      console.log('商家不存在:', merchantId);
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    // 更新商家描述
    const result = await merchantModel.updateDescription(merchantId, description);
    console.log('更新结果:', result);
    
    res.json({ success: true, message: '更新成功' });
  } catch (error) {
    console.error('更新商家描述错误:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 数据挖掘接口 - 批量获取所有用户数据
app.get('/api/data-mining/users', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    // 构建查询条件
    let merchantQuery = 'SELECT * FROM merchant';
    let workerQuery = 'SELECT * FROM gig_worker';
    let params = [];
    
    // 如果提供了时间范围，添加创建时间过滤
    if (start_date && end_date) {
      merchantQuery += ' WHERE created_at BETWEEN ? AND ?';
      workerQuery += ' WHERE created_at BETWEEN ? AND ?';
      params = [start_date, end_date, start_date, end_date];
    }
    
    // 执行查询
    const [merchants] = await pool.query(merchantQuery, start_date && end_date ? [start_date, end_date] : []);
    const [workers] = await pool.query(workerQuery, start_date && end_date ? [start_date, end_date] : []);
    
    // 移除密码和盐值字段
    merchants.forEach(merchant => {
      delete merchant.password;
      delete merchant.salt;
    });
    workers.forEach(worker => {
      delete worker.password;
      delete worker.salt;
    });
    
    res.json({
      success: true,
      data: {
        merchants,
        workers
      }
    });
  } catch (error) {
    console.error('获取用户数据失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 数据挖掘接口 - 批量获取所有订单数据
app.get('/api/data-mining/orders', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    // 构建查询条件
    let query = `
      SELECT 
        d.*, 
        m.shop_name as merchant_name
      FROM demand_order d
      LEFT JOIN merchant m ON d.merchant_id = m.id
    `;
    let params = [];
    
    // 如果提供了时间范围，添加创建时间过滤
    if (start_date && end_date) {
      query += ' WHERE d.created_at BETWEEN ? AND ?';
      params = [start_date, end_date];
    }
    
    query += ' ORDER BY d.created_at DESC';
    
    // 执行查询
    const [orders] = await pool.query(query, params);
    
    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('获取订单数据失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 数据挖掘接口 - 批量获取所有接单记录
app.get('/api/data-mining/accepts', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    // 构建查询条件
    let query = `
      SELECT 
        oa.*, 
        d.demand_id, 
        d.merchant_id, 
        d.hourly_wage, 
        d.work_time, 
        w.name as worker_name, 
        w.phone as worker_phone, 
        m.shop_name as merchant_name
      FROM order_accept oa
      LEFT JOIN demand_order d ON oa.demand_id = d.demand_id
      LEFT JOIN gig_worker w ON oa.worker_id = w.id
      LEFT JOIN merchant m ON d.merchant_id = m.id
    `;
    let params = [];
    
    // 如果提供了时间范围，添加创建时间过滤
    if (start_date && end_date) {
      query += ' WHERE oa.created_at BETWEEN ? AND ?';
      params = [start_date, end_date];
    }
    
    query += ' ORDER BY oa.created_at DESC';
    
    // 执行查询
    const [accepts] = await pool.query(query, params);
    
    res.json({
      success: true,
      data: accepts
    });
  } catch (error) {
    console.error('获取接单记录失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 前端大屏接口 - 实时统计数据
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    // 获取总用户数
    const [merchantCount] = await pool.query('SELECT COUNT(*) as count FROM merchant');
    const [workerCount] = await pool.query('SELECT COUNT(*) as count FROM gig_worker');
    
    // 获取总订单数和完成率
    const [orderCount] = await pool.query('SELECT COUNT(*) as count FROM demand_order');
    const [completedOrders] = await pool.query(`
      SELECT COUNT(*) as count FROM demand_order d
      WHERE EXISTS(
        SELECT 1 FROM order_accept oa 
        WHERE oa.demand_id = d.demand_id 
        AND oa.end_work_time IS NOT NULL
      )
    `);
    
    // 获取总工时和总金额
    const [totalHours] = await pool.query(`
      SELECT ROUND(SUM(TIMESTAMPDIFF(MINUTE, start_work_time, end_work_time) / 60), 2) as total_hours 
      FROM order_accept 
      WHERE start_work_time IS NOT NULL AND end_work_time IS NOT NULL
    `);
    
    const [totalAmount] = await pool.query(`
      SELECT ROUND(SUM((TIMESTAMPDIFF(MINUTE, oa.start_work_time, oa.end_work_time) / 60) * d.hourly_wage), 2) as total_amount 
      FROM order_accept oa
      JOIN demand_order d ON oa.demand_id = d.demand_id
      WHERE oa.start_work_time IS NOT NULL AND oa.end_work_time IS NOT NULL
    `);
    
    // 计算完成率
    const completionRate = orderCount[0].count > 0 
      ? (completedOrders[0].count / orderCount[0].count * 100).toFixed(2) 
      : '0.00';
    
    res.json({
      success: true,
      data: {
        totalMerchants: merchantCount[0].count,
        totalWorkers: workerCount[0].count,
        totalOrders: orderCount[0].count,
        completedOrders: completedOrders[0].count,
        completionRate: parseFloat(completionRate),
        totalHours: totalHours[0].total_hours || 0,
        totalAmount: totalAmount[0].total_amount || 0
      }
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 前端大屏接口 - 地区分布数据
app.get('/api/dashboard/location-distribution', async (req, res) => {
  try {
    const [locations] = await pool.query(`
      SELECT 
        location, 
        COUNT(*) as order_count,
        COUNT(DISTINCT merchant_id) as merchant_count
      FROM demand_order
      WHERE location IS NOT NULL AND location != ''
      GROUP BY location
      ORDER BY order_count DESC
      LIMIT 10
    `);
    
    res.json({
      success: true,
      data: locations
    });
  } catch (error) {
    console.error('获取地区分布数据失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 前端大屏接口 - 时间趋势数据
app.get('/api/dashboard/time-trend', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    // 获取最近N天的订单趋势
    const [trend] = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as order_count,
        COUNT(DISTINCT merchant_id) as merchant_count,
        COUNT(DISTINCT (SELECT worker_id FROM order_accept oa WHERE oa.demand_id = d.demand_id)) as worker_count
      FROM demand_order d
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [days]);
    
    res.json({
      success: true,
      data: trend
    });
  } catch (error) {
    console.error('获取时间趋势数据失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 前端大屏接口 - 热门任务类型统计
app.get('/api/dashboard/popular-tasks', async (req, res) => {
  try {
    const [tasks] = await pool.query(`
      SELECT 
        job_type, 
        COUNT(*) as order_count,
        AVG(hourly_wage) as avg_wage,
        COUNT(DISTINCT worker_id) as worker_count
      FROM demand_order d
      LEFT JOIN order_accept oa ON d.demand_id = oa.demand_id
      WHERE job_type IS NOT NULL AND job_type != ''
      GROUP BY job_type
      ORDER BY order_count DESC
      LIMIT 10
    `);
    
    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('获取热门任务类型失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});



// 管理员相关接口

// 管理员登录接口
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ success: false, message: '账号和密码不能为空' });
    }
    
    const [rows] = await pool.query(
      'SELECT id, username, password, status FROM platform_admin WHERE username = ?',
      [username]
    );
    
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: '账号或密码错误' });
    }
    
    const admin = rows[0];
    if (admin.status !== '已启用') {
      return res.status(401).json({ success: false, message: '账号已被禁用' });
    }
    
    // 直接比较密码（暂时使用明文密码）
    if (admin.password !== password) {
      return res.status(401).json({ success: false, message: '账号或密码错误' });
    }
    
    res.json({ 
      success: true, 
      data: {
        id: admin.id,
        username: admin.username,
        status: admin.status
      }
    });
  } catch (error) {
    console.error('管理员登录失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 管理员获取实名认证列表接口
app.get('/api/admin/identity/list', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM identity_verification ORDER BY submitted_at DESC'
    );
    // 管理员可以看到完整的身份证号
    const safe = (rows || []).map(({ id_card_salt, id_card_enc, id_card_dup_key, ...r }) => ({
      ...r
    }));
    res.json({ success: true, data: safe });
  } catch (error) {
    console.error('获取实名认证列表失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 管理员审核实名认证接口
app.post('/api/admin/identity/review', async (req, res) => {
  try {
    const { id, status, review_comment } = req.body;
    
    if (!id || !status) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: '状态参数错误' });
    }
    
    await pool.query(
      'UPDATE identity_verification SET status = ?, review_comment = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, review_comment || null, id]
    );
    
    res.json({ success: true, message: '审核成功' });
  } catch (error) {
    console.error('审核实名认证失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 初始化平台管理员表
async function initAdminTable() {
  try {
    // 创建平台管理员表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS platform_admin (
        id INT NOT NULL AUTO_INCREMENT,
        adminId VARCHAR(100) NOT NULL COMMENT '管理员ID',
        username VARCHAR(100) NOT NULL COMMENT '账号',
        password VARCHAR(255) NOT NULL COMMENT '密码',
        email VARCHAR(255) DEFAULT NULL COMMENT '邮箱',
        status VARCHAR(20) DEFAULT '已启用' COMMENT '账号状态',
        PRIMARY KEY (id),
        UNIQUE KEY username (username)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='平台管理员表'
    `);
    
    // 插入默认管理员账号
    await pool.query(`
      INSERT IGNORE INTO platform_admin (adminId, username, password, status) 
      VALUES ('admin001', 'admin', 'admin123', '已启用')
    `);
    
    console.log('平台管理员表初始化完成');
  } catch (error) {
    console.error('初始化平台管理员表失败:', error);
  }
}

app.listen(PORT, async () => {
  console.log(`🔗 访问地址: http://localhost:${PORT}`);
  // 初始化平台管理员表
  await initAdminTable();
});