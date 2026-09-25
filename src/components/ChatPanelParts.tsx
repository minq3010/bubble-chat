import { useState, type FormEvent, type JSX, type MouseEvent } from "react"
import { AlertTriangle, Globe, X } from "lucide-react"
import {
  MessengerIcon,
  SpotifyIcon,
  TiktokIcon,
  YoutubeIcon,
  ZaloIcon,
} from "./BrandIcons"
import { useTranslation } from "../utils/i18n"

export type Provider = "messenger" | "zalo" | "custom"
export type CustomTab = {
  name: string
  url: string
  color?: string
}

export const defaultMeta = {
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

export type Preset = {
  name: string
  url: string
  color: string
  Icon?: (props: PresetIconProps) => JSX.Element
}

export const ENTERTAINMENT_PRESETS: Preset[] = [
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

export const CHAT_PRESETS: Preset[] = [
  { name: "Telegram", url: "https://web.telegram.org/a/", color: "#229ED9" },
  { name: "WhatsApp", url: "https://web.whatsapp.com", color: "#25D366" },
  { name: "Discord", url: "https://discord.com/app", color: "#5865F2" },
  { name: "ChatGPT", url: "https://chatgpt.com", color: "#10A37F" },
  { name: "Slack", url: "https://app.slack.com/client", color: "#E01E5A" },
]

export function getCustomTabIcon(name?: string, url?: string) {
  const target = `${name || ""} ${url || ""}`.toLowerCase()
  if (target.includes("youtube") || target.includes("youtu.be"))
    return YoutubeIcon
  if (target.includes("tiktok")) return TiktokIcon
  if (target.includes("spotify")) return SpotifyIcon
  return Globe
}

export function ProviderTab({
  provider,
  active,
  unread = 0,
  customName,
  customColor,
  compact = false,
  onClick,
  onRemove,
  onContextMenu,
}: {
  provider: Provider
  active: boolean
  unread?: number
  customName?: string
  customColor?: string
  compact?: boolean
  onClick: () => void
  onRemove?: () => void
  onContextMenu?: (e: MouseEvent) => void
}) {
  const isCustom = provider === "custom"
  const name = isCustom ? customName || "Custom" : defaultMeta[provider].name
  const Icon = isCustom
    ? getCustomTabIcon(customName)
    : defaultMeta[provider].Icon
  const color = isCustom
    ? customColor || "var(--primary)"
    : defaultMeta[provider].color

  const showLabel = !compact || active

  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      role="button"
      tabIndex={0}
      aria-pressed={active}
      title={name}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick()
        }
      }}
      className={`group relative flex shrink-0 cursor-pointer items-center transition-all duration-150 outline-none select-none focus-visible:ring-1.5 focus-visible:ring-ring/50 ${
        compact
          ? "gap-1 px-1.5 py-0.5 text-[10.5px]"
          : "gap-1.5 px-2 py-0.5 text-[11.5px]"
      } font-medium rounded-md ${
        active
          ? "bg-card text-card-foreground shadow-xs"
          : "text-muted-foreground/80 hover:bg-card/40 hover:text-foreground"
      }`}
    >
      <Icon
        size={13}
        className="shrink-0 transition-transform duration-150 group-hover:scale-105"
        style={{ color: isCustom ? color : undefined }}
      />
      {showLabel && (
        <span
          className={`truncate transition-all duration-150 ${
            compact ? "max-w-[55px]" : "max-w-[80px]"
          }`}
        >
          {name}
        </span>
      )}
      {unread > 0 && (
        <span
          className={`flex items-center justify-center rounded-full font-bold text-white shadow-xs select-none leading-none ${
            unread > 9
              ? "h-3 min-w-3 px-0.5 text-[7.5px]"
              : "h-3 w-3 text-[8px]"
          }`}
          style={{ background: "var(--danger)" }}
        >
          {unread > 99 ? "99+" : unread}
        </span>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          title="Bỏ tab này"
          className="ml-0.5 -mr-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-muted-foreground/50 opacity-0 transition-all group-hover:opacity-100 hover:bg-danger/15 hover:text-danger"
        >
          <X size={9} />
        </button>
      )}
      {active && (
        <span
          className="absolute -bottom-[2px] left-1/2 h-[1.5px] w-3 -translate-x-1/2 rounded-full transition-all duration-200"
          style={{ background: color }}
        />
      )}
    </div>
  )
}

export function FailedState({ onReload }: { onReload: () => void }) {
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

export function AddTabModal({
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

  const handleSubmit = (e: FormEvent) => {
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
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm animate-fade-in overflow-hidden">
      <div className="flex w-full max-w-[340px] max-h-[92vh] overflow-y-auto flex-col rounded-2xl border border-border/60 bg-panel/95 backdrop-blur-xl p-5 shadow-e3 animate-slide-up scrollbar-thin">
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <Globe size={16} />
            </div>
            <div>
              <h4 className="text-[14px] font-semibold text-foreground">
                {t("addNewTab")}
              </h4>
              <p className="text-[11px] text-muted-foreground">
                {t("maxOneTab")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-95 cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Presets */}
        <div className="mt-3 space-y-2.5">
          <div>
            <span className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider">
              🎬 {t("entertainment")}
            </span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {ENTERTAINMENT_PRESETS.map((p) => {
                const IconComponent = p.Icon
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] font-medium transition-all cursor-pointer active:scale-95 ${
                      name === p.name
                        ? "border-primary bg-primary/10 font-semibold text-primary shadow-sm"
                        : "border-border/60 bg-card/50 text-muted-foreground hover:bg-card hover:text-foreground hover:border-border"
                    }`}
                  >
                    {IconComponent && <IconComponent size={14} />}
                    <span>{p.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <span className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider">
              💬 {t("chatAndAi")}
            </span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {CHAT_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className={`rounded-lg border px-2.5 py-1 text-[12px] font-medium transition-all cursor-pointer active:scale-95 ${
                    name === p.name
                      ? "border-primary bg-primary/10 font-semibold text-primary shadow-sm"
                      : "border-border/60 bg-card/50 text-muted-foreground hover:bg-card hover:text-foreground hover:border-border"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <div>
            <label className="text-[12px] font-medium text-muted-foreground">
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
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
          </div>

          <div>
            <label className="text-[12px] font-medium text-muted-foreground">
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
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {error && (
            <p className="text-[12px] font-medium text-danger animate-shake">
              {error}
            </p>
          )}

          <div className="mt-1 flex items-center justify-end gap-2 border-t border-border/40 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-1.5 text-[13px] font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-95 cursor-pointer"
            >
              {t("addTab")}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function RemoveTabModal({
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
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="flex w-full max-w-[300px] flex-col rounded-2xl border border-border/60 bg-panel/95 backdrop-blur-xl p-5 shadow-e3 animate-slide-up">
        <h4 className="text-[14px] font-semibold text-foreground">
          {t("removeTabTitle", { name: tabName })}
        </h4>
        <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
          {t("removeTabDesc")}
        </p>

        <div className="mt-5 flex items-center justify-end gap-2 border-t border-border/40 pt-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-danger px-4 py-1.5 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-danger/90 active:scale-95 cursor-pointer"
          >
            {t("confirmRemove")}
          </button>
        </div>
      </div>
    </div>
  )
}
