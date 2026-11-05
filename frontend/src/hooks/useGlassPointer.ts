import { useEffect } from 'react'

/**
 * Feeds the pointer position to the glass panel under it (as --mx / --my),
 * which CSS uses to draw a highlight that follows the cursor. One listener
 * for the whole page instead of one per panel.
 */
export function useGlassPointer() {
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return
      const panel = event.target.closest<HTMLElement>('.glass')
      if (!panel) return

      const rect = panel.getBoundingClientRect()
      panel.style.setProperty('--mx', `${event.clientX - rect.left}px`)
      panel.style.setProperty('--my', `${event.clientY - rect.top}px`)
    }

    document.addEventListener('pointermove', onMove, { passive: true })
    return () => document.removeEventListener('pointermove', onMove)
  }, [])
}
