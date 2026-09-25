import { useState, useEffect } from "react"

export type Language = "vi" | "en"

export const translations = {
  vi: {
    // Navigation / Sections
    settings: "Cài đặt",
    general: "Chung",
    appearance: "Giao diện",
    behavior: "Hành vi",
    performance: "Hiệu năng",
    privacy: "Quyền riêng tư & Dữ liệu",
    about: "Giới thiệu",
    tabGeneral: "Cài đặt",
    tabAppearance: "Giao diện",
    tabStorage: "Bộ nhớ",
    tabAbout: "Giới thiệu",
    panelResetGroup: "Vị trí & Kích thước",
    panelResetDesc: "Khôi phục bảng chat về vị trí hoặc kích thước mặc định.",
    resetPosBtn: "Đặt lại vị trí",
    resetSizeBtn: "Đặt lại kích thước",
    advancedStorage: "Tùy chọn nâng cao",
    advancedStorageDesc: "Quản lý phiên đăng nhập và mở thư mục lưu trữ.",
    ramCurrent: "RAM đang dùng",
    cacheSize: "Bộ nhớ đệm",
    cleanCacheNow: "Dọn dẹp bộ nhớ đệm",
    cleanCacheSuccess: "Đã dọn dẹp bộ nhớ đệm!",
    language: "Ngôn ngữ",
    languageDesc: "Chọn ngôn ngữ hiển thị giao diện",
    back: "Quay lại",
    done: "Xong",

    // Subtitles
    generalDesc: "Khởi động, hút cạnh, ngôn ngữ",
    appearanceDesc: "Chế độ màu, kích thước và độ mờ bong bóng & bảng chat",
    behaviorDesc: "Ghim trên cùng, phím tắt",
    performanceDesc: "Quản lý bộ nhớ & bộ nhớ đệm",
    privacyDesc: "Xóa cookie, dữ liệu phiên & quảng cáo",
    aboutDesc: "Phiên bản & thông tin",

    // General Settings
    systemStartup: "Khởi động cùng hệ thống",
    startAtLogin: "Khởi động cùng máy tính",
    startAtLoginDesc: "Tự động mở Bubble Chat khi máy tính khởi động.",
    showBubbleOnStartup: "Hiện bong bóng khi khởi động",
    windowBehavior: "Hành vi cửa sổ",
    rememberPosition: "Ghi nhớ vị trí bong bóng",
    snapToEdge: "Tự động hút vào cạnh màn hình",
    snapToEdgeDesc:
      "Bong bóng sẽ tự dính vào cạnh màn hình gần nhất khi thả chuột.",
    closeOnBlur: "Đóng bảng chat khi click ra ngoài",
    resetPanelPosition: "Đặt lại vị trí bảng chat",
    resetPanelPositionDesc:
      "Đưa bảng chat trở về vị trí mặc định bên cạnh bong bóng.",
    resetPanelSize: "Đặt lại kích thước bảng chat",
    resetPanelSizeDesc: "Khôi phục về kích thước mặc định ban đầu.",

    // Appearance Settings
    themeMode: "Chế độ giao diện",
    themeLight: "Sáng",
    themeDark: "Tối",
    themeSystem: "Hệ thống",
    bubbleSize: "Kích thước bong bóng",
    bubbleSizeSmall: "Nhỏ",
    bubbleSizeMedium: "Vừa",
    bubbleSizeLarge: "Lớn",
    bubbleOpacity: "Độ mờ bong bóng & bảng chat",
    bubbleIcon: "Biểu tượng bong bóng",
    iconDefault: "Mặc định",
    iconMessage: "Tin nhắn",
    iconSpark: "Lấp lánh",
    iconHeart: "Trái tim",
    iconBolt: "Tia sét",

    // Behavior Settings
    alwaysOnTop: "Luôn hiển thị trên cùng",
    alwaysOnTopDesc:
      "Giữ bong bóng và bảng chat luôn nổi trên các ứng dụng khác.",
    shortcuts: "Phím tắt",
    togglePanel: "Bật / Tắt bảng chat",
    openMessenger: "Mở Messenger",
    openZalo: "Mở Zalo",

    // Performance Settings
    memoryModes: "Chế độ quản lý bộ nhớ",
    perfBalanced: "Cân bằng",
    perfBalancedDesc: "Tải theo nhu cầu và tự giải phóng tab nền sau 1 phút.",
    perfLowMemory: "Tiết kiệm RAM",
    perfLowMemoryDesc:
      "Chỉ giữ tab đang mở và giải phóng khi thu nhỏ bảng chat.",
    perfInstant: "Chuyển tức thì",
    perfInstantDesc:
      "Giữ tất cả các tab đã mở trong bộ nhớ để chuyển đổi ngay.",
    ramUsage: "RAM ứng dụng đang sử dụng",
    ramBeforeSettings: "Trước khi mở Cài đặt",
    ramProcessCount: "{count} tiến trình",
    ramMainProcess: "Ứng dụng chính",
    ramWebContent: "Nội dung web",
    ramGpu: "Đồ họa",
    ramUtility: "Tiện ích hệ thống",
    refreshRam: "Đo lại",
    ramTrend: "Biến động RAM gần đây",
    processBreakdown: "Phân bổ theo tiến trình",
    storageTotal: "Tổng dung lượng trên ổ đĩa",

    // Privacy & Ads
    contentAndAds: "Nội dung & Quảng cáo",
    blockAds: "Chặn quảng cáo (YouTube & Spotify)",
    blockAdsDesc:
      "Tự động bỏ qua quảng cáo video, tắt tiếng giật mình và ẩn banner.",
    storageAndCache: "Lưu trữ & Bộ nhớ",
    storageNotice:
      "Các phiên đăng nhập được lưu an toàn trong vùng lưu trữ riêng biệt của Chromium. Bubble Chat không bao giờ lưu trữ mật khẩu của bạn.",
    storageTabUsage: "Dung lượng dữ liệu trên ổ đĩa",
    storageTabUsageDesc:
      "Kích thước dữ liệu và bộ nhớ đệm lưu trữ thực tế của từng tab.",
    storageWarningBanner:
      'Tab "{name}" đang lưu {size} MB (vượt ngưỡng {threshold} MB)',
    storageThreshold: "Ngưỡng cảnh báo dung lượng Tab 3",
    storageThresholdDesc:
      "Hiển thị cảnh báo khi dung lượng lưu trữ của tab thứ 3 vượt quá giới hạn này.",
    clearCustomCacheOnly: "Dọn bộ nhớ đệm {name} (giữ đăng nhập)",
    clearCustomCacheOnlyDesc:
      "Xóa dữ liệu đệm và video tạm thời để giải phóng dung lượng mà không làm đăng xuất tài khoản.",
    clearCacheOnly: "Dọn bộ nhớ đệm",
    cacheClearedSuccess: "Đã dọn dẹp bộ nhớ đệm thành công!",
    downloadComplete: 'Đã lưu tệp: "{name}" vào thư mục Tải về',
    openFolder: "Mở thư mục",
    threshold300: "300 MB",
    threshold500: "500 MB (Khuyên dùng)",
    threshold1000: "1 GB",
    threshold2000: "2 GB",
    thresholdOff: "Tắt cảnh báo",
    cleaning: "Đang dọn…",
    dismiss: "Bỏ qua",
    clearMessengerSession: "Xóa phiên đăng nhập Messenger",
    clearZaloSession: "Xóa phiên đăng nhập Zalo",
    clearCustomSession: "Xóa phiên đăng nhập {name}",
    clearWebCache: "Xóa bộ nhớ đệm (Cache)",
    clearWebCacheDesc: "Giải phóng dung lượng các tệp tạm và hình ảnh.",
    openSessionFolder: "Mở thư mục lưu trữ",

    // About
    checkUpdates: "Kiểm tra cập nhật",
    checking: "Đang kiểm tra…",
    downloadingUpdate: "Đang tải bản cập nhật…",
    installingUpdate: "Đang cài đặt bản cập nhật…",
    upToDate: "Đã là bản mới nhất (v{version})",
    updateAvailable: "Có bản cập nhật mới: v{version}",
    downloadUpdate: "Tải bản cập nhật",
    viewRelease: "Xem chi tiết",
    environment: "MÔI TRƯỜNG",
    appVersion: "Phiên bản ứng dụng",
    sessionRemaining: "Thời hạn phiên",
    sessionRemainingDesc: "Thời gian khả dụng trước khi yêu cầu xác thực OTP",
    developer: "NHÀ PHÁT TRIỂN",
    copy: "Sao chép",
    copied: "Đã chép",

    // Chat Panel
    options: "Tùy chọn",
    reload: "Tải lại trang",
    openInBrowser: "Mở trong trình duyệt",
    openSettings: "Cài đặt",
    removeCustomTab: 'Bỏ tab "{name}"',
    collapsePanel: "Thu nhỏ bảng chat",
    addNewTab: "Thêm tab mới",
    maxOneTab: "Tối đa 1 tab tùy chỉnh",
    quickPresets: "Gợi ý nhanh:",
    entertainment: "Giải trí",
    chatAndAi: "Nhắn tin & AI",
    tabName: "Tên tab",
    tabNamePlaceholder: "VD: Telegram, ChatGPT, ...",
    urlAddress: "Địa chỉ URL",
    cancel: "Hủy",
    addTab: "Thêm tab",
    removeTabTitle: 'Bỏ tab "{name}"?',
    removeTabDesc:
      "Tab này sẽ được gỡ khỏi thanh điều hướng. Bạn có thể thêm lại tab này hoặc một tab khác bất cứ lúc nào.",
    confirmRemove: "Bỏ tab",
    nameRequired: "Vui lòng nhập tên tab",
    urlRequired: "Vui lòng nhập URL của trang web",
    invalidUrl: "URL không hợp lệ. Ví dụ: https://web.telegram.org",
    pageFailed: "Không thể tải trang",
    pageFailedDesc: "Kiểm tra kết nối của bạn, sau đó tải lại.",
    switchTabQuickly: "Chuyển nhanh sang:",
    switchCustomUrl: "Đổi URL khác...",
    removeThisTab: "Bỏ tab này",
    resizeHint:
      "Kéo cạnh hoặc góc để đổi kích thước (Nhấp đúp: chế độ rộng / thu gọn)",
    wideMode: "Chế độ rộng",
    compactMode: "Chế độ thu gọn",

    // Lock Screen
    timeLimitReached: "Đã hết thời gian sử dụng",
    timeLimitDesc:
      "Phiên làm việc đã kết thúc. Vui lòng liên hệ admin để gia hạn",
    enterAdminOtp: "Nhập mã OTP xác thực",
    unlock: "Mở khóa",
    unlocking: "Đang kiểm tra...",
    invalidOtp: "Mã OTP không hợp lệ hoặc đã hết hạn",
    invalidOtpWithAttempts: "Mã OTP không đúng. Còn lại {remaining} lần thử.",
    temporarilyLocked: "Đã nhập sai 5 lần. Tạm khóa trong {time}.",
    unlockSuccess: "Mở khóa thành công! Gia hạn thêm 4 giờ.",
  },
  en: {
    // Navigation / Sections
    settings: "Settings",
    general: "General",
    appearance: "Appearance",
    behavior: "Behavior",
    performance: "Performance",
    privacy: "Privacy & Storage",
    about: "About",
    tabGeneral: "General",
    tabAppearance: "Appearance",
    tabStorage: "Storage",
    tabAbout: "About",
    panelResetGroup: "Position & Size",
    panelResetDesc: "Reset panel to default position or dimensions.",
    resetPosBtn: "Reset position",
    resetSizeBtn: "Reset size",
    advancedStorage: "Advanced Options",
    advancedStorageDesc: "Manage login sessions and open local storage folder.",
    ramCurrent: "RAM usage",
    cacheSize: "Cache storage",
    cleanCacheNow: "Clear Cache",
    cleanCacheSuccess: "Cache cleared successfully!",
    language: "Language",
    languageDesc: "Choose interface display language",
    back: "Back",
    done: "Done",

    // Subtitles
    generalDesc: "Startup, dock edge, language",
    appearanceDesc: "Color mode, bubble size and panel opacity",
    behaviorDesc: "Always on top, hotkeys",
    performanceDesc: "Memory management & caching",
    privacyDesc: "Clear cookies, session storage & ads",
    aboutDesc: "Version & diagnostics",

    // General Settings
    systemStartup: "System startup",
    startAtLogin: "Start at login",
    startAtLoginDesc: "Launch Bubble Chat automatically when PC starts.",
    showBubbleOnStartup: "Show bubble on startup",
    windowBehavior: "Window behavior",
    rememberPosition: "Remember bubble position",
    snapToEdge: "Snap to screen edge",
    snapToEdgeDesc: "Bubble docks to the nearest edge on release.",
    closeOnBlur: "Close panel when losing focus",
    resetPanelPosition: "Reset panel position",
    resetPanelPositionDesc:
      "Snap panel back to default position beside the bubble.",
    resetPanelSize: "Reset panel size",
    resetPanelSizeDesc: "Restore default panel dimensions.",

    // Appearance Settings
    themeMode: "Theme mode",
    themeLight: "Light",
    themeDark: "Dark",
    themeSystem: "System",
    bubbleSize: "Bubble size",
    bubbleSizeSmall: "Small",
    bubbleSizeMedium: "Medium",
    bubbleSizeLarge: "Large",
    bubbleOpacity: "Bubble & panel opacity",
    bubbleIcon: "Bubble icon",
    iconDefault: "Default",
    iconMessage: "Message",
    iconSpark: "Spark",
    iconHeart: "Heart",
    iconBolt: "Bolt",

    // Behavior Settings
    alwaysOnTop: "Always on top",
    alwaysOnTopDesc: "Keep bubble and chat panel floating above other windows.",
    shortcuts: "Keyboard shortcuts",
    togglePanel: "Toggle chat panel",
    openMessenger: "Open Messenger",
    openZalo: "Open Zalo",

    // Performance Settings
    memoryModes: "Memory management",
    perfBalanced: "Balanced",
    perfBalancedDesc:
      "Loads on demand and releases background tabs after one minute.",
    perfLowMemory: "Low Memory",
    perfLowMemoryDesc:
      "Keeps only the active tab and releases it when the panel is hidden.",
    perfInstant: "Instant Switching",
    perfInstantDesc:
      "Keeps all opened tabs rendered in memory for zero latency.",
    ramUsage: "Current app RAM usage",
    ramBeforeSettings: "Before opening Settings",
    ramProcessCount: "{count} processes",
    ramMainProcess: "Main app",
    ramWebContent: "Web content",
    ramGpu: "Graphics",
    ramUtility: "System utility",
    refreshRam: "Refresh",
    ramTrend: "Recent RAM trend",
    processBreakdown: "Process breakdown",
    storageTotal: "Total disk usage",

    // Privacy & Ads
    contentAndAds: "Content & Ads",
    blockAds: "Block ads (YouTube & Spotify)",
    blockAdsDesc: "Auto-skip video ads, mute ad bursts, and remove banners.",
    storageAndCache: "Storage & Cache",
    storageNotice:
      "Login sessions are safely kept inside isolated Chromium storage. Bubble never reads or stores passwords.",
    storageTabUsage: "Disk storage usage by tab",
    storageTabUsageDesc:
      "Actual disk space used by cache, local storage, and session data.",
    storageWarningBanner:
      'Tab "{name}" is storing {size} MB (exceeds {threshold} MB limit)',
    storageThreshold: "Tab 3 storage alert threshold",
    storageThresholdDesc:
      "Display a warning banner when tab 3 disk storage exceeds this threshold.",
    clearCustomCacheOnly: "Clear {name} cache (keep login)",
    clearCustomCacheOnlyDesc:
      "Clear temporary cached media and web data without logging out.",
    clearCacheOnly: "Clear cache",
    cacheClearedSuccess: "Cache cleared successfully!",
    downloadComplete: 'Downloaded file: "{name}" to Downloads',
    openFolder: "Open folder",
    threshold300: "300 MB",
    threshold500: "500 MB (Recommended)",
    threshold1000: "1 GB",
    threshold2000: "2 GB",
    thresholdOff: "Disabled",
    cleaning: "Cleaning…",
    dismiss: "Dismiss",
    clearMessengerSession: "Clear Messenger session",
    clearZaloSession: "Clear Zalo session",
    clearCustomSession: "Clear {name} session",
    clearWebCache: "Clear web cache",
    clearWebCacheDesc: "Frees temporary files and assets.",
    openSessionFolder: "Open session folder",

    // About
    checkUpdates: "Check updates",
    checking: "Checking…",
    downloadingUpdate: "Downloading update…",
    installingUpdate: "Installing update…",
    upToDate: "Up to date (v{version})",
    updateAvailable: "Update available: v{version}",
    downloadUpdate: "Download update",
    viewRelease: "View release",
    environment: "ENVIRONMENT",
    appVersion: "App version",
    sessionRemaining: "Session remaining",
    sessionRemainingDesc: "Time remaining before OTP verification is required",
    developer: "DEVELOPER",
    copy: "Copy",
    copied: "Copied",

    // Chat Panel
    options: "Options",
    reload: "Reload",
    openInBrowser: "Open in browser",
    openSettings: "Open settings",
    removeCustomTab: 'Remove tab "{name}"',
    collapsePanel: "Collapse panel",
    addNewTab: "Add new tab",
    maxOneTab: "Maximum 1 custom tab",
    quickPresets: "Quick presets:",
    entertainment: "Entertainment",
    chatAndAi: "Messaging & AI",
    tabName: "Tab name",
    tabNamePlaceholder: "e.g. Telegram, ChatGPT, ...",
    urlAddress: "URL address",
    cancel: "Cancel",
    addTab: "Add tab",
    removeTabTitle: 'Remove tab "{name}"?',
    removeTabDesc:
      "This tab will be removed from navigation. You can add it or another tab back at any time.",
    confirmRemove: "Remove tab",
    nameRequired: "Please enter a tab name",
    urlRequired: "Please enter a website URL",
    invalidUrl: "Invalid URL. Example: https://web.telegram.org",
    pageFailed: "Page failed to load",
    pageFailedDesc: "Check your connection, then reload the provider.",
    switchTabQuickly: "Quick switch to:",
    switchCustomUrl: "Change URL...",
    removeThisTab: "Remove tab",
    resizeHint:
      "Drag edges or corners to resize (Double-click: toggle wide / compact)",
    wideMode: "Wide mode",
    compactMode: "Compact mode",

    // Lock Screen
    timeLimitReached: "Usage Time Limit Reached",
    timeLimitDesc:
      "Your 4-hour session has ended. Please ask Admin to enter the 6-digit OTP code from Google Authenticator to continue.",
    enterAdminOtp: "Enter Admin OTP",
    unlock: "Unlock",
    unlocking: "Verifying...",
    invalidOtp: "Invalid or expired OTP code",
    invalidOtpWithAttempts: "Invalid OTP. {remaining} attempts remaining.",
    temporarilyLocked: "Too many failed attempts. Locked for {time}.",
    unlockSuccess: "Unlocked successfully! Added 4 hours.",
  },
} as const

export type TranslationKey = keyof typeof translations.en

export function useTranslation() {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem("bubble.language")
    return saved === "en" || saved === "vi" ? saved : "vi"
  })

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<Language>).detail
      if (detail === "en" || detail === "vi") setLang(detail)
    }
    window.addEventListener("bubble:language", handler)
    return () => window.removeEventListener("bubble:language", handler)
  }, [])

  const t = (
    key: TranslationKey,
    params?: Record<string, string | number>,
  ): string => {
    let str: string =
      (translations[lang] as any)?.[key] ||
      (translations.en as any)?.[key] ||
      key
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v))
      })
    }
    return str
  }

  const setLanguage = (newLang: Language) => {
    setLang(newLang)
    try {
      localStorage.setItem("bubble.language", newLang)
    } catch {}
    window.dispatchEvent(
      new CustomEvent("bubble:language", { detail: newLang }),
    )
  }

  return { lang, setLanguage, t }
}
