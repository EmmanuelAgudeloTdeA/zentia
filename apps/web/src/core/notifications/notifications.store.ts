import { create } from 'zustand';
import { useSessionStore } from '../auth';

export const NOTIFICATIONS_PATH = '/notifications';

interface NotificationsState {
  /** `null` mientras no se conoce (la campana no muestra contador ni error). */
  unreadCount: number | null;
  setUnreadCount: (count: number | null) => void;
  decrement: () => void;
}

export const useNotificationsStore = create<NotificationsState>()((set) => ({
  unreadCount: null,
  setUnreadCount: (unreadCount) => set({ unreadCount }),
  decrement: () =>
    set((state) => ({
      unreadCount: state.unreadCount ? state.unreadCount - 1 : state.unreadCount,
    })),
}));

// Al cambiar de usuario (logout o sesión expirada) no debe verse el contador del anterior.
useSessionStore.subscribe((state, previous) => {
  if (state.user?.id !== previous.user?.id) useNotificationsStore.getState().setUnreadCount(null);
});
