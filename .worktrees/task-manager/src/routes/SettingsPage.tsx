import { useState } from 'react';
import { Card, Button, Input, Radio, Typography, Space, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/useAuthStore';
import { useSettingsStore } from '../stores/useSettingsStore';

const { Title } = Typography;

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { changePin, lock } = useAuthStore();
  const { theme, language, setTheme, setLanguage } = useSettingsStore();

  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  const handleChangePin = async () => {
    if (newPin.length < 4) {
      message.error('新密码至少需要4位');
      return;
    }
    if (newPin !== confirmPin) {
      message.error(t('settings.pinNotMatch'));
      return;
    }
    setPinLoading(true);
    const ok = await changePin(oldPin, newPin);
    if (ok) {
      message.success(t('settings.pinChanged'));
      setOldPin('');
      setNewPin('');
      setConfirmPin('');
    } else {
      message.error(t('settings.wrongOldPin'));
    }
    setPinLoading(false);
  };

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <Title level={4}>{t('app.settings')}</Title>

      <Card title={t('settings.changePin')} style={{ marginBottom: 16 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Input.Password
            placeholder={t('settings.oldPin')}
            value={oldPin}
            onChange={(e) =>
              setOldPin(e.target.value.replace(/\D/g, '').slice(0, 6))
            }
            maxLength={6}
          />
          <Input.Password
            placeholder={t('settings.newPin')}
            value={newPin}
            onChange={(e) =>
              setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))
            }
            maxLength={6}
          />
          <Input.Password
            placeholder={t('settings.confirmNewPin')}
            value={confirmPin}
            onChange={(e) =>
              setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))
            }
            maxLength={6}
          />
          <Button type="primary" onClick={handleChangePin} loading={pinLoading}>
            {t('common.save')}
          </Button>
        </Space>
      </Card>

      <Card title={t('settings.language')} style={{ marginBottom: 16 }}>
        <Radio.Group
          value={language}
          onChange={(e) => handleLanguageChange(e.target.value)}
        >
          <Radio.Button value="zh-CN">中文</Radio.Button>
          <Radio.Button value="en">English</Radio.Button>
        </Radio.Group>
      </Card>

      <Card title={t('settings.theme')} style={{ marginBottom: 16 }}>
        <Radio.Group value={theme} onChange={(e) => setTheme(e.target.value)}>
          <Radio.Button value="light">{t('settings.light')}</Radio.Button>
          <Radio.Button value="dark">{t('settings.dark')}</Radio.Button>
          <Radio.Button value="system">{t('settings.system')}</Radio.Button>
        </Radio.Group>
      </Card>

      <Button danger onClick={lock}>
        锁定应用
      </Button>
    </div>
  );
}
