'use client';

import { createContext, ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

type NotificationItem = {
  id: string;
  title?: string;
  message: string;
  type: NotificationType;
  durationMs?: number;
};

type NotificationInput = {
  title?: string;
  message: string;
  type?: NotificationType;
  durationMs?: number;
};

interface NotificationContextType {
  notifications: NotificationItem[];
  notify: (input: NotificationInput) => string;
  success: (message: string, title?: string) => string;
  error: (message: string, title?: string) => string;
  info: (message: string, title?: string) => string;
  warning: (message: string, title?: string) => string;
  remove: (id: string) => void;
  clear: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

const typeStyles: Record<NotificationType, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
};

const typeIcons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
} satisfies Record<NotificationType, typeof CheckCircle2>;

function NotificationViewport({ items, onRemove }: { items: NotificationItem[]; onRemove: (id: string) => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[120] flex justify-center px-3 sm:justify-end sm:px-4">
      <div className="flex w-full max-w-md flex-col gap-3">
        {items.map((item) => {
          const Icon = typeIcons[item.type];
          return (
            <div
              key={item.id}
              className={`pointer-events-auto rounded-[22px] border px-4 py-3 shadow-lg backdrop-blur-xl ${typeStyles[item.type]}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  {item.title ? <p className="text-sm font-semibold">{item.title}</p> : null}
                  <p className="text-sm leading-5">{item.message}</p>
                </div>
                <button
                  type="button"
                  className="rounded-full p-1 transition hover:bg-white/60"
                  onClick={() => onRemove(item.id)}
                  aria-label="Fechar notificação"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const remove = useCallback((id: string) => {
    const timer = timersRef.current[id];
    if (timer) {
      clearTimeout(timer);
      delete timersRef.current[id];
    }
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback(
    ({ title, message, type = 'info', durationMs = 3500 }: NotificationInput) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const item: NotificationItem = { id, title, message, type, durationMs };
      setNotifications((prev) => [...prev, item]);
      timersRef.current[id] = setTimeout(() => remove(id), durationMs);
      return id;
    },
    [remove]
  );

  const clear = useCallback(() => {
    Object.values(timersRef.current).forEach(clearTimeout);
    timersRef.current = {};
    setNotifications([]);
  }, []);

  const value = useMemo<NotificationContextType>(
    () => ({
      notifications,
      notify,
      success: (message, title) => notify({ type: 'success', message, title }),
      error: (message, title) => notify({ type: 'error', message, title, durationMs: 4500 }),
      info: (message, title) => notify({ type: 'info', message, title }),
      warning: (message, title) => notify({ type: 'warning', message, title, durationMs: 4200 }),
      remove,
      clear,
    }),
    [notifications, notify, remove, clear]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationViewport items={notifications} onRemove={remove} />
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
}
