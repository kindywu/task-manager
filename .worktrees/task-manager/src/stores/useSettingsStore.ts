import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';

interface SettingsState {
  theme: Theme;
  language: string;
  setTheme: (t: Theme) => void;
  setLanguage: (l: string) => void;
  initSettings: () => void;
}

function applyTheme(theme: Theme) {
  const dark =
    theme === 'dark' ||
    (theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: (localStorage.getItem('theme') as Theme) || 'light',
  language: localStorage.getItem('language') || 'zh-CN',

  setTheme: (t) => {
    localStorage.setItem('theme', t);
    set({ theme: t });
    applyTheme(t);
  },

  setLanguage: (l) => {
    localStorage.setItem('language', l);
    set({ language: l });
  },

  initSettings: () => {
    const t = (localStorage.getItem('theme') as Theme) || 'light';
    applyTheme(t);
  },
}));
