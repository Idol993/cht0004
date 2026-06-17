import React, { useState, useEffect } from 'react'
import { Card, Table, Tag, Button, Space, Typography, App as AntdApp, Input, Select } from 'antd'
import { PlusOutlined, EyeOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { billApi } from '../api'
import dayjs from 'dayjs'

const { Title } = Typography
const { Option } = Select

function BillList() {
  const navigate = useNavigate()
  const { message } = AntdApp.useApp()
  const [loading, setLoading] = useState(false)
  const [bills, setBills] = useState([])
  const [total, setTotal] = useState(0)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 })
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    loadBills()
  }, [pagination.current, pagination.pageSize, statusFilter])

  const loadBills = async () => {
    setLoading(true)
    try {
      const params = {
        page: pagination.current,
        pageSize: pagination.pageSize
      }
      if (statusFilter) params.status = statusFilter

      const data = await billApi.getList(params)
      setBills(data.bills || [])
      setTotal(data.total || 0)
    } catch (err) {
      message.error('加载账单列表失败')
    } finally {
      setLoading(false)
    }
  }

  const getStatusTag = (status) => {
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
    if (!status) return null
    const s = statusMap[status] || { color: 'default', text: status }
    return <Tag color={s.color}>{s.text}</Tag>
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
      title: '总金额',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 120,
      render: val => <span className="money-text">¥{val.toFixed(2)}</span>
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
      title: '截止日期',
      dataIndex: 'due_date',
      key: 'due_date',
      width: 120,
      render: (val) => {
        const isOverdue = dayjs().isAfter(dayjs(val))
        return (
          <span style={{ color: isOverdue ? '#ff4d4f' : 'inherit' }}>
            {dayjs(val).format('YYYY-MM-DD')}
            {isOverdue && ' (已逾期)'}
          </span>
        )
      }
    },
    {
      title: '我的份额',
      dataIndex: 'share_amount',
      key: 'share_amount',
      width: 120,
      render: (val) => val ? <span className="money-text">¥{val.toFixed(2)}</span> : '-'
    },
    {
      title: '账单状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: val => getStatusTag(val)
    },
    {
      title: '我的状态',
      dataIndex: 'my_status',
      key: 'my_status',
      width: 100,
      render: val => getMyStatusTag(val)
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>全部账单</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/create')}>
          新建账单
        </Button>
      </div>

      <Card className="card-shadow">
        <Space style={{ marginBottom: 16 }}>
          <span>状态筛选：</span>
          <Select
            placeholder="全部状态"
            style={{ width: 150 }}
            allowClear
            value={statusFilter || undefined}
            onChange={val => { setStatusFilter(val || ''); setPagination(p => ({ ...p, current: 1 })) }}
          >
            <Option value="pending">进行中</Option>
            <Option value="all_paid">全部已付</Option>
            <Option value="closed">已关闭</Option>
          </Select>
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
            showTotal: t => `共 ${t} 条`,
            onChange: (page, pageSize) => setPagination({ current: page, pageSize })
          }}
        />
      </Card>
    </div>
  )
}

export default BillList
