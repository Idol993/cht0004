import React, { useState, useEffect } from 'react'
import { Card, Form, Input, InputNumber, DatePicker, Select, Button, Typography, App, Space, Tag, Divider, List, Avatar } from 'antd'
import { UserOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { billApi, authApi } from '../api'

const { Title, Text } = Typography
const { TextArea } = Input
const { Option } = Select

function CreateBill() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null')
    setCurrentUser(user)
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const data = await authApi.getAllUsers()
      const currentUser = JSON.parse(localStorage.getItem('user') || 'null')
      const filteredUsers = data.users.filter(u => u.id !== currentUser?.id)
      setUsers(filteredUsers)
    } catch (err) {
      message.error('加载用户列表失败')
    }
  }

  const handleUsersChange = (value) => {
    setSelectedUsers(value)
  }

  const getTotalParticipants = () => {
    return selectedUsers.length + (currentUser ? 1 : 0)
  }

  const getPerPersonAmount = () => {
    const total = form.getFieldValue('total_amount') || 0
    const count = getTotalParticipants()
    if (count === 0) return 0
    return (total / count).toFixed(2)
  }

  const onFinish = async (values) => {
    const allParticipantIds = [...selectedUsers]
    if (currentUser) allParticipantIds.push(currentUser.id)

    if (allParticipantIds.length < 2) {
      message.error('至少需要2个参与人')
      return
    }

    setLoading(true)
    try {
      const data = await billApi.create({
        title: values.title,
        total_amount: values.total_amount,
        bill_date: values.bill_date.format('YYYY-MM-DD'),
        due_date: values.due_date.format('YYYY-MM-DD'),
        participant_ids: allParticipantIds,
        description: values.description
      })
      message.success('账单创建成功')
      navigate(`/bill/${data.bill.id}`)
    } catch (err) {
      message.error(err.response?.data?.error || '创建失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Title level={4} style={{ marginTop: 0 }}>新建账单</Title>

      <Card className="card-shadow" style={{ maxWidth: 700 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            bill_date: dayjs(),
            due_date: dayjs().add(7, 'day'),
            total_amount: 0
          }}
        >
          <Form.Item
            label="账单标题"
            name="title"
            rules={[{ required: true, message: '请输入账单标题' }]}
          >
            <Input placeholder="例如：12月房租、水电费等" size="large" />
          </Form.Item>

          <Form.Item
            label="账单金额"
            name="total_amount"
            rules={[
              { required: true, message: '请输入账单金额' },
              { type: 'number', min: 0.01, message: '金额必须大于0' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              size="large"
              prefix="¥"
              min={0}
              step={10}
              precision={2}
              placeholder="请输入总金额"
            />
          </Form.Item>

          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div>
              <Text type="secondary">参与分摊人数：{getTotalParticipants()} 人</Text>
              <Tag color="blue" style={{ marginLeft: 8 }}>
                人均约 ¥{getPerPersonAmount()}
              </Tag>
            </div>
          </Space>

          <Form.Item
            label="参与分摊人员"
            name="participants"
            rules={[{ required: true, message: '请选择参与人' }]}
          >
            <Select
              mode="multiple"
              size="large"
              placeholder="选择参与分摊的室友"
              value={selectedUsers}
              onChange={handleUsersChange}
              optionLabelProp="label"
            >
              {users.map(user => (
                <Option key={user.id} value={user.id} label={user.nickname}>
                  <Space>
                    <Avatar size="small" icon={<UserOutlined />} />
                    <span>{user.nickname}</span>
                    <Text type="secondary">@{user.username}</Text>
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          {currentUser && (
            <div style={{ marginBottom: 24, padding: 12, background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f' }}>
              <Text type="secondary">发起人（自动加入）：</Text>
              <Tag color="green" style={{ marginLeft: 8 }}>
                {currentUser.nickname}（我）
              </Tag>
            </div>
          )}

          <Form.Item label="账单日期" name="bill_date">
            <DatePicker style={{ width: '100%' }} size="large" />
          </Form.Item>

          <Form.Item
            label="付款截止日期"
            name="due_date"
            rules={[{ required: true, message: '请选择截止日期' }]}
          >
            <DatePicker style={{ width: '100%' }} size="large" />
          </Form.Item>

          <Form.Item label="备注说明" name="description">
            <TextArea rows={3} placeholder="可选，填写账单说明或备注信息" />
          </Form.Item>

          <Divider />

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" size="large" loading={loading}>
                创建账单
              </Button>
              <Button size="large" onClick={() => navigate('/bills')}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default CreateBill
