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
    language: "Ngôn ngữ",
    languageDesc: "Chọn ngôn ngữ hiển thị giao diện",
    back: "Quay lại",
    done: "Xong",

    // Subtitles
    generalDesc: "Khởi động, hút cạnh, ngôn ngữ",
    appearanceDesc: "Chế độ màu, kích thước và độ mờ bong bóng",
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
    bubbleOpacity: "Độ mờ bong bóng",
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
    perfBalancedDesc:
      "Tải tab theo nhu cầu. Duy trì Messenger & Zalo, giải phóng tab nặng khi ẩn.",
    perfLowMemory: "Tiết kiệm RAM",
    perfLowMemoryDesc:
      "Chỉ giữ 1 tab đang mở, giải phóng toàn bộ tài nguyên các tab nền.",
    perfInstant: "Chuyển tức thì",
    perfInstantDesc:
      "Giữ tất cả các tab đã mở trong bộ nhớ để chuyển đổi ngay.",
    ramUsage: "Bộ nhớ RAM đang sử dụng",
    trimRamNow: "Dọn dẹp RAM",
    trimRamDesc: "Giải phóng bộ nhớ đệm và thu hồi tài nguyên chưa sử dụng.",
    ramOptimized: "Đã dọn dẹp!",

    // Privacy & Ads
    contentAndAds: "Nội dung & Quảng cáo",
    blockAds: "Chặn quảng cáo (YouTube & Spotify)",
    blockAdsDesc:
      "Tự động bỏ qua quảng cáo video, tắt tiếng giật mình và ẩn banner.",
    storageAndCache: "Lưu trữ & Bộ nhớ",
    storageNotice:
      "Các phiên đăng nhập được lưu an toàn trong vùng lưu trữ riêng biệt của Chromium. Bubble Chat không bao giờ lưu trữ mật khẩu của bạn.",
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
    language: "Language",
    languageDesc: "Choose interface display language",
    back: "Back",
    done: "Done",

    // Subtitles
    generalDesc: "Startup, dock edge, language",
    appearanceDesc: "Color mode, bubble size and opacity",
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
    bubbleOpacity: "Bubble opacity",
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
      "Loads on demand. Keeps chat tabs ready, unloads heavy background media tabs.",
    perfLowMemory: "Low Memory",
    perfLowMemoryDesc:
      "Only keeps the active tab in memory, unloads background tabs completely.",
    perfInstant: "Instant Switching",
    perfInstantDesc:
      "Keeps all opened tabs rendered in memory for zero latency.",
    ramUsage: "Current RAM usage",
    trimRamNow: "Trim RAM",
    trimRamDesc: "Clear cache and reclaim unused background memory.",
    ramOptimized: "Optimized!",

    // Privacy & Ads
    contentAndAds: "Content & Ads",
    blockAds: "Block ads (YouTube & Spotify)",
    blockAdsDesc: "Auto-skip video ads, mute ad bursts, and remove banners.",
    storageAndCache: "Storage & Cache",
    storageNotice:
      "Login sessions are safely kept inside isolated Chromium storage. Bubble never reads or stores passwords.",
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
