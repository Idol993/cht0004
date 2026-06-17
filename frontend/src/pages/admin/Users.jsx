import React, { useState, useEffect } from 'react'
import { Card, Table, Tag, Button, Avatar, Typography, App as AntdApp, Space } from 'antd'
import { UserOutlined, DownloadOutlined, CrownOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { adminApi } from '../../api'

const { Title } = Typography

function AdminUsers() {
  const { message } = AntdApp.useApp()
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState([])

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const data = await adminApi.getUsers()
      setUsers(data.users || [])
    } catch (err) {
      message.error('加载用户列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleExportUser = async (userId, username) => {
    try {
      const response = await adminApi.exportUser(userId)
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `个人对账单-${username}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      message.success('导出成功')
    } catch (err) {
      message.error('导出失败')
    }
  }

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60
    },
    {
      title: '头像',
      dataIndex: 'avatar',
      key: 'avatar',
      width: 60,
      render: (_, record) => (
        <Avatar size="small" icon={<UserOutlined />} />
      )
    },
    {
      title: '昵称',
      dataIndex: 'nickname',
      key: 'nickname',
      render: (text, record) => (
        <Space>
          {text}
          {record.role === 'admin' && <CrownOutlined style={{ color: '#faad14' }} />}
        </Space>
      )
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username'
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: val => (
        <Tag color={val === 'admin' ? 'gold' : 'blue'}>
          {val === 'admin' ? '管理员' : '普通用户'}
        </Tag>
      )
    },
    {
      title: '参与账单数',
      dataIndex: 'bill_count',
      key: 'bill_count',
      width: 100
    },
    {
      title: '累计分摊金额',
      dataIndex: 'total_share',
      key: 'total_share',
      width: 140,
      render: val => <span className="money-text">¥{val.toFixed(2)}</span>
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: val => dayjs(val).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Button
          type="link"
          icon={<DownloadOutlined />}
          onClick={() => handleExportUser(record.id, record.username)}
        >
          导出对账单
        </Button>
      )
    }
  ]

  return (
    <div>
      <Title level={4} style={{ marginTop: 0 }}>用户管理</Title>

      <Card className="card-shadow">
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={users}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: t => `共 ${t} 个用户`
          }}
        />
      </Card>
    </div>
  )
}

export default AdminUsers
