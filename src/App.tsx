import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntApp, theme, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useAuthStore } from './stores/useAuthStore';
import { useSettingsStore } from './stores/useSettingsStore';
import { getDb } from './db/database';
import './i18n';
import UnlockPage from './routes/UnlockPage';
import Layout from './components/Layout';
import CloseDialog from './components/CloseDialog';

const KanbanBoard = lazy(() => import('./routes/KanbanBoard'));
const StatisticsPage = lazy(() => import('./routes/StatisticsPage'));
const SettingsPage = lazy(() => import('./routes/SettingsPage'));

function AppInner() {
  const isLocked = useAuthStore((s) => s.isLocked);
  const { theme: appTheme, language, initSettings } = useSettingsStore();
  const [dbReady, setDbReady] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const closingRef = useRef(false);

  useEffect(() => {
    getDb().then(() => setDbReady(true));
    initSettings();
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    getCurrentWindow().onCloseRequested(async (event) => {
      if (closingRef.current) return;
      const behavior = localStorage.getItem('close-behavior');
      if (behavior === 'hide') {
        event.preventDefault();
        await getCurrentWindow().hide();
      } else if (behavior === 'quit') {
        // let the window close normally
      } else {
        event.preventDefault();
        setCloseDialogOpen(true);
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, []);

  const handleHide = useCallback(async (remember: boolean) => {
    if (remember) {
      localStorage.setItem('close-behavior', 'hide');
    }
    setCloseDialogOpen(false);
    await getCurrentWindow().hide();
  }, []);

  const handleQuit = useCallback(async (remember: boolean) => {
    if (remember) {
      localStorage.setItem('close-behavior', 'quit');
    }
    setCloseDialogOpen(false);
    closingRef.current = true;
    await getCurrentWindow().close();
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
  const isDark = !isLocked && appTheme === 'dark';

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#fa8c16',
          borderRadius: 8,
        },
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
      }}
      locale={antdLocale}
    >
      <AntApp>
        {isLocked ? (
          <UnlockPage />
        ) : (
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
        )}
        <CloseDialog
          open={closeDialogOpen}
          onHide={handleHide}
          onQuit={handleQuit}
        />
      </AntApp>
    </ConfigProvider>
  );
}

export default function App() {
  return <AppInner />;
}
