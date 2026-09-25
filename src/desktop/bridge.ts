export type UpdateInfo = {
  status: "idle" | "checking" | "available" | "downloading" | "installing" | "up-to-date" | "error"
  currentVersion: string
  latestVersion?: string
  releaseNotes?: string
  downloadUrl?: string
  releaseUrl?: string
  error?: string
}

export type AppearanceData = {
  theme?: string
  bubbleSize?: string
  bubbleOpacity?: number
  bubbleIcon?: string
}

export type UnreadCallbackCounts = {
  messenger: number
  zalo: number
  custom?: number
}

export type MemoryMetricItem = {
  type: string
  name?: string
  mb: number
}

export type MemoryUsageResult = {
  totalMB: number
  chatMB?: number
  processCount?: number
  metrics?: MemoryMetricItem[]
}

export type StorageUsageResult = {
  messengerMB: number
  zaloMB: number
  customMB: number
  totalMB: number
  warnThresholdMB: number
}

export type StorageWarningInfo = {
  provider: string
  sizeMB: number
  thresholdMB: number
}

export type DownloadCompleteInfo = {
  fileName: string
  savePath: string
}

export type TotpVerifyResult = {
  success: boolean
  error?: string
  lockoutRemainingSeconds?: number
  failedAttempts?: number
}

export type LockStatus = {
  enabled?: boolean
  isLocked: boolean
  remainingSeconds?: number
  lockoutRemainingSeconds?: number
  failedAttempts?: number
}

export type DesktopBridge = {
  isElectron: true
  platform?: string
  copyDeveloperPhone: () => void
  getAppVersion: () => Promise<string>
  getUpdateInfo: () => Promise<UpdateInfo>
  checkForUpdates: () => Promise<UpdateInfo>
  installUpdate: () => Promise<UpdateInfo>
  openUpdateDownload: () => Promise<void>
  onUpdateStatus: (cb: (info: UpdateInfo) => void) => () => void
  getSettings: () => Promise<Record<string, any>>
  setAppearance: (data: AppearanceData) => void
  onAppearance: (cb: (data: AppearanceData) => void) => () => void
  bubbleDragStart: () => void
  bubbleDragEnd: () => void
  bubbleClick: () => void
  showContextMenu: () => void
  showBubble: () => void
  hideBubble: () => void
  openProvider: (which: "messenger" | "zalo" | "custom" | "settings") => void
  quit: () => void
  collapsePanel: () => void
  resetPanelPosition?: () => void
  resetPanelSize: () => void
  getPanelBounds?: () => Promise<{
    x: number
    y: number
    width: number
    height: number
  } | null>
  setPanelBounds?: (bounds: {
    x?: number
    y?: number
    width: number
    height: number
  }) => void
  openExternal: (url: string) => void
  setLoginItem: (enabled: boolean) => void
  setAlwaysOnTop: (enabled: boolean) => void
  setCloseOnBlur: (enabled: boolean) => void
  setShowBubbleOnStartup: (enabled: boolean) => void
  setRememberPosition: (enabled: boolean) => void
  setSnapToEdge: (enabled: boolean) => void
  setPerformanceMode: (mode: string) => void
  reportUnread: (
    provider: "messenger" | "zalo" | "custom",
    count: number,
  ) => void
  onUnread: (cb: (counts: UnreadCallbackCounts) => void) => () => void
  clearSession: (provider: "messenger" | "zalo" | "custom" | "cache") => void
  openSessionStorage: () => void
  onNavigate: (cb: (which: string) => void) => () => void
  onPerformance: (cb: (mode: string) => void) => () => void
  onPanelVisibility?: (cb: (visible: boolean) => void) => () => void
  onReloadProvider?: (cb: (provider: string) => void) => () => void
  getMemoryUsage?: () => Promise<MemoryUsageResult>
  getStorageUsage?: () => Promise<StorageUsageResult>
  clearCustomCache?: () => Promise<StorageUsageResult>
  setStorageThreshold?: (thresholdMB: number) => void
  onStorageWarning?: (cb: (info: StorageWarningInfo) => void) => () => void
  onDownloadComplete?: (cb: (info: DownloadCompleteInfo) => void) => () => void
  getLockStatus?: () => Promise<LockStatus>
  verifyTotp?: (code: string) => Promise<TotpVerifyResult>
  onLockState?: (cb: (status: LockStatus) => void) => () => void
}

declare global {
  interface Window {
    desktop?: DesktopBridge
  }
}

export const desktop = (): DesktopBridge | undefined =>
  typeof window !== "undefined" ? window.desktop : undefined

export const isElectron = (): boolean => !!desktop()?.isElectron

/**
 * Resets the floating chat panel back to its default position beside the bubble,
 * WITHOUT changing or shrinking its size (strictly preserves the user's resized dimensions).
 */
export function resetPanelPosition() {
  const currentW =
    (typeof window !== "undefined"
      ? window.outerWidth || window.innerWidth
      : null) || 260
  const currentH =
    (typeof window !== "undefined"
      ? window.outerHeight || window.innerHeight
      : null) || 370
  const BUBBLE = 88

  let bx: number | null = null
  let by: number | null = null

  try {
    const stored = localStorage.getItem("bubble.currentPos")
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) {
        bx = parsed.x
        by = parsed.y
      }
    }
  } catch {}

  const screenW =
    (typeof window !== "undefined" ? window.screen.availWidth : null) || 1920
  const screenH =
    (typeof window !== "undefined" ? window.screen.availHeight : null) || 1080
  const screenLeft =
    typeof window !== "undefined" ? (window.screen as any).availLeft || 0 : 0
  const screenTop =
    typeof window !== "undefined" ? (window.screen as any).availTop || 0 : 0

  const actualBx = bx ?? screenLeft + screenW - BUBBLE - 24
  const actualBy = by ?? screenTop + Math.round(screenH * 0.4)

  const spaceRight = screenLeft + screenW - (actualBx + BUBBLE)
  const openRight = spaceRight >= currentW + 8
  let px = openRight ? actualBx + BUBBLE + 6 : actualBx - currentW - 6
  px = Math.min(
    Math.max(screenLeft, px),
    Math.max(screenLeft, screenLeft + screenW - currentW),
  )
  let py = actualBy - 30
  py = Math.min(
    Math.max(screenTop, py),
    Math.max(screenTop, screenTop + screenH - currentH),
  )

  const roundedX = Math.round(px)
  const roundedY = Math.round(py)

  if (typeof window !== "undefined") {
    if (typeof window.moveTo === "function") {
      window.moveTo(roundedX, roundedY)
    }
  }

  desktop()?.setPanelBounds?.({
    x: roundedX,
    y: roundedY,
    width: currentW,
    height: currentH,
  })
  desktop()?.resetPanelPosition?.()
}

/**
 * Resets the floating chat panel back to default dimensions (260x370).
 */
export function resetPanelSize() {
  const width = 260
  const height = 370
  if (typeof window !== "undefined" && typeof window.resizeTo === "function") {
    window.resizeTo(width, height)
  }
  desktop()?.resetPanelSize?.()
}

/**
 * Backwards compatibility alias for resetPanelPosition.
 */
export function resetPanelToDefault() {
  resetPanelPosition()
}
