export type UpdateInfo = {
  status: "idle" | "checking" | "available" | "up-to-date" | "error";
  currentVersion: string;
  latestVersion?: string;
  releaseNotes?: string;
  downloadUrl?: string;
  releaseUrl?: string;
  error?: string;
};

export type AppearanceData = {
  theme?: string;
  bubbleSize?: string;
};

export type DesktopBridge = {
  isElectron: true;
  platform?: string;
  copyDeveloperPhone: () => void;
  getAppVersion: () => Promise<string>;
  getUpdateInfo: () => Promise<UpdateInfo>;
  checkForUpdates: () => Promise<UpdateInfo>;
  openUpdateDownload: () => Promise<void>;
  onUpdateStatus: (cb: (info: UpdateInfo) => void) => () => void;
  getSettings: () => Promise<Record<string, any>>;
  setAppearance: (data: AppearanceData) => void;
  onAppearance: (cb: (data: AppearanceData) => void) => () => void;
  bubbleDragStart: () => void;
  bubbleDragEnd: () => void;
  bubbleClick: () => void;
  showContextMenu: () => void;
  showBubble: () => void;
  hideBubble: () => void;
  openProvider: (which: "messenger" | "zalo" | "settings") => void;
  quit: () => void;
  collapsePanel: () => void;
  resetPanelSize: () => void;
  openExternal: (url: string) => void;
  setLoginItem: (enabled: boolean) => void;
  setAlwaysOnTop: (enabled: boolean) => void;
  setCloseOnBlur: (enabled: boolean) => void;
  setShowBubbleOnStartup: (enabled: boolean) => void;
  setRememberPosition: (enabled: boolean) => void;
  setSnapToEdge: (enabled: boolean) => void;
  setPerformanceMode: (mode: string) => void;
  reportUnread: (provider: "messenger" | "zalo", count: number) => void;
  onUnread: (cb: (counts: { messenger: number; zalo: number }) => void) => () => void;
  clearSession: (provider: "messenger" | "zalo" | "cache") => void;
  openSessionStorage: () => void;
  onNavigate: (cb: (which: string) => void) => () => void;
  onPerformance: (cb: (mode: string) => void) => () => void;
  onReloadProvider?: (cb: (provider: string) => void) => () => void;
};

declare global {
  interface Window {
    desktop?: DesktopBridge;
  }
}

export const desktop = (): DesktopBridge | undefined =>
  typeof window !== "undefined" ? window.desktop : undefined;

export const isElectron = (): boolean => !!desktop()?.isElectron;
