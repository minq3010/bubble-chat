import { useEffect, useState, useRef } from "react"
import { X, MessageCircle } from "lucide-react"
import { MessengerIcon, ZaloIcon } from "../components/BrandIcons"
import { desktop, type IncomingNotification } from "./bridge"
import { withTransitionSuppression } from "../utils/theme"
import { useTranslation } from "../utils/i18n"

let audioCtx: AudioContext | null = null

function playChime() {
  try {
    if (!audioCtx || audioCtx.state === "closed") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      audioCtx = new AudioCtx()
    }
    if (audioCtx.state === "suspended") {
      void audioCtx.resume()
    }
    const now = audioCtx.currentTime

    // Note 1: 587.33 Hz (D5)
    const osc1 = audioCtx.createOscillator()
    const gain1 = audioCtx.createGain()
    osc1.type = "sine"
    osc1.frequency.setValueAtTime(587.33, now)
    gain1.gain.setValueAtTime(0.06, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22)
    osc1.connect(gain1)
    gain1.connect(audioCtx.destination)
    osc1.start(now)
    osc1.stop(now + 0.22)

    // Note 2: 880 Hz (A5)
    const osc2 = audioCtx.createOscillator()
    const gain2 = audioCtx.createGain()
    osc2.type = "sine"
    osc2.frequency.setValueAtTime(880, now + 0.07)
    gain2.gain.setValueAtTime(0.08, now + 0.07)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
    osc2.connect(gain2)
    gain2.connect(audioCtx.destination)
    osc2.start(now + 0.07)
    osc2.stop(now + 0.4)
  } catch {}
}

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

export default function ToastWindow() {
  const { t } = useTranslation()
  const [data, setData] = useState<IncomingNotification | null>(null)
  const [visible, setVisible] = useState(false)
  const [theme, setTheme] = useState(
    () => localStorage.getItem("bubble.theme") || "System",
  )
  const [systemIsDark, setSystemIsDark] = useState(() =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : true,
  )
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    document.documentElement.style.background = "transparent"
    document.body.style.background = "transparent"

    desktop()
      ?.getSettings()
      .then((settings) => {
        if (settings?.theme) {
          setTheme((prev) => (prev === settings.theme ? prev : settings.theme))
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

    const offIpc = desktop()?.onAppearance((appearance) => {
      if (appearance.theme) {
        withTransitionSuppression(() => {
          setTheme((prev) =>
            prev === appearance.theme ? prev : appearance.theme || prev,
          )
        })
      }
    })

    const offToastShow = desktop()?.onToastShow?.((incoming) => {
      if (incoming.theme) {
        withTransitionSuppression(() => {
          setTheme((prev) =>
            prev === incoming.theme ? prev : incoming.theme || prev,
          )
        })
      }
      setData(incoming)
      setVisible(false)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true)
        })
      })
      playChime()
    })

    const offToastHide = desktop()?.onToastHide?.(() => {
      setVisible(false)
    })

    return () => {
      media.removeEventListener("change", onMediaChange)
      offIpc?.()
      offToastShow?.()
      offToastHide?.()
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [])

  const isDark = theme === "Dark" || (theme === "System" && systemIsDark)

  useEffect(() => {
    withTransitionSuppression(() => {
      document.documentElement.classList.toggle("dark", isDark)
    })
  }, [isDark])

  if (!data) return null

  const isFromRight = data.direction !== "from-left"

  const handleClick = () => {
    desktop()?.toastClick?.(data.provider)
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation()
    setVisible(false)
    desktop()?.toastDismiss?.()
  }

  const fallback = data.provider === "zalo" ? "Zalo" : "Messenger"
  const resolved = resolveNotificationTitleAndBody(
    data.title || "",
    data.body || "",
    fallback,
  )

  const titleText = resolved.title || fallback
  const bodyText =
    resolved.body && resolved.body.trim()
      ? resolved.body.trim()
      : t("newMessage") || "Tin nhắn mới"

  return (
    <div
      className={`${
        isDark ? "dark" : ""
      } flex h-screen w-screen items-center justify-center bg-transparent select-none p-2`}
    >
      <div
        onClick={handleClick}
        className={`relative flex h-full w-full items-center gap-2.5 rounded-xl border border-border/80 bg-card text-card-foreground px-3 py-2 shadow-md transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer hover:border-primary/50 active:scale-[0.98] ${
          visible
            ? "translate-x-0 opacity-100 scale-100"
            : `opacity-0 scale-95 pointer-events-none ${
                isFromRight ? "translate-x-4" : "-translate-x-4"
              }`
        }`}
      >
        {/* Provider Icon / Contact Avatar */}
        <div className="relative shrink-0">
          {data.icon && data.icon.startsWith("http") ? (
            <img
              src={data.icon}
              alt=""
              className="h-9 w-9 rounded-lg object-cover ring-1 ring-border/50"
            />
          ) : (
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-muted text-foreground ring-1 ring-border/50">
              {data.provider === "messenger" ? (
                <MessengerIcon size={22} />
              ) : data.provider === "zalo" ? (
                <ZaloIcon size={22} />
              ) : (
                <MessageCircle size={22} className="text-primary" />
              )}
            </div>
          )}
        </div>

        {/* Message preview details */}
        <div className="min-w-0 flex-1 pr-1">
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-[12.5px] font-semibold text-foreground leading-tight">
              {titleText}
            </span>
            <span className="shrink-0 font-mono text-[10px] text-muted-foreground/80">
              {t("justNow") || "vừa xong"}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground line-clamp-2 break-words">
            {bodyText}
          </p>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          aria-label="Dismiss"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  )
}
