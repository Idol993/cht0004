import React, { useState, useEffect } from 'react'
import {
  Card, Descriptions, Tag, Button, List, Avatar, Space, Typography, App,
  Modal, Form, InputNumber, Divider, Statistic, Row, Col
} from 'antd'
import {
  CheckOutlined, ClockCircleOutlined, EditOutlined,
  DeleteOutlined, PayCircleOutlined, UserOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { billApi } from '../api'

const { Title, Text } = Typography
const { confirm } = Modal

function BillDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [bill, setBill] = useState(null)
  const [loading, setLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [shares, setShares] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [payModalVisible, setPayModalVisible] = useState(false)
  const [payForm] = Form.useForm()

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null')
    setCurrentUser(user)
    loadBill()
  }, [id])

  const loadBill = async () => {
    setLoading(true)
    try {
      const data = await billApi.getDetail(id)
      setBill(data.bill)
      setShares(data.bill.participants.map(p => ({
        participant_id: p.id,
        user_id: p.user_id,
        nickname: p.nickname,
        amount: p.share_amount
      })))
    } catch (err) {
      message.error('加载账单详情失败')
    } finally {
      setLoading(false)
    }
  }

  const getStatusTag = (status) => {
    const statusMap = {
      pending: { color: 'orange', text: '进行中', icon: <ClockCircleOutlined /> },
      all_paid: { color: 'blue', text: '全部已付', icon: <CheckOutlined /> },
      closed: { color: 'green', text: '已关闭', icon: <CheckOutlined /> }
    }
    const s = statusMap[status] || { color: 'default', text: status }
    return <Tag color={s.color} icon={s.icon}>{s.text}</Tag>
  }

  const getPaymentStatusTag = (status) => {
    const statusMap = {
      pending: { color: 'red', text: '待付款' },
      paid: { color: 'green', text: '已付款' }
    }
    const s = statusMap[status] || { color: 'default', text: status }
    return <Tag color={s.color}>{s.text}</Tag>
  }

  const isCreator = currentUser?.id === bill?.creator_id
  const isAdmin = currentUser?.role === 'admin'
  const canEdit = (isCreator || isAdmin) && bill?.status === 'pending'
  const myParticipant = bill?.participants?.find(p => p.user_id === currentUser?.id)

  const handlePay = () => {
    setPayModalVisible(true)
  }

  const handlePaySubmit = async () => {
    try {
      const values = payForm.getFieldsValue()
      await billApi.pay(id, values)
      message.success('支付确认成功')
      setPayModalVisible(false)
      payForm.resetFields()
      loadBill()
    } catch (err) {
      message.error(err.response?.data?.error || '支付确认失败')
    }
  }

  const handleEditShares = () => {
    setEditMode(true)
  }

  const handleSaveShares = async () => {
    try {
      const shareData = shares.map(s => ({
        participant_id: s.participant_id,
        amount: Number(s.amount)
      }))
      await billApi.updateShares(id, shareData)
      message.success('份额调整成功')
      setEditMode(false)
      loadBill()
    } catch (err) {
      message.error(err.response?.data?.error || '调整失败')
    }
  }

  const handleShareChange = (participantId, value) => {
    setShares(prev => prev.map(s =>
      s.participant_id === participantId ? { ...s, amount: value } : s
    ))
  }

  const handleConfirmSettlement = () => {
    confirm({
      title: '确认结算',
      icon: <ExclamationCircleOutlined />,
      content: '确认所有款项已收到，关闭此账单？',
      onOk: async () => {
        try {
          await billApi.confirmSettlement(id)
          message.success('结算确认成功，账单已关闭')
          loadBill()
        } catch (err) {
          message.error(err.response?.data?.error || '操作失败')
        }
      }
    })
  }

  const handleDelete = () => {
    confirm({
      title: '删除账单',
      icon: <ExclamationCircleOutlined />,
      content: '确定要删除此账单吗？此操作不可恢复。',
      okText: '删除',
      okType: 'danger',
      onOk: async () => {
        try {
          await billApi.delete(id)
          message.success('删除成功')
          navigate('/bills')
        } catch (err) {
          message.error(err.response?.data?.error || '删除失败')
        }
      }
    })
  }

  const getTotalShares = () => {
    return shares.reduce((sum, s) => sum + Number(s.amount || 0), 0).toFixed(2)
  }

  const isOverdue = bill && dayjs().isAfter(dayjs(bill.due_date))

  if (!bill) {
    return <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>
  }

  const paidCount = bill.participants?.filter(p => p.status === 'paid').length || 0
  const totalParticipants = bill.participants?.length || 0

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Button onClick={() => navigate(-1)} style={{ marginRight: 12 }}>返回</Button>
          <Title level={4} style={{ display: 'inline', margin: 0 }}>{bill.title}</Title>
          <span style={{ marginLeft: 12 }}>{getStatusTag(bill.status)}</span>
        </div>
        <Space>
          {canEdit && (
            <>
              <Button icon={<EditOutlined />} onClick={handleEditShares}>
                调整份额
              </Button>
              <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
                删除
              </Button>
            </>
          )}
          {myParticipant?.status === 'pending' && bill.status === 'pending' && (
            <Button type="primary" icon={<PayCircleOutlined />} onClick={handlePay}>
              确认付款
            </Button>
          )}
          {bill.status === 'all_paid' && isCreator && (
            <Button type="primary" onClick={handleConfirmSettlement}>
              确认收款并关闭
            </Button>
          )}
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card className="card-shadow">
            <Statistic
              title="总金额"
              value={bill.total_amount}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="card-shadow">
            <Statistic
              title="付款进度"
              value={paidCount}
              suffix={`/ ${totalParticipants} 人`}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="card-shadow">
            <Statistic
              title="我的份额"
              value={myParticipant?.share_amount || 0}
              precision={2}
              prefix="¥"
              valueStyle={{ color: myParticipant?.status === 'paid' ? '#52c41a' : '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Card className="card-shadow" title="账单信息" style={{ marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label="创建人">{bill.creator_name}</Descriptions.Item>
          <Descriptions.Item label="账单日期">{dayjs(bill.bill_date).format('YYYY-MM-DD')}</Descriptions.Item>
          <Descriptions.Item label="截止日期">
            <span style={{ color: isOverdue ? '#ff4d4f' : 'inherit' }}>
              {dayjs(bill.due_date).format('YYYY-MM-DD')}
              {isOverdue && ' (已逾期)'}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">{dayjs(bill.created_at).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
          {bill.description && (
            <Descriptions.Item label="备注" span={2}>{bill.description}</Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Card
        className="card-shadow"
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>分摊明细</span>
            {editMode && (
              <Space>
                <Text type="secondary">
                  合计: ¥{getTotalShares()}
                  {Math.abs(getTotalShares() - bill.total_amount) > 0.01 && (
                    <span style={{ color: '#ff4d4f', marginLeft: 8 }}>
                      (与总额不符，差额: ¥{(getTotalShares() - bill.total_amount).toFixed(2)})
                    </span>
                  )}
                </Text>
                <Button type="primary" size="small" onClick={handleSaveShares}>
                  保存
                </Button>
                <Button size="small" onClick={() => { setEditMode(false); loadBill() }}>
                  取消
                </Button>
              </Space>
            )}
          </div>
        }
      >
        <List
          dataSource={editMode ? shares : bill.participants}
          renderItem={item => {
            const participant = editMode
              ? bill.participants.find(p => p.id === item.participant_id)
              : item
            
            return (
              <List.Item
                key={item.id || item.participant_id}
                actions={!editMode ? [getPaymentStatusTag(participant?.status || item.status)] : []}
              >
                <List.Item.Meta
                  avatar={<Avatar icon={<UserOutlined />} />}
                  title={
                    <Space>
                      {participant?.nickname || item.nickname}
                      {participant?.user_id === currentUser?.id && (
                        <Tag color="blue">我</Tag>
                      )}
                      {participant?.user_id === bill.creator_id && (
                        <Tag color="purple">发起人</Tag>
                      )}
                    </Space>
                  }
                  description={
                    participant?.paid_at
                      ? `付款时间: ${dayjs(participant.paid_at).format('YYYY-MM-DD HH:mm')}`
                      : '未付款'
                  }
                />
                {editMode ? (
                  <InputNumber
                    size="small"
                    min={0}
                    precision={2}
                    value={item.amount}
                    onChange={val => handleShareChange(item.participant_id, val)}
                    style={{ width: 120 }}
                    prefix="¥"
                  />
                ) : (
                  <span className="money-text" style={{ fontSize: 16, fontWeight: 600 }}>
                    ¥{(participant?.share_amount || item.share_amount).toFixed(2)}
                  </span>
                )}
              </List.Item>
            )
          }}
        />
      </Card>

      {bill.settlement && (
        <Card className="card-shadow" title="结算信息" style={{ marginTop: 16 }}>
          <Descriptions column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="结算单生成时间">
              {dayjs(bill.settlement.created_at).format('YYYY-MM-DD HH:mm')}
            </Descriptions.Item>
            {bill.settlement.confirmed_at && (
              <>
                <Descriptions.Item label="确认人">
                  {bill.settlement.confirmer_name}
                </Descriptions.Item>
                <Descriptions.Item label="确认时间">
                  {dayjs(bill.settlement.confirmed_at).format('YYYY-MM-DD HH:mm')}
                </Descriptions.Item>
              </>
            )}
          </Descriptions>
        </Card>
      )}

      <Modal
        title="确认付款"
        open={payModalVisible}
        onOk={handlePaySubmit}
        onCancel={() => setPayModalVisible(false)}
        okText="确认已付款"
      >
        <Form form={payForm} layout="vertical">
          <div style={{ marginBottom: 16, padding: 16, background: '#f6ffed', borderRadius: 8 }}>
            <Text type="secondary">账单：</Text><Text strong>{bill.title}</Text>
            <br />
            <Text type="secondary">应付金额：</Text>
            <Text strong style={{ color: '#1890ff', fontSize: 18 }}>
              ¥{myParticipant?.share_amount?.toFixed(2)}
            </Text>
          </div>
          <Form.Item label="付款方式" name="payment_method">
            <Input defaultValue="线下支付" placeholder="例如：微信、支付宝、现金等" />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={2} placeholder="可选" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default BillDetail
