import { useState, useEffect, useCallback } from "react"
import {
  Settings2,
  Palette,
  HardDrive,
  Info,
  Check,
  FolderOpen,
  X,
  RotateCcw,
  LocateFixed,
  Copy,
  Languages,
  Trash2,
  ChevronDown,
  Zap,
} from "lucide-react"
import {
  AppIcon,
  BubbleIcon,
  bubbleIconNames,
  type BubbleIconName,
} from "./BrandIcons"
import {
  desktop,
  resetPanelPosition,
  resetPanelSize,
  type MemoryUsageResult,
  type StorageUsageResult,
} from "../desktop/bridge"
import { useAppUpdate } from "../hooks/useAppUpdate"
import { withTransitionSuppression } from "../utils/theme"
import { useTranslation } from "../utils/i18n"

export type Section = "general" | "appearance" | "storage" | "about"

function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean
  onChange: () => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:outline-none ${
        on ? "bg-primary" : "bg-muted-foreground/30"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4.5 w-4.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          on ? "translate-x-5" : "translate-x-0.5"
        }`}
        style={{
          transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      />
    </button>
  )
}

function ToggleRow({
  title,
  desc,
  settingKey,
  defaultOn = false,
}: {
  title: string
  desc?: string
  settingKey: string
  defaultOn?: boolean
}) {
  const [on, setOn] = useState(() => {
    const v = localStorage.getItem(`bubble.${settingKey}`)
    return v !== null ? v === "true" : defaultOn
  })

  useEffect(() => {
    desktop()
      ?.getSettings()
      .then((s) => {
        if (s && typeof s[settingKey] === "boolean") {
          setOn(s[settingKey])
        }
      })
      .catch(() => {})
  }, [settingKey])

  const toggle = () => {
    setOn((prev) => {
      const next = !prev
      const key = `bubble.${settingKey}`
      try {
        localStorage.setItem(key, String(next))
      } catch {}
      if (settingKey === "startAtLogin") desktop()?.setLoginItem(next)
      if (settingKey === "alwaysOnTop") desktop()?.setAlwaysOnTop(next)
      if (settingKey === "closeOnBlur") desktop()?.setCloseOnBlur(next)
      if (settingKey === "showBubbleOnStartup")
        desktop()?.setShowBubbleOnStartup(next)
      if (settingKey === "rememberPosition")
        desktop()?.setRememberPosition(next)
      if (settingKey === "snapToEdge") desktop()?.setSnapToEdge(next)
      return next
    })
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0 flex-1 pr-1">
        <div className="text-[12.5px] font-medium leading-tight text-foreground">
          {title}
        </div>
        {desc && (
          <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            {desc}
          </div>
        )}
      </div>
      <Toggle on={on} onChange={toggle} label={title} />
    </div>
  )
}

function Group({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-3.5">
      <h3 className="mb-1.5 flex items-center gap-2 px-1 font-mono text-[10.5px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
        <span>{title}</span>
        <span className="flex-1 h-px bg-border/40" />
      </h3>
      <div className="divide-y divide-border/50 rounded-xl border border-border/70 bg-card px-3.5">
        {children}
      </div>
    </section>
  )
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex w-full items-center rounded-lg bg-muted/80 p-0.5">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`flex-1 rounded-md py-1.5 text-center font-medium text-[11.5px] transition-all duration-200 cursor-pointer ${
            value === opt.id
              ? "bg-card text-foreground shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function getCustomTabName() {
  try {
    const raw = localStorage.getItem("bubble.customTab")
    return raw ? JSON.parse(raw)?.name : null
  } catch {
    return null
  }
}

/* ==================== 1. General Pane ==================== */

function GeneralPane() {
  const { t } = useTranslation()
  const [resetPosDone, setResetPosDone] = useState(false)
  const [resetSizeDone, setResetSizeDone] = useState(false)

  const handleResetPos = () => {
    resetPanelPosition()
    setResetPosDone(true)
    setTimeout(() => setResetPosDone(false), 2000)
  }

  const handleResetSize = () => {
    resetPanelSize()
    setResetSizeDone(true)
    setTimeout(() => setResetSizeDone(false), 2000)
  }

  const isMac =
    desktop()?.platform === "darwin" ||
    (typeof navigator !== "undefined" && /Mac/i.test(navigator.userAgent))

  return (
    <div className="space-y-3.5 animate-fade-in">
      <Group title={t("windowBehavior")}>
        <ToggleRow
          title={t("startAtLogin")}
          settingKey="startAtLogin"
          desc={t("startAtLoginDesc")}
          defaultOn
        />
        <ToggleRow
          title={t("alwaysOnTop")}
          settingKey="alwaysOnTop"
          desc={t("alwaysOnTopDesc")}
          defaultOn
        />
        <ToggleRow
          title={t("snapToEdge")}
          settingKey="snapToEdge"
          desc={t("snapToEdgeDesc")}
          defaultOn
        />
        <ToggleRow
          title={t("closeOnBlur")}
          settingKey="closeOnBlur"
          defaultOn
        />
      </Group>

      <Group title={t("panelResetGroup")}>
        <div className="py-2.5">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {t("panelResetDesc")}
          </p>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleResetPos}
              className={`flex items-center justify-center gap-1.5 rounded-lg border py-1.5 px-2.5 text-[11.5px] font-medium transition-all active:scale-95 cursor-pointer ${
                resetPosDone
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500 font-semibold"
                  : "border-border/80 bg-muted/60 text-foreground hover:bg-muted"
              }`}
            >
              {resetPosDone ? <Check size={13} /> : <LocateFixed size={13} />}
              <span>{resetPosDone ? t("done") : t("resetPosBtn")}</span>
            </button>
            <button
              type="button"
              onClick={handleResetSize}
              className={`flex items-center justify-center gap-1.5 rounded-lg border py-1.5 px-2.5 text-[11.5px] font-medium transition-all active:scale-95 cursor-pointer ${
                resetSizeDone
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500 font-semibold"
                  : "border-border/80 bg-muted/60 text-foreground hover:bg-muted"
              }`}
            >
              {resetSizeDone ? <Check size={13} /> : <RotateCcw size={13} />}
              <span>{resetSizeDone ? t("done") : t("resetSizeBtn")}</span>
            </button>
          </div>
        </div>
      </Group>

      <Group title={t("shortcuts")}>
        <div className="divide-y divide-border/40 py-0.5 text-[11.5px]">
          <div className="flex items-center justify-between py-2">
            <span className="text-muted-foreground">{t("togglePanel")}</span>
            <kbd className="rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[10.5px] text-foreground/80">
              {isMac ? "⌥ ⌘ B" : "Alt + Ctrl + B"}
            </kbd>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-muted-foreground">{t("openMessenger")}</span>
            <kbd className="rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[10.5px] text-foreground/80">
              {isMac ? "⌥ ⌘ M" : "Alt + Ctrl + M"}
            </kbd>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-muted-foreground">{t("openZalo")}</span>
            <kbd className="rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[10.5px] text-foreground/80">
              {isMac ? "⌥ ⌘ Z" : "Alt + Ctrl + Z"}
            </kbd>
          </div>
        </div>
      </Group>
    </div>
  )
}

/* ==================== 2. Appearance Pane ==================== */

function AppearancePane() {
  const { t } = useTranslation()
  const [theme, setTheme] = useState(
    () => localStorage.getItem("bubble.theme") || "System",
  )
  const [size, setSize] = useState(
    () => localStorage.getItem("bubble.bubbleSize") || "Medium",
  )
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

  useEffect(() => {
    desktop()
      ?.getSettings()
      .then((settings) => {
        if (settings) {
          if (settings.theme) setTheme(settings.theme)
          if (settings.bubbleSize) setSize(settings.bubbleSize)
          if (Number.isFinite(settings.bubbleOpacity)) {
            setOpacity(settings.bubbleOpacity)
          }
          if (bubbleIconNames.includes(settings.bubbleIcon as BubbleIconName)) {
            setIcon(settings.bubbleIcon as BubbleIconName)
          }
        }
      })
      .catch(() => {})
  }, [])

  const saveTheme = (value: string) => {
    if (value === theme) return
    withTransitionSuppression(() => {
      setTheme(value)
      try {
        localStorage.setItem("bubble.theme", value)
      } catch {}
      desktop()?.setAppearance({ theme: value, bubbleSize: size })
      window.dispatchEvent(
        new CustomEvent("bubble:appearance", {
          detail: { key: "bubble.theme", value },
        }),
      )
    })
  }

  const saveSize = (value: string) => {
    if (value === size) return
    setSize(value)
    try {
      localStorage.setItem("bubble.bubbleSize", value)
    } catch {}
    desktop()?.setAppearance({ theme, bubbleSize: value })
    window.dispatchEvent(
      new CustomEvent("bubble:appearance", {
        detail: { key: "bubble.bubbleSize", value },
      }),
    )
  }

  const saveOpacity = (value: number) => {
    setOpacity(value)
    try {
      localStorage.setItem("bubble.bubbleOpacity", String(value))
    } catch {}
    desktop()?.setAppearance({ bubbleOpacity: value })
    window.dispatchEvent(
      new CustomEvent("bubble:appearance", {
        detail: { key: "bubble.bubbleOpacity", value: String(value) },
      }),
    )
  }

  const saveIcon = (value: BubbleIconName) => {
    setIcon(value)
    try {
      localStorage.setItem("bubble.bubbleIcon", value)
    } catch {}
    desktop()?.setAppearance({ bubbleIcon: value })
    window.dispatchEvent(
      new CustomEvent("bubble:appearance", {
        detail: { key: "bubble.bubbleIcon", value },
      }),
    )
  }

  const themeOptions = [
    { id: "System", label: t("themeSystem") },
    { id: "Light", label: t("themeLight") },
    { id: "Dark", label: t("themeDark") },
  ]

  const sizeOptions = [
    { id: "Small", label: t("bubbleSizeSmall") },
    { id: "Medium", label: t("bubbleSizeMedium") },
    { id: "Large", label: t("bubbleSizeLarge") },
  ]

  return (
    <div className="space-y-3.5 animate-fade-in">
      <Group title={t("themeMode")}>
        <div className="py-2.5">
          <Segmented
            options={themeOptions}
            value={theme}
            onChange={saveTheme}
          />
        </div>
      </Group>

      <Group title={t("bubbleSize")}>
        <div className="py-2.5">
          <Segmented options={sizeOptions} value={size} onChange={saveSize} />
        </div>
      </Group>

      <Group title={t("bubbleIcon")}>
        <div className="grid grid-cols-5 gap-2 py-2.5">
          {bubbleIconNames.map((name) => (
            <button
              key={name}
              type="button"
              aria-label={t(
                `icon${name[0].toUpperCase()}${name.slice(1)}` as "iconDefault",
              )}
              aria-pressed={icon === name}
              onClick={() => saveIcon(name)}
              className={`grid place-items-center rounded-lg border p-2 transition-all cursor-pointer ${
                icon === name
                  ? "border-primary bg-primary/10 ring-2 ring-primary/20 scale-105"
                  : "border-border/70 bg-muted/30 hover:bg-muted"
              }`}
            >
              <BubbleIcon name={name} size={28} />
            </button>
          ))}
        </div>
      </Group>

      <Group title={t("bubbleOpacity")}>
        <div className="py-2.5">
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="text-muted-foreground">{t("bubbleOpacity")}</span>
            <span className="font-mono font-medium text-foreground">
              {opacity}%
            </span>
          </div>
          <input
            type="range"
            min="20"
            max="100"
            step="5"
            value={opacity}
            onChange={(e) => saveOpacity(Number(e.target.value))}
            className="w-full accent-primary cursor-pointer"
          />
        </div>
      </Group>
    </div>
  )
}

/* ==================== 3. Storage & Performance Pane ==================== */

function StoragePane() {
  const { t } = useTranslation()
  const [mode, setMode] = useState(
    () => localStorage.getItem("bubble.performanceMode") || "Balanced",
  )
  const [memory, setMemory] = useState<MemoryUsageResult | null>(null)
  const [storageUsage, setStorageUsage] = useState<StorageUsageResult | null>(
    null,
  )
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [cleanDone, setCleanDone] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const customTabName = getCustomTabName()

  const fetchData = useCallback(async () => {
    try {
      const [mem, stor] = await Promise.all([
        desktop()?.getMemoryUsage?.(),
        desktop()?.getStorageUsage?.(),
      ])
      if (mem && typeof mem.totalMB === "number") setMemory(mem)
      if (stor) setStorageUsage(stor)
    } catch {}
  }, [])

  useEffect(() => {
    void fetchData()
    const timer = setInterval(() => void fetchData(), 10000)
    return () => clearInterval(timer)
  }, [fetchData])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchData()
    setIsRefreshing(false)
  }

  const saveMode = (next: string) => {
    setMode(next)
    try {
      localStorage.setItem("bubble.performanceMode", next)
    } catch {}
    desktop()?.setPerformanceMode(next)
    window.dispatchEvent(
      new CustomEvent("bubble:performance", { detail: next }),
    )
  }

  const handleClearCache = async () => {
    setCleaning(true)
    try {
      await desktop()?.clearSession("cache")
      await desktop()?.clearCustomCache?.()
      await fetchData()
      setCleanDone(true)
      setTimeout(() => setCleanDone(false), 2500)
    } catch {}
    setCleaning(false)
  }

  const modes = [
    {
      id: "Balanced",
      label: t("perfBalanced"),
      desc: t("perfBalancedDesc"),
    },
    {
      id: "Low Memory",
      label: t("perfLowMemory"),
      desc: t("perfLowMemoryDesc"),
    },
    {
      id: "Instant Switching",
      label: t("perfInstant"),
      desc: t("perfInstantDesc"),
    },
  ]

  return (
    <div className="space-y-3.5 animate-fade-in">
      {/* Overview RAM & Cache status */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border/70 bg-card p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
              <Zap size={13} className="text-amber-500" />
              {t("ramCurrent")}
            </span>
            <button
              type="button"
              disabled={isRefreshing}
              onClick={handleRefresh}
              className="text-muted-foreground hover:text-foreground active:scale-95 disabled:opacity-40 cursor-pointer"
              title={t("refreshRam")}
            >
              <RotateCcw
                size={11}
                className={isRefreshing ? "animate-spin" : ""}
              />
            </button>
          </div>
          <div className="mt-1 font-mono text-[16px] font-semibold text-foreground">
            {memory ? `${memory.totalMB} MB` : "---"}
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-3">
          <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
            <HardDrive size={13} className="text-primary" />
            {t("cacheSize")}
          </span>
          <div className="mt-1 font-mono text-[16px] font-semibold text-foreground">
            {storageUsage ? `${storageUsage.totalMB} MB` : "---"}
          </div>
        </div>
      </div>

      {/* Primary Clean Cache Button */}
      <div className="rounded-xl border border-border/70 bg-card p-3">
        <div className="flex items-center justify-between gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-medium text-foreground">
              {t("clearCacheOnly")}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground leading-snug">
              {t("clearWebCacheDesc")}
            </div>
          </div>
          <button
            type="button"
            disabled={cleaning}
            onClick={handleClearCache}
            className={`shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-medium transition-all active:scale-95 cursor-pointer ${
              cleanDone
                ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/40"
                : "bg-primary text-primary-foreground hover:opacity-90 shadow-xs"
            }`}
          >
            {cleanDone ? <Check size={13} /> : <Trash2 size={13} />}
            <span>
              {cleanDone
                ? t("cleanCacheSuccess")
                : cleaning
                  ? t("cleaning")
                  : t("cleanCacheNow")}
            </span>
          </button>
        </div>
      </div>

      {/* Content & Ads */}
      <Group title={t("contentAndAds")}>
        <ToggleRow
          title={t("blockAds")}
          settingKey="adBlock"
          desc={t("blockAdsDesc")}
          defaultOn
        />
      </Group>

      {/* Performance modes */}
      <Group title={t("memoryModes")}>
        <div className="py-2 space-y-1.5">
          {modes.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => saveMode(item.id)}
              className={`flex w-full items-start gap-2.5 rounded-lg p-2 text-left transition-all cursor-pointer ${
                mode === item.id
                  ? "bg-primary/10 border border-primary/30"
                  : "hover:bg-muted/40 border border-transparent"
              }`}
            >
              <span
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  mode === item.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/40"
                }`}
              >
                {mode === item.id && (
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-medium text-foreground">
                  {item.label}
                </span>
                <span className="mt-0.5 block text-[10.5px] leading-tight text-muted-foreground">
                  {item.desc}
                </span>
              </span>
            </button>
          ))}
        </div>
      </Group>

      {/* Advanced expandable section for session logout & open folder */}
      <div className="rounded-xl border border-border/70 bg-card overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced((prev) => !prev)}
          className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-[11.5px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <span>{t("advancedStorage")}</span>
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${
              showAdvanced ? "rotate-180" : ""
            }`}
          />
        </button>

        {showAdvanced && (
          <div className="border-t border-border/50 divide-y divide-border/40 px-3.5 py-1 text-[11.5px] animate-fade-in">
            <button
              type="button"
              onClick={() => desktop()?.openSessionStorage()}
              className="flex w-full items-center gap-2 py-2 text-foreground/80 hover:text-primary transition-colors cursor-pointer"
            >
              <FolderOpen size={13} className="text-muted-foreground" />
              <span>{t("openSessionFolder")}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (window.confirm(t("clearMessengerSession") + "?")) {
                  desktop()?.clearSession("messenger")
                }
              }}
              className="flex w-full items-center gap-2 py-2 text-danger hover:underline cursor-pointer"
            >
              <Trash2 size={13} />
              <span>{t("clearMessengerSession")}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (window.confirm(t("clearZaloSession") + "?")) {
                  desktop()?.clearSession("zalo")
                }
              }}
              className="flex w-full items-center gap-2 py-2 text-danger hover:underline cursor-pointer"
            >
              <Trash2 size={13} />
              <span>{t("clearZaloSession")}</span>
            </button>

            {customTabName && (
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      t("clearCustomSession", { name: customTabName }) + "?",
                    )
                  ) {
                    desktop()?.clearSession("custom")
                  }
                }}
                className="flex w-full items-center gap-2 py-2 text-danger hover:underline cursor-pointer"
              >
                <Trash2 size={13} />
                <span>{t("clearCustomSession", { name: customTabName })}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ==================== 4. About Pane ==================== */

function formatRemainingDetailed(seconds: number, lang: "vi" | "en"): string {
  const safeSec = Math.max(0, Math.floor(seconds))
  const h = Math.floor(safeSec / 3600)
  const m = Math.floor((safeSec % 3600) / 60)
  const s = safeSec % 60

  if (lang === "vi") {
    if (h > 0) return `${h} giờ ${m} phút`
    if (m > 0) return `${m} phút ${s} giây`
    return `${s} giây`
  }
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function AboutPane({
  version,
  remainingSeconds,
  updateInfo,
  checkForUpdates,
  installUpdate,
  openUpdateDownload,
}: {
  version: string
  remainingSeconds?: number
  updateInfo: ReturnType<typeof useAppUpdate>["updateInfo"]
  checkForUpdates: () => Promise<void>
  installUpdate: () => Promise<unknown> | undefined
  openUpdateDownload: () => Promise<void> | undefined
}) {
  const { t, lang } = useTranslation()
  const [copied, setCopied] = useState(false)
  const updateInProgress =
    updateInfo.status === "downloading" || updateInfo.status === "installing"

  return (
    <div className="space-y-3.5 animate-fade-in">
      <div className="flex flex-col items-center rounded-xl border border-border/70 bg-card p-4 text-center">
        <AppIcon size={46} round className="shadow-e2" />
        <h3 className="mt-2 font-semibold text-[15px] text-foreground">
          Bubble Chat
        </h3>
        <div className="font-mono text-[11px] text-muted-foreground">
          v{version} • Messenger & Zalo
        </div>

        <button
          type="button"
          onClick={() => void checkForUpdates()}
          disabled={updateInfo.status === "checking" || updateInProgress}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-3 py-1.5 font-medium text-[11.5px] text-foreground transition-all hover:bg-muted active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          <RotateCcw
            size={12}
            className={updateInfo.status === "checking" ? "animate-spin" : ""}
          />
          {updateInfo.status === "checking"
            ? t("checking")
            : updateInfo.status === "downloading"
              ? t("downloadingUpdate")
              : updateInfo.status === "installing"
                ? t("installingUpdate")
                : updateInfo.status === "up-to-date"
                  ? t("upToDate", { version })
                  : t("checkUpdates")}
        </button>

        {updateInfo.status === "available" && (
          <div className="mt-2.5 flex flex-col items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-[11.5px] font-medium text-emerald-500">
            <div>
              {t("updateAvailable", {
                version: updateInfo.latestVersion || "",
              })}
            </div>
            <button
              type="button"
              onClick={() =>
                void (updateInfo.downloadUrl
                  ? installUpdate()
                  : openUpdateDownload())
              }
              className="cursor-pointer inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1 font-semibold text-white shadow-xs hover:bg-emerald-500 active:scale-95"
            >
              {updateInfo.downloadUrl ? t("downloadUpdate") : t("viewRelease")}
            </button>
          </div>
        )}
        {updateInfo.status === "error" && (
          <div className="mt-2 text-[11px] text-danger">{updateInfo.error}</div>
        )}
      </div>

      {typeof remainingSeconds === "number" && (
        <Group title={t("environment")}>
          <div className="flex items-center justify-between py-2.5 text-[12px]">
            <span
              className="text-muted-foreground"
              title={t("sessionRemainingDesc")}
            >
              {t("sessionRemaining")}
            </span>
            <span className="font-mono text-[11px] font-medium text-foreground">
              {formatRemainingDetailed(remainingSeconds, lang)}
            </span>
          </div>
        </Group>
      )}

      <Group title={t("developer")}>
        <div className="flex items-center justify-between gap-3 py-2.5">
          <div>
            <div className="text-[12px] font-medium text-foreground">
              Nguyen Minh Quoc
            </div>
            <div className="font-mono text-[11px] text-muted-foreground">
              0866 007 219
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              desktop()?.copyDeveloperPhone()
              setCopied(true)
              window.setTimeout(() => setCopied(false), 1500)
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground transition-opacity hover:opacity-90 active:scale-95 cursor-pointer"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}{" "}
            {copied ? t("copied") : t("copy")}
          </button>
        </div>
      </Group>
    </div>
  )
}

/* ==================== Main Settings Component ==================== */

export default function SettingsWindow({ onClose }: { onClose: () => void }) {
  const { t, lang, setLanguage } = useTranslation()
  const [activeTab, setActiveTab] = useState<Section>("general")
  const [remainingSeconds, setRemainingSeconds] = useState<number | undefined>()
  const { updateInfo, checkForUpdates, installUpdate, openUpdateDownload } =
    useAppUpdate()
  const version = updateInfo.currentVersion || "…"

  useEffect(() => {
    let active = true
    const fetchStatus = () => {
      desktop()
        ?.getLockStatus?.()
        .then((res) => {
          if (active) {
            if (res?.enabled === false) {
              setRemainingSeconds(undefined)
            } else if (typeof res?.remainingSeconds === "number") {
              setRemainingSeconds(res.remainingSeconds)
            }
          }
        })
        .catch(() => {})
    }
    fetchStatus()
    const timer = setInterval(fetchStatus, 10000)
    const tick = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (typeof prev === "number" && prev > 0) {
          return prev - 1
        }
        return prev
      })
    }, 1000)
    const offLock = desktop()?.onLockState?.((status) => {
      if (active) {
        if (typeof status?.remainingSeconds === "number") {
          setRemainingSeconds(status.remainingSeconds)
        } else if (status?.isLocked) {
          setRemainingSeconds(0)
        }
      }
    })
    return () => {
      active = false
      clearInterval(timer)
      clearInterval(tick)
      offLock?.()
    }
  }, [])

  const tabs: Array<{
    id: Section
    label: string
    icon: typeof Settings2
    badge?: boolean
  }> = [
    {
      id: "general",
      label: t("tabGeneral"),
      icon: Settings2,
    },
    {
      id: "appearance",
      label: t("tabAppearance"),
      icon: Palette,
    },
    {
      id: "storage",
      label: t("tabStorage"),
      icon: HardDrive,
    },
    {
      id: "about",
      label: t("tabAbout"),
      icon: Info,
      badge: updateInfo.status === "available",
    },
  ]

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-panel select-none">
      {/* Header */}
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-border/50 bg-card/60 px-3.5">
        <div className="flex items-center gap-2">
          <AppIcon size={18} />
          <span className="font-semibold text-[13.5px] text-foreground">
            {t("settings")}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setLanguage(lang === "vi" ? "en" : "vi")}
            className="flex items-center gap-1 rounded-lg border border-border/70 bg-card/60 px-2 py-1 font-mono text-[11px] font-semibold text-foreground/80 hover:bg-muted transition-all active:scale-95 cursor-pointer"
            title={
              lang === "vi" ? "Switch to English" : "Chuyển sang Tiếng Việt"
            }
          >
            <Languages size={13} className="opacity-70" />
            <span>{lang === "vi" ? "VI" : "EN"}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/80 text-foreground transition-all hover:bg-border active:scale-95 cursor-pointer"
            aria-label={t("done")}
          >
            <X size={15} />
          </button>
        </div>
      </header>

      {/* Clean Top Tab Navigation Bar */}
      <nav className="flex shrink-0 border-b border-border/50 bg-card/30 p-1.5 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 px-2 text-[12px] font-medium transition-all duration-150 cursor-pointer ${
                isActive
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon
                size={14}
                className={isActive ? "text-primary-foreground" : "opacity-75"}
              />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-danger ring-2 ring-background animate-pulse-dot" />
              )}
            </button>
          )
        })}
      </nav>

      {/* Main Content Area */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-3">
        {activeTab === "general" && <GeneralPane />}
        {activeTab === "appearance" && <AppearancePane />}
        {activeTab === "storage" && <StoragePane />}
        {activeTab === "about" && (
          <AboutPane
            version={version}
            remainingSeconds={remainingSeconds}
            updateInfo={updateInfo}
            checkForUpdates={checkForUpdates}
            installUpdate={installUpdate}
            openUpdateDownload={openUpdateDownload}
          />
        )}
      </div>

      {/* Subtle Footer */}
      <footer className="flex shrink-0 items-center justify-between border-t border-border/40 bg-card/30 px-3.5 py-1.5 font-mono text-[10px] text-muted-foreground">
        <span>Bubble Chat v{version}</span>
        {typeof remainingSeconds === "number" && (
          <span
            className="opacity-75 transition-opacity hover:opacity-100 cursor-default"
            title={`${t("sessionRemaining")}: ${formatRemainingDetailed(remainingSeconds, lang)}`}
          >
            {formatRemainingDetailed(remainingSeconds, lang)}
          </span>
        )}
      </footer>
    </div>
  )
}
