import { useEffect, useState } from "react"
import ChatPanel from "../components/ChatPanel"
import type { Provider } from "../components/ChatPanel"
import SettingsWindow from "../components/SettingsWindow"
import LockScreen from "../components/LockScreen"
import { desktop } from "./bridge"
import { withTransitionSuppression } from "../utils/theme"

/** Renderer for the frameless, transparent panel window. */
export default function PanelWindow() {
  const [provider, setProvider] = useState<Provider>("messenger")
  const [view, setView] = useState<"chat" | "settings">("chat")
  const [isLocked, setIsLocked] = useState(false)
  const [theme, setTheme] = useState(
    () => localStorage.getItem("bubble.theme") || "System",
  )
  const [systemIsDark, setSystemIsDark] = useState(() =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : true,
  )

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

    const offIpc = desktop()?.onAppearance((data) => {
      if (data.theme) {
        withTransitionSuppression(() => {
          setTheme((prev) => (prev === data.theme ? prev : data.theme || prev))
        })
      }
    })

    type AppearanceEventDetail = {
      key: string
      value: string
    }
    const onAppearance = (event: Event) => {
      const value = (event as CustomEvent<AppearanceEventDetail>).detail
      if (value.key === "bubble.theme") {
        withTransitionSuppression(() => {
          setTheme((prev) => (prev === value.value ? prev : value.value))
        })
      }
    }
    window.addEventListener("bubble:appearance", onAppearance)
    const offNav = desktop()?.onNavigate((which) => {
      if (which === "settings") {
        setView("settings")
      } else if (
        which === "messenger" ||
        which === "zalo" ||
        which === "custom"
      ) {
        setProvider(which)
        setView("chat")
      }
    })
    const offLock = desktop()?.onLockState?.((status) => {
      if (typeof status?.isLocked === "boolean") {
        setIsLocked(status.isLocked)
      }
    })

    void desktop()
      ?.getLockStatus?.()
      .then((status) => {
        if (typeof status?.isLocked === "boolean") {
          setIsLocked(status.isLocked)
        }
      })
      .catch(() => {})

    return () => {
      media.removeEventListener("change", onMediaChange)
      offIpc?.()
      window.removeEventListener("bubble:appearance", onAppearance)
      offNav?.()
      offLock?.()
    }
  }, [])

  const isDark = theme === "Dark" || (theme === "System" && systemIsDark)

  useEffect(() => {
    withTransitionSuppression(() => {
      document.documentElement.classList.toggle("dark", isDark)
    })
  }, [isDark])

  return (
    <div
      className={`${
        isDark ? "dark" : ""
      } h-screen w-screen bg-transparent select-none`}
    >
      <div className="h-full w-full overflow-hidden rounded-[16px] border border-border/80 bg-panel">
        {isLocked ? (
          <LockScreen onUnlocked={() => setIsLocked(false)} />
        ) : view === "settings" ? (
          <SettingsWindow onClose={() => setView("chat")} />
        ) : (
          <ChatPanel initialProvider={provider} />
        )}
      </div>
    </div>
  )
}
