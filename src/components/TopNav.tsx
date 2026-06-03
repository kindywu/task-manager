import { useNavigate, useLocation } from 'react-router-dom';
import { Menu } from 'antd';
import { AppstoreOutlined, BarChartOutlined, SettingOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

export default function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const items = [
    { key: '/', icon: <AppstoreOutlined />, label: t('app.kanban') },
    { key: '/statistics', icon: <BarChartOutlined />, label: t('app.statistics') },
    { key: '/settings', icon: <SettingOutlined />, label: t('app.settings') },
  ];

  const selectedKey = location.pathname.startsWith('/statistics')
    ? '/statistics'
    : location.pathname.startsWith('/settings')
      ? '/settings'
      : '/';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        borderBottom: '1px solid #f0f0f0',
        background: '#fff',
        height: 56,
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 700, color: '#fa8c16' }}>
        {t('app.title')}
      </div>
      <Menu
        mode="horizontal"
        selectedKeys={[selectedKey]}
        items={items}
        onClick={({ key }) => navigate(key)}
        style={{ border: 'none', flex: 1, justifyContent: 'center' }}
      />
      <div style={{ width: 100 }} />
    </div>
  );
}
