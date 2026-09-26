/**
 * Sonner Notification & Toast Event Engine
 *
 * Inspired by emilkowalski/sonner and Linear's fluid toast stack.
 * Manages spring-animated stacked floating notifications, auto-dismiss timers,
 * action callbacks, and severity levels.
 */

export type ToastType = 'success' | 'info' | 'warning' | 'error' | 'ai';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface SonnerToastItem {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
  durationMs?: number;
  action?: ToastAction;
  timestamp: number;
}

type ToastListener = (toasts: SonnerToastItem[]) => void;

export class SonnerNotificationEngine {
  private static instance: SonnerNotificationEngine;
  private toasts: SonnerToastItem[] = [];
  private listeners: Set<ToastListener> = new Set();
  private maxVisible: number = 4;

  private constructor() {}

  public static getInstance(): SonnerNotificationEngine {
    if (!SonnerNotificationEngine.instance) {
      SonnerNotificationEngine.instance = new SonnerNotificationEngine();
    }
    return SonnerNotificationEngine.instance;
  }

  public subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    listener([...this.toasts]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const list = [...this.toasts];
    this.listeners.forEach(cb => cb(list));
  }

  public show(options: {
    title: string;
    description?: string;
    type?: ToastType;
    durationMs?: number;
    action?: ToastAction;
  }): string {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const duration = options.durationMs ?? 4200;

    const newToast: SonnerToastItem = {
      id,
      title: options.title,
      description: options.description,
      type: options.type || 'info',
      durationMs: duration,
      action: options.action,
      timestamp: Date.now()
    };

    // Prepend to stack and truncate to maxVisible + buffer
    this.toasts = [newToast, ...this.toasts].slice(0, 10);
    this.notify();

    // Auto-dismiss timer
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }

    return id;
  }

  public success(title: string, description?: string, action?: ToastAction): string {
    return this.show({ title, description, type: 'success', action });
  }

  public error(title: string, description?: string, action?: ToastAction): string {
    return this.show({ title, description, type: 'error', action, durationMs: 6000 });
  }

  public warning(title: string, description?: string, action?: ToastAction): string {
    return this.show({ title, description, type: 'warning', action });
  }

  public ai(title: string, description?: string, action?: ToastAction): string {
    return this.show({ title, description, type: 'ai', action, durationMs: 5000 });
  }

  public dismiss(id: string) {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.notify();
  }

  public clearAll() {
    this.toasts = [];
    this.notify();
  }

  public getToasts(): SonnerToastItem[] {
    return [...this.toasts];
  }
}

export const sonnerNotificationEngine = SonnerNotificationEngine.getInstance();
