const express = require('express');
const dayjs = require('dayjs');
const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

function checkBillAccess(billId, userId, userRole) {
  if (userRole === 'admin') return true;
  
  const participant = db.billParticipants.findByBillAndUser(billId, userId);
  const bill = db.bills.findById(billId);
  
  return !!(participant || (bill && bill.creator_id === userId));
}

router.post('/', authMiddleware, (req, res) => {
  const { title, total_amount, bill_date, due_date, participant_ids, description } = req.body;

  if (!title || !total_amount || !bill_date || !due_date || !participant_ids || !participant_ids.length) {
    return res.status(400).json({ error: '请填写完整的账单信息' });
  }

  if (total_amount <= 0) {
    return res.status(400).json({ error: '账单金额必须大于0' });
  }

  if (!Array.isArray(participant_ids) || participant_ids.length < 2) {
    return res.status(400).json({ error: '至少需要2个参与人' });
  }

  try {
    const allParticipants = [...new Set([...participant_ids, req.user.id])];
    const { bill } = db.bills.create({
      title,
      total_amount: Number(total_amount),
      bill_date,
      due_date,
      creator_id: req.user.id,
      description: description || ''
    }, allParticipants);

    allParticipants.forEach(userId => {
      if (userId !== req.user.id) {
        db.notifications.create({
          user_id: userId,
          bill_id: bill.id,
          type: 'bill_created',
          title: `新账单：${title}`,
          content: `${req.user.nickname} 创建了一笔账单「${title}」，金额 ¥${total_amount}，请及时查看。`
        });
      }
    });

    const billDetail = db.bills.getDetail(bill.id);
    res.status(201).json({ bill: billDetail });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '创建账单失败' });
  }
});

router.get('/list', authMiddleware, (req, res) => {
  const { status, page = 1, pageSize = 10 } = req.query;

  let result;

  if (req.user.role === 'admin') {
    result = db.bills.list({ status, page, pageSize });
  } else {
    result = db.bills.listByUser(req.user.id, { status, page, pageSize });
  }

  res.json(result);
});

router.get('/my/pending', authMiddleware, (req, res) => {
  const bills = db.bills.getPendingByUser(req.user.id);
  res.json({ bills });
});

router.get('/my/history', authMiddleware, (req, res) => {
  const { month, page = 1, pageSize = 10 } = req.query;
  
  const result = db.bills.getHistoryByUser(req.user.id, { month, page, pageSize });
  res.json(result);
});

router.get('/my/export/:month', authMiddleware, (req, res) => {
  const month = req.params.month;

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: '月份格式错误，应为 YYYY-MM' });
  }

  const result = db.bills.getUserMonthlyExport(req.user.id, month);
  if (!result) {
    return res.status(404).json({ error: '用户不存在' });
  }

  const { user, records } = result;

  const exportDir = path.join(__dirname, '..', 'exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const filePath = path.join(exportDir, `my-statement-${user.username}-${month}.csv`);

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

  const formattedRecords = records.map(r => ({
    ...r,
    bill_status: getStatusText(r.bill_status),
    payment_status: getStatusText(r.payment_status)
  }));

  csvWriter.writeRecords(formattedRecords).then(() => {
    res.download(filePath, `个人对账单-${user.nickname}-${month}.csv`, (err) => {
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

router.get('/:id', authMiddleware, (req, res) => {
  const billId = Number(req.params.id);

  if (!checkBillAccess(billId, req.user.id, req.user.role)) {
    return res.status(403).json({ error: '无权查看此账单' });
  }

  const bill = db.bills.getDetail(billId);
  if (!bill) {
    return res.status(404).json({ error: '账单不存在' });
  }

  res.json({ bill });
});

router.put('/:id/shares', authMiddleware, (req, res) => {
  const billId = Number(req.params.id);
  const { shares } = req.body;

  const bill = db.bills.findById(billId);
  if (!bill) {
    return res.status(404).json({ error: '账单不存在' });
  }

  if (bill.creator_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: '只有账单创建人可以调整份额' });
  }

  if (bill.status !== 'pending') {
    return res.status(400).json({ error: '账单已结算，无法调整份额' });
  }

  if (!shares || !Array.isArray(shares)) {
    return res.status(400).json({ error: '参数错误' });
  }

  const totalShares = shares.reduce((sum, s) => sum + Number(s.amount), 0);
  if (Math.abs(totalShares - bill.total_amount) > 0.01) {
    return res.status(400).json({ 
      error: `份额总和 (¥${totalShares.toFixed(2)}) 必须等于账单总额 (¥${bill.total_amount})` 
    });
  }

  try {
    shares.forEach(share => {
      db.billParticipants.updateShare(share.participant_id, share.amount);
    });

    const updatedBill = db.bills.getDetail(billId);
    res.json({ bill: updatedBill });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '调整份额失败' });
  }
});

router.post('/:id/pay', authMiddleware, (req, res) => {
  const billId = Number(req.params.id);
  const { payment_method, remark } = req.body;

  const participant = db.billParticipants.findByBillAndUser(billId, req.user.id);

  if (!participant) {
    return res.status(403).json({ error: '您不是该账单的参与人' });
  }

  if (participant.status === 'paid') {
    return res.status(400).json({ error: '您已支付该账单' });
  }

  const bill = db.bills.findById(billId);
  if (bill.status === 'settled' || bill.status === 'closed') {
    return res.status(400).json({ error: '账单已结算，无法支付' });
  }

  try {
    db.billParticipants.markPaid(participant.id);

    db.paymentRecords.create({
      bill_id: billId,
      participant_id: participant.id,
      amount: participant.share_amount,
      payment_method: payment_method || '线下支付',
      remark: remark || ''
    });

    db.notifications.create({
      user_id: bill.creator_id,
      bill_id: billId,
      type: 'payment_made',
      title: `付款通知：${bill.title}`,
      content: `${req.user.nickname} 已支付账单「${bill.title}」，金额 ¥${participant.share_amount.toFixed(2)}。`
    });

    const unpaidCount = db.billParticipants.getUnpaidCount(billId);

    if (unpaidCount === 0) {
      db.bills.updateStatus(billId, 'all_paid');
      db.settlements.create(billId);

      const allParticipants = db.billParticipants.findByBill(billId);
      allParticipants.forEach(p => {
        db.notifications.create({
          user_id: p.user_id,
          bill_id: billId,
          type: 'bill_settled',
          title: `账单已结清：${bill.title}`,
          content: `账单「${bill.title}」所有人均已付款，已生成结算单。`
        });
      });
    }

    const updatedBill = db.bills.getDetail(billId);
    res.json({ bill: updatedBill, message: '支付确认成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '支付确认失败' });
  }
});

router.post('/:id/confirm-settlement', authMiddleware, (req, res) => {
  const billId = Number(req.params.id);

  const bill = db.bills.findById(billId);
  if (!bill) {
    return res.status(404).json({ error: '账单不存在' });
  }

  if (bill.creator_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: '只有账单创建人可以确认结算' });
  }

  if (bill.status !== 'all_paid') {
    return res.status(400).json({ error: '账单尚未全部支付，无法确认结算' });
  }

  try {
    db.bills.updateStatus(billId, 'closed');
    db.settlements.confirm(billId, req.user.id);

    const allParticipants = db.billParticipants.findByBill(billId);
    allParticipants.forEach(p => {
      if (p.user_id !== req.user.id) {
        db.notifications.create({
          user_id: p.user_id,
          bill_id: billId,
          type: 'bill_closed',
          title: `账单已关闭：${bill.title}`,
          content: `发起人已确认收款，账单「${bill.title}」已关闭。`
        });
      }
    });

    const updatedBill = db.bills.getDetail(billId);
    res.json({ bill: updatedBill, message: '结算确认成功，账单已关闭' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '确认结算失败' });
  }
});

router.delete('/:id', authMiddleware, (req, res) => {
  const billId = Number(req.params.id);

  const bill = db.bills.findById(billId);
  if (!bill) {
    return res.status(404).json({ error: '账单不存在' });
  }

  if (bill.creator_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: '只有账单创建人可以删除' });
  }

  if (bill.status !== 'pending') {
    return res.status(400).json({ error: '账单已进入结算流程，无法删除' });
  }

  try {
    db.bills.delete(billId);
    res.json({ message: '账单已删除' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '删除失败' });
  }
});

module.exports = router;
