import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
  createElement,
} from "react"
import {
  RotateCw,
  RotateCcw,
  ExternalLink,
  Minus,
  MoreHorizontal,
  Settings2,
  AlertTriangle,
  Globe,
  Plus,
  X,
  Trash2,
  Check,
} from "lucide-react"
import {
  MessengerIcon,
  ZaloIcon,
  YoutubeIcon,
  TiktokIcon,
  SpotifyIcon,
} from "./BrandIcons"
import { desktop } from "../desktop/bridge"
import { useWebviewZoom } from "../hooks/useWebviewZoom"
import { useUnreadCounts } from "../hooks/useUnreadCounts"
import { useAppUpdate } from "../hooks/useAppUpdate"
import { useTranslation } from "../utils/i18n"

export type Provider = "messenger" | "zalo" | "custom"
export type CustomTab = {
  name: string
  url: string
  color?: string
}

type LoadState = "ready" | "failed"

const defaultMeta = {
  messenger: {
    name: "Messenger",
    Icon: MessengerIcon,
    color: "var(--messenger)",
    url: "https://www.messenger.com",
  },
  zalo: {
    name: "Zalo",
    Icon: ZaloIcon,
    color: "var(--zalo)",
    url: "https://chat.zalo.me",
  },
} as const

type PresetIconProps = {
  className?: string
  size?: number
}

type Preset = {
  name: string
  url: string
  color: string
  Icon?: (props: PresetIconProps) => React.JSX.Element
}

const ENTERTAINMENT_PRESETS: Preset[] = [
  {
    name: "YouTube",
    url: "https://www.youtube.com",
    color: "#FF0000",
    Icon: YoutubeIcon,
  },
  {
    name: "TikTok",
    url: "https://www.tiktok.com",
    color: "#FE2C55",
    Icon: TiktokIcon,
  },
  {
    name: "Spotify",
    url: "https://open.spotify.com",
    color: "#1DB954",
    Icon: SpotifyIcon,
  },
]

const CHAT_PRESETS: Preset[] = [
  { name: "Telegram", url: "https://web.telegram.org/a/", color: "#229ED9" },
  { name: "WhatsApp", url: "https://web.whatsapp.com", color: "#25D366" },
  { name: "Discord", url: "https://discord.com/app", color: "#5865F2" },
  { name: "ChatGPT", url: "https://chatgpt.com", color: "#10A37F" },
  { name: "Slack", url: "https://app.slack.com/client", color: "#E01E5A" },
]

function getCustomTabIcon(name?: string, url?: string) {
  const target = `${name || ""} ${url || ""}`.toLowerCase()
  if (target.includes("youtube") || target.includes("youtu.be"))
    return YoutubeIcon
  if (target.includes("tiktok")) return TiktokIcon
  if (target.includes("spotify")) return SpotifyIcon
  return Globe
}

const UNREAD_PROBE = `(() => {
  if (/\\(\\d+\\)/.test(document.title)) return 1;
  const marker = document.querySelector(
    "[aria-label*='unread' i],[aria-label*='chưa đọc' i],[data-testid*='unread' i],[class*='unread' i]"
  );
  if (marker) return 1;
  const badge = document.querySelector(
    "[aria-label*='notification' i],[aria-label*='thông báo' i]"
  );
  if (badge) return 1;
  return 0;
})()`

const AD_BLOCK_CSS = `
.video-ads,
.ytp-ad-module,
.ytp-ad-overlay-container,
.ytp-ad-player-overlay,
.ytp-ad-player-overlay-layout,
#masthead-ad,
ytd-display-ad-renderer,
ytd-promoted-sparkles-web-renderer,
ytd-promoted-video-renderer,
ytd-banner-promo-renderer,
ytd-ad-slot-renderer,
ytd-in-feed-ad-layout-renderer,
ytd-player-legacy-desktop-watch-ads-renderer,
#player-ads,
tp-yt-paper-dialog:has(#feedback.ytd-enforcement-message-view-model),
ytd-enforcement-message-view-model,
[data-testid="banner-ad"],
[data-testid="in-app-banner"],
[aria-label="Sponsored"],
.upgrade-button,
ins.adsbygoogle,
[id^="google_ads_"],
div[data-google-query-id] {
  display: none !important;
}
`

const AD_BLOCK_SCRIPT = `(() => {
  if (window.__bubbleAdBlockActive) return;
  window.__bubbleAdBlockActive = true;

  const isYouTube = location.hostname.includes("youtube.com") || location.hostname.includes("youtu.be");
  const isSpotify = location.hostname.includes("spotify.com");

  let wasMutedBeforeAd = false;

  function handleYouTube() {
    const skipSelectors = [
      ".ytp-ad-skip-button",
      ".ytp-ad-skip-button-modern",
      ".ytp-skip-ad-button",
      ".ytp-ad-skip-button-slot button",
      "button[id^='skip-button']"
    ];
    for (const sel of skipSelectors) {
      const btn = document.querySelector(sel);
      if (btn && typeof btn.click === "function") {
        btn.click();
        break;
      }
    }

    const player = document.querySelector("#movie_player, .html5-video-player");
    const isAdShowing = player && (
      player.classList.contains("ad-showing") ||
      player.classList.contains("ad-interrupting") ||
      Boolean(document.querySelector(".ytp-ad-player-overlay, .ytp-ad-module:not(:empty)"))
    );
    const video = document.querySelector("video");

    if (video) {
      if (isAdShowing) {
        if (!wasMutedBeforeAd) {
          wasMutedBeforeAd = video.muted;
        }
        video.muted = true;
        video.playbackRate = 16.0;
        if (Number.isFinite(video.duration) && video.duration > 0) {
          video.currentTime = video.duration;
        }
      } else if (video.playbackRate > 2.0) {
        video.playbackRate = 1.0;
        video.muted = wasMutedBeforeAd;
      }
    }

    const dialog = document.querySelector("tp-yt-paper-dialog:has(ytd-enforcement-message-view-model)");
    if (dialog) {
      dialog.remove();
      if (video && video.paused) {
        void video.play().catch(() => {});
      }
    }
    const dismissBtn = document.querySelector("ytd-enforcement-message-view-model #dismiss-button button");
    if (dismissBtn && typeof dismissBtn.click === "function") {
      dismissBtn.click();
    }
  }

  function handleSpotify() {
    const trackInfo = document.querySelector("[data-testid='now-playing-widget'], [data-testid='context-item-info']");
    const isAd = trackInfo && /advertisement|quảng cáo/i.test(trackInfo.textContent || "");
    if (isAd) {
      const skipForward = document.querySelector("[data-testid='control-button-skip-forward']");
      if (skipForward && typeof skipForward.click === "function") {
        skipForward.click();
      }
      const audio = document.querySelector("audio");
      if (audio && Number.isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = audio.duration;
      }
    }
  }

  setInterval(() => {
    try {
      if (isYouTube) handleYouTube();
      if (isSpotify) handleSpotify();
    } catch {}
  }, 600);
})()`

function ProviderTab({
  provider,
  active,
  unread,
  customName,
  customColor,
  onClick,
  onRemove,
  onContextMenu,
}: {
  provider: Provider
  active: boolean
  unread: number
  customName?: string
  customColor?: string
  onClick: () => void
  onRemove?: () => void
  onContextMenu?: (e: React.MouseEvent) => void
}) {
  const isCustom = provider === "custom"
  const name = isCustom ? customName || "Custom" : defaultMeta[provider].name
  const Icon = isCustom
    ? getCustomTabIcon(customName)
    : defaultMeta[provider].Icon
  const color = isCustom
    ? customColor || "var(--primary)"
    : defaultMeta[provider].color

  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      role="button"
      tabIndex={0}
      aria-pressed={active}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick()
        }
      }}
      className={`group relative flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[7px] px-2.5 py-0.5 text-[12px] font-medium transition-all duration-150 outline-none select-none focus-visible:ring-1 focus-visible:ring-ring/60 ${
        active
          ? "bg-card text-card-foreground shadow-sm"
          : "text-muted-foreground hover:bg-card/40 hover:text-foreground"
      }`}
    >
      <Icon
        size={14}
        className="shrink-0"
        style={{ color: isCustom ? color : undefined }}
      />
      <span className="max-w-[85px] truncate" title={name}>
        {name}
      </span>
      {unread > 0 && (
        <span
          className="ml-0.5 h-2 w-2 shrink-0 rounded-full"
          style={{ background: "var(--danger)" }}
        />
      )}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          title="Bỏ tab này"
          className="ml-0.5 -mr-1 flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:bg-muted hover:text-danger"
        >
          <X size={11} />
        </button>
      )}
      {active && (
        <span
          className="absolute -bottom-[3px] left-1/2 h-[2px] w-5 -translate-x-1/2 rounded-full"
          style={{ background: color }}
        />
      )}
    </div>
  )
}

function FailedState({ onReload }: { onReload: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-5 text-center sm:px-10">
      <div
        className="grid h-14 w-14 place-items-center rounded-2xl border border-border"
        style={{
          background: "color-mix(in srgb, var(--muted) 70%, transparent)",
        }}
      >
        <AlertTriangle className="text-danger" size={24} />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-[15px] font-semibold">{t("pageFailed")}</h3>
        <p className="mx-auto max-w-[15rem] text-[12.5px] leading-relaxed text-muted-foreground">
          {t("pageFailedDesc")}
        </p>
      </div>
      <button
        onClick={onReload}
        className="mt-1 rounded-[9px] bg-danger px-4 py-1.5 text-[12.5px] font-medium text-white shadow-e1 transition-transform active:scale-[0.97] cursor-pointer"
      >
        {t("reload")}
      </button>
    </div>
  )
}

function AddTabModal({
  onAdd,
  onClose,
}: {
  onAdd: (tab: CustomTab) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [color, setColor] = useState("#6366F1")
  const [error, setError] = useState("")

  const applyPreset = (preset: Preset) => {
    setName(preset.name)
    setUrl(preset.url)
    setColor(preset.color)
    setError("")
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    let trimmedUrl = url.trim()

    if (!trimmedName) {
      setError(t("nameRequired"))
      return
    }
    if (!trimmedUrl) {
      setError(t("urlRequired"))
      return
    }

    if (!/^https?:\/\//i.test(trimmedUrl)) {
      trimmedUrl = `https://${trimmedUrl}`
    }

    try {
      new URL(trimmedUrl)
    } catch {
      setError(t("invalidUrl"))
      return
    }

    onAdd({
      name: trimmedName,
      url: trimmedUrl,
      color,
    })
  }

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px] animate-in fade-in duration-150">
      <div className="flex w-full max-w-[320px] flex-col rounded-[14px] border border-border/80 bg-panel p-4 shadow-e3">
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">
              <Globe size={15} />
            </div>
            <div>
              <h4 className="text-[13px] font-semibold text-foreground">
                {t("addNewTab")}
              </h4>
              <p className="text-[10.5px] text-muted-foreground">
                {t("maxOneTab")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {/* Presets */}
        <div className="mt-2 space-y-2">
          <div>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              🎬 {t("entertainment")}
            </span>
            <div className="mt-1 flex flex-wrap gap-1">
              {ENTERTAINMENT_PRESETS.map((p) => {
                const IconComponent = p.Icon
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className={`inline-flex items-center gap-1.5 rounded-[6px] border px-2 py-0.5 text-[11px] font-medium transition-all cursor-pointer ${
                      name === p.name
                        ? "border-primary bg-primary/10 font-semibold text-primary"
                        : "border-border/60 bg-card/50 text-muted-foreground hover:bg-card hover:text-foreground"
                    }`}
                  >
                    {IconComponent && <IconComponent size={12} />}
                    <span>{p.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              💬 {t("chatAndAi")}
            </span>
            <div className="mt-1 flex flex-wrap gap-1">
              {CHAT_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className={`rounded-[6px] border px-2 py-0.5 text-[11px] font-medium transition-all cursor-pointer ${
                    name === p.name
                      ? "border-primary bg-primary/10 font-semibold text-primary"
                      : "border-border/60 bg-card/50 text-muted-foreground hover:bg-card hover:text-foreground"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2.5">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground">
              {t("tabName")}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError("")
              }}
              placeholder={t("tabNamePlaceholder")}
              maxLength={20}
              className="mt-1 w-full rounded-[8px] border border-border bg-card px-2.5 py-1.5 text-[12px] text-foreground outline-none transition-colors focus:border-primary"
              autoFocus
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground">
              {t("urlAddress")}
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                setError("")
              }}
              placeholder="https://..."
              className="mt-1 w-full rounded-[8px] border border-border bg-card px-2.5 py-1.5 text-[12px] text-foreground outline-none transition-colors focus:border-primary"
            />
          </div>

          {error && (
            <p className="text-[11px] font-medium text-danger">{error}</p>
          )}

          <div className="mt-2 flex items-center justify-end gap-2 border-t border-border/40 pt-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[8px] px-3 py-1 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              className="rounded-[8px] bg-primary px-3.5 py-1 text-[12px] font-semibold text-primary-foreground shadow-xs transition-all hover:opacity-90 active:scale-95 cursor-pointer"
            >
              {t("addTab")}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function RemoveTabModal({
  tabName,
  onConfirm,
  onCancel,
}: {
  tabName: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px] animate-in fade-in duration-150">
      <div className="flex w-full max-w-[290px] flex-col rounded-[14px] border border-border/80 bg-panel p-4 shadow-e3">
        <h4 className="text-[13px] font-semibold text-foreground">
          {t("removeTabTitle", { name: tabName })}
        </h4>
        <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
          {t("removeTabDesc")}
        </p>

        <div className="mt-4 flex items-center justify-end gap-2 border-t border-border/40 pt-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-[8px] px-3 py-1 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-[8px] bg-danger px-3.5 py-1 text-[12px] font-semibold text-white shadow-xs transition-all hover:opacity-90 active:scale-95 cursor-pointer"
          >
            {t("confirmRemove")}
          </button>
        </div>
      </div>
    </div>
  )
}

function WebView({
  provider,
  customTab,
  onStateChange,
}: {
  provider: Provider
  customTab?: CustomTab | null
  onStateChange: (state: LoadState) => void
}) {
  const url =
    provider === "messenger"
      ? defaultMeta.messenger.url
      : provider === "zalo"
        ? defaultMeta.zalo.url
        : customTab?.url || "about:blank"
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

  const pollUnread = useCallback(() => {
    applyAdBlock()
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
          desktop()?.reportUnread(provider, count)
        })
        .catch(() => undefined)
    } catch {
      // The webview is not attached until dom-ready.
    }
  }, [provider, applyAdBlock])

  useEffect(() => {
    const handleResize = () => triggerGuestResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [triggerGuestResize])

  useEffect(() => {
    if (!viewRef.current) return
    const view = viewRef.current
    bindWebview(view)
    const finish = () => {
      onStateChange("ready")
      triggerGuestResize()
      pollUnread()
      applyAdBlock()
    }
    const fail = () => {
      onStateChange("failed")
      desktop()?.reportUnread(provider, 0)
    }
    view.addEventListener("dom-ready", applyAdBlock)
    view.addEventListener("did-finish-load", finish)
    view.addEventListener("did-fail-load", fail)
    return () => {
      view.removeEventListener("dom-ready", applyAdBlock)
      view.removeEventListener("did-finish-load", finish)
      view.removeEventListener("did-fail-load", fail)
    }
  }, [
    onStateChange,
    provider,
    bindWebview,
    triggerGuestResize,
    pollUnread,
    applyAdBlock,
  ])

  useEffect(() => {
    if (provider === "custom") return
    pollUnread()
    const timer = window.setInterval(pollUnread, 10000)
    return () => window.clearInterval(timer)
  }, [pollUnread, provider])

  return (
    <div className="relative flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      {createElement("webview", {
        key: `${provider}-${url}`,
        ref: viewRef,
        src: url,
        partition: `persist:${provider}`,
        allowpopups: "true",
        webpreferences: "backgroundThrottling=yes,contextIsolation=yes",
        useragent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        style: {
          width: "100%",
          height: "100%",
          minWidth: 0,
          minHeight: 0,
          display: "flex",
          flex: "1 1 0%",
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

export default function ChatPanel({
  initialProvider = "messenger",
}: {
  initialProvider?: Provider
}) {
  const { t } = useTranslation()
  const [provider, setProvider] = useState<Provider>(initialProvider)
  const [state, setState] = useState<LoadState>("ready")
  const [menuOpen, setMenuOpen] = useState(false)
  const [customTab, setCustomTab] = useState<CustomTab | null>(() => {
    try {
      const raw = localStorage.getItem("bubble.customTab")
      if (!raw) return null
      const parsed = JSON.parse(raw)
      if (
        parsed &&
        typeof parsed.name === "string" &&
        typeof parsed.url === "string"
      ) {
        return parsed
      }
    } catch {}
    return null
  })
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [tabContextMenu, setTabContextMenu] = useState<{
    x: number
    y: number
  } | null>(null)
  const [visitedProviders, setVisitedProviders] = useState<Set<Provider>>(
    () => new Set([initialProvider]),
  )

  const unread = useUnreadCounts()
  const [performanceMode, setPerformanceMode] = useState(
    () => localStorage.getItem("bubble.performanceMode") || "Balanced",
  )
  const [reloadKey, setReloadKey] = useState(0)
  const { updateInfo, openUpdateDownload } = useAppUpdate()

  const handleSwitchPreset = (preset: Preset) => {
    const newTab: CustomTab = {
      name: preset.name,
      url: preset.url,
      color: preset.color,
    }
    localStorage.setItem("bubble.customTab", JSON.stringify(newTab))
    setCustomTab(newTab)
    setVisitedProviders((prev) => new Set(prev).add("custom"))
    setProvider("custom")
    setState("ready")
    setReloadKey((k) => k + 1)
    setTabContextMenu(null)
  }

  useEffect(() => {
    setProvider(initialProvider)
    setState("ready")
  }, [initialProvider])

  useEffect(() => {
    const update = (mode: string) => setPerformanceMode(mode)
    const onLocalChange = (event: Event) =>
      update((event as CustomEvent<string>).detail)
    const off = desktop()?.onPerformance(update)
    const offReload = desktop()?.onReloadProvider?.((p) => {
      if (p === provider || p === "all") {
        reload()
      }
    })
    window.addEventListener("bubble:performance", onLocalChange)
    return () => {
      window.removeEventListener("bubble:performance", onLocalChange)
      off?.()
      offReload?.()
    }
  }, [provider])

  const openExternal = () => {
    const url =
      provider === "messenger"
        ? defaultMeta.messenger.url
        : provider === "zalo"
          ? defaultMeta.zalo.url
          : customTab?.url
    if (url) desktop()?.openExternal(url)
  }

  const reload = () => setReloadKey((key) => key + 1)

  const selectProvider = (next: Provider) => {
    setVisitedProviders((prev) => new Set(prev).add(next))
    setProvider(next)
    setState("ready")
  }

  const handleAddTab = (newTab: CustomTab) => {
    setCustomTab(newTab)
    try {
      localStorage.setItem("bubble.customTab", JSON.stringify(newTab))
    } catch {}
    selectProvider("custom")
    setAddModalOpen(false)
  }

  const handleRemoveTab = () => {
    setCustomTab(null)
    try {
      localStorage.removeItem("bubble.customTab")
    } catch {}
    setVisitedProviders((prev) => {
      const next = new Set(prev)
      next.delete("custom")
      return next
    })
    desktop()?.reportUnread("custom", 0)
    if (provider === "custom") {
      selectProvider("messenger")
    }
    setConfirmRemove(false)
  }

  // Memory optimization strategy:
  // - Low Memory: Only mounts the active tab. All background tabs are destroyed immediately.
  // - Balanced (Default): Lazy-mounts tabs on first visit. Messenger & Zalo stay mounted once opened.
  //   Heavy media/custom tabs are unloaded when inactive to prevent video/audio background RAM bloat.
  // - Instant Switching: Keeps all visited tabs mounted in background.
  const keepProvidersMounted = performanceMode !== "Low Memory"

  const mountedProviders: Provider[] = useMemo(() => {
    if (performanceMode === "Low Memory") {
      return [provider]
    }
    if (performanceMode === "Instant Switching") {
      return Array.from(visitedProviders).filter(
        (p) => p !== "custom" || Boolean(customTab),
      )
    }
    // Balanced mode (default):
    return Array.from(visitedProviders).filter((p) => {
      if (p === "custom") {
        return Boolean(customTab) && provider === "custom"
      }
      return true
    })
  }, [performanceMode, visitedProviders, provider, customTab])

  return (
    <div className="relative flex h-full w-full min-h-0 max-w-full flex-col overflow-hidden border-border bg-panel text-foreground">
      {/* ultra-compact header without bulky toolbar */}
      <div
        className="flex min-w-0 items-center justify-between border-b border-border/40 bg-card/50 px-2 py-1 select-none"
        onContextMenu={(e) => {
          e.preventDefault()
          setMenuOpen((prev) => !prev)
        }}
      >
        <div className="flex min-w-0 items-center gap-1 rounded-[8px] bg-muted/60 p-0.5">
          <ProviderTab
            provider="messenger"
            active={provider === "messenger"}
            unread={unread.messenger}
            onClick={() => selectProvider("messenger")}
          />
          <ProviderTab
            provider="zalo"
            active={provider === "zalo"}
            unread={unread.zalo}
            onClick={() => selectProvider("zalo")}
          />
          {customTab && (
            <ProviderTab
              provider="custom"
              active={provider === "custom"}
              unread={unread.custom || 0}
              customName={customTab.name}
              customColor={customTab.color}
              onClick={() => selectProvider("custom")}
              onRemove={() => setConfirmRemove(true)}
              onContextMenu={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setTabContextMenu({ x: e.clientX, y: e.clientY })
              }}
            />
          )}
          {!customTab && (
            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              title={t("addNewTab")}
              className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-[6px] text-muted-foreground/70 transition-all hover:bg-card hover:text-foreground active:scale-95 cursor-pointer"
            >
              <Plus size={13} />
            </button>
          )}
        </div>

        {/* Minimal options toggle */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((open) => !open)}
            title={t("options")}
            aria-label={t("options")}
            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/60 transition-colors hover:bg-muted/80 hover:text-foreground cursor-pointer"
          >
            <MoreHorizontal size={13} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-6 z-30 w-[190px] rounded-[10px] border border-border bg-panel p-1.5 shadow-e3">
              <button
                onClick={() => {
                  reload()
                  setMenuOpen(false)
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] hover:bg-muted cursor-pointer"
              >
                <RotateCw size={13} /> {t("reload")}
              </button>
              <button
                onClick={() => {
                  openExternal()
                  setMenuOpen(false)
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] hover:bg-muted cursor-pointer"
              >
                <ExternalLink size={13} /> {t("openInBrowser")}
              </button>
              {customTab && (
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    setConfirmRemove(true)
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] text-danger hover:bg-muted cursor-pointer"
                >
                  <Trash2 size={13} />{" "}
                  {t("removeCustomTab", { name: customTab.name })}
                </button>
              )}
              <button
                onClick={() => {
                  setMenuOpen(false)
                  desktop()?.openProvider("settings")
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] hover:bg-muted cursor-pointer"
              >
                <Settings2 size={13} /> {t("openSettings")}
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false)
                  desktop()?.resetPanelSize()
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] hover:bg-muted cursor-pointer"
              >
                <RotateCcw size={13} /> {t("resetPanelSize")}
              </button>
              <div className="my-1 h-px bg-border" />
              <button
                onClick={() => {
                  desktop()?.collapsePanel()
                  setMenuOpen(false)
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] text-danger hover:bg-muted cursor-pointer"
              >
                <Minus size={13} /> {t("collapsePanel")}
              </button>
            </div>
          )}
        </div>
      </div>

      {updateInfo.status === "available" && (
        <button
          type="button"
          onClick={() => void openUpdateDownload()}
          className="flex items-center justify-between bg-emerald-500/15 px-3 py-1.5 text-left text-[11px] font-medium text-emerald-500 hover:bg-emerald-500/20"
        >
          <span>Update available: {updateInfo.latestVersion}</span>
          <span className="font-semibold underline">
            {updateInfo.downloadUrl ? "Download" : "View release"}
          </span>
        </button>
      )}

      {/* main embedded area */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {state === "ready" && keepProvidersMounted ? (
          <div className="relative h-full w-full flex-1">
            {mountedProviders.map((item) => (
              <div
                key={item === "custom" ? `custom-${customTab?.url}` : item}
                className={`absolute inset-0 ${
                  provider === item ? "" : "invisible pointer-events-none"
                }`}
              >
                <WebView
                  provider={item}
                  customTab={item === "custom" ? customTab : undefined}
                  onStateChange={(nextState) => {
                    if (provider === item) {
                      setState(nextState)
                    }
                  }}
                />
              </div>
            ))}
          </div>
        ) : state === "ready" ? (
          <WebView
            key={`${provider}-${reloadKey}-${
              provider === "custom" ? customTab?.url : ""
            }`}
            provider={provider}
            customTab={provider === "custom" ? customTab : undefined}
            onStateChange={setState}
          />
        ) : (
          <FailedState onReload={reload} />
        )}

        {addModalOpen && (
          <AddTabModal
            onAdd={handleAddTab}
            onClose={() => setAddModalOpen(false)}
          />
        )}

        {confirmRemove && customTab && (
          <RemoveTabModal
            tabName={customTab.name}
            onConfirm={handleRemoveTab}
            onCancel={() => setConfirmRemove(false)}
          />
        )}

        {/* Quick switch context menu for 3rd tab */}
        {tabContextMenu && (
          <>
            <div
              className="fixed inset-0 z-40 bg-transparent"
              onClick={() => setTabContextMenu(null)}
              onContextMenu={(e) => {
                e.preventDefault()
                setTabContextMenu(null)
              }}
            />
            <div
              style={{
                top: Math.min(tabContextMenu.y + 6, 280),
                left: Math.max(10, Math.min(tabContextMenu.x - 20, 160)),
              }}
              className="fixed z-50 w-[215px] rounded-[10px] border border-border bg-panel p-1.5 shadow-e3 text-foreground select-none"
            >
              <div className="px-2 py-1 text-[10.5px] font-semibold tracking-wider text-muted-foreground uppercase">
                {t("switchTabQuickly")}
              </div>

              {ENTERTAINMENT_PRESETS.map((p) => {
                const isCurrent = customTab?.url === p.url
                const Icon = p.Icon || Globe
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handleSwitchPreset(p)}
                    className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-[12px] transition-colors hover:bg-muted cursor-pointer ${
                      isCurrent
                        ? "font-medium bg-muted/60 text-foreground"
                        : "text-foreground/90"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon size={14} style={{ color: p.color }} />
                      <span>{p.name}</span>
                    </div>
                    {isCurrent && <Check size={13} className="text-primary" />}
                  </button>
                )
              })}

              <div className="my-1 border-t border-border/50" />

              <div className="px-2 py-0.5 text-[10.5px] font-semibold tracking-wider text-muted-foreground/80 uppercase">
                {t("chatAndAi")}
              </div>

              {CHAT_PRESETS.slice(0, 3).map((p) => {
                const isCurrent = customTab?.url === p.url
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handleSwitchPreset(p)}
                    className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-[12px] transition-colors hover:bg-muted cursor-pointer ${
                      isCurrent
                        ? "font-medium bg-muted/60 text-foreground"
                        : "text-foreground/90"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Globe size={14} style={{ color: p.color }} />
                      <span>{p.name}</span>
                    </div>
                    {isCurrent && <Check size={13} className="text-primary" />}
                  </button>
                )
              })}

              <div className="my-1 border-t border-border/50" />

              <button
                type="button"
                onClick={() => {
                  setTabContextMenu(null)
                  setAddModalOpen(true)
                }}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[12px] hover:bg-muted cursor-pointer text-foreground/90"
              >
                <Plus size={13} className="opacity-70" />
                <span>{t("switchCustomUrl")}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTabContextMenu(null)
                  reload()
                }}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[12px] hover:bg-muted cursor-pointer text-foreground/90"
              >
                <RotateCw size={13} className="opacity-70" />
                <span>{t("reload")}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTabContextMenu(null)
                  setConfirmRemove(true)
                }}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[12px] text-danger hover:bg-muted cursor-pointer"
              >
                <Trash2 size={13} />
                <span>{t("removeThisTab")}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
