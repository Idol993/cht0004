const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const db = require('./db');
const { startReminderService, checkOverdueBills } = require('./reminder');

const authRoutes = require('./routes/auth');
const billRoutes = require('./routes/bills');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3001;

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '账单分摊系统服务运行正常' });
});

app.post('/api/debug/check-overdue', (req, res) => {
  checkOverdueBills();
  res.json({ message: '逾期检查已执行' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║     合租室友账单分摊与结算系统 - 后端服务                ║
╠══════════════════════════════════════════════════════════╣
║  服务地址: http://localhost:${PORT}                        ║
║  API 前缀: /api                                          ║
╠══════════════════════════════════════════════════════════╣
║  默认账号:                                               ║
║    管理员: admin / admin123                              ║
║    普通用户: zhangsan/lisi/wangwu / 123456               ║
╚══════════════════════════════════════════════════════════╝
  `);
  
  startReminderService();
});

module.exports = app;
