import { useState, useEffect, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntApp, theme, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import { useAuthStore } from './stores/useAuthStore';
import { useSettingsStore } from './stores/useSettingsStore';
import { getDb } from './db/database';
import './i18n';
import UnlockPage from './routes/UnlockPage';
import Layout from './components/Layout';

const KanbanBoard = lazy(() => import('./routes/KanbanBoard'));
const StatisticsPage = lazy(() => import('./routes/StatisticsPage'));
const SettingsPage = lazy(() => import('./routes/SettingsPage'));

function AppInner() {
  const isLocked = useAuthStore((s) => s.isLocked);
  const { theme: appTheme, language, initSettings } = useSettingsStore();
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    getDb().then(() => setDbReady(true));
    initSettings();
  }, []);

  if (!dbReady) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fff7e6',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  const antdLocale = language === 'zh-CN' ? zhCN : enUS;

  if (isLocked) {
    return (
      <ConfigProvider
        theme={{ token: { colorPrimary: '#fa8c16' } }}
        locale={antdLocale}
      >
        <AntApp>
          <UnlockPage />
        </AntApp>
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#fa8c16',
          borderRadius: 8,
        },
        algorithm:
          appTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
      }}
      locale={antdLocale}
    >
      <AntApp>
        <HashRouter>
          <Suspense fallback={<Spin size="large" />}>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<KanbanBoard />} />
                <Route path="/statistics" element={<StatisticsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </HashRouter>
      </AntApp>
    </ConfigProvider>
  );
}

export default function App() {
  return <AppInner />;
}
