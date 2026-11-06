import { useCallback, useState } from 'react'
import { ConfirmDialog, type ConfirmRequest } from '../components/ConfirmDialog'

/**
 * Promise-based replacement for window.confirm(), which some hosts block
 * (sandboxed frames) and which can't be styled. Built on <dialog>, so focus
 * trapping, Esc to cancel and the backdrop come from the browser.
 */
export function useConfirm() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null)

  const confirm = useCallback(
    (title: string, message: string, confirmLabel = 'Confirm') =>
      new Promise<boolean>((resolve) =>
        setRequest({ title, message, confirmLabel, resolve }),
      ),
    [],
  )

  const close = (ok: boolean) => {
    request?.resolve(ok)
    setRequest(null)
  }

  const dialog = request ? (
    <ConfirmDialog request={request} onClose={close} />
  ) : null
  return [confirm, dialog] as const
}
