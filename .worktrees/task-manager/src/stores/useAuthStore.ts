import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

interface AuthState {
  isLocked: boolean;
  isFirstRun: boolean;
  unlock: (pin: string) => Promise<boolean>;
  setPin: (pin: string) => Promise<void>;
  changePin: (oldPin: string, newPin: string) => Promise<boolean>;
  checkPinStatus: () => Promise<void>;
  lock: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isLocked: true,
  isFirstRun: false,

  checkPinStatus: async () => {
    const has = await invoke<boolean>('has_pin');
    set({ isFirstRun: !has, isLocked: true });
  },

  unlock: async (pin: string) => {
    const ok = await invoke<boolean>('verify_pin', { pin });
    if (ok) set({ isLocked: false, isFirstRun: false });
    return ok;
  },

  setPin: async (pin: string) => {
    await invoke('set_pin', { pin });
    set({ isLocked: false, isFirstRun: false });
  },

  changePin: async (oldPin: string, newPin: string) => {
    const ok = await invoke<boolean>('change_pin', { oldPin, newPin });
    return ok;
  },

  lock: () => set({ isLocked: true }),
}));
