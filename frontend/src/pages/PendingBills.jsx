import React, { useState, useEffect } from 'react'
import { Card, List, Tag, Button, Typography, App, Empty, Avatar, Space, Modal, Form, Input } from 'antd'
import {
  ClockCircleOutlined, PayCircleOutlined, UserOutlined,
  ExclamationCircleOutlined, CalendarOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { billApi } from '../api'

const { Title, Text } = Typography
const { confirm } = Modal

function PendingBills() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [bills, setBills] = useState([])
  const [payModalVisible, setPayModalVisible] = useState(false)
  const [selectedBill, setSelectedBill] = useState(null)
  const [payForm] = Form.useForm()

  useEffect(() => {
    loadPendingBills()
  }, [])

  const loadPendingBills = async () => {
    setLoading(true)
    try {
      const data = await billApi.getPending()
      setBills(data.bills || [])
    } catch (err) {
      message.error('加载待付款账单失败')
    } finally {
      setLoading(false)
    }
  }

  const handlePayClick = (bill) => {
    setSelectedBill(bill)
    setPayModalVisible(true)
  }

  const handlePaySubmit = async () => {
    if (!selectedBill) return
    
    try {
      const values = payForm.getFieldsValue()
      await billApi.pay(selectedBill.id, values)
      message.success('支付确认成功')
      setPayModalVisible(false)
      payForm.resetFields()
      loadPendingBills()
    } catch (err) {
      message.error(err.response?.data?.error || '支付确认失败')
    }
  }

  const getDaysOverdue = (dueDate) => {
    return dayjs().diff(dayjs(dueDate), 'day')
  }

  if (loading && bills.length === 0) {
    return <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>
  }

  return (
    <div>
      <Title level={4} style={{ marginTop: 0 }}>
        <ClockCircleOutlined style={{ marginRight: 8, color: '#faad14' }} />
        待我付款
        <Tag color="red" style={{ marginLeft: 8 }}>{bills.length} 笔待付</Tag>
      </Title>

      {bills.length === 0 ? (
        <Card className="card-shadow">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span>
                暂无待付款账单
                <br />
                <Text type="secondary">所有账单都已结清，太棒了！</Text>
              </span>
            }
          />
        </Card>
      ) : (
        <List
          grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 3 }}
          dataSource={bills}
          renderItem={item => {
            const isOverdue = dayjs().isAfter(dayjs(item.due_date))
            const daysOverdue = getDaysOverdue(item.due_date)

            return (
              <List.Item>
                <Card
                  className="card-shadow"
                  hoverable
                  onClick={() => navigate(`/bill/${item.id}`)}
                  style={{ cursor: 'pointer', borderColor: isOverdue ? '#ff4d4f' : '' }}
                  actions={[
                    <Button
                      type="primary"
                      icon={<PayCircleOutlined />}
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePayClick(item)
                      }}
                    >
                      确认付款
                    </Button>
                  ]}
                >
                  <Card.Meta
                    title={
                      <Space>
                        <span>{item.title}</span>
                        {isOverdue && <Tag color="red">{daysOverdue}天逾期</Tag>}
                      </Space>
                    }
                    description={
                      <div>
                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                          <div>
                            <Text type="secondary" style={{ marginRight: 8 }}>创建人：</Text>
                            <Avatar size="small" icon={<UserOutlined />} style={{ marginRight: 4 }} />
                            {item.creator_name}
                          </div>
                          <div>
                            <CalendarOutlined style={{ marginRight: 4 }} />
                            <Text type="secondary">截止：</Text>
                            <span style={{ color: isOverdue ? '#ff4d4f' : 'inherit' }}>
                              {dayjs(item.due_date).format('YYYY-MM-DD')}
                            </span>
                          </div>
                        </Space>
                      </div>
                    }
                  />
                  <div style={{ marginTop: 16, textAlign: 'right' }}>
                    <Text type="secondary">应付金额</Text>
                    <div className="money-text" style={{ fontSize: 24, fontWeight: 600, color: '#ff4d4f' }}>
                      ¥{item.share_amount?.toFixed(2)}
                    </div>
                  </div>
                </Card>
              </List.Item>
            )
          }}
        />
      )}

      <Modal
        title="确认付款"
        open={payModalVisible}
        onOk={handlePaySubmit}
        onCancel={() => setPayModalVisible(false)}
        okText="确认已付款"
        okButtonProps={{ type: 'primary' }}
      >
        {selectedBill && (
          <Form form={payForm} layout="vertical">
            <div style={{ marginBottom: 16, padding: 16, background: '#f6ffed', borderRadius: 8 }}>
              <Text type="secondary">账单：</Text><Text strong>{selectedBill.title}</Text>
              <br />
              <Text type="secondary">应付金额：</Text>
              <Text strong style={{ color: '#1890ff', fontSize: 20 }}>
                ¥{selectedBill.share_amount?.toFixed(2)}
              </Text>
            </div>
            <Form.Item label="付款方式" name="payment_method" initialValue="线下支付">
              <Input placeholder="例如：微信、支付宝、现金等" />
            </Form.Item>
            <Form.Item label="备注" name="remark">
              <Input.TextArea rows={2} placeholder="可选" />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  )
}

export default PendingBills
