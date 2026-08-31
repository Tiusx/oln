import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

// ---------------------------------------------------------------------------
// ToastContext — lightweight toast notifications
// ---------------------------------------------------------------------------
interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastCtx {
  toast: (message: string, type?: Toast['type']) => void;
}

const ToastContext = createContext<ToastCtx>({ toast: () => {} });
export const useToast = () => useContext(ToastContext);

let toastSeq = 0;

const TOAST_ICON: Record<Toast['type'], string> = {
  success: '✓',
  error: '!',
  info: 'i',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = ++toastSeq;
    setToasts((prev) => [...prev, { id, type, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-wrap" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`} role="status">
            <span className="toast-icon" aria-hidden="true">{TOAST_ICON[t.type]}</span>
            <span className="toast-msg">{t.message}</span>
            <button
              className="toast-close"
              onClick={() => dismiss(t.id)}
              aria-label="关闭提示"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// ConfirmContext — async confirmation modal replacing window.confirm
// ---------------------------------------------------------------------------
interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface ConfirmCtx {
  confirm: (opts: string | ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmCtx>({ confirm: async () => false });
export const useConfirm = () => useContext(ConfirmContext);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ id: number; opts: ConfirmOptions; resolve?: (v: boolean) => void } | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const cancelRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback((input: string | ConfirmOptions) => {
    const opts: ConfirmOptions = typeof input === 'string' ? { message: input } : input;
    return new Promise<boolean>((resolve) => {
      const id = ++toastSeq;
      setState({ id, opts, resolve });
    });
  }, []);

  const close = useCallback((result: boolean) => {
    const cur = stateRef.current;
    if (cur?.resolve) cur.resolve(result);
    setState(null);
  }, []);

  // Close on Escape + focus the cancel button when the modal opens
  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
    };
    document.addEventListener('keydown', onKey);
    cancelRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [state, close]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) close(false); }}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
            <div className="modal-head" id="confirm-title">{state.opts.title || '确认操作'}</div>
            <div className="modal-body">{state.opts.message}</div>
            <div className="modal-actions">
              <button className="ghost" ref={cancelRef} onClick={() => close(false)}>
                {state.opts.cancelText || '取消'}
              </button>
              <button
                className={state.opts.danger ? 'danger' : undefined}
                onClick={() => close(true)}
              >
                {state.opts.confirmText || '确定'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
