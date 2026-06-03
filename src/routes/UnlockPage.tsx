import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import PinInput from '../components/PinInput';

export default function UnlockPage() {
  const { isFirstRun, unlock, setPin, checkPinStatus } = useAuthStore();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    checkPinStatus().then(() => setReady(true));
  }, [checkPinStatus]);

  const handleUnlock = async (pin: string) => {
    setLoading(true);
    setError('');
    const ok = await unlock(pin);
    if (!ok) setError('密码错误，请重试');
    setLoading(false);
  };

  const handleSetPin = async (pin: string) => {
    setLoading(true);
    await setPin(pin);
    setLoading(false);
  };

  if (!ready) return null;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #fff7e6 0%, #fff1cc 100%)',
      }}
    >
      <div
        style={{
          background: '#fff',
          padding: 48,
          borderRadius: 16,
          boxShadow: '0 4px 24px rgba(250, 140, 22, 0.12)',
          width: 400,
        }}
      >
        {isFirstRun ? (
          <PinInput onSubmit={handleSetPin} confirmMode title="设置解锁密码" loading={loading} />
        ) : (
          <PinInput onSubmit={handleUnlock} title="输入密码解锁" error={error} loading={loading} />
        )}
      </div>
    </div>
  );
}
