import React, { useState, useEffect } from 'react'
import { Card, List, Tag, Button, Typography, App, Space, Empty, Badge, Avatar } from 'antd'
import {
  BellOutlined, CheckOutlined, ReadOutlined,
  WalletOutlined, ExclamationCircleOutlined, CheckCircleOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { notificationApi } from '../api'

const { Title, Text } = Typography

function Notifications() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    loadNotifications()
  }, [filter])

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const params = {
        page: 1,
        pageSize: 50
      }
      if (filter === 'unread') params.read = 0
      if (filter === 'read') params.read = 1

      const data = await notificationApi.getList(params)
      setNotifications(data.notifications || [])
      setUnreadCount(data.unread_count || 0)
    } catch (err) {
      message.error('加载通知失败')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkRead = async (id) => {
    try {
      await notificationApi.markRead(id)
      loadNotifications()
    } catch (err) {
      message.error('操作失败')
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead()
      message.success('已全部标记为已读')
      loadNotifications()
    } catch (err) {
      message.error('操作失败')
    }
  }

  const handleClick = (notification) => {
    if (notification.read_status === 0) {
      handleMarkRead(notification.id)
    }
    if (notification.bill_id) {
      navigate(`/bill/${notification.bill_id}`)
    }
  }

  const getNotificationIcon = (type) => {
    const iconMap = {
      bill_created: <WalletOutlined style={{ color: '#1890ff' }} />,
      payment_made: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      bill_settled: <CheckOutlined style={{ color: '#1890ff' }} />,
      bill_closed: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      overdue_reminder: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
      severe_overdue: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
    }
    return iconMap[type] || <BellOutlined />
  }

  const getTypeTag = (type) => {
    const tagMap = {
      bill_created: { color: 'blue', text: '新账单' },
      payment_made: { color: 'green', text: '付款通知' },
      bill_settled: { color: 'blue', text: '结算通知' },
      bill_closed: { color: 'green', text: '账单关闭' },
      overdue_reminder: { color: 'orange', text: '逾期提醒' },
      severe_overdue: { color: 'red', text: '严重逾期' }
    }
    const t = tagMap[type] || { color: 'default', text: type }
    return <Tag color={t.color}>{t.text}</Tag>
  }

  const filterButtons = [
    { key: 'all', label: '全部' },
    { key: 'unread', label: '未读' },
    { key: 'read', label: '已读' }
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          <BellOutlined style={{ marginRight: 8 }} />
          通知中心
          <Badge count={unreadCount} style={{ marginLeft: 12 }} />
        </Title>
        <Space>
          <Button
            type="primary"
            icon={<ReadOutlined />}
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
          >
            全部已读
          </Button>
        </Space>
      </div>

      <Card className="card-shadow">
        <Space style={{ marginBottom: 16 }}>
          {filterButtons.map(btn => (
            <Button
              key={btn.key}
              type={filter === btn.key ? 'primary' : 'default'}
              onClick={() => setFilter(btn.key)}
            >
              {btn.label}
              {btn.key === 'unread' && unreadCount > 0 && (
                <Badge count={unreadCount} style={{ marginLeft: 4 }} />
              )}
            </Button>
          ))}
        </Space>

        {notifications.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无通知"
          />
        ) : (
          <List
            dataSource={notifications}
            renderItem={item => (
              <List.Item
                key={item.id}
                onClick={() => handleClick(item)}
                style={{
                  cursor: 'pointer',
                  background: item.read_status === 0 ? '#f0f7ff' : 'transparent',
                  padding: '12px 16px',
                  marginBottom: 8,
                  borderRadius: 8
                }}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar
                      icon={getNotificationIcon(item.type)}
                      style={{ background: 'transparent' }}
                      size={40}
                    />
                  }
                  title={
                    <Space>
                      <span style={{ fontWeight: item.read_status === 0 ? 600 : 400 }}>
                        {item.title}
                      </span>
                      {getTypeTag(item.type)}
                    </Space>
                  }
                  description={
                    <div>
                      <Text type="secondary">{item.content}</Text>
                      <div style={{ marginTop: 4 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {dayjs(item.created_at).format('YYYY-MM-DD HH:mm')}
                        </Text>
                      </div>
                    </div>
                  }
                />
                {item.read_status === 0 && (
                  <Badge status="processing" color="#1890ff" />
                )}
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  )
}

export default Notifications
