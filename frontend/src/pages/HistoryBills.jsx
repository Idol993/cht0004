import React, { useState, useEffect } from 'react'
import { Card, Table, Tag, Space, Typography, App, Select, Button, DatePicker, Statistic, Row, Col } from 'antd'
import { DownloadOutlined, EyeOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { billApi } from '../api'

const { Title } = Typography
const { Option } = Select
const { MonthPicker } = DatePicker

function HistoryBills() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [bills, setBills] = useState([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState({ total_paid: 0, total_owed: 0 })
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 })
  const [selectedMonth, setSelectedMonth] = useState(null)

  useEffect(() => {
    loadHistory()
  }, [pagination.current, pagination.pageSize, selectedMonth])

  const loadHistory = async () => {
    setLoading(true)
    try {
      const params = {
        page: pagination.current,
        pageSize: pagination.pageSize
      }
      if (selectedMonth) {
        params.month = selectedMonth
      }

      const data = await billApi.getHistory(params)
      setBills(data.bills || [])
      setTotal(data.total || 0)
      setStats(data.stats || { total_paid: 0, total_owed: 0 })
    } catch (err) {
      message.error('加载历史账单失败')
    } finally {
      setLoading(false)
    }
  }

  const getBillStatusTag = (status) => {
    const statusMap = {
      pending: { color: 'orange', text: '进行中' },
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

  const handleMonthChange = (date) => {
    setSelectedMonth(date ? date.format('YYYY-MM') : null)
    setPagination(p => ({ ...p, current: 1 }))
  }

  const columns = [
    {
      title: '账单标题',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <a onClick={() => navigate(`/bill/${record.id}`)}>{text}</a>
      )
    },
    {
      title: '创建人',
      dataIndex: 'creator_name',
      key: 'creator_name',
      width: 100
    },
    {
      title: '账单日期',
      dataIndex: 'bill_date',
      key: 'bill_date',
      width: 120,
      render: val => dayjs(val).format('YYYY-MM-DD')
    },
    {
      title: '账单总额',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 120,
      render: val => <span className="money-text">¥{val.toFixed(2)}</span>
    },
    {
      title: '我的份额',
      dataIndex: 'share_amount',
      key: 'share_amount',
      width: 120,
      render: val => <span className="money-text">¥{val.toFixed(2)}</span>
    },
    {
      title: '我的状态',
      dataIndex: 'my_status',
      key: 'my_status',
      width: 100,
      render: val => getMyStatusTag(val)
    },
    {
      title: '账单状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: val => getBillStatusTag(val)
    },
    {
      title: '付款时间',
      dataIndex: 'paid_at',
      key: 'paid_at',
      width: 160,
      render: val => val ? dayjs(val).format('YYYY-MM-DD HH:mm') : '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/bill/${record.id}`)}
        >
          详情
        </Button>
      )
    }
  ]

  return (
    <div>
      <Title level={4} style={{ marginTop: 0 }}>历史账单</Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={8}>
          <Card className="card-shadow" size="small">
            <Statistic
              title="累计已付"
              value={stats.total_paid}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#52c41a', fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card className="card-shadow" size="small">
            <Statistic
              title="待付款项"
              value={stats.total_owed}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#ff4d4f', fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="card-shadow" size="small">
            <Statistic
              title="账单总数"
              value={total}
              suffix="笔"
              valueStyle={{ color: '#1890ff', fontSize: 20 }}
            />
          </Card>
        </Col>
      </Row>

      <Card className="card-shadow">
        <Space style={{ marginBottom: 16 }}>
          <span>月份筛选：</span>
          <MonthPicker
            placeholder="全部月份"
            allowClear
            value={selectedMonth ? dayjs(selectedMonth) : null}
            onChange={handleMonthChange}
          />
          <Button
            icon={<DownloadOutlined />}
            onClick={() => message.info('请前往管理后台导出对账单')}
          >
            导出对账单
          </Button>
        </Space>

        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={bills}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: t => `共 ${t} 条记录`,
            onChange: (page, pageSize) => setPagination({ current: page, pageSize })
          }}
        />
      </Card>
    </div>
  )
}

export default HistoryBills
