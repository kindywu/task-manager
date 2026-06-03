import { useState } from 'react';
import { Input, Button, Space, Typography } from 'antd';
import { LockOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface Props {
  onSubmit: (pin: string) => void;
  confirmMode?: boolean;
  error?: string;
  loading?: boolean;
  title: string;
}

export default function PinInput({ onSubmit, confirmMode, error, loading, title }: Props) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const handleSubmit = () => {
    if (pin.length < 4) return;
    if (confirmMode && pin !== confirmPin) return;
    onSubmit(pin);
  };

  return (
    <div style={{ textAlign: 'center', maxWidth: 320, margin: '0 auto' }}>
      <LockOutlined style={{ fontSize: 48, color: '#fa8c16', marginBottom: 16 }} />
      <Title level={3}>{title}</Title>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Input.Password
          size="large"
          placeholder="输入4-6位PIN码"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          maxLength={6}
          onPressEnter={handleSubmit}
          style={{ textAlign: 'center', letterSpacing: 8 }}
        />
        {confirmMode && (
          <Input.Password
            size="large"
            placeholder="确认PIN码"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            onPressEnter={handleSubmit}
            style={{ textAlign: 'center', letterSpacing: 8 }}
          />
        )}
        {error && <Text type="danger">{error}</Text>}
        <Button
          type="primary"
          block
          size="large"
          onClick={handleSubmit}
          loading={loading}
          disabled={pin.length < 4 || (confirmMode && pin !== confirmPin)}
        >
          确定
        </Button>
      </Space>
    </div>
  );
}
