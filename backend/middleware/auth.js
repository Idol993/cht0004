const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = 'billing_system_secret_key_2024';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.users.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
    }

    req.user = {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      role: user.role
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: '无效的认证令牌' });
  }
}

function adminMiddleware(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '权限不足，需要管理员权限' });
  }
  next();
}

module.exports = {
  generateToken,
  authMiddleware,
  adminMiddleware,
  JWT_SECRET
};
