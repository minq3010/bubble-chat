import { createElement, useCallback, useEffect, useRef } from "react"
import { desktop } from "../desktop/bridge"
import {
  AD_BLOCK_CSS,
  AD_BLOCK_SCRIPT,
  REALTIME_OBSERVER_SCRIPT,
  UNREAD_PROBE,
} from "../desktop/webviewScripts"
import { useWebviewZoom } from "../hooks/useWebviewZoom"
import type { Provider } from "./ChatPanelParts"

export default function ChatWebView({
  provider,
  url,
  onStateChange,
  active,
  resizeToken,
}: {
  provider: Provider
  url: string
  onStateChange: (state: "ready" | "failed") => void
  active: boolean
  resizeToken: string
}) {
  const viewRef = useRef<HTMLElement>(null)
  const {
    zoomBadgeVisible,
    formattedZoomPercent,
    bindWebview,
    triggerGuestResize,
  } = useWebviewZoom(provider)

  const applyAdBlock = useCallback(() => {
    if (localStorage.getItem("bubble.adBlock") === "false") return
    const view = viewRef.current as HTMLElement & {
      insertCSS?: (css: string) => Promise<unknown>
      executeJavaScript?: (code: string) => Promise<unknown>
    } | null
    if (!view) return
    try {
      if (typeof view.insertCSS === "function") {
        void view.insertCSS(AD_BLOCK_CSS).catch(() => {})
      }
      if (typeof view.executeJavaScript === "function") {
        void view.executeJavaScript(AD_BLOCK_SCRIPT).catch(() => {})
      }
    } catch {}
  }, [])

  const injectObserver = useCallback(() => {
    const view = viewRef.current as HTMLElement & {
      executeJavaScript?: (code: string) => Promise<unknown>
    } | null
    if (!view || typeof view.executeJavaScript !== "function") return
    try {
      void view.executeJavaScript(REALTIME_OBSERVER_SCRIPT).catch(() => {})
    } catch {}
  }, [])

  const lastNotifTimeRef = useRef(0)
  const prevUnreadRef = useRef(0)

  const handleReportUnread = useCallback(
    (count: number) => {
      const safeCount = Math.min(Math.max(0, count), 999)
      if (safeCount > prevUnreadRef.current) {
        const view = viewRef.current as HTMLElement & {
          executeJavaScript?: (code: string) => Promise<unknown>
        } | null
        if (view && typeof view.executeJavaScript === "function") {
          void view
            .executeJavaScript(
              "if (window.__bubble_extract_and_send) window.__bubble_extract_and_send();",
            )
            .catch(() => {})
        }
      }
      prevUnreadRef.current = safeCount
      desktop()?.reportUnread(provider, safeCount)
    },
    [provider],
  )

  const pollUnread = useCallback(() => {
    if (!viewRef.current) return
    const view = viewRef.current as HTMLElement & {
      executeJavaScript?: (code: string) => Promise<unknown>
    }
    if (typeof view.executeJavaScript !== "function") return
    try {
      void view
        .executeJavaScript(UNREAD_PROBE)
        .then((value) => {
          const count =
            typeof value === "number" && Number.isFinite(value)
              ? Math.max(0, Math.floor(value))
              : 0
          handleReportUnread(count)
        })
        .catch(() => undefined)
    } catch {
      // The webview is not attached until dom-ready.
    }
  }, [handleReportUnread])

  useEffect(() => triggerGuestResize(), [resizeToken, triggerGuestResize])

  useEffect(() => {
    if (!viewRef.current) return
    const view = viewRef.current
    bindWebview(view)

    const handleTitleUpdated = (e: any) => {
      const title: string = e.title || ""
      const match =
        title.match(/^[\(\[]\s*(\d+)\+?\s*[\)\]]/) ||
        title.match(
          /[\(\[]\s*(\d+)\+?\s*[\)\]]\s*(?:Zalo|Messenger|Facebook|Đoạn chat|Chat)/i,
        ) ||
        title.match(/[\(\[](\d+)\+?[\)\]]/)
      if (match) {
        const count = parseInt(match[1], 10)
        if (Number.isFinite(count) && count >= 0) {
          if (count > 0) {
            const mFull = title.match(/^[\(\[]\s*\d+\+?\s*[\)\]]\s*(.*?)$/)
            if (mFull && mFull[1]) {
              const clean = mFull[1]
                .replace(/[-–—|•]\s*(?:Zalo|Messenger|Facebook).*$/i, "")
                .trim()
              if (clean.includes(": ")) {
                const parts = clean.split(/:\s+/)
                const sender = parts[0].trim()
                const message = parts
                  .slice(1)
                  .join(": ")
                  .trim()
                  .replace(
                    /^(?:unread messages?|new messages?|các tin nhắn chưa đọc|tin nhắn chưa đọc|tin nhắn mới)[:\s]+/i,
                    "",
                  )
                  .trim()
                if (sender || message) {
                  desktop()?.reportNotification?.({
                    provider,
                    title:
                      sender || (provider === "zalo" ? "Zalo" : "Messenger"),
                    body: message,
                    icon: "",
                  })
                }
              }
            }
          }
          if (provider === "zalo") {
            // For Zalo, count is strictly per-person/conversation, computed from DOM
            pollUnread()
          } else {
            handleReportUnread(count)
          }
        }
      } else {
        pollUnread()
      }
    }

    const handleConsoleMessage = (e: any) => {
      const msg: string = e.message || ""
      if (msg.startsWith("__BUBBLE_NOTIFICATION_DATA__:")) {
        try {
          const raw = msg.slice("__BUBBLE_NOTIFICATION_DATA__:".length).trim()
          const data = JSON.parse(raw)
          lastNotifTimeRef.current = Date.now()
          const pName =
            provider === "zalo"
              ? "Zalo"
              : provider === "messenger"
                ? "Messenger"
                : "Tin nhắn mới"
          const cleanBody = (data.body || "")
            .replace(
              /^(?:unread messages?|new messages?|các tin nhắn chưa đọc|tin nhắn chưa đọc|tin nhắn mới)[:\s]+/i,
              "",
            )
            .trim()
          desktop()?.reportNotification?.({
            provider,
            title: data.title || pName,
            body: cleanBody,
            icon: data.icon || "",
          })
        } catch {}
        pollUnread()
      } else if (msg.startsWith("__BUBBLE_UNREAD__:")) {
        const raw = msg.slice("__BUBBLE_UNREAD__:".length).trim()
        const count = parseInt(raw, 10)
        if (Number.isFinite(count) && count >= 0) {
          handleReportUnread(count)
        }
      } else if (msg.startsWith("__BUBBLE_NOTIF__:")) {
        pollUnread()
      }
    }

    const onDomReady = () => {
      applyAdBlock()
      injectObserver()
      pollUnread()
    }

    const finish = () => {
      onStateChange("ready")
      triggerGuestResize()
      injectObserver()
      pollUnread()
    }
    const fail = () => {
      onStateChange("failed")
      desktop()?.reportUnread(provider, 0)
    }

    view.addEventListener("dom-ready", onDomReady)
    view.addEventListener("did-finish-load", finish)
    view.addEventListener("did-fail-load", fail)
    view.addEventListener("page-title-updated", handleTitleUpdated)
    view.addEventListener("console-message", handleConsoleMessage)

    return () => {
      view.removeEventListener("dom-ready", onDomReady)
      view.removeEventListener("did-finish-load", finish)
      view.removeEventListener("did-fail-load", fail)
      view.removeEventListener("page-title-updated", handleTitleUpdated)
      view.removeEventListener("console-message", handleConsoleMessage)
    }
  }, [
    onStateChange,
    provider,
    bindWebview,
    triggerGuestResize,
    pollUnread,
    applyAdBlock,
    injectObserver,
  ])

  useEffect(() => {
    if (url === "about:blank") return
    pollUnread()
    const timer = window.setInterval(pollUnread, active ? 15000 : 45000)
    return () => window.clearInterval(timer)
  }, [active, pollUnread, provider, url])

  return (
    <div className="relative flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      {createElement("webview", {
        key: `${provider}-${url}`,
        ref: viewRef,
        src: url,
        partition: `persist:${provider}`,
        allowpopups: "true",
        webpreferences:
          "backgroundThrottling=no,contextIsolation=yes,autoplayPolicy=no-user-gesture-required",
        useragent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        style: {
          width: "100%",
          height: "100%",
          minWidth: 0,
          minHeight: 0,
          display: "flex",
          flex: "1 1 0%",
          backgroundColor: "var(--panel)",
        },
      })}
      {zoomBadgeVisible && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/80 px-3 py-1 font-mono text-[11px] font-medium text-white shadow-lg backdrop-blur transition-opacity">
          Zoom {formattedZoomPercent}
        </div>
      )}
    </div>
  )
}
