import React, { useState, useEffect } from 'react'
import { Card, Col, Row, Statistic, List, Tag, Typography, App as AntdApp, Button, Table, Space } from 'antd'
import {
  UserOutlined, WalletOutlined, ClockCircleOutlined,
  CheckCircleOutlined, ExclamationCircleOutlined, TeamOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { adminApi } from '../../api'

const { Title } = Typography

function AdminDashboard() {
  const navigate = useNavigate()
  const { message } = AntdApp.useApp()
  const [stats, setStats] = useState({})
  const [overdueList, setOverdueList] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await adminApi.getStats()
      setStats(data.stats || {})
      setOverdueList(data.overdue_participants || [])
    } catch (err) {
      message.error('加载统计数据失败')
    } finally {
      setLoading(false)
    }
  }

  const overdueColumns = [
    {
      title: '账单',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <a onClick={() => navigate(`/bill/${record.bill_id}`)}>{text}</a>
      )
    },
    {
      title: '用户',
      dataIndex: 'nickname',
      key: 'nickname',
      width: 100
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 120
    },
    {
      title: '分摊金额',
      dataIndex: 'share_amount',
      key: 'share_amount',
      width: 120,
      render: val => <span className="money-text">¥{val.toFixed(2)}</span>
    },
    {
      title: '截止日期',
      dataIndex: 'due_date',
      key: 'due_date',
      width: 120,
      render: val => dayjs(val).format('YYYY-MM-DD')
    },
    {
      title: '逾期天数',
      key: 'overdue_days',
      width: 100,
      render: (_, record) => {
        const days = dayjs().diff(dayjs(record.due_date), 'day')
        return <Tag color={days >= 7 ? 'red' : 'orange'}>{days} 天</Tag>
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button type="link" onClick={() => navigate(`/bill/${record.bill_id}`)}>
          查看
        </Button>
      )
    }
  ]

  return (
    <div>
      <Title level={4} style={{ marginTop: 0 }}>
        <TeamOutlined style={{ marginRight: 8 }} />
        管理后台 - 数据概览
      </Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card className="card-shadow">
            <Statistic
              title="用户总数"
              value={stats.total_users || 0}
              prefix={<UserOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="card-shadow">
            <Statistic
              title="账单总数"
              value={stats.total_bills || 0}
              prefix={<WalletOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="card-shadow">
            <Statistic
              title="进行中账单"
              value={stats.pending_bills || 0}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="card-shadow">
            <Statistic
              title="已关闭账单"
              value={stats.closed_bills || 0}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Card className="card-shadow" title={
        <Space>
          <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
          异常未结清记录
          <Tag color="red">{overdueList.length} 笔</Tag>
        </Space>
      }>
        {overdueList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
            <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 12 }} />
            <p>暂无异常未结清记录</p>
          </div>
        ) : (
          <Table
            rowKey="id"
            loading={loading}
            columns={overdueColumns}
            dataSource={overdueList}
            pagination={false}
            size="small"
          />
        )}
      </Card>
    </div>
  )
}

export default AdminDashboard
