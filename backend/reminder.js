const dayjs = require('dayjs');
const db = require('./db');

function checkOverdueBills() {
  console.log('开始检查逾期账单...', new Date().toLocaleString());

  const overdueBills = db.billParticipants.getOverdueParticipants();

  overdueBills.forEach(bp => {
    const daysOverdue = dayjs().diff(dayjs(bp.due_date), 'day');

    if (daysOverdue >= 3 && daysOverdue < 7) {
      const todayReminder = db.reminderLogs.findTodayReminder(
        bp.bill_id, bp.user_id, 'daily_overdue'
      );

      if (!todayReminder) {
        db.notifications.create({
          user_id: bp.user_id,
          bill_id: bp.bill_id,
          type: 'overdue_reminder',
          title: `逾期提醒：${bp.title}`,
          content: `账单「${bp.title}」已逾期 ${daysOverdue} 天，请尽快支付 ¥${bp.share_amount.toFixed(2)}。`
        });

        db.reminderLogs.create({
          bill_id: bp.bill_id,
          user_id: bp.user_id,
          reminder_type: 'daily_overdue'
        });

        console.log(`已发送逾期提醒给 ${bp.nickname}，账单：${bp.title}，逾期 ${daysOverdue} 天`);
      }
    }

    if (daysOverdue >= 7) {
      const sevenDayReminder = db.reminderLogs.findEverReminder(
        bp.bill_id, bp.user_id, 'severely_overdue'
      );

      if (!sevenDayReminder) {
        const creator = db.users.findById(bp.creator_id);
        
        db.notifications.create({
          user_id: bp.creator_id,
          bill_id: bp.bill_id,
          type: 'severe_overdue',
          title: `严重逾期通知：${bp.title}`,
          content: `账单「${bp.title}」中的 ${bp.nickname} 已逾期 ${daysOverdue} 天未支付 ¥${bp.share_amount.toFixed(2)}，请及时跟进。`
        });

        db.reminderLogs.create({
          bill_id: bp.bill_id,
          user_id: bp.user_id,
          reminder_type: 'severely_overdue'
        });

        console.log(`已发送严重逾期通知给发起人 ${creator?.nickname}，账单：${bp.title}，逾期人：${bp.nickname}`);
      }
    }
  });

  console.log('逾期账单检查完成');
}

function startReminderService() {
  checkOverdueBills();
  
  setInterval(() => {
    const now = new Date();
    if (now.getHours() === 9) {
      checkOverdueBills();
    }
  }, 60 * 60 * 1000);

  console.log('提醒服务已启动');
}

module.exports = { startReminderService, checkOverdueBills };
