const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { generateToken, authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  const user = db.users.findByUsername(username);
  
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  const token = generateToken(user);
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      role: user.role
    }
  });
});

router.post('/register', (req, res) => {
  const { username, password, nickname } = req.body;

  if (!username || !password || !nickname) {
    return res.status(400).json({ error: '请填写完整信息' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: '密码长度不能少于6位' });
  }

  const existingUser = db.users.findByUsername(username);
  if (existingUser) {
    return res.status(400).json({ error: '用户名已存在' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  
  try {
    const user = db.users.create({
      username,
      password: hashedPassword,
      nickname
    });

    const token = generateToken(user);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        role: user.role
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '注册失败' });
  }
});

router.get('/profile', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

router.get('/all', authMiddleware, (req, res) => {
  const users = db.users.getAll().map(u => ({
    id: u.id,
    username: u.username,
    nickname: u.nickname,
    role: u.role
  }));
  res.json({ users });
});

module.exports = router;
