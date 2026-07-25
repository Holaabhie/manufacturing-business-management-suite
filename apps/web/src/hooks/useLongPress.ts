import { useRef, useCallback } from "react"

const LONG_PRESS_DURATION = 500   // 500ms exactly
const MOVE_THRESHOLD = 10          // cancel if moved > 10px

export function useLongPress(
  onLongPress: () => void,
  onClick?: () => void
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startPos = useRef<{ x: number; y: number } | null>(null)
  const triggered = useRef(false)

  const start = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    triggered.current = false
    const point = "touches" in e ? e.touches[0] : e
    startPos.current = { x: point.clientX, y: point.clientY }

    timerRef.current = setTimeout(() => {
      triggered.current = true
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(50)   // subtle haptic feedback
      }
      onLongPress()
    }, LONG_PRESS_DURATION)
  }, [onLongPress])

  const move = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!startPos.current || !timerRef.current) return
    const point = "touches" in e ? e.touches[0] : e
    const dx = Math.abs(point.clientX - startPos.current.x)
    const dy = Math.abs(point.clientY - startPos.current.y)

    // Cancel if scrolling — do not trigger long press
    if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const end = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (!triggered.current && onClick) {
      onClick()
    }
  }, [onClick])

  return {
    onMouseDown: start,
    onMouseMove: move,
    onMouseUp: end,
    onTouchStart: start,
    onTouchMove: move,
    onTouchEnd: end,
    onTouchCancel: end,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault()
  }
}
