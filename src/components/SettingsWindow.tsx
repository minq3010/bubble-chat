import { useState, useEffect, useCallback } from "react"
import {
  Settings2,
  Palette,
  MousePointerClick,
  Gauge,
  Shield,
  Info,
  Check,
  Trash2,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  X,
  RotateCcw,
  LocateFixed,
  Copy,
  Languages,
  HardDrive,
  AlertTriangle,
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
  type MemoryMetricItem,
  type MemoryUsageResult,
  type StorageUsageResult,
} from "../desktop/bridge"
import { useAppUpdate } from "../hooks/useAppUpdate"
import { withTransitionSuppression } from "../utils/theme"
import { useTranslation } from "../utils/i18n"

export type Section = "general" | "appearance" | "behavior" | "performance" | "privacy" | "about"

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
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0 flex-1 pr-1">
        <div className="text-[13px] font-medium leading-tight text-foreground">
          {title}
        </div>
        {desc && (
          <div className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
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
    <section className="mb-4">
      <h3 className="mb-2 flex items-center gap-2 px-1 font-mono text-[10.5px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
        <span>{title}</span>
        <span className="flex-1 h-px bg-border/40" />
      </h3>
      <div className="divide-y divide-border/50 rounded-xl border border-border/70 bg-card px-4">
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
  options: string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex w-full items-center rounded-lg bg-muted/80 p-1">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`flex-1 rounded-md py-1.5 text-center font-medium text-[12px] transition-all duration-200 cursor-pointer ${
            value === option
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

function ActionRow({
  icon,
  title,
  desc,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  desc?: string
  onClick?: () => void
}) {
  const [done, setDone] = useState(false)

  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="text-muted-foreground">{icon}</div>
        <div>
          <div className="text-[12.5px] font-medium text-foreground">
            {title}
          </div>
          {desc && (
            <div className="text-[11px] text-muted-foreground">{desc}</div>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          if (title.startsWith("Clear") && !window.confirm(`${title}?`)) {
            return
          }
          onClick?.()
          setDone(true)
          setTimeout(() => setDone(false), 2000)
        }}
        className={`shrink-0 rounded-md border px-2 py-0.5 font-medium text-[11.5px] transition-colors ${
          done
            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500"
            : "border-border bg-muted/60 text-foreground hover:bg-muted"
        }`}
      >
        {done ? "Done" : "Run"}
      </button>
    </div>
  )
}

function ShortcutRow({
  label,
  keys,
  winKeys,
}: {
  label: string
  keys: string
  winKeys?: string
}) {
  const isMac =
    desktop()?.platform === "darwin" ||
    (typeof navigator !== "undefined" && /Mac/i.test(navigator.userAgent))
  const displayKeys = isMac ? keys : winKeys || keys
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="text-[12.5px] font-medium text-foreground">{label}</div>
      <kbd className="rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] text-foreground/80">
        {displayKeys}
      </kbd>
    </div>
  )
}

/* ---------- Sub-pages ---------- */

function GeneralPane() {
  const { t, lang, setLanguage } = useTranslation()

  return (
    <>
      <Group title={t("language")}>
        <div className="py-2.5">
          <div className="mb-2">
            <div className="text-[12.5px] font-medium leading-tight text-foreground">
              {t("language")}
            </div>
            <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              {t("languageDesc")}
            </div>
          </div>
          <Segmented
            options={["Tiếng Việt", "English"]}
            value={lang === "vi" ? "Tiếng Việt" : "English"}
            onChange={(val) => setLanguage(val === "Tiếng Việt" ? "vi" : "en")}
          />
        </div>
      </Group>

      <Group title={t("systemStartup")}>
        <ToggleRow
          title={t("startAtLogin")}
          settingKey="startAtLogin"
          desc={t("startAtLoginDesc")}
          defaultOn
        />
        <ToggleRow
          title={t("showBubbleOnStartup")}
          settingKey="showBubbleOnStartup"
          defaultOn
        />
      </Group>

      <Group title={t("windowBehavior")}>
        <ToggleRow
          title={t("rememberPosition")}
          settingKey="rememberPosition"
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
        <ActionRow
          icon={<LocateFixed size={14} />}
          title={t("resetPanelPosition")}
          desc={t("resetPanelPositionDesc")}
          onClick={() => resetPanelPosition()}
        />
        <ActionRow
          icon={<RotateCcw size={14} />}
          title={t("resetPanelSize")}
          desc={t("resetPanelSizeDesc")}
          onClick={() => resetPanelSize()}
        />
      </Group>
    </>
  )
}

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

  return (
    <>
      <Group title={t("themeMode")}>
        <div className="py-2.5">
          <Segmented
            options={["System", "Light", "Dark"]}
            value={theme}
            onChange={saveTheme}
          />
        </div>
      </Group>

      <Group title={t("bubbleSize")}>
        <div className="py-2.5">
          <Segmented
            options={["Small", "Medium", "Large"]}
            value={size}
            onChange={saveSize}
          />
        </div>
      </Group>

      <Group title={t("bubbleOpacity")}>
        <div className="space-y-2 py-2.5">
          <label
            htmlFor="bubble-opacity"
            className="block text-[12px] font-medium text-foreground"
          >
            {t("bubbleOpacity")}
          </label>
          <div className="flex items-center gap-3">
            <input
              id="bubble-opacity"
              type="range"
              min="20"
              max="100"
              step="5"
              value={opacity}
              onChange={(event) => saveOpacity(Number(event.target.value))}
              className="min-w-0 flex-1 accent-primary"
            />
            <span className="w-9 text-right font-mono text-[11px] text-muted-foreground">
              {opacity}%
            </span>
          </div>
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
              className={`grid place-items-center rounded-lg border p-2 transition-all ${
                icon === name
                  ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                  : "border-border/70 bg-muted/40 hover:bg-muted"
              }`}
            >
              <BubbleIcon name={name} size={30} />
            </button>
          ))}
        </div>
      </Group>
    </>
  )
}

function BehaviorPane() {
  const { t } = useTranslation()

  return (
    <>
      <Group title={t("windowBehavior")}>
        <ToggleRow
          title={t("alwaysOnTop")}
          settingKey="alwaysOnTop"
          desc={t("alwaysOnTopDesc")}
          defaultOn
        />
      </Group>

      <Group title={t("shortcuts")}>
        <ShortcutRow
          label={t("togglePanel")}
          keys="⌥ ⌘ B"
          winKeys="Alt + Ctrl + B"
        />
        <ShortcutRow
          label={t("openMessenger")}
          keys="⌥ ⌘ M"
          winKeys="Alt + Ctrl + M"
        />
        <ShortcutRow
          label={t("openZalo")}
          keys="⌥ ⌘ Z"
          winKeys="Alt + Ctrl + Z"
        />
      </Group>
    </>
  )
}

function PerformancePane() {
  const { t } = useTranslation()
  const [mode, setMode] = useState(
    () => localStorage.getItem("bubble.performanceMode") || "Balanced",
  )
  const [memory, setMemory] = useState<MemoryUsageResult | null>(null)
  const [isRefreshingMemory, setIsRefreshingMemory] = useState(false)

  const fetchMemory = useCallback(async () => {
    try {
      const res = await desktop()?.getMemoryUsage?.()
      if (res && typeof res.totalMB === "number") {
        setMemory(res)
      }
    } catch {}
  }, [])

  useEffect(() => {
    void fetchMemory()
    const timer = setInterval(() => void fetchMemory(), 4000)
    return () => clearInterval(timer)
  }, [fetchMemory])

  const handleRefreshMemory = async () => {
    setIsRefreshingMemory(true)
    await fetchMemory()
    setIsRefreshingMemory(false)
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

  const modes = [
    {
      id: "Balanced",
      name: t("perfBalanced"),
      desc: t("perfBalancedDesc"),
    },
    {
      id: "Low Memory",
      name: t("perfLowMemory"),
      desc: t("perfLowMemoryDesc"),
    },
    {
      id: "Instant Switching",
      name: t("perfInstant"),
      desc: t("perfInstantDesc"),
    },
  ]

  const metricLabel = (metric: MemoryMetricItem) => {
    if (metric.type === "Browser") return t("ramMainProcess")
    if (metric.type === "Tab") return t("ramWebContent")
    if (metric.type === "GPU") return t("ramGpu")
    if (metric.type === "Utility") return metric.name || t("ramUtility")
    return metric.type
  }

  return (
    <>
      <div className="mb-3 rounded-xl border border-border/70 bg-card/60 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Gauge size={18} className="text-primary shrink-0" />
            <div>
              <div className="text-[12px] font-medium text-foreground">
                {t("ramUsage")}
              </div>
              <div className="mt-0.5 font-mono text-[15px] font-semibold text-foreground">
                {memory ? `${memory.totalMB} MB` : "---"}
              </div>
              {memory?.processCount && (
                <div className="text-[10.5px] text-muted-foreground">
                  {t("ramProcessCount", { count: memory.processCount })}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            disabled={isRefreshingMemory}
            onClick={handleRefreshMemory}
            className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted/80 px-2.5 py-1 text-[11.5px] font-medium text-foreground transition-all hover:bg-muted active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RotateCcw
              size={11}
              className={isRefreshingMemory ? "animate-spin" : ""}
            />
            <span>{t("refreshRam")}</span>
          </button>
        </div>

        {memory?.chatMB && (
          <div className="mt-2 flex justify-between border-t border-border/50 pt-2 text-[11px]">
            <span className="text-muted-foreground">
              {t("ramBeforeSettings")}
            </span>
            <span className="font-mono font-medium text-foreground">
              {memory.chatMB} MB
            </span>
          </div>
        )}

        {memory?.metrics && memory.metrics.length > 0 && (
          <div className="mt-2 space-y-1 border-t border-border/50 pt-2">
            {memory.metrics.map((metric, index) => (
              <div
                key={`${metric.type}-${metric.name || index}`}
                className="flex justify-between text-[10.5px]"
              >
                <span className="truncate text-muted-foreground">
                  {metricLabel(metric)}
                </span>
                <span className="ml-3 shrink-0 font-mono text-foreground/80">
                  {metric.mb} MB
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Group title={t("memoryModes")}>
        {modes.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => saveMode(item.id)}
            className="flex w-full items-start gap-3 py-2.5 text-left transition-colors hover:bg-muted/40 cursor-pointer"
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
            <span>
              <span className="block text-[12.5px] font-medium text-foreground">
                {item.name}
              </span>
              <span className="mt-0.5 block text-[11px] leading-tight text-muted-foreground">
                {item.desc}
              </span>
            </span>
          </button>
        ))}
      </Group>
    </>
  )
}

function PrivacyPane() {
  const { t } = useTranslation()
  const [storageUsage, setStorageUsage] = useState<StorageUsageResult | null>(
    null,
  )
  const [threshold, setThreshold] = useState<number>(500)
  const [cleanSuccess, setCleanSuccess] = useState(false)

  const customTabName = (() => {
    try {
      const raw = localStorage.getItem("bubble.customTab")
      return raw ? JSON.parse(raw)?.name : null
    } catch {
      return null
    }
  })()

  const loadStorage = useCallback(() => {
    desktop()
      ?.getStorageUsage?.()
      .then((data) => {
        if (data) {
          setStorageUsage(data)
          if (typeof data.warnThresholdMB === "number") {
            setThreshold(data.warnThresholdMB)
          }
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    loadStorage()
  }, [loadStorage])

  const handleSetThreshold = (val: number) => {
    setThreshold(val)
    desktop()?.setStorageThreshold?.(val)
  }

  const handleClearCustomCache = async () => {
    try {
      const updated = await desktop()?.clearCustomCache?.()
      if (updated) setStorageUsage(updated)
      setCleanSuccess(true)
      setTimeout(() => setCleanSuccess(false), 2500)
    } catch {}
  }

  const thresholdOptions = [
    { label: t("threshold300"), value: 300 },
    { label: t("threshold500"), value: 500 },
    { label: t("threshold1000"), value: 1000 },
    { label: t("threshold2000"), value: 2000 },
    { label: t("thresholdOff"), value: 0 },
  ]

  return (
    <>
      <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-border/70 bg-accent/40 p-3">
        <Shield size={16} className="mt-0.5 shrink-0 text-primary" />
        <p className="text-[11.5px] leading-relaxed text-foreground/80">
          {t("storageNotice")}
        </p>
      </div>

      <Group title={t("storageTabUsage")}>
        <div className="grid grid-cols-3 gap-2 p-1">
          <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5 text-center">
            <span className="text-[11px] font-medium text-muted-foreground block truncate">
              Messenger
            </span>
            <span className="text-sm font-semibold text-foreground mt-0.5 block">
              {storageUsage ? `${storageUsage.messengerMB} MB` : "..."}
            </span>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5 text-center">
            <span className="text-[11px] font-medium text-muted-foreground block truncate">
              Zalo
            </span>
            <span className="text-sm font-semibold text-foreground mt-0.5 block">
              {storageUsage ? `${storageUsage.zaloMB} MB` : "..."}
            </span>
          </div>
          <div
            className={`rounded-xl border p-2.5 text-center transition-colors ${
              storageUsage &&
              threshold > 0 &&
              storageUsage.customMB >= threshold
                ? "border-amber-500/50 bg-amber-500/10"
                : "border-border/60 bg-muted/30"
            }`}
          >
            <span className="text-[11px] font-medium text-muted-foreground block truncate">
              {customTabName || "Tab 3"}
            </span>
            <span className="text-sm font-semibold text-foreground mt-0.5 flex items-center justify-center gap-1">
              {storageUsage ? `${storageUsage.customMB} MB` : "..."}
              {storageUsage &&
                threshold > 0 &&
                storageUsage.customMB >= threshold && (
                  <AlertTriangle size={13} className="text-amber-400" />
                )}
            </span>
          </div>
        </div>

        <div className="px-3 py-2 border-t border-border/40 mt-1">
          <div className="flex items-center justify-between mb-1.5">
            <div>
              <span className="text-xs font-medium text-foreground block">
                {t("storageThreshold")}
              </span>
              <span className="text-[11px] text-muted-foreground block">
                {t("storageThresholdDesc")}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {thresholdOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSetThreshold(opt.value)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                  threshold === opt.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </Group>

      <Group title={t("contentAndAds")}>
        <ToggleRow
          title={t("blockAds")}
          settingKey="adBlock"
          desc={t("blockAdsDesc")}
          defaultOn
        />
      </Group>

      <Group title={t("storageAndCache")}>
        {customTabName && (
          <ActionRow
            icon={<HardDrive size={14} />}
            title={t("clearCustomCacheOnly", { name: customTabName })}
            desc={
              cleanSuccess
                ? t("cacheClearedSuccess")
                : t("clearCustomCacheOnlyDesc")
            }
            onClick={handleClearCustomCache}
          />
        )}
        <ActionRow
          icon={<Trash2 size={14} />}
          title={t("clearMessengerSession")}
          onClick={() => desktop()?.clearSession("messenger")}
        />
        <ActionRow
          icon={<Trash2 size={14} />}
          title={t("clearZaloSession")}
          onClick={() => desktop()?.clearSession("zalo")}
        />
        {customTabName && (
          <ActionRow
            icon={<Trash2 size={14} />}
            title={t("clearCustomSession", { name: customTabName })}
            onClick={() => desktop()?.clearSession("custom")}
          />
        )}
        <ActionRow
          icon={<Trash2 size={14} />}
          title={t("clearWebCache")}
          desc={t("clearWebCacheDesc")}
          onClick={() => desktop()?.clearSession("cache")}
        />
        <ActionRow
          icon={<FolderOpen size={14} />}
          title={t("openSessionFolder")}
          onClick={() => desktop()?.openSessionStorage()}
        />
      </Group>
    </>
  )
}

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

function formatRemainingShort(seconds: number, lang: "vi" | "en"): string {
  const safeSec = Math.max(0, Math.floor(seconds))
  const h = Math.floor(safeSec / 3600)
  const m = Math.floor((safeSec % 3600) / 60)

  if (lang === "vi") {
    if (h > 0) return `${h}g ${m}p`
    return `${m}p`
  }
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

type AboutPaneProps = {
  version: string
  remainingSeconds?: number
  updateInfo: ReturnType<typeof useAppUpdate>["updateInfo"]
  checkForUpdates: () => Promise<void>
  installUpdate: () => Promise<unknown> | undefined
  openUpdateDownload: () => Promise<void> | undefined
}

function AboutPane({
  version,
  remainingSeconds,
  updateInfo,
  checkForUpdates,
  installUpdate,
  openUpdateDownload,
}: AboutPaneProps) {
  const { t, lang } = useTranslation()
  const [copied, setCopied] = useState(false)
  const electron = "44.2.0"
  const chromium = "152.0.7977.76"
  const updateInProgress =
    updateInfo.status === "downloading" || updateInfo.status === "installing"

  return (
    <>
      <div className="mb-3 flex flex-col items-center rounded-xl border border-border/70 bg-card/60 p-4 text-center">
        <AppIcon size={44} round className="shadow-e2" />
        <h3 className="mt-2 font-semibold text-[15px] text-foreground">
          Bubble Chat
        </h3>
        <div className="font-mono text-[10.5px] text-muted-foreground">
          Messenger + Zalo Desktop
        </div>
        <button
          type="button"
          onClick={() => void checkForUpdates()}
          disabled={updateInfo.status === "checking" || updateInProgress}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-3 py-1.5 font-medium text-[11.5px] text-foreground transition-all hover:bg-muted active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
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
            {updateInfo.releaseNotes && (
              <p className="mt-1 max-h-16 overflow-y-auto whitespace-pre-line text-left font-normal text-muted-foreground text-[10.5px]">
                {updateInfo.releaseNotes}
              </p>
            )}
          </div>
        )}
        {updateInfo.status === "error" && (
          <div className="mt-2 text-[11px] text-danger">{updateInfo.error}</div>
        )}
      </div>

      <Group title={t("environment")}>
        <div className="flex items-center justify-between py-2 text-[12px]">
          <span className="text-muted-foreground">{t("appVersion")}</span>
          <span className="font-mono text-[11px] text-foreground">
            {version}
          </span>
        </div>
        {typeof remainingSeconds === "number" && (
          <div className="flex items-center justify-between py-2 text-[12px]">
            <span
              className="text-muted-foreground"
              title={t("sessionRemainingDesc")}
            >
              {t("sessionRemaining")}
            </span>
            <span className="font-mono text-[11px] text-foreground/80">
              {formatRemainingDetailed(remainingSeconds, lang)}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between py-2 text-[12px]">
          <span className="text-muted-foreground">Electron</span>
          <span className="font-mono text-[11px] text-foreground">
            {electron}
          </span>
        </div>
        <div className="flex items-center justify-between py-2 text-[12px]">
          <span className="text-muted-foreground">Chromium</span>
          <span className="font-mono text-[11px] text-foreground">
            {chromium}
          </span>
        </div>
      </Group>

      <Group title={t("developer")}>
        <div className="flex items-center justify-between gap-3 py-2">
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
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-[11px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}{" "}
            {copied ? t("copied") : t("copy")}
          </button>
        </div>
      </Group>
    </>
  )
}

/* ---------- Main Component ---------- */

export default function SettingsWindow({ onClose }: { onClose: () => void }) {
  const { t, lang, setLanguage } = useTranslation()
  const [section, setSection] = useState<Section | null>(null)
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

  const sections: Array<{
    id: Section
    label: string
    desc: string
    icon: typeof Settings2
    accent: string
  }> = [
    {
      id: "general",
      label: t("general"),
      desc: t("generalDesc"),
      icon: Settings2,
      accent: "bg-blue-500/15 text-blue-500",
    },
    {
      id: "appearance",
      label: t("appearance"),
      desc: t("appearanceDesc"),
      icon: Palette,
      accent: "bg-purple-500/15 text-purple-500",
    },
    {
      id: "behavior",
      label: t("behavior"),
      desc: t("behaviorDesc"),
      icon: MousePointerClick,
      accent: "bg-amber-500/15 text-amber-500",
    },
    {
      id: "performance",
      label: t("performance"),
      desc: t("performanceDesc"),
      icon: Gauge,
      accent: "bg-emerald-500/15 text-emerald-500",
    },
    {
      id: "privacy",
      label: t("privacy"),
      desc: t("privacyDesc"),
      icon: Shield,
      accent: "bg-teal-500/15 text-teal-500",
    },
    {
      id: "about",
      label: t("about"),
      desc: t("aboutDesc"),
      icon: Info,
      accent: "bg-slate-500/15 text-slate-500 dark:text-slate-400",
    },
  ]

  const activeMeta = sections.find((s) => s.id === section)

  const renderContent = () => {
    switch (section) {
      case "general":
        return <GeneralPane />
      case "appearance":
        return <AppearancePane />
      case "behavior":
        return <BehaviorPane />
      case "performance":
        return <PerformancePane />
      case "privacy":
        return <PrivacyPane />
      case "about":
        return (
          <AboutPane
            version={version}
            remainingSeconds={remainingSeconds}
            updateInfo={updateInfo}
            checkForUpdates={checkForUpdates}
            installUpdate={installUpdate}
            openUpdateDownload={openUpdateDownload}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-panel">
      {/* Header */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border/50 bg-card/60 px-3.5 select-none">
        {section ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSection(null)}
              className="flex items-center gap-0.5 rounded-lg px-2 py-1.5 font-medium text-[13px] text-primary transition-all hover:bg-muted active:scale-95 cursor-pointer"
            >
              <ChevronLeft size={18} />
              <span>{t("back")}</span>
            </button>
            <span className="text-border-strong">/</span>
            <span className="truncate font-semibold text-[14px] text-foreground">
              {activeMeta?.label}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <AppIcon size={18} />
            <span className="font-semibold text-[14px] text-foreground">
              {t("settings")}
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setLanguage(lang === "vi" ? "en" : "vi")}
            className="flex items-center gap-1 rounded-lg border border-border/70 bg-card/60 px-2.5 py-1 font-mono text-[11.5px] font-semibold text-foreground/80 hover:bg-muted transition-all active:scale-95 cursor-pointer"
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
            className="flex items-center gap-1 rounded-lg bg-muted/80 px-3 py-1.5 font-medium text-[12px] text-foreground transition-all hover:bg-border active:scale-95 cursor-pointer"
          >
            <span>{t("done")}</span>
            <X size={13} className="opacity-70" />
          </button>
        </div>
      </header>

      {/* Main body area */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-3">
        {section === null ? (
          <div className="space-y-1.5 stagger-children">
            {sections.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className="group flex w-full items-center gap-3 rounded-xl border border-border/40 bg-card/50 px-3.5 py-3 text-left transition-all duration-200 hover:border-border/80 hover:bg-card hover:-translate-y-[1px] hover:shadow-e1 active:scale-[0.99] active:translate-y-0 animate-fade-in cursor-pointer"
                >
                  <div
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${item.accent}`}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-[13.5px] text-foreground group-hover:text-primary transition-colors">
                      {item.label}
                      {item.id === "about" &&
                        updateInfo.status === "available" && (
                          <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-danger align-middle animate-pulse-dot" />
                        )}
                    </div>
                    <div className="truncate text-[11.5px] text-muted-foreground">
                      {item.desc}
                    </div>
                  </div>
                  <ChevronRight
                    size={16}
                    className="shrink-0 text-muted-foreground/50 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-muted-foreground"
                  />
                </button>
              )
            })}
          </div>
        ) : (
          <div className="animate-slide-in-right">{renderContent()}</div>
        )}
      </div>

      {/* Footer info in root */}
      {section === null && (
        <div className="flex items-center justify-between border-t border-border/40 bg-card/30 px-3.5 py-2 font-mono text-[10px] text-muted-foreground">
          <span>Bubble Chat v{version}</span>
          {typeof remainingSeconds === "number" && (
            <span
              className="opacity-75 transition-opacity hover:opacity-100 cursor-default"
              title={`${t("sessionRemaining")}: ${formatRemainingDetailed(remainingSeconds, lang)}`}
            >
              {formatRemainingShort(remainingSeconds, lang)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
