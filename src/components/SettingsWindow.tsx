import { useState, useEffect } from "react";
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
  RefreshCw,
  Copy,
} from "lucide-react";
import { AppIcon } from "./BrandIcons";
import { desktop } from "../desktop/bridge";
import { useAppUpdate } from "../hooks/useAppUpdate";
import { withTransitionSuppression } from "../utils/theme";

export type Section =
  | "general"
  | "appearance"
  | "behavior"
  | "performance"
  | "privacy"
  | "about";

interface SectionMeta {
  id: Section;
  label: string;
  desc: string;
  icon: typeof Settings2;
  accent: string;
}

const SECTIONS: SectionMeta[] = [
  {
    id: "general",
    label: "General",
    desc: "Startup, dock edge, close behavior",
    icon: Settings2,
    accent: "bg-blue-500/15 text-blue-500",
  },
  {
    id: "appearance",
    label: "Appearance",
    desc: "Color mode, bubble size",
    icon: Palette,
    accent: "bg-purple-500/15 text-purple-500",
  },
  {
    id: "behavior",
    label: "Behavior",
    desc: "Always on top, hotkeys",
    icon: MousePointerClick,
    accent: "bg-amber-500/15 text-amber-500",
  },
  {
    id: "performance",
    label: "Performance",
    desc: "Memory management & caching",
    icon: Gauge,
    accent: "bg-emerald-500/15 text-emerald-500",
  },
  {
    id: "privacy",
    label: "Privacy & Cache",
    desc: "Clear cookies, session storage",
    icon: Shield,
    accent: "bg-teal-500/15 text-teal-500",
  },
  {
    id: "about",
    label: "About",
    desc: "Version & diagnostics",
    icon: Info,
    accent: "bg-slate-500/15 text-slate-500 dark:text-slate-400",
  },
];

function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 outline-none focus-visible:ring-1 focus-visible:ring-ring ${
        on ? "bg-primary" : "bg-muted-foreground/30"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          on ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function ToggleRow({
  title,
  desc,
  defaultOn = false,
  settingKey = title,
}: {
  title: string;
  desc?: string;
  defaultOn?: boolean;
  settingKey?: string;
}) {
  const key = `bubble.setting.${settingKey}`;
  const [on, setOn] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved === null ? defaultOn : saved === "true";
    } catch {
      return defaultOn;
    }
  });

  useEffect(() => {
    desktop()?.getSettings().then((settings) => {
      if (settings && typeof settings[settingKey] === "boolean") {
        setOn(settings[settingKey]);
        try {
          localStorage.setItem(key, String(settings[settingKey]));
        } catch {}
      }
    }).catch(() => {});
  }, [settingKey, key]);

  const toggle = () => {
    setOn((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(key, String(next));
      } catch {}
      if (settingKey === "startAtLogin") desktop()?.setLoginItem(next);
      if (settingKey === "alwaysOnTop") desktop()?.setAlwaysOnTop(next);
      if (settingKey === "closeOnBlur") desktop()?.setCloseOnBlur(next);
      if (settingKey === "showBubbleOnStartup") desktop()?.setShowBubbleOnStartup(next);
      if (settingKey === "rememberPosition") desktop()?.setRememberPosition(next);
      if (settingKey === "snapToEdge") desktop()?.setSnapToEdge(next);
      return next;
    });
  };

  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0 flex-1 pr-1">
        <div className="text-[12.5px] font-medium leading-tight text-foreground">{title}</div>
        {desc && <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{desc}</div>}
      </div>
      <Toggle on={on} onChange={toggle} label={title} />
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-3.5">
      <h3 className="mb-1.5 px-1 font-mono text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
        {title}
      </h3>
      <div className="divide-y divide-border/50 rounded-xl border border-border/70 bg-card px-3.5">
        {children}
      </div>
    </section>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex w-full items-center rounded-lg bg-muted/80 p-0.5">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={value === option}
          className={`flex-1 rounded-[6px] py-1 text-center font-medium text-[11.5px] transition-colors duration-150 ${
            value === option
              ? "bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function ActionRow({
  icon,
  title,
  desc,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc?: string;
  onClick?: () => void;
}) {
  const [done, setDone] = useState(false);

  return (
    <div className="flex items-center justify-between gap-2.5 py-2.5">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="shrink-0 text-muted-foreground">{icon}</span>
        <div className="min-w-0">
          <div className="text-[12.5px] font-medium leading-tight text-foreground">{title}</div>
          {desc && <div className="mt-0.5 text-[10.5px] text-muted-foreground">{desc}</div>}
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          if (title.startsWith("Clear") && !window.confirm(`${title}? You may need to sign in again.`)) {
            return;
          }
          onClick?.();
          setDone(true);
          setTimeout(() => setDone(false), 2000);
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
  );
}

function ShortcutRow({ label, keys, winKeys }: { label: string; keys: string; winKeys?: string }) {
  const isMac = desktop()?.platform === "darwin" || (typeof navigator !== "undefined" && /Mac/i.test(navigator.userAgent));
  const displayKeys = isMac ? keys : (winKeys || keys);
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="text-[12.5px] font-medium text-foreground">{label}</div>
      <kbd className="rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] text-foreground/80">
        {displayKeys}
      </kbd>
    </div>
  );
}

/* ---------- Sub-pages ---------- */

function GeneralPane() {
  return (
    <>
      <Group title="Startup">
        <ToggleRow
          title="Start at login"
          settingKey="startAtLogin"
          desc="Launch Bubble Chat automatically when macOS/PC starts."
          defaultOn
        />
        <ToggleRow
          title="Show bubble on startup"
          settingKey="showBubbleOnStartup"
          defaultOn
        />
      </Group>

      <Group title="Window behavior">
        <ToggleRow
          title="Remember bubble position"
          settingKey="rememberPosition"
          defaultOn
        />
        <ToggleRow
          title="Snap to screen edge"
          settingKey="snapToEdge"
          desc="Bubble Chat docks to the nearest edge on release."
          defaultOn
        />
        <ToggleRow
          title="Close panel when losing focus"
          settingKey="closeOnBlur"
          defaultOn
        />
      </Group>
    </>
  );
}

function AppearancePane() {
  const [theme, setTheme] = useState(() => localStorage.getItem("bubble.theme") || "System");
  const [size, setSize] = useState(() => localStorage.getItem("bubble.bubbleSize") || "Medium");

  useEffect(() => {
    desktop()?.getSettings().then((settings) => {
      if (settings) {
        if (settings.theme) setTheme(settings.theme);
        if (settings.bubbleSize) setSize(settings.bubbleSize);
      }
    }).catch(() => {});
  }, []);

  const saveTheme = (value: string) => {
    if (value === theme) return;
    withTransitionSuppression(() => {
      setTheme(value);
      try {
        localStorage.setItem("bubble.theme", value);
      } catch {}
      desktop()?.setAppearance({ theme: value, bubbleSize: size });
      window.dispatchEvent(new CustomEvent("bubble:appearance", { detail: { key: "bubble.theme", value } }));
    });
  };

  const saveSize = (value: string) => {
    if (value === size) return;
    setSize(value);
    try {
      localStorage.setItem("bubble.bubbleSize", value);
    } catch {}
    desktop()?.setAppearance({ theme, bubbleSize: value });
    window.dispatchEvent(new CustomEvent("bubble:appearance", { detail: { key: "bubble.bubbleSize", value } }));
  };

  return (
    <>
      <Group title="Theme">
        <div className="py-2.5">
          <div className="mb-1.5 text-[12.5px] font-medium text-foreground">Color mode</div>
          <Segmented
            options={["System", "Light", "Dark"]}
            value={theme}
            onChange={saveTheme}
          />
        </div>
      </Group>

      <Group title="Bubble">
        <div className="py-2.5">
          <div className="mb-1.5 text-[12.5px] font-medium text-foreground">Bubble size</div>
          <Segmented
            options={["Small", "Medium", "Large"]}
            value={size}
            onChange={saveSize}
          />
        </div>
      </Group>
    </>
  );
}

function BehaviorPane() {
  return (
    <>
      <Group title="Display rules">
        <ToggleRow title="Always on top" settingKey="alwaysOnTop" defaultOn />
      </Group>

      <Group title="Global shortcuts">
        <ShortcutRow label="Toggle bubble" keys="⌥ ⌘ B" winKeys="Alt + Ctrl + B" />
        <ShortcutRow label="Open Messenger" keys="⌥ ⌘ M" winKeys="Alt + Ctrl + M" />
        <ShortcutRow label="Open Zalo" keys="⌥ ⌘ Z" winKeys="Alt + Ctrl + Z" />
      </Group>
    </>
  );
}

function PerformancePane() {
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem("bubble.performanceMode") || "Balanced";
    } catch {
      return "Balanced";
    }
  });

  useEffect(() => {
    desktop()?.getSettings().then((settings) => {
      if (settings?.performanceMode) {
        setMode(settings.performanceMode);
        try {
          localStorage.setItem("bubble.performanceMode", settings.performanceMode);
        } catch {}
      }
    }).catch(() => {});
  }, []);

  const modes = [
    {
      id: "Low Memory",
      name: "Low Memory",
      desc: "Unload inactive chat tabs to save system RAM.",
    },
    {
      id: "Balanced",
      name: "Balanced",
      desc: "Keep active tab live and throttle background tab.",
    },
    {
      id: "Instant Switching",
      name: "Instant Switching",
      desc: "Both Messenger and Zalo stay fully loaded.",
    },
  ];

  return (
    <Group title="Memory profile">
      {modes.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => {
            setMode(item.id);
            try {
              localStorage.setItem("bubble.performanceMode", item.id);
            } catch {}
            window.dispatchEvent(new CustomEvent("bubble:performance", { detail: item.id }));
            desktop()?.setPerformanceMode(item.id);
          }}
          className="flex w-full items-start gap-2.5 py-2.5 text-left transition-colors"
        >
          <span
            className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border transition-colors ${
              mode === item.id ? "border-primary bg-primary text-primary-foreground" : "border-border-strong"
            }`}
          >
            {mode === item.id && <Check size={10} strokeWidth={3} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[12.5px] font-medium text-foreground">{item.name}</span>
            <span className="mt-0.5 block text-[11px] leading-tight text-muted-foreground">{item.desc}</span>
          </span>
        </button>
      ))}
    </Group>
  );
}

function PrivacyPane() {
  return (
    <>
      <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-border/70 bg-accent/40 p-3">
        <Shield size={16} className="mt-0.5 shrink-0 text-primary" />
        <p className="text-[11.5px] leading-relaxed text-foreground/80">
          Login sessions are safely kept inside isolated Chromium storage. Bubble never reads or stores passwords.
        </p>
      </div>

      <Group title="Storage & Cache">
        <ActionRow
          icon={<Trash2 size={14} />}
          title="Clear Messenger session"
          onClick={() => desktop()?.clearSession("messenger")}
        />
        <ActionRow
          icon={<Trash2 size={14} />}
          title="Clear Zalo session"
          onClick={() => desktop()?.clearSession("zalo")}
        />
        <ActionRow
          icon={<Trash2 size={14} />}
          title="Clear web cache"
          desc="Frees temporary files and assets."
          onClick={() => desktop()?.clearSession("cache")}
        />
        <ActionRow
          icon={<FolderOpen size={14} />}
          title="Open session folder"
          onClick={() => desktop()?.openSessionStorage()}
        />
      </Group>
    </>
  );
}

function AboutPane({
  version,
  updateInfo,
  checkForUpdates,
  openUpdateDownload,
}: {
  version: string;
  updateInfo: ReturnType<typeof useAppUpdate>["updateInfo"];
  checkForUpdates: () => Promise<void>;
  openUpdateDownload: () => Promise<void> | undefined;
}) {
  const [copied, setCopied] = useState(false);
  const userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const electron = userAgent.match(/Electron\/([\d.]+)/)?.[1] || "Desktop shell";
  const chromium = userAgent.match(/Chrome\/([\d.]+)/)?.[1] || "Chromium";

  return (
    <>
      <div className="mb-3 flex flex-col items-center justify-center rounded-xl border border-border/70 bg-card/60 py-4 text-center">
        <div className="mb-2">
          <AppIcon size={38} />
        </div>
          <div className="text-[14px] font-semibold text-foreground">Bubble Chat</div>
          <div className="font-mono text-[10.5px] text-muted-foreground">Messenger + Zalo Desktop</div>
        <button
          type="button"
          onClick={() => void checkForUpdates()}
          disabled={updateInfo.status === "checking"}
          className="mt-2.5 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1 font-medium text-[11.5px] text-primary-foreground shadow-xs transition-opacity hover:opacity-90 active:scale-98"
        >
          <RefreshCw size={11} className={updateInfo.status === "checking" ? "animate-spin" : ""} />
          {updateInfo.status === "checking" ? "Checking…" : updateInfo.status === "up-to-date" ? `Up to date (v${version})` : "Check updates"}
        </button>
        {updateInfo.status === "available" && (
          <div className="mt-2 text-[11px] font-medium text-success">
            <div>
              Update available: {updateInfo.latestVersion}
              <button type="button" onClick={() => void openUpdateDownload()} className="ml-2 underline">{updateInfo.downloadUrl ? "Download" : "View release"}</button>
            </div>
            {updateInfo.releaseNotes && <p className="mt-1 max-h-16 overflow-y-auto whitespace-pre-line font-normal text-muted-foreground">{updateInfo.releaseNotes}</p>}
          </div>
        )}
        {updateInfo.status === "error" && <div className="mt-2 text-[11px] text-danger">{updateInfo.error}</div>}
      </div>

      <Group title="Environment">
        <div className="flex items-center justify-between py-2 text-[12px]">
          <span className="text-muted-foreground">App version</span>
          <span className="font-mono text-[11px] text-foreground">{version}</span>
        </div>
        <div className="flex items-center justify-between py-2 text-[12px]">
          <span className="text-muted-foreground">Electron</span>
          <span className="font-mono text-[11px] text-foreground">{electron}</span>
        </div>
        <div className="flex items-center justify-between py-2 text-[12px]">
          <span className="text-muted-foreground">Chromium</span>
          <span className="font-mono text-[11px] text-foreground">{chromium}</span>
        </div>
      </Group>

      <Group title="Developer">
        <div className="flex items-center justify-between gap-3 py-2">
          <div>
            <div className="text-[12px] font-medium text-foreground">Nguyen Minh Quoc</div>
            <div className="font-mono text-[11px] text-muted-foreground">0866 007 219</div>
          </div>
          <button
            type="button"
            onClick={() => {
              desktop()?.copyDeveloperPhone();
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-[11px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </Group>
    </>
  );
}

/* ---------- Main Component ---------- */

export default function SettingsWindow({ onClose }: { onClose: () => void }) {
  const [section, setSection] = useState<Section | null>(null);
  const { updateInfo, checkForUpdates, openUpdateDownload } = useAppUpdate();
  const version = updateInfo.currentVersion || "…";

  const activeMeta = SECTIONS.find((s) => s.id === section);

  const renderContent = () => {
    switch (section) {
      case "general":
        return <GeneralPane />;
      case "appearance":
        return <AppearancePane />;
      case "behavior":
        return <BehaviorPane />;
      case "performance":
        return <PerformancePane />;
      case "privacy":
        return <PrivacyPane />;
      case "about":
        return <AboutPane version={version} updateInfo={updateInfo} checkForUpdates={checkForUpdates} openUpdateDownload={openUpdateDownload} />;
      default:
        return null;
    }
  };

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden bg-panel"
    >
      {/* Header */}
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-border/50 bg-card/60 px-3 select-none">
        {section ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSection(null)}
              className="flex items-center gap-0.5 rounded-md px-1.5 py-1 font-medium text-[12px] text-primary transition-colors hover:bg-muted"
            >
              <ChevronLeft size={16} />
              <span>Back</span>
            </button>
            <span className="text-border-strong">/</span>
            <span className="truncate font-semibold text-[13px] text-foreground">
              {activeMeta?.label}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <AppIcon size={16} />
            <span className="font-semibold text-[13px] text-foreground">Settings</span>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1 rounded-md bg-muted/80 px-2.5 py-1 font-medium text-[11.5px] text-foreground transition-colors hover:bg-border"
        >
          <span>Done</span>
          <X size={12} className="opacity-70" />
        </button>
      </header>

      {/* Main body area */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-3">
        {section === null ? (
          <div className="space-y-1">
            {SECTIONS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className="group flex w-full items-center gap-3 rounded-xl border border-border/40 bg-card/50 px-3 py-2.5 text-left transition-all hover:border-border/80 hover:bg-card active:scale-[0.99]"
                >
                  <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${item.accent}`}>
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-[13px] text-foreground group-hover:text-primary">
                      {item.label}{item.id === "about" && updateInfo.status === "available" && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-danger align-middle" />}
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">{item.desc}</div>
                  </div>
                  <ChevronRight size={14} className="shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
                </button>
              );
            })}
          </div>
        ) : (
          <div>{renderContent()}</div>
        )}
      </div>

      {/* Footer info in root */}
      {section === null && (
        <div className="border-t border-border/40 bg-card/30 px-3.5 py-2 text-center font-mono text-[10px] text-muted-foreground">
          Bubble Chat v{version} · Messenger & Zalo
        </div>
      )}
    </div>
  );
}
