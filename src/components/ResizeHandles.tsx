import React, { useState, useEffect, useRef, useCallback } from "react"
import { desktop, resetPanelPosition } from "../desktop/bridge"
import { useTranslation } from "../utils/i18n"

type ResizeDirection = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw"

interface ResizeHandlesProps {
  children?: React.ReactNode
}

export default function ResizeHandles({ children }: ResizeHandlesProps) {
  const { t } = useTranslation()
  const [isResizing, setIsResizing] = useState(false)
  const [activeDirection, setActiveDirection] = useState<ResizeDirection | null>(null)
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null)
  const [showPill, setShowPill] = useState(false)
  const pillTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.outerWidth || window.innerWidth,
        height: window.outerHeight || window.innerHeight,
      })
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const handleStartResize = useCallback(
    async (direction: ResizeDirection, e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      // Fetch accurate bounds from main process or fallback to window
      let startX = window.screenX
      let startY = window.screenY
      let startWidth = window.outerWidth || window.innerWidth
      let startHeight = window.outerHeight || window.innerHeight

      try {
        const bounds = await desktop()?.getPanelBounds?.()
        if (bounds) {
          startX = bounds.x
          startY = bounds.y
          startWidth = bounds.width
          startHeight = bounds.height
        }
      } catch {}

      const startScreenX = e.screenX
      const startScreenY = e.screenY

      setIsResizing(true)
      setActiveDirection(direction)
      setDimensions({ width: startWidth, height: startHeight })
      setShowPill(true)

      if (pillTimerRef.current) {
        window.clearTimeout(pillTimerRef.current)
        pillTimerRef.current = null
      }

      let rafId: number | null = null

      const onMouseMove = (moveEvent: MouseEvent) => {
        const dx = moveEvent.screenX - startScreenX
        const dy = moveEvent.screenY - startScreenY

        let nextWidth = startWidth
        let nextHeight = startHeight
        let nextX = startX
        let nextY = startY

        // Handle Horizontal
        if (direction.includes("e")) {
          nextWidth = Math.max(200, Math.min(960, startWidth + dx))
        } else if (direction.includes("w")) {
          const rawW = startWidth - dx
          nextWidth = Math.max(200, Math.min(960, rawW))
          nextX = startX + (startWidth - nextWidth)
        }

        // Handle Vertical
        if (direction.includes("s")) {
          nextHeight = Math.max(240, Math.min(1200, startHeight + dy))
        } else if (direction.includes("n")) {
          const rawH = startHeight - dy
          nextHeight = Math.max(240, Math.min(1200, rawH))
          nextY = startY + (startHeight - nextHeight)
        }

        if (rafId) cancelAnimationFrame(rafId)
        rafId = requestAnimationFrame(() => {
          setDimensions({ width: Math.round(nextWidth), height: Math.round(nextHeight) })
          desktop()?.setPanelBounds?.({
            x: Math.round(nextX),
            y: Math.round(nextY),
            width: Math.round(nextWidth),
            height: Math.round(nextHeight),
          })
          if (typeof window !== "undefined" && typeof window.resizeTo === "function") {
            window.resizeTo(Math.round(nextWidth), Math.round(nextHeight))
          }
        })
      }

      const onMouseUp = () => {
        if (rafId) cancelAnimationFrame(rafId)
        window.removeEventListener("mousemove", onMouseMove)
        window.removeEventListener("mouseup", onMouseUp)
        setIsResizing(false)
        setActiveDirection(null)

        pillTimerRef.current = window.setTimeout(() => {
          setShowPill(false)
          pillTimerRef.current = null
        }, 900)
      }

      window.addEventListener("mousemove", onMouseMove)
      window.addEventListener("mouseup", onMouseUp)
    },
    [],
  )

  const handleToggleWideMode = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const currentW = window.outerWidth || window.innerWidth

    // If currently Wide, return to default Compact size AND default position beside bubble
    if (currentW >= 420) {
      if (typeof window !== "undefined" && typeof window.resizeTo === "function") {
        window.resizeTo(260, 370)
      }
      desktop()?.setPanelBounds?.({ width: 260, height: 370 })
      resetPanelPosition()
      setDimensions({ width: 260, height: 370 })
      setShowPill(true)
      if (pillTimerRef.current) window.clearTimeout(pillTimerRef.current)
      pillTimerRef.current = window.setTimeout(() => {
        setShowPill(false)
        pillTimerRef.current = null
      }, 1200)
      return
    }

    // Otherwise, expand to Wide (580x640)
    const targetWidth = 580
    const targetHeight = 640

    try {
      const bounds = await desktop()?.getPanelBounds?.()
      const x = bounds?.x ?? window.screenX
      const y = bounds?.y ?? window.screenY
      desktop()?.setPanelBounds?.({
        x: Math.max(10, x - (targetWidth - currentW)),
        y,
        width: targetWidth,
        height: targetHeight,
      })
    } catch {
      desktop()?.setPanelBounds?.({
        width: targetWidth,
        height: targetHeight,
      })
    }

    if (typeof window !== "undefined" && typeof window.resizeTo === "function") {
      window.resizeTo(targetWidth, targetHeight)
    }

    setDimensions({ width: targetWidth, height: targetHeight })
    setShowPill(true)
    if (pillTimerRef.current) window.clearTimeout(pillTimerRef.current)
    pillTimerRef.current = window.setTimeout(() => {
      setShowPill(false)
      pillTimerRef.current = null
    }, 1200)
  }, [])

  const cursorClassMap: Record<ResizeDirection, string> = {
    n: "cursor-ns-resize",
    s: "cursor-ns-resize",
    e: "cursor-ew-resize",
    w: "cursor-ew-resize",
    ne: "cursor-nesw-resize",
    nw: "cursor-nwse-resize",
    se: "cursor-nwse-resize",
    sw: "cursor-nesw-resize",
  }

  return (
    <div className="relative h-full w-full">
      {children}

      {/* Resize edges */}
      <div
        onMouseDown={(e) => handleStartResize("n", e)}
        className="absolute top-0 left-3 right-3 h-2 z-30 cursor-ns-resize"
      />
      <div
        onMouseDown={(e) => handleStartResize("s", e)}
        className="absolute bottom-0 left-3 right-3 h-2 z-30 cursor-ns-resize"
      />
      <div
        onMouseDown={(e) => handleStartResize("w", e)}
        className="absolute top-3 bottom-3 left-0 w-2 z-30 cursor-ew-resize"
      />
      <div
        onMouseDown={(e) => handleStartResize("e", e)}
        className="absolute top-3 bottom-3 right-0 w-2 z-30 cursor-ew-resize"
      />

      {/* Resize corners */}
      <div
        onMouseDown={(e) => handleStartResize("nw", e)}
        className="absolute top-0 left-0 h-3.5 w-3.5 z-40 cursor-nwse-resize"
      />
      <div
        onMouseDown={(e) => handleStartResize("ne", e)}
        className="absolute top-0 right-0 h-3.5 w-3.5 z-40 cursor-nesw-resize"
      />
      <div
        onMouseDown={(e) => handleStartResize("sw", e)}
        className="absolute bottom-0 left-0 h-3.5 w-3.5 z-40 cursor-nesw-resize"
      />
      <div
        onMouseDown={(e) => handleStartResize("se", e)}
        className="absolute bottom-0 right-0 h-3.5 w-3.5 z-40 cursor-nwse-resize"
      />

      {/* Sleek corner grip in bottom-right */}
      <div
        onMouseDown={(e) => handleStartResize("se", e)}
        onDoubleClick={handleToggleWideMode}
        title={t("resizeHint")}
        className="group absolute bottom-1 right-1 z-40 flex h-4 w-4 cursor-nwse-resize items-end justify-end p-0.5 opacity-40 transition-opacity hover:opacity-100"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-foreground/60 transition-colors group-hover:text-primary"
        >
          <line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="8" y1="5.5" x2="5.5" y2="8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="8" cy="8" r="0.8" fill="currentColor" />
        </svg>
      </div>

      {/* Transparent overlay while resizing to prevent <webview> from stealing mouse events */}
      {isResizing && activeDirection && (
        <div
          className={`fixed inset-0 z-50 select-none ${cursorClassMap[activeDirection]}`}
          style={{ background: "transparent" }}
        />
      )}

      {/* Live Dimension Pill */}
      {showPill && dimensions && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 rounded-full border border-border/60 bg-foreground/90 px-3 py-1 text-[11px] font-medium font-mono text-background shadow-e3 backdrop-blur-md animate-scale-in">
          <span>{dimensions.width}</span>
          <span className="text-background/50">×</span>
          <span>{dimensions.height}</span>
          <span className="text-[10px] text-background/60">px</span>
          {dimensions.width >= 480 && (
            <span className="ml-1 rounded-sm bg-primary/20 px-1 py-0.2 text-[9.5px] font-semibold text-primary">
              Wide
            </span>
          )}
        </div>
      )}
    </div>
  )
}
