import type { Toast } from '../hooks/useToasts'

type Props = {
  toasts: Toast[]
  onDismiss: (id: number) => void
}

export function Toasts({ toasts, onDismiss }: Props) {
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          className={`glass toast ${toast.kind}`}
          role={toast.kind === 'error' ? 'alert' : 'status'}
          onClick={() => onDismiss(toast.id)}
          title="Dismiss"
        >
          <span className="toast-icon" aria-hidden="true">
            {toast.kind === 'success' ? '✓' : '!'}
          </span>
          {toast.text}
        </button>
      ))}
    </div>
  )
}
