import { useCallback, useEffect, useState, useMemo } from "react"
import {
  RotateCw,
  RotateCcw,
  LocateFixed,
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
import ChatWebView from "./ChatWebView"
import {
  AddTabModal,
  CHAT_PRESETS,
  defaultMeta,
  ENTERTAINMENT_PRESETS,
  FailedState,
  ProviderTab,
  RemoveTabModal,
  type CustomTab,
  type Preset,
  type Provider,
} from "./ChatPanelParts"
export type { CustomTab, Provider } from "./ChatPanelParts"
import {
  desktop,
  resetPanelPosition,
  resetPanelSize,
  type StorageWarningInfo,
  type DownloadCompleteInfo,
} from "../desktop/bridge"
import { useUnreadCounts } from "../hooks/useUnreadCounts"
import { useAppUpdate } from "../hooks/useAppUpdate"
import { useTranslation } from "../utils/i18n"

type LoadState = "ready" | "failed"

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
  const [panelSize, setPanelSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 375,
    height: typeof window !== "undefined" ? window.innerHeight : 560,
  })

  useEffect(() => {
    const handleResize = () => {
      setPanelSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const isCompact = panelSize.width < 340
  const isWide = panelSize.width >= 460
  const resizeToken = `${panelSize.width}x${panelSize.height}`
  const [panelVisible, setPanelVisible] = useState(false)
  const [isPanelDragging, setIsPanelDragging] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const { updateInfo, openUpdateDownload } = useAppUpdate()
  const [storageWarning, setStorageWarning] =
    useState<StorageWarningInfo | null>(null)
  const [warningDismissed, setWarningDismissed] = useState(false)
  const [isCleaningStorage, setIsCleaningStorage] = useState(false)
  const [downloadToast, setDownloadToast] =
    useState<DownloadCompleteInfo | null>(null)

  useEffect(() => {
    const offWarn = desktop()?.onStorageWarning?.((info) => {
      setStorageWarning(info)
      setWarningDismissed(false)
    })
    const offDown = desktop()?.onDownloadComplete?.((info) => {
      setDownloadToast(info)
      setTimeout(() => setDownloadToast(null), 4500)
    })
    return () => {
      offWarn?.()
      offDown?.()
    }
  }, [])

  const handleCleanCache = async () => {
    setIsCleaningStorage(true)
    try {
      await desktop()?.clearCustomCache?.()
      setStorageWarning(null)
    } catch {}
    setIsCleaningStorage(false)
  }

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
    const offVisibility = desktop()?.onPanelVisibility?.(setPanelVisible)
    window.addEventListener("bubble:performance", onLocalChange)
    return () => {
      window.removeEventListener("bubble:performance", onLocalChange)
      off?.()
      offReload?.()
      offVisibility?.()
    }
  }, [provider])

  useEffect(() => {
    if (performanceMode !== "Balanced") return
    const timer = window.setTimeout(() => {
      setVisitedProviders(new Set([provider]))
    }, 60000)
    return () => window.clearTimeout(timer)
  }, [performanceMode, provider])

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
  // - Balanced (Default): Lazy-mounts tabs, then unloads inactive tabs after one minute.
  // - Instant Switching: Keeps all visited tabs mounted in background.
  const keepProvidersMounted = performanceMode !== "Low Memory"
  const shouldRenderWebviews = performanceMode !== "Low Memory" || panelVisible

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

  const handleHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (
      target.closest("button, [role='button'], input, textarea, a, .no-drag")
    ) {
      return
    }
    if (e.button !== 0) return

    e.preventDefault()

    const startX = window.screenX
    const startY = window.screenY

    const startScreenX = e.screenX
    const startScreenY = e.screenY

    let rafId: number | null = null
    let pendingPosition: [number, number] | null = null

    const flushPosition = () => {
      rafId = null
      if (!pendingPosition) return
      desktop()?.setPanelPosition?.(pendingPosition[0], pendingPosition[1])
      pendingPosition = null
    }

    setIsPanelDragging(true)

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.screenX - startScreenX
      const dy = moveEvent.screenY - startScreenY
      const nextX = Math.round(startX + dx)
      const nextY = Math.round(startY + dy)

      pendingPosition = [nextX, nextY]
      if (!rafId) rafId = requestAnimationFrame(flushPosition)
    }

    const onMouseUp = () => {
      if (rafId) cancelAnimationFrame(rafId)
      flushPosition()
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
      setIsPanelDragging(false)
    }

    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
  }, [])

  return (
    <div className="relative flex h-full w-full min-h-0 max-w-full flex-col overflow-hidden border-border bg-panel text-foreground">
      {/* Header with tabs */}
      <div
        className="flex min-w-0 items-center justify-between border-b border-border/30 bg-card/40 px-1.5 py-0.5 select-none cursor-grab active:cursor-grabbing"
        onContextMenu={(e) => {
          e.preventDefault()
          setMenuOpen((prev) => !prev)
        }}
        onMouseDown={handleHeaderMouseDown}
      >
        <div className="flex min-w-0 items-center gap-0.5 rounded-lg bg-muted/40 p-0.5">
          <ProviderTab
            provider="messenger"
            active={provider === "messenger"}
            unread={unread.messenger}
            compact={isCompact}
            onClick={() => selectProvider("messenger")}
          />
          <ProviderTab
            provider="zalo"
            active={provider === "zalo"}
            unread={unread.zalo}
            compact={isCompact}
            onClick={() => selectProvider("zalo")}
          />
          {customTab && (
            <ProviderTab
              provider="custom"
              active={provider === "custom"}
              unread={unread.custom || 0}
              customName={customTab.name}
              customColor={customTab.color}
              compact={isCompact}
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
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-muted-foreground/60 transition-all hover:bg-card/60 hover:text-foreground active:scale-95 cursor-pointer"
            >
              <Plus size={11} />
            </button>
          )}
        </div>

        {/* Action Controls & Options */}
        <div className="flex items-center gap-0.5">
          {isWide && (
            <>
              <button
                type="button"
                onClick={reload}
                title={t("reload")}
                aria-label={t("reload")}
                className="flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground/60 transition-all hover:bg-muted/80 hover:text-foreground active:scale-95 cursor-pointer"
              >
                <RotateCw size={12} />
              </button>
              <button
                type="button"
                onClick={openExternal}
                title={t("openInBrowser")}
                aria-label={t("openInBrowser")}
                className="flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground/60 transition-all hover:bg-muted/80 hover:text-foreground active:scale-95 cursor-pointer"
              >
                <ExternalLink size={12} />
              </button>
              <button
                type="button"
                onClick={resetPanelPosition}
                title={t("resetPanelPosition")}
                aria-label={t("resetPanelPosition")}
                className="flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground/60 transition-all hover:bg-muted/80 hover:text-foreground active:scale-95 cursor-pointer"
              >
                <LocateFixed size={12} />
              </button>
              <div className="mx-0.5 h-3 w-px bg-border/40" />
            </>
          )}

          {/* Options menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((open) => !open)}
              title={t("options")}
              aria-label={t("options")}
              className="flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground/60 transition-all hover:bg-muted/80 hover:text-foreground active:scale-95 cursor-pointer"
            >
              <MoreHorizontal size={13} />
            </button>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-8 z-30 w-[200px] rounded-xl border border-border/60 bg-panel/95 backdrop-blur-lg p-1 shadow-e3 animate-scale-in stagger-children">
                  <button
                    onClick={() => {
                      reload()
                      setMenuOpen(false)
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors hover:bg-muted cursor-pointer animate-fade-in"
                  >
                    <RotateCw size={15} className="text-muted-foreground" />{" "}
                    {t("reload")}
                  </button>
                  <button
                    onClick={() => {
                      openExternal()
                      setMenuOpen(false)
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors hover:bg-muted cursor-pointer animate-fade-in"
                  >
                    <ExternalLink size={15} className="text-muted-foreground" />{" "}
                    {t("openInBrowser")}
                  </button>
                  {customTab && (
                    <button
                      onClick={() => {
                        setMenuOpen(false)
                        setConfirmRemove(true)
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-danger transition-colors hover:bg-danger/10 cursor-pointer animate-fade-in"
                    >
                      <Trash2 size={15} />{" "}
                      {t("removeCustomTab", { name: customTab.name })}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      desktop()?.openProvider("settings")
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors hover:bg-muted cursor-pointer animate-fade-in"
                  >
                    <Settings2 size={15} className="text-muted-foreground" />{" "}
                    {t("openSettings")}
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      resetPanelPosition()
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors hover:bg-muted cursor-pointer animate-fade-in"
                  >
                    <LocateFixed size={15} className="text-muted-foreground" />{" "}
                    {t("resetPanelPosition")}
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      resetPanelSize()
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors hover:bg-muted cursor-pointer animate-fade-in"
                  >
                    <RotateCcw size={15} className="text-muted-foreground" />{" "}
                    {t("resetPanelSize")}
                  </button>
                  <div className="my-0.5 mx-2 h-px bg-border/50" />
                  <button
                    onClick={() => {
                      desktop()?.collapsePanel()
                      setMenuOpen(false)
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-danger transition-colors hover:bg-danger/10 cursor-pointer animate-fade-in"
                  >
                    <Minus size={15} /> {t("collapsePanel")}
                  </button>
                </div>
              </>
            )}
          </div>
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

      {storageWarning && provider === "custom" && !warningDismissed && (
        <div className="flex items-center justify-between gap-2 border-b border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-xs text-amber-200 backdrop-blur-md animate-fade-in select-none">
          <div className="flex items-center gap-1.5 min-w-0">
            <AlertTriangle size={13} className="text-amber-400 shrink-0" />
            <span className="truncate text-[11px]">
              {t("storageWarningBanner", {
                name: customTab?.name || "Tab 3",
                size: storageWarning.sizeMB,
                threshold: storageWarning.thresholdMB,
              })}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleCleanCache}
              disabled={isCleaningStorage}
              className="rounded bg-amber-500/25 hover:bg-amber-500/40 text-amber-200 px-1.5 py-0.5 font-medium transition-colors cursor-pointer text-[10px] disabled:opacity-50"
            >
              {isCleaningStorage ? t("cleaning") : t("clearCacheOnly")}
            </button>
            <button
              type="button"
              onClick={() => setWarningDismissed(true)}
              className="text-amber-400/70 hover:text-amber-200 transition-colors cursor-pointer p-0.5"
              title={t("dismiss")}
              aria-label={t("dismiss")}
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* main embedded area */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {!shouldRenderWebviews ? null : state === "ready" &&
          keepProvidersMounted ? (
          <div className="relative h-full w-full flex-1">
            {mountedProviders.map((item) => (
              <div
                key={item === "custom" ? `custom-${customTab?.url}` : item}
                className={`absolute inset-0 ${
                  provider === item ? "" : "invisible pointer-events-none"
                }`}
              >
                <ChatWebView
                  provider={item}
                  url={
                    item === "custom"
                      ? customTab?.url || "about:blank"
                      : defaultMeta[item].url
                  }
                  active={provider === item}
                  resizeToken={resizeToken}
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
          <ChatWebView
            key={`${provider}-${reloadKey}-${
              provider === "custom" ? customTab?.url : ""
            }`}
            provider={provider}
            url={
              provider === "custom"
                ? customTab?.url || "about:blank"
                : defaultMeta[provider].url
            }
            active
            resizeToken={resizeToken}
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
                top: Math.min(
                  tabContextMenu.y + 6,
                  Math.max(10, panelSize.height - 300),
                ),
                left: Math.max(
                  10,
                  Math.min(
                    tabContextMenu.x - 20,
                    Math.max(10, panelSize.width - 240),
                  ),
                ),
              }}
              className="fixed z-50 w-[230px] rounded-xl border border-border/60 bg-panel/95 backdrop-blur-lg p-1 shadow-e3 text-foreground select-none animate-scale-in stagger-children"
            >
              <div className="px-2.5 py-1.5 text-[10.5px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
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
                    className={`flex w-full items-center justify-between gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors hover:bg-muted cursor-pointer animate-fade-in ${
                      isCurrent
                        ? "bg-muted/60 text-foreground"
                        : "text-foreground/90"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon size={16} style={{ color: p.color }} />
                      <span>{p.name}</span>
                    </div>
                    {isCurrent && <Check size={15} className="text-primary" />}
                  </button>
                )
              })}

              <div className="my-0.5 mx-2 border-t border-border/50" />

              <div className="px-2.5 py-1 text-[10.5px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
                {t("chatAndAi")}
              </div>

              {CHAT_PRESETS.slice(0, 3).map((p) => {
                const isCurrent = customTab?.url === p.url
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handleSwitchPreset(p)}
                    className={`flex w-full items-center justify-between gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors hover:bg-muted cursor-pointer animate-fade-in ${
                      isCurrent
                        ? "bg-muted/60 text-foreground"
                        : "text-foreground/90"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Globe size={16} style={{ color: p.color }} />
                      <span>{p.name}</span>
                    </div>
                    {isCurrent && <Check size={15} className="text-primary" />}
                  </button>
                )
              })}

              <div className="my-0.5 mx-2 border-t border-border/50" />

              <button
                type="button"
                onClick={() => {
                  setTabContextMenu(null)
                  setAddModalOpen(true)
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium hover:bg-muted cursor-pointer text-foreground/90 animate-fade-in"
              >
                <Plus size={15} className="text-muted-foreground" />
                <span>{t("switchCustomUrl")}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTabContextMenu(null)
                  reload()
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium hover:bg-muted cursor-pointer text-foreground/90 animate-fade-in"
              >
                <RotateCw size={15} className="text-muted-foreground" />
                <span>{t("reload")}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTabContextMenu(null)
                  setConfirmRemove(true)
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-danger hover:bg-danger/10 cursor-pointer animate-fade-in"
              >
                <Trash2 size={15} />
                <span>{t("removeThisTab")}</span>
              </button>
            </div>
          </>
        )}
      </div>

      {downloadToast && (
        <div className="absolute bottom-2.5 left-2.5 right-2.5 z-40 flex items-center justify-between gap-2 rounded-xl border border-emerald-500/40 bg-card/95 px-3 py-2 text-xs text-foreground shadow-xl backdrop-blur-md animate-scale-in">
          <div className="flex items-center gap-2 min-w-0">
            <Check size={14} className="text-emerald-400 shrink-0" />
            <span className="truncate font-medium text-[11px]">
              {t("downloadComplete", { name: downloadToast.fileName })}
            </span>
          </div>
          <button
            type="button"
            onClick={() => desktop()?.openSessionStorage()}
            className="text-[11px] text-primary hover:underline shrink-0 cursor-pointer font-medium"
          >
            {t("openFolder")}
          </button>
        </div>
      )}
      {isPanelDragging && (
        <div className="fixed inset-0 z-[60] cursor-grabbing select-none" />
      )}
    </div>
  )
}
