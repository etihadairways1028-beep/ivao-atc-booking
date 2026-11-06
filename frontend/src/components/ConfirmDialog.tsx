import { useEffect, useRef } from 'react'

export type ConfirmRequest = {
  title: string
  message: string
  confirmLabel: string
  resolve: (ok: boolean) => void
}

export function ConfirmDialog({
  request,
  onClose,
}: {
  request: ConfirmRequest
  onClose: (ok: boolean) => void
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      className="glass dialog"
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault()
        onClose(false)
      }}
      // A click on the backdrop lands on the <dialog> element itself.
      onClick={(e) => e.target === ref.current && onClose(false)}
    >
      <h2 id="dialog-title">{request.title}</h2>
      <p className="muted">{request.message}</p>
      <div className="dialog-actions">
        <button type="button" onClick={() => onClose(false)}>
          Cancel
        </button>
        <button
          type="button"
          className="primary danger-fill"
          autoFocus
          onClick={() => onClose(true)}
        >
          {request.confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
