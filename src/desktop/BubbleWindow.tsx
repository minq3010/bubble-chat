import { useEffect, useRef, useState } from "react"
import FloatingBubble from "../components/FloatingBubble"
import { bubbleIconNames, type BubbleIconName } from "../components/BrandIcons"
import { desktop } from "./bridge"
import { totalUnread, useUnreadCounts } from "../hooks/useUnreadCounts"
import { withTransitionSuppression } from "../utils/theme"

/**
 * Renderer for the transparent, always-on-top bubble window.
 * Distinguishes single clicks (to toggle panel) from dragging (to reposition bubble).
 */
export default function BubbleWindow() {
  const unreadCounts = useUnreadCounts()
  const unread = totalUnread(unreadCounts)
  const [theme, setTheme] = useState(
    () => localStorage.getItem("bubble.theme") || "System",
  )
  const [size, setSize] = useState<"Small" | "Medium" | "Large">(() => {
    const value = localStorage.getItem("bubble.bubbleSize")
    return value === "Small" || value === "Large" ? value : "Medium"
  })
  const [opacity, setOpacity] = useState(() => {
    const value = Number(localStorage.getItem("bubble.bubbleOpacity"))
    return value >= 20 && value <= 100 ? value : 100
  })
  const [icon, setIcon] = useState<BubbleIconName>(() => {
    const value = localStorage.getItem("bubble.bubbleIcon")
    return bubbleIconNames.includes(value as BubbleIconName)
      ? value as BubbleIconName
      : "default"
  })
  const [systemIsDark, setSystemIsDark] = useState(() =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : true,
  )
  const [isDraggingVisual, setIsDraggingVisual] = useState(false)

  const lastClickRef = useRef(0)

  useEffect(() => {
    document.documentElement.style.background = "transparent"
    document.body.style.background = "transparent"

    desktop()
      ?.getSettings()
      .then((settings) => {
        if (settings?.theme)
          setTheme((prev) => (prev === settings.theme ? prev : settings.theme))
        if (
          settings?.bubbleSize &&
          (settings.bubbleSize === "Small" ||
            settings.bubbleSize === "Medium" ||
            settings.bubbleSize === "Large")
        ) {
          setSize(settings.bubbleSize)
        }
        if (Number.isFinite(settings?.bubbleOpacity)) {
          setOpacity(settings.bubbleOpacity)
        }
        if (bubbleIconNames.includes(settings?.bubbleIcon as BubbleIconName)) {
          setIcon(settings.bubbleIcon as BubbleIconName)
        }
      })
      .catch(() => {})

    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const onMediaChange = (e: MediaQueryListEvent) => {
      withTransitionSuppression(() => {
        setSystemIsDark(e.matches)
      })
    }
    media.addEventListener("change", onMediaChange)

    const offIpc = desktop()?.onAppearance((data) => {
      if (data.theme) {
        withTransitionSuppression(() => {
          setTheme((prev) => (prev === data.theme ? prev : data.theme || prev))
        })
      }
      if (
        data.bubbleSize &&
        (data.bubbleSize === "Small" ||
          data.bubbleSize === "Medium" ||
          data.bubbleSize === "Large")
      ) {
        setSize(data.bubbleSize)
      }
      if (
        typeof data.bubbleOpacity === "number" &&
        Number.isFinite(data.bubbleOpacity)
      ) {
        setOpacity(data.bubbleOpacity)
      }
      if (bubbleIconNames.includes(data.bubbleIcon as BubbleIconName)) {
        setIcon(data.bubbleIcon as BubbleIconName)
      }
    })

    type AppearanceEventDetail = {
      key: string
      value: string
    }
    const onAppearance = (event: Event) => {
      const value = (event as CustomEvent<AppearanceEventDetail>).detail
      if (value.key === "bubble.theme") {
        withTransitionSuppression(() => {
          setTheme((prev) => (prev === value.value ? prev : value.value))
        })
      }
      if (
        value.key === "bubble.bubbleSize" &&
        (value.value === "Small" ||
          value.value === "Medium" ||
          value.value === "Large")
      ) {
        setSize(value.value)
      }
      if (value.key === "bubble.bubbleOpacity") {
        const next = Number(value.value)
        if (next >= 20 && next <= 100) setOpacity(next)
      }
      if (
        value.key === "bubble.bubbleIcon" &&
        bubbleIconNames.includes(value.value as BubbleIconName)
      ) {
        setIcon(value.value as BubbleIconName)
      }
    }
    window.addEventListener("bubble:appearance", onAppearance)

    return () => {
      media.removeEventListener("change", onMediaChange)
      offIpc?.()
      window.removeEventListener("bubble:appearance", onAppearance)
    }
  }, [])

  const isDark = theme === "Dark" || (theme === "System" && systemIsDark)

  useEffect(() => {
    withTransitionSuppression(() => {
      document.documentElement.classList.toggle("dark", isDark)
    })
  }, [isDark])

  const triggerClick = () => {
    const now = Date.now()
    if (now - lastClickRef.current < 200) return
    lastClickRef.current = now
    desktop()?.bubbleClick()
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    event.preventDefault()

    const startX = event.screenX
    const startY = event.screenY
    const startTime = Date.now()
    let isDragging = false

    const onPointerMove = (moveEvent: PointerEvent) => {
      const distance = Math.hypot(
        moveEvent.screenX - startX,
        moveEvent.screenY - startY,
      )
      if (distance > 6) {
        if (!isDragging) {
          isDragging = true
          setIsDraggingVisual(true)
          desktop()?.bubbleDragStart()
        }
      }
    }

    const cleanup = () => {
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      window.removeEventListener("pointercancel", onPointerUp)
      window.removeEventListener("mouseup", onPointerUp)
    }

    const onPointerUp = () => {
      cleanup()

      if (isDragging) {
        setIsDraggingVisual(false)
        desktop()?.bubbleDragEnd()
      } else {
        const elapsed = Date.now() - startTime
        if (elapsed < 600) {
          triggerClick()
        }
      }
    }

    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", onPointerUp)
    window.addEventListener("pointercancel", onPointerUp)
    window.addEventListener("mouseup", onPointerUp)
  }

  return (
    <div
      className={`${
        isDark ? "dark" : ""
      } relative flex h-screen w-screen items-center justify-center bg-transparent select-none`}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        desktop()?.showContextMenu()
      }}
    >
      <div
        onPointerDown={onPointerDown}
        style={{ opacity: opacity / 100 }}
        className={`cursor-grab select-none active:cursor-grabbing ${
          isDraggingVisual ? "cursor-grabbing" : ""
        }`}
      >
        <FloatingBubble
          state={isDraggingVisual ? "dragging" : unread > 0 ? "unread" : "idle"}
          unread={unread}
          size={size}
          icon={icon}
        />
      </div>
    </div>
  )
}
