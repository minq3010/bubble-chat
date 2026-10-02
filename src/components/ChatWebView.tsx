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

function cleanBidi(text: string): string {
  return String(text || "")
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, "")
    .trim()
}

function isGenericLabel(str: string): boolean {
  const s = cleanBidi(str).toLowerCase().trim()
  if (!s) return true
  if (/[:\uFF1A]/.test(s)) return false
  return (
    /^(?:zalo|messenger|facebook|đoạn chat|chat|tin nhắn mới|các tin nhắn mới|tin mới|tin nhắn chưa đọc|các tin nhắn chưa đọc|tin nhắn chưa xem|chưa đọc|new messages?|unread messages?|unseen messages?|unread)(?:[:\uFF1A\s–—\-·•|/()\[\]]*|\s*\d+\+?|\d+\s*)*$/i.test(
      s,
    ) ||
    /^(?:\(?\d+\+?\)?\s*)?(?:unread messages?|new messages?|unseen messages?|unread|tin nhắn chưa đọc|các tin nhắn chưa đọc|tin nhắn chưa xem|tin nhắn mới|các tin nhắn mới|tin mới|chưa đọc)$/i.test(
      s,
    )
  )
}

function cleanNotificationText(text: string, title = ""): string {
  let s = cleanBidi(text)
  if (!s) return ""
  if (isGenericLabel(s)) return ""

  const prefixRegex =
    /^(?:(?:\(?\d+\+?\)?\s*)?(?:unread messages?|new messages?|unseen messages?|unread|tin nhắn chưa đọc|các tin nhắn chưa đọc|tin nhắn chưa xem|tin nhắn mới|các tin nhắn mới|tin mới|chưa đọc)(?:\s+(?:from|từ)\s+[^:\uFF1A–—\-·•\n]+)?(?:[:\uFF1A–—\-·•|/]+|\s+))/i
  const suffixRegex =
    /[:\uFF1A\s–—\-·•|/()\[\]]*(?:\(?\d+\+?\)?\s*)?(?:unread messages?|new messages?|unseen messages?|unread|tin nhắn chưa đọc|các tin nhắn chưa đọc|tin nhắn chưa xem|tin nhắn mới|các tin nhắn mới|tin mới|chưa đọc)$/i
  const bracketedRegex =
    /(?:^|\s)[\(\[\{](?:\(?\d+\+?\)?\s*)?(?:unread messages?|new messages?|unseen messages?|unread|tin nhắn chưa đọc|các tin nhắn chưa đọc|tin nhắn chưa xem|tin nhắn mới|các tin nhắn mới|chưa đọc)[\)\]\}][:\uFF1A\s–—\-·•]*/gi

  for (let i = 0; i < 5; i++) {
    const before = s
    s = s.replace(bracketedRegex, " ").trim()
    s = s.replace(prefixRegex, "").trim()
    s = s.replace(suffixRegex, "").trim()

    if (title) {
      const cleanT = cleanBidi(title).toLowerCase()
      if (cleanT && !isGenericLabel(cleanT)) {
        const sLower = s.toLowerCase()
        if (sLower.startsWith(cleanT)) {
          const rest = s.slice(cleanT.length)
          if (/^[:\uFF1A\s–—\-·•|/]+/.test(rest)) {
            s = rest.replace(/^[:\uFF1A\s–—\-·•|/]+/, "").trim()
          }
        }
      }
    }
    if (s === before) break
  }
  if (isGenericLabel(s)) return ""
  return s
}

interface NotificationResult {
  title: string
  body: string
}

function resolveNotificationTitleAndBody(
  rawTitle: string,
  rawBody: string,
  fallbackProvider = "Messenger",
): NotificationResult {
  let title = cleanNotificationText(rawTitle || "")
  let body = cleanNotificationText(rawBody || "", title)

  if (!title || isGenericLabel(title)) {
    const sepMatch = body.match(
      /^([^:\uFF1A–—\-·•\n]{1,40})[:\uFF1A–—\-·•]\s*(.+)$/,
    )
    if (sepMatch && !isGenericLabel(sepMatch[1])) {
      title = cleanNotificationText(sepMatch[1])
      body = cleanNotificationText(sepMatch[2], title)
    } else {
      title = ""
    }
  }

  if (!body && title) {
    const sepMatch = title.match(
      /^([^:\uFF1A–—\-·•\n]{1,40})[:\uFF1A–—\-·•]\s*(.+)$/,
    )
    if (sepMatch && !isGenericLabel(sepMatch[1])) {
      title = cleanNotificationText(sepMatch[1])
      body = cleanNotificationText(sepMatch[2], title)
    }
  }

  if (isGenericLabel(title)) title = ""
  if (isGenericLabel(body)) body = ""

  return {
    title: title || fallbackProvider,
    body: body,
  }
}

export default function ChatWebView({
  provider,
  url,
  onStateChange,
  active,
  resizeToken,
  reloadToken,
}: {
  provider: Provider
  url: string
  onStateChange: (state: "ready" | "failed") => void
  active: boolean
  resizeToken: string
  reloadToken?: number
}) {
  const viewRef = useRef<HTMLElement>(null)
  const prevReloadTokenRef = useRef(reloadToken)

  useEffect(() => {
    if (reloadToken && reloadToken !== prevReloadTokenRef.current) {
      prevReloadTokenRef.current = reloadToken
      const view = viewRef.current as HTMLElement & {
        reload?: () => void
        loadURL?: (targetUrl: string) => void
      } | null
      if (view && typeof view.reload === "function") {
        try {
          view.reload()
        } catch {
          if (typeof view.loadURL === "function" && url) {
            try {
              view.loadURL(url)
            } catch {}
          }
        }
      }
    }
  }, [reloadToken, url])

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
              let titleCand = ""
              let bodyCand = ""
              if (clean.includes(": ")) {
                const parts = clean.split(/:\s+/)
                titleCand = parts[0].trim()
                bodyCand = parts.slice(1).join(": ").trim()
              } else {
                titleCand = clean
              }
              const pName =
                provider === "zalo"
                  ? "Zalo"
                  : provider === "messenger"
                    ? "Messenger"
                    : "Tin nhắn mới"
              const res = resolveNotificationTitleAndBody(
                titleCand,
                bodyCand,
                pName,
              )
              if (res.title || res.body) {
                desktop()?.reportNotification?.({
                  provider,
                  title: res.title || pName,
                  body: res.body,
                  icon: "",
                })
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
          const res = resolveNotificationTitleAndBody(
            data.title || "",
            data.body || "",
            pName,
          )
          desktop()?.reportNotification?.({
            provider,
            title: res.title || pName,
            body: res.body,
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
    view.addEventListener("did-navigate", applyAdBlock)
    view.addEventListener("did-navigate-in-page", applyAdBlock)

    return () => {
      view.removeEventListener("dom-ready", onDomReady)
      view.removeEventListener("did-finish-load", finish)
      view.removeEventListener("did-fail-load", fail)
      view.removeEventListener("page-title-updated", handleTitleUpdated)
      view.removeEventListener("console-message", handleConsoleMessage)
      view.removeEventListener("did-navigate", applyAdBlock)
      view.removeEventListener("did-navigate-in-page", applyAdBlock)
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
