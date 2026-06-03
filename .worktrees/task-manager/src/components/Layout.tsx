import { Outlet } from 'react-router-dom';
import TopNav from './TopNav';
import { useSettingsStore } from '../stores/useSettingsStore';

export default function Layout() {
  const theme = useSettingsStore((s) => s.theme);
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: isDark ? '#141414' : '#fff7e6',
      }}
    >
      <TopNav />
      <main style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
        <Outlet />
      </main>
    </div>
  );
}
