const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'billing-db.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db = null;

function loadDB() {
  if (db) return db;
  
  if (!fs.existsSync(dbPath)) {
    db = {
      users: [],
      bills: [],
      bill_participants: [],
      settlements: [],
      notifications: [],
      payment_records: [],
      reminder_logs: [],
      counters: {
        users: 0,
        bills: 0,
        bill_participants: 0,
        settlements: 0,
        notifications: 0,
        payment_records: 0,
        reminder_logs: 0
      }
    };
    saveDB();
    initDefaultData();
  } else {
    db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  }
  
  return db;
}

function saveDB() {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

function getNextId(table) {
  loadDB();
  db.counters[table] = (db.counters[table] || 0) + 1;
  saveDB();
  return db.counters[table];
}

function initDefaultData() {
  const adminCount = db.users.filter(u => u.role === 'admin').length;
  if (adminCount === 0) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    const id = getNextId('users');
    db.users.push({
      id,
      username: 'admin',
      password: hashedPassword,
      nickname: '系统管理员',
      role: 'admin',
      created_at: new Date().toISOString()
    });
    console.log('默认管理员账号已创建: admin / admin123');
  }

  if (db.users.length < 4) {
    const defaultUsers = [
      { username: 'zhangsan', nickname: '张三' },
      { username: 'lisi', nickname: '李四' },
      { username: 'wangwu', nickname: '王五' },
    ];
    const hashedPassword = bcrypt.hashSync('123456', 10);
    defaultUsers.forEach(u => {
      if (!db.users.find(x => x.username === u.username)) {
        const id = getNextId('users');
        db.users.push({
          id,
          username: u.username,
          password: hashedPassword,
          nickname: u.nickname,
          role: 'user',
          created_at: new Date().toISOString()
        });
      }
    });
    console.log('默认测试用户已创建: zhangsan/lisi/wangwu / 123456');
    saveDB();
  }
}

loadDB();

const dataAccess = {
  users: {
    findById: (id) => db.users.find(u => u.id === id),
    findByUsername: (username) => db.users.find(u => u.username === username),
    getAll: () => [...db.users].sort((a, b) => a.id - b.id),
    create: (user) => {
      const id = getNextId('users');
      const newUser = {
        id,
        ...user,
        role: user.role || 'user',
        created_at: new Date().toISOString()
      };
      db.users.push(newUser);
      saveDB();
      return newUser;
    },
    count: () => db.users.length
  },

  bills: {
    findById: (id) => {
      const bill = db.bills.find(b => b.id === id);
      if (!bill) return null;
      return { ...bill };
    },
    getDetail: (id) => {
      const bill = db.bills.find(b => b.id === id);
      if (!bill) return null;
      
      const creator = db.users.find(u => u.id === bill.creator_id);
      const participants = db.bill_participants
        .filter(p => p.bill_id === id)
        .map(p => {
          const user = db.users.find(u => u.id === p.user_id);
          return {
            ...p,
            username: user?.username,
            nickname: user?.nickname
          };
        })
        .sort((a, b) => a.id - b.id);
      
      const settlement = db.settlements.find(s => s.bill_id === id);
      let confirmer = null;
      if (settlement?.confirmed_by) {
        confirmer = db.users.find(u => u.id === settlement.confirmed_by);
      }
      
      return {
        ...bill,
        creator_name: creator?.nickname,
        participants,
        settlement: settlement ? {
          ...settlement,
          confirmer_name: confirmer?.nickname
        } : null
      };
    },
    list: ({ status, page = 1, pageSize = 10 } = {}) => {
      let bills = [...db.bills];
      
      if (status) {
        bills = bills.filter(b => b.status === status);
      }
      
      bills = bills.map(b => {
        const creator = db.users.find(u => u.id === b.creator_id);
        return { ...b, creator_name: creator?.nickname };
      });
      
      bills.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      const total = bills.length;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      
      return {
        bills: bills.slice(start, end),
        total,
        page: Number(page),
        pageSize: Number(pageSize)
      };
    },
    listByUser: (userId, { status, page = 1, pageSize = 10 } = {}) => {
      let participantBills = db.bill_participants
        .filter(p => p.user_id === userId)
        .map(p => ({
          billId: p.bill_id,
          my_status: p.status,
          share_amount: p.share_amount,
          paid_amount: p.paid_amount
        }));
      
      let bills = db.bills
        .filter(b => participantBills.some(pb => pb.billId === b.id))
        .map(b => {
          const pb = participantBills.find(x => x.billId === b.id);
          const creator = db.users.find(u => u.id === b.creator_id);
          return {
            ...b,
            creator_name: creator?.nickname,
            my_status: pb.my_status,
            share_amount: pb.share_amount,
            paid_amount: pb.paid_amount
          };
        });
      
      if (status) {
        bills = bills.filter(b => b.status === status);
      }
      
      bills.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      const total = bills.length;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      
      return {
        bills: bills.slice(start, end),
        total,
        page: Number(page),
        pageSize: Number(pageSize)
      };
    },
    create: (billData, participantIds) => {
      const id = getNextId('bills');
      const bill = {
        id,
        ...billData,
        status: 'pending',
        created_at: new Date().toISOString(),
        closed_at: null
      };
      db.bills.push(bill);
      
      const totalAmount = Number(billData.total_amount);
      const perPerson = Number((totalAmount / participantIds.length).toFixed(2));
      const remainder = Number((totalAmount - perPerson * participantIds.length).toFixed(2));
      
      const participants = [];
      participantIds.forEach((userId, index) => {
        let share = perPerson;
        if (index === 0) {
          share = Number((perPerson + remainder).toFixed(2));
        }
        const pId = getNextId('bill_participants');
        const participant = {
          id: pId,
          bill_id: id,
          user_id: userId,
          share_amount: share,
          paid_amount: 0,
          status: 'pending',
          paid_at: null
        };
        db.bill_participants.push(participant);
        participants.push(participant);
      });
      
      saveDB();
      return { bill, participants };
    },
    updateStatus: (id, status) => {
      const bill = db.bills.find(b => b.id === id);
      if (bill) {
        bill.status = status;
        if (status === 'closed') {
          bill.closed_at = new Date().toISOString();
        }
        saveDB();
      }
      return bill;
    },
    delete: (id) => {
      const index = db.bills.findIndex(b => b.id === id);
      if (index > -1) {
        db.bills.splice(index, 1);
        db.bill_participants = db.bill_participants.filter(p => p.bill_id !== id);
        saveDB();
        return true;
      }
      return false;
    },
    getPendingByUser: (userId) => {
      const pendingParticipants = db.bill_participants.filter(
        p => p.user_id === userId && p.status === 'pending'
      );
      
      const bills = pendingParticipants
        .map(p => {
          const bill = db.bills.find(b => b.id === p.bill_id);
          if (!bill || !['pending', 'all_paid'].includes(bill.status)) return null;
          const creator = db.users.find(u => u.id === bill.creator_id);
          return {
            ...bill,
            creator_name: creator?.nickname,
            share_amount: p.share_amount,
            my_status: p.status
          };
        })
        .filter(Boolean);
      
      bills.sort((a, b) => {
        const dateCompare = new Date(a.due_date) - new Date(b.due_date);
        if (dateCompare !== 0) return dateCompare;
        return new Date(b.created_at) - new Date(a.created_at);
      });
      
      return bills;
    },
    getHistoryByUser: (userId, { month, page = 1, pageSize = 10 } = {}) => {
      let participants = db.bill_participants.filter(p => p.user_id === userId);
      
      let bills = participants
        .map(p => {
          const bill = db.bills.find(b => b.id === p.bill_id);
          if (!bill) return null;
          
          if (month && !bill.bill_date.startsWith(month)) return null;
          
          const creator = db.users.find(u => u.id === bill.creator_id);
          return {
            ...bill,
            creator_name: creator?.nickname,
            share_amount: p.share_amount,
            paid_amount: p.paid_amount,
            my_status: p.status,
            paid_at: p.paid_at
          };
        })
        .filter(Boolean);
      
      bills.sort((a, b) => {
        const dateCompare = new Date(b.bill_date) - new Date(a.bill_date);
        if (dateCompare !== 0) return dateCompare;
        return new Date(b.created_at) - new Date(a.created_at);
      });
      
      const total = bills.length;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      
      let totalPaid = 0;
      let totalOwed = 0;
      bills.forEach(bill => {
        if (bill.my_status === 'paid') {
          totalPaid += bill.share_amount;
        } else {
          totalOwed += bill.share_amount;
        }
      });
      
      return {
        bills: bills.slice(start, end),
        total,
        page: Number(page),
        pageSize: Number(pageSize),
        stats: {
          total_paid: Number(totalPaid.toFixed(2)),
          total_owed: Number(totalOwed.toFixed(2))
        }
      };
    },
    getUserMonthlyExport: (userId, month) => {
      const user = db.users.find(u => u.id === userId);
      if (!user) return null;

      const records = db.bill_participants
        .filter(p => p.user_id === userId)
        .map(p => {
          const bill = db.bills.find(b => b.id === p.bill_id);
          if (!bill) return null;
          if (month && !bill.bill_date.startsWith(month)) return null;
          const creator = db.users.find(u => u.id === bill.creator_id);
          return {
            bill_id: bill.id,
            title: bill.title,
            bill_date: bill.bill_date,
            due_date: bill.due_date,
            bill_status: bill.status,
            share_amount: p.share_amount,
            paid_amount: p.paid_amount || 0,
            payment_status: p.status,
            paid_at: p.paid_at || '',
            creator_name: creator?.nickname || ''
          };
        })
        .filter(Boolean)
        .sort((a, b) => new Date(b.bill_date) - new Date(a.bill_date));

      return { user, records };
    },
    getTotalAmount: () => {
      return db.bills.reduce((sum, b) => sum + Number(b.total_amount), 0);
    }
  },

  billParticipants: {
    findByBillAndUser: (billId, userId) => 
      db.bill_participants.find(p => p.bill_id === billId && p.user_id === userId),
    findByBill: (billId) => 
      db.bill_participants.filter(p => p.bill_id === billId).sort((a, b) => a.id - b.id),
    updateShare: (id, amount) => {
      const p = db.bill_participants.find(x => x.id === id);
      if (p) {
        p.share_amount = Number(amount);
        saveDB();
      }
      return p;
    },
    markPaid: (id) => {
      const p = db.bill_participants.find(x => x.id === id);
      if (p) {
        p.status = 'paid';
        p.paid_amount = p.share_amount;
        p.paid_at = new Date().toISOString();
        saveDB();
      }
      return p;
    },
    getUnpaidCount: (billId) => {
      return db.bill_participants.filter(p => p.bill_id === billId && p.status !== 'paid').length;
    },
    getOverdueParticipants: () => {
      const now = new Date();
      return db.bill_participants
        .filter(p => p.status === 'pending')
        .map(p => {
          const bill = db.bills.find(b => b.id === p.bill_id);
          if (!bill || bill.status !== 'pending') return null;
          if (new Date(bill.due_date) >= now) return null;
          
          const user = db.users.find(u => u.id === p.user_id);
          return {
            ...p,
            title: bill.title,
            due_date: bill.due_date,
            creator_id: bill.creator_id,
            nickname: user?.nickname,
            username: user?.username
          };
        })
        .filter(Boolean)
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    }
  },

  settlements: {
    create: (billId) => {
      const id = getNextId('settlements');
      const settlement = {
        id,
        bill_id: billId,
        confirmed_by: null,
        confirmed_at: null,
        created_at: new Date().toISOString()
      };
      db.settlements.push(settlement);
      saveDB();
      return settlement;
    },
    findByBill: (billId) => db.settlements.find(s => s.bill_id === billId),
    confirm: (billId, confirmerId) => {
      const s = db.settlements.find(x => x.bill_id === billId);
      if (s) {
        s.confirmed_by = confirmerId;
        s.confirmed_at = new Date().toISOString();
        saveDB();
      }
      return s;
    }
  },

  notifications: {
    create: (data) => {
      const id = getNextId('notifications');
      const notification = {
        id,
        ...data,
        read_status: 0,
        created_at: new Date().toISOString()
      };
      db.notifications.push(notification);
      saveDB();
      return notification;
    },
    getByUser: (userId, { read, page = 1, pageSize = 20 } = {}) => {
      let notifications = db.notifications.filter(n => n.user_id === userId);
      
      if (read !== undefined && read !== null) {
        notifications = notifications.filter(n => n.read_status === (read ? 1 : 0));
      }
      
      notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      const total = notifications.length;
      const unreadCount = db.notifications.filter(n => n.user_id === userId && n.read_status === 0).length;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      
      return {
        notifications: notifications.slice(start, end),
        total,
        unread_count: unreadCount,
        page: Number(page),
        pageSize: Number(pageSize)
      };
    },
    getUnreadCount: (userId) => {
      return db.notifications.filter(n => n.user_id === userId && n.read_status === 0).length;
    },
    markRead: (id) => {
      const n = db.notifications.find(x => x.id === id);
      if (n) {
        n.read_status = 1;
        saveDB();
      }
      return n;
    },
    markAllRead: (userId) => {
      db.notifications
        .filter(n => n.user_id === userId)
        .forEach(n => { n.read_status = 1; });
      saveDB();
    }
  },

  paymentRecords: {
    create: (data) => {
      const id = getNextId('payment_records');
      const record = {
        id,
        ...data,
        created_at: new Date().toISOString()
      };
      db.payment_records.push(record);
      saveDB();
      return record;
    }
  },

  reminderLogs: {
    create: (data) => {
      const id = getNextId('reminder_logs');
      const log = {
        id,
        ...data,
        created_at: new Date().toISOString()
      };
      db.reminder_logs.push(log);
      saveDB();
      return log;
    },
    findTodayReminder: (billId, userId, type) => {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      return db.reminder_logs.find(r => 
        r.bill_id === billId && 
        r.user_id === userId && 
        r.reminder_type === type &&
        r.created_at.startsWith(todayStr)
      );
    },
    findEverReminder: (billId, userId, type) => {
      return db.reminder_logs.find(r => 
        r.bill_id === billId && 
        r.user_id === userId && 
        r.reminder_type === type
      );
    }
  },

  admin: {
    getStats: () => {
      const totalUsers = db.users.length;
      const totalBills = db.bills.length;
      const pendingBills = db.bills.filter(b => b.status === 'pending').length;
      const closedBills = db.bills.filter(b => b.status === 'closed').length;
      const totalAmount = db.bills.reduce((sum, b) => sum + Number(b.total_amount), 0);
      
      const overdueParticipants = dataAccess.billParticipants.getOverdueParticipants();
      
      return {
        stats: {
          total_users: totalUsers,
          total_bills: totalBills,
          pending_bills: pendingBills,
          closed_bills: closedBills,
          total_amount: Number(totalAmount.toFixed(2))
        },
        overdue_participants: overdueParticipants
      };
    },
    getAllBills: ({ status, page = 1, pageSize = 10 } = {}) => {
      let bills = [...db.bills];
      
      if (status) {
        bills = bills.filter(b => b.status === status);
      }
      
      bills = bills.map(b => {
        const creator = db.users.find(u => u.id === b.creator_id);
        return { ...b, creator_name: creator?.nickname };
      });
      
      bills.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      const total = bills.length;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      
      return {
        bills: bills.slice(start, end),
        total,
        page: Number(page),
        pageSize: Number(pageSize)
      };
    },
    getUsersWithStats: () => {
      return db.users.map(u => {
        const participants = db.bill_participants.filter(p => p.user_id === u.id);
        const billCount = participants.length;
        const totalShare = participants.reduce((sum, p) => sum + Number(p.share_amount), 0);
        
        return {
          id: u.id,
          username: u.username,
          nickname: u.nickname,
          role: u.role,
          created_at: u.created_at,
          bill_count: billCount,
          total_share: Number(totalShare.toFixed(2))
        };
      }).sort((a, b) => a.id - b.id);
    },
    getMonthlyBills: (month) => {
      const bills = db.bills
        .filter(b => b.bill_date.startsWith(month))
        .map(b => {
          const creator = db.users.find(u => u.id === b.creator_id);
          return { ...b, creator_name: creator?.nickname };
        })
        .sort((a, b) => new Date(b.bill_date) - new Date(a.bill_date));
      
      const participants = [];
      bills.forEach(bill => {
        const billParticipants = db.bill_participants
          .filter(p => p.bill_id === bill.id)
          .map(p => {
            const user = db.users.find(u => u.id === p.user_id);
            return {
              ...p,
              nickname: user?.nickname,
              username: user?.username,
              title: bill.title
            };
          });
        participants.push(...billParticipants);
      });
      
      return { bills, participants };
    },
    getUserBills: (userId) => {
      const user = db.users.find(u => u.id === userId);
      if (!user) return null;
      
      const records = db.bill_participants
        .filter(p => p.user_id === userId)
        .map(p => {
          const bill = db.bills.find(b => b.id === p.bill_id);
          if (!bill) return null;
          const creator = db.users.find(u => u.id === bill.creator_id);
          return {
            bill_id: bill.id,
            title: bill.title,
            bill_date: bill.bill_date,
            due_date: bill.due_date,
            bill_status: bill.status,
            share_amount: p.share_amount,
            paid_amount: p.paid_amount,
            payment_status: p.status,
            paid_at: p.paid_at,
            creator_name: creator?.nickname
          };
        })
        .filter(Boolean)
        .sort((a, b) => new Date(b.bill_date) - new Date(a.bill_date));
      
      return { user, records };
    }
  }
};

module.exports = dataAccess;
