import { useEffect, useState } from "react";
import ChatPanel from "../components/ChatPanel";
import type { Provider } from "../components/ChatPanel";
import SettingsWindow from "../components/SettingsWindow";
import { desktop } from "./bridge";

/** Renderer for the frameless, transparent panel window. */
export default function PanelWindow() {
  const [provider, setProvider] = useState<Provider>("messenger");
  const [view, setView] = useState<"chat" | "settings">("chat");
  const [theme, setTheme] = useState(() => localStorage.getItem("bubble.theme") || "Dark");

  useEffect(() => {
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";

    const onAppearance = (event: Event) => {
      const value = (event as CustomEvent<{ key: string; value: string }>).detail;
      if (value.key === "bubble.theme") setTheme(value.value);
    };
    window.addEventListener("bubble:appearance", onAppearance);
    const off = desktop()?.onNavigate((which) => {
      if (which === "settings") {
        setView("settings");
      } else if (which === "messenger" || which === "zalo") {
        setProvider(which);
        setView("chat");
      }
    });
    return () => {
      window.removeEventListener("bubble:appearance", onAppearance);
      off?.();
    };
  }, []);

  return (
    <div className={`${theme !== "Light" ? "dark" : ""} h-screen w-screen`}>
      <div className="h-full w-full overflow-hidden rounded-[16px] bg-panel shadow-e3">
        {view === "settings" ? (
          <SettingsWindow onClose={() => setView("chat")} />
        ) : (
          <ChatPanel initialProvider={provider} />
        )}
      </div>
    </div>
  );
}
