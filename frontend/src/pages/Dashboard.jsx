import React, { useState, useEffect } from 'react'
import { Card, Col, Row, Statistic, List, Tag, Button, Typography, App as AntdApp } from 'antd'
import {
  MoneyCollectOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationOutlined,
  ArrowRightOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { billApi, notificationApi } from '../api'
import dayjs from 'dayjs'

const { Title, Text } = Typography

function Dashboard() {
  const navigate = useNavigate()
  const { message } = AntdApp.useApp()
  const [stats, setStats] = useState({ total_paid: 0, total_owed: 0 })
  const [pendingBills, setPendingBills] = useState([])
  const [recentBills, setRecentBills] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const historyData = await billApi.getHistory({ pageSize: 5 })
      setStats(historyData.stats || { total_paid: 0, total_owed: 0 })
      setRecentBills(historyData.bills || [])

      const pendingData = await billApi.getPending()
      setPendingBills(pendingData.bills || [])
    } catch (err) {
      message.error('加载数据失败')
    }
  }

  const getStatusTag = (status) => {
    const statusMap = {
      pending: { color: 'orange', text: '待支付' },
      all_paid: { color: 'blue', text: '全部已付' },
      closed: { color: 'green', text: '已关闭' }
    }
    const s = statusMap[status] || { color: 'default', text: status }
    return <Tag color={s.color}>{s.text}</Tag>
  }

  const getMyStatusTag = (status) => {
    const statusMap = {
      pending: { color: 'red', text: '待付款' },
      paid: { color: 'green', text: '已付款' }
    }
    const s = statusMap[status] || { color: 'default', text: status }
    return <Tag color={s.color}>{s.text}</Tag>
  }

  return (
    <div>
      <Title level={4} style={{ marginTop: 0 }}>首页概览</Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="card-shadow">
            <Statistic
              title="待付款总额"
              value={stats.total_owed || 0}
              precision={2}
              prefix={<MoneyCollectOutlined style={{ color: '#ff4d4f' }} />}
              suffix="元"
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="card-shadow">
            <Statistic
              title="已付款总额"
              value={stats.total_paid || 0}
              precision={2}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              suffix="元"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="card-shadow">
            <Statistic
              title="待处理账单"
              value={pendingBills.length}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="card-shadow">
            <Statistic
              title="历史账单数"
              value={recentBills.length}
              prefix={<ExclamationOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            className="card-shadow"
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>待我付款</span>
                <Button type="link" onClick={() => navigate('/pending')}>
                  查看全部 <ArrowRightOutlined />
                </Button>
              </div>
            }
          >
            {pendingBills.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 12 }} />
                <p>暂无待付款账单</p>
              </div>
            ) : (
              <List
                dataSource={pendingBills.slice(0, 5)}
                renderItem={item => (
                  <List.Item
                    key={item.id}
                    onClick={() => navigate(`/bill/${item.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <List.Item.Meta
                      title={item.title}
                      description={
                        <div>
                          <Text type="secondary">创建人：{item.creator_name}</Text>
                          <Text type="secondary" style={{ marginLeft: 16 }}>
                            截止：{dayjs(item.due_date).format('YYYY-MM-DD')}
                          </Text>
                          {dayjs().isAfter(dayjs(item.due_date)) && (
                            <Tag color="red" style={{ marginLeft: 8 }}>已逾期</Tag>
                          )}
                        </div>
                      }
                    />
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 18, fontWeight: 600, color: '#ff4d4f' }}>
                        ¥{item.share_amount?.toFixed(2)}
                      </div>
                      {getMyStatusTag(item.my_status)}
                    </div>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            className="card-shadow"
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>最近账单</span>
                <Button type="link" onClick={() => navigate('/history')}>
                  查看全部 <ArrowRightOutlined />
                </Button>
              </div>
            }
          >
            <List
              dataSource={recentBills}
              renderItem={item => (
                <List.Item
                  key={item.id}
                  onClick={() => navigate(`/bill/${item.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <List.Item.Meta
                    title={item.title}
                    description={
                      <div>
                        <Text type="secondary">创建人：{item.creator_name}</Text>
                        <Text type="secondary" style={{ marginLeft: 16 }}>
                          {dayjs(item.bill_date).format('YYYY-MM-DD')}
                        </Text>
                      </div>
                    }
                  />
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 16, fontWeight: 500 }}>
                      ¥{item.total_amount?.toFixed(2)}
                    </div>
                    {getStatusTag(item.status)}
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard
