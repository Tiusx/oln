import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

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

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = ++toastSeq;
    setToasts((prev) => [...prev, { id, type, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span className="toast-icon">
              {t.type === 'success' ? '✓' : t.type === 'error' ? '×' : 'i'}
            </span>
            {t.message}
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

  const confirm = useCallback((input: string | ConfirmOptions) => {
    const opts: ConfirmOptions = typeof input === 'string' ? { message: input } : input;
    return new Promise<boolean>((resolve) => {
      const id = ++toastSeq;
      setState({ id, opts, resolve });
    });
  }, []);

  const close = (result: boolean) => {
    const cur = stateRef.current;
    if (cur?.resolve) cur.resolve(result);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) close(false); }}>
          <div className="modal" role="dialog" aria-modal="true">
            <div className="modal-head">{state.opts.title || '确认操作'}</div>
            <div className="modal-body">{state.opts.message}</div>
            <div className="modal-actions">
              <button className="ghost" onClick={() => close(false)}>
                {state.opts.cancelText || '取消'}
              </button>
              <button
                className={state.opts.danger ? 'danger' : undefined}
                onClick={() => close(true)}
                autoFocus
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
