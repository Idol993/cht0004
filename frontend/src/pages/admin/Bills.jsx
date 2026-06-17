import React, { useState, useEffect } from 'react'
import { Card, Table, Tag, Button, Space, Typography, App as AntdApp, Select, DatePicker, Input } from 'antd'
import { DownloadOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { adminApi } from '../../api'

const { Title } = Typography
const { Option } = Select
const { MonthPicker } = DatePicker

function AdminBills() {
  const navigate = useNavigate()
  const { message } = AntdApp.useApp()
  const [loading, setLoading] = useState(false)
  const [bills, setBills] = useState([])
  const [total, setTotal] = useState(0)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 })
  const [statusFilter, setStatusFilter] = useState('')
  const [exportMonth, setExportMonth] = useState(null)

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

      const data = await adminApi.getAllBills(params)
      setBills(data.bills || [])
      setTotal(data.total || 0)
    } catch (err) {
      message.error('加载账单列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    if (!exportMonth) {
      message.warning('请先选择要导出的月份')
      return
    }

    try {
      const response = await adminApi.exportMonthly(exportMonth.format('YYYY-MM'))
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `月度对账单-${exportMonth.format('YYYY-MM')}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      message.success('导出成功')
    } catch (err) {
      message.error('导出失败')
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

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60
    },
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
          </span>
        )
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: val => getStatusTag(val)
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: val => dayjs(val).format('YYYY-MM-DD HH:mm')
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
      <Title level={4} style={{ marginTop: 0 }}>账单管理</Title>

      <Card className="card-shadow">
        <Space style={{ marginBottom: 16 }} wrap>
          <span>状态：</span>
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

          <Space split={<span style={{ color: '#d9d9d9' }}>|</span>}>
            <span>导出月度对账单：</span>
            <MonthPicker
              placeholder="选择月份"
              value={exportMonth}
              onChange={setExportMonth}
            />
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleExport}
            >
              导出 CSV
            </Button>
          </Space>
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

export default AdminBills
