import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Avatar, Dropdown, Badge, Button, App as AntdApp } from 'antd'
import {
  HomeOutlined,
  PlusCircleOutlined,
  ClockCircleOutlined,
  HistoryOutlined,
  BellOutlined,
  UserOutlined,
  DashboardOutlined,
  TeamOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import BillList from './pages/BillList'
import BillDetail from './pages/BillDetail'
import CreateBill from './pages/CreateBill'
import PendingBills from './pages/PendingBills'
import HistoryBills from './pages/HistoryBills'
import Notifications from './pages/Notifications'
import AdminDashboard from './pages/admin/Dashboard'
import AdminBills from './pages/admin/Bills'
import AdminUsers from './pages/admin/Users'
import { notificationApi } from './api'

const { Header, Sider, Content } = Layout

function PrivateRoute({ children, requireAdmin = false }) {
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  if (!user) {
    return <Navigate to="/login" replace />
  }
  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/" replace />
  }
  return children
}

function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { message } = AntdApp.useApp()
  const [user, setUser] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
      fetchUnreadCount()
    }
  }, [])

  const fetchUnreadCount = () => {
    notificationApi.getUnreadCount().then(data => {
      setUnreadCount(data.unread_count)
    }).catch(() => {})
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    message.success('已退出登录')
    navigate('/login')
  }

  const userMenuItems = [
    {
      key: 'notifications',
      icon: <BellOutlined />,
      label: '通知中心',
      onClick: () => navigate('/notifications')
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout
    }
  ]

  const selectedKey = location.pathname.split('/')[1] || 'dashboard'

  const menuItems = [
    { key: 'dashboard', icon: <HomeOutlined />, label: '首页概览', onClick: () => navigate('/') },
    { key: 'bills', icon: <ClockCircleOutlined />, label: '全部账单', onClick: () => navigate('/bills') },
    { key: 'create', icon: <PlusCircleOutlined />, label: '新建账单', onClick: () => navigate('/create') },
    { key: 'pending', icon: <ClockCircleOutlined />, label: '待我付款', onClick: () => navigate('/pending') },
    { key: 'history', icon: <HistoryOutlined />, label: '历史账单', onClick: () => navigate('/history') },
    { key: 'notifications', icon: <BellOutlined />, label: '通知中心', onClick: () => navigate('/notifications') },
  ]

  if (user?.role === 'admin') {
    menuItems.push({ type: 'divider' })
    menuItems.push({
      key: 'admin',
      icon: <DashboardOutlined />,
      label: '管理后台',
      children: [
        { key: 'admin-dashboard', icon: <DashboardOutlined />, label: '数据概览', onClick: () => navigate('/admin') },
        { key: 'admin-bills', icon: <ClockCircleOutlined />, label: '账单管理', onClick: () => navigate('/admin/bills') },
        { key: 'admin-users', icon: <TeamOutlined />, label: '用户管理', onClick: () => navigate('/admin/users') }
      ]
    })
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="dark"
        width={220}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: collapsed ? 14 : 18,
          fontWeight: 600,
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          {collapsed ? '账单' : '合租账单系统'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
        />
      </Sider>
      <Layout>
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
        }}>
          <div>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Badge count={unreadCount} size="small">
              <Button
                type="text"
                icon={<BellOutlined />}
                onClick={() => navigate('/notifications')}
              />
            </Badge>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar size="small" icon={<UserOutlined />} />
                <span>{user?.nickname || '用户'}</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ padding: 24, background: '#f0f2f5', minHeight: 'calc(100vh - 64px)' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/bills" element={<BillList />} />
            <Route path="/bill/:id" element={<BillDetail />} />
            <Route path="/create" element={<CreateBill />} />
            <Route path="/pending" element={<PendingBills />} />
            <Route path="/history" element={<HistoryBills />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/admin" element={<PrivateRoute requireAdmin={true}><AdminDashboard /></PrivateRoute>} />
            <Route path="/admin/bills" element={<PrivateRoute requireAdmin={true}><AdminBills /></PrivateRoute>} />
            <Route path="/admin/users" element={<PrivateRoute requireAdmin={true}><AdminUsers /></PrivateRoute>} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/*" element={<PrivateRoute><MainLayout /></PrivateRoute>} />
    </Routes>
  )
}

export default App
