const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/list', authMiddleware, (req, res) => {
  const { read, page = 1, pageSize = 20 } = req.query;
  
  let readParam = undefined;
  if (read !== undefined && read !== '') {
    readParam = read === '1' ? 1 : 0;
  }

  const result = db.notifications.getByUser(req.user.id, {
    read: readParam,
    page,
    pageSize
  });

  res.json(result);
});

router.get('/unread-count', authMiddleware, (req, res) => {
  const count = db.notifications.getUnreadCount(req.user.id);
  res.json({ unread_count: count });
});

router.post('/read/:id', authMiddleware, (req, res) => {
  const notificationId = Number(req.params.id);

  const notification = db.notifications.getByUser(req.user.id, { page: 1, pageSize: 100 })
    .notifications.find(n => n.id === notificationId);
  
  if (!notification) {
    return res.status(403).json({ error: '无权操作此通知' });
  }

  db.notifications.markRead(notificationId);
  res.json({ message: '标记已读成功' });
});

router.post('/read-all', authMiddleware, (req, res) => {
  db.notifications.markAllRead(req.user.id);
  res.json({ message: '全部标记已读成功' });
});

module.exports = router;
