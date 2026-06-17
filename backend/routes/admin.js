const express = require('express');
const dayjs = require('dayjs');
const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

router.get('/stats', (req, res) => {
  const result = db.admin.getStats();
  res.json(result);
});

router.get('/all-bills', (req, res) => {
  const { status, page = 1, pageSize = 10 } = req.query;
  const result = db.admin.getAllBills({ status, page, pageSize });
  res.json(result);
});

router.get('/users', (req, res) => {
  const users = db.admin.getUsersWithStats();
  res.json({ users });
});

router.get('/export/monthly/:month', (req, res) => {
  const month = req.params.month;
  
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: '月份格式错误，应为 YYYY-MM' });
  }

  const { bills, participants } = db.admin.getMonthlyBills(month);

  const exportDir = path.join(__dirname, '..', 'exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const filePath = path.join(exportDir, `monthly-statement-${month}.csv`);

  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: [
      { id: 'bill_id', title: '账单ID' },
      { id: 'title', title: '账单标题' },
      { id: 'bill_date', title: '账单日期' },
      { id: 'due_date', title: '截止日期' },
      { id: 'creator_name', title: '创建人' },
      { id: 'total_amount', title: '总金额' },
      { id: 'status', title: '账单状态' },
      { id: 'participant', title: '参与人' },
      { id: 'share_amount', title: '分摊金额' },
      { id: 'paid_amount', title: '已付金额' },
      { id: 'payment_status', title: '付款状态' },
      { id: 'paid_at', title: '付款时间' }
    ]
  });

  const records = [];
  bills.forEach(bill => {
    const billParticipants = participants.filter(p => p.bill_id === bill.id);
    billParticipants.forEach(p => {
      records.push({
        bill_id: bill.id,
        title: bill.title,
        bill_date: bill.bill_date,
        due_date: bill.due_date,
        creator_name: bill.creator_name,
        total_amount: bill.total_amount,
        status: getStatusText(bill.status),
        participant: p.nickname,
        share_amount: p.share_amount,
        paid_amount: p.paid_amount || 0,
        payment_status: getStatusText(p.status),
        paid_at: p.paid_at || ''
      });
    });
  });

  csvWriter.writeRecords(records).then(() => {
    res.download(filePath, `月度对账单-${month}.csv`, (err) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: '导出失败' });
      }
    });
  }).catch(err => {
    console.error(err);
    res.status(500).json({ error: '导出失败' });
  });
});

router.get('/user-export/:userId', (req, res) => {
  const userId = Number(req.params.userId);

  const result = db.admin.getUserBills(userId);
  if (!result) {
    return res.status(404).json({ error: '用户不存在' });
  }

  const { user, records } = result;

  const exportDir = path.join(__dirname, '..', 'exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const filePath = path.join(exportDir, `user-statement-${user.username}-${dayjs().format('YYYYMMDD')}.csv`);

  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: [
      { id: 'bill_id', title: '账单ID' },
      { id: 'title', title: '账单标题' },
      { id: 'bill_date', title: '账单日期' },
      { id: 'due_date', title: '截止日期' },
      { id: 'creator_name', title: '创建人' },
      { id: 'bill_status', title: '账单状态' },
      { id: 'share_amount', title: '应付金额' },
      { id: 'paid_amount', title: '已付金额' },
      { id: 'payment_status', title: '我的状态' },
      { id: 'paid_at', title: '付款时间' }
    ]
  });

  const formattedRecords = records.map(r => ({
    ...r,
    bill_status: getStatusText(r.bill_status),
    payment_status: getStatusText(r.payment_status)
  }));

  csvWriter.writeRecords(formattedRecords).then(() => {
    res.download(filePath, `个人对账单-${user.nickname}.csv`, (err) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: '导出失败' });
      }
    });
  }).catch(err => {
    console.error(err);
    res.status(500).json({ error: '导出失败' });
  });
});

function getStatusText(status) {
  const statusMap = {
    'pending': '待支付',
    'paid': '已支付',
    'all_paid': '全部已付',
    'settled': '已结算',
    'closed': '已关闭'
  };
  return statusMap[status] || status;
}

module.exports = router;
