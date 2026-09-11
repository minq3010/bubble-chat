import { useCallback, useEffect, useRef, useState, createElement } from "react";
import {
  RotateCw,
  RotateCcw,
  ExternalLink,
  Minus,
  MoreHorizontal,
  Settings2,
  AlertTriangle,
} from "lucide-react";
import { MessengerIcon, ZaloIcon } from "./BrandIcons";
import { desktop } from "../desktop/bridge";
import { useWebviewZoom } from "../hooks/useWebviewZoom";
import { useUnreadCounts } from "../hooks/useUnreadCounts";
import { useAppUpdate } from "../hooks/useAppUpdate";

export type Provider = "messenger" | "zalo";
type LoadState = "ready" | "failed";

const providerMeta = {
  messenger: {
    name: "Messenger",
    Icon: MessengerIcon,
    color: "var(--messenger)",
    url: "https://www.messenger.com",
  },
  zalo: {
    name: "Zalo",
    Icon: ZaloIcon,
    color: "var(--zalo)",
    url: "https://chat.zalo.me",
  },
} as const;

const UNREAD_PROBE = `(() => {
  const numberFrom = (value) => {
    const matches = String(value).match(/\\d{1,3}/g) || [];
    return matches.length ? Number(matches[matches.length - 1]) : 0;
  };
  const labelled = Array.from(document.querySelectorAll("[aria-label],[title]"));
  const summary = labelled.find((element) => /notifications?/i.test(element.getAttribute("aria-label") || element.getAttribute("title") || ""));
  const summaryCount = summary ? numberFrom(summary.getAttribute("aria-label") || summary.getAttribute("title") || "") : 0;
  if (summaryCount > 0) return summaryCount;
  const markers = Array.from(document.querySelectorAll("[aria-label*='unread' i],[data-testid*='unread' i],[class*='unread' i]"));
  const values = markers.map((element) => numberFrom(element.getAttribute("aria-label") || element.textContent || "")).filter((value) => value > 0);
  if (values.length) return values.reduce((total, value) => total + value, 0);
  const title = document.title.match(/^\\s*\\((\\d{1,3})\\)/);
  return title ? Number(title[1]) : 0;
})()`;

function ProviderTab({
  provider,
  active,
  unread,
  onClick,
}: {
  provider: Provider;
  active: boolean;
  unread: number;
  onClick: () => void;
}) {
  const { name, Icon } = providerMeta[provider];
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`group relative flex items-center gap-1.5 rounded-[7px] px-2.5 py-0.5 text-[12px] font-medium transition-all duration-150 outline-none focus-visible:ring-1 focus-visible:ring-ring/60 ${
        active
          ? "bg-card text-card-foreground shadow-sm"
          : "text-muted-foreground hover:bg-card/40 hover:text-foreground"
      }`}
    >
      <Icon size={14} />
      <span>{name}</span>
      {unread > 0 && (
        <span className="ml-0.5 grid h-[15px] min-w-[15px] place-items-center rounded-full bg-danger px-1 font-mono text-[9px] font-semibold text-white">
          {unread}
        </span>
      )}
      {active && (
        <span
          className="absolute -bottom-[3px] left-1/2 h-[2px] w-5 -translate-x-1/2 rounded-full"
          style={{ background: providerMeta[provider].color }}
        />
      )}
    </button>
  );
}

function FailedState({ onReload }: { onReload: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-5 text-center sm:px-10">
      <div
        className="grid h-14 w-14 place-items-center rounded-2xl border border-border"
        style={{ background: "color-mix(in srgb, var(--muted) 70%, transparent)" }}
      >
        <AlertTriangle className="text-danger" size={24} />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-[15px] font-semibold">Page failed to load</h3>
        <p className="mx-auto max-w-[15rem] text-[12.5px] leading-relaxed text-muted-foreground">
          Check your connection, then reload the provider.
        </p>
      </div>
      <button
        onClick={onReload}
        className="mt-1 rounded-[9px] bg-danger px-4 py-1.5 text-[12.5px] font-medium text-white shadow-e1 transition-transform active:scale-[0.97]"
      >
        Reload
      </button>
    </div>
  );
}

function WebView({ provider, onStateChange }: { provider: Provider; onStateChange: (state: LoadState) => void }) {
  const { url } = providerMeta[provider];
  const viewRef = useRef<HTMLElement>(null);
  const { zoomBadgeVisible, formattedZoomPercent, bindWebview, triggerGuestResize } = useWebviewZoom();

  const pollUnread = useCallback(() => {
    if (!viewRef.current) return;
    const view = viewRef.current as HTMLElement & { executeJavaScript?: (code: string) => Promise<unknown> };
    if (typeof view.executeJavaScript !== "function") return;
    try {
      void view.executeJavaScript(UNREAD_PROBE)
        .then((value) => {
          const count = typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
          desktop()?.reportUnread(provider, count);
        })
        .catch(() => undefined);
    } catch {
      // The webview is not attached until dom-ready.
    }
  }, [provider]);

  useEffect(() => {
    const handleResize = () => triggerGuestResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [triggerGuestResize]);

  useEffect(() => {
    if (!viewRef.current) return;
    const view = viewRef.current;
    bindWebview(view);
    const finish = () => {
      onStateChange("ready");
      triggerGuestResize();
      pollUnread();
    };
    const fail = () => {
      onStateChange("failed");
      desktop()?.reportUnread(provider, 0);
    };
    view.addEventListener("did-finish-load", finish);
    view.addEventListener("did-fail-load", fail);
    return () => {
      view.removeEventListener("did-finish-load", finish);
      view.removeEventListener("did-fail-load", fail);
    };
  }, [onStateChange, provider, bindWebview, triggerGuestResize, pollUnread]);

  useEffect(() => {
    pollUnread();
    const timer = window.setInterval(pollUnread, 5000);
    return () => window.clearInterval(timer);
  }, [pollUnread]);

  return (
    <div className="relative flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      {createElement("webview", {
        key: provider,
        ref: viewRef,
        src: url,
        partition: `persist:${provider}`,
        allowpopups: "true",
        useragent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        style: { width: "100%", height: "100%", minWidth: 0, minHeight: 0, display: "flex", flex: "1 1 0%" },
      })}
      {zoomBadgeVisible && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/80 px-3 py-1 font-mono text-[11px] font-medium text-white shadow-lg backdrop-blur transition-opacity">
          Zoom {formattedZoomPercent}
        </div>
      )}
    </div>
  );
}

export default function ChatPanel({
  initialProvider = "messenger",
}: {
  initialProvider?: Provider;
}) {
  const [provider, setProvider] = useState<Provider>(initialProvider);
  const [state, setState] = useState<LoadState>("ready");
  const [menuOpen, setMenuOpen] = useState(false);
  const unread = useUnreadCounts();
  const [performanceMode, setPerformanceMode] = useState(() => localStorage.getItem("bubble.performanceMode") || "Balanced");
  const [reloadKey, setReloadKey] = useState(0);
  const { updateInfo, openUpdateDownload } = useAppUpdate();

  useEffect(() => {
    setProvider(initialProvider);
    setState("ready");
  }, [initialProvider]);

  useEffect(() => {
    const update = (mode: string) => setPerformanceMode(mode);
    const onLocalChange = (event: Event) => update((event as CustomEvent<string>).detail);
    const off = desktop()?.onPerformance(update);
    const offReload = desktop()?.onReloadProvider?.((p) => {
      if (p === provider || p === "all") {
        reload();
      }
    });
    window.addEventListener("bubble:performance", onLocalChange);
    return () => {
      window.removeEventListener("bubble:performance", onLocalChange);
      off?.();
      offReload?.();
    };
  }, [provider]);

  const openExternal = () => {
    const url = provider === "messenger" ? "https://www.messenger.com" : "https://chat.zalo.me";
    desktop()?.openExternal(url);
  };
  const reload = () => setReloadKey((key) => key + 1);
  const selectProvider = (next: Provider) => {
    setProvider(next);
    setState("ready");
  };
  // Low Memory mode unloads inactive tab; Balanced and Instant Switching keep tabs ready.
  const keepProvidersMounted = performanceMode !== "Low Memory";

  return (
    <div
      className="flex h-full w-full min-h-0 max-w-full flex-col overflow-hidden border-border bg-panel text-foreground"
    >
      {/* ultra-compact header without bulky toolbar */}
      <div
        className="flex min-w-0 items-center justify-between border-b border-border/40 bg-card/50 px-2 py-1 select-none"
        onContextMenu={(e) => {
          e.preventDefault();
          setMenuOpen((prev) => !prev);
        }}
      >
        <div className="flex items-center gap-1 rounded-[8px] bg-muted/60 p-0.5">
          <ProviderTab
            provider="messenger"
            active={provider === "messenger"}
            unread={unread.messenger}
            onClick={() => selectProvider("messenger")}
          />
          <ProviderTab
            provider="zalo"
            active={provider === "zalo"}
            unread={unread.zalo}
            onClick={() => selectProvider("zalo")}
          />
        </div>

        {/* Minimal options toggle */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((open) => !open)}
            title="Options"
            aria-label="Options"
            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/60 transition-colors hover:bg-muted/80 hover:text-foreground"
          >
            <MoreHorizontal size={13} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-6 z-30 w-[190px] rounded-[10px] border border-border bg-panel p-1.5 shadow-e3">
              <button
                onClick={() => {
                  reload();
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] hover:bg-muted"
              >
                <RotateCw size={13} /> Reload
              </button>
              <button
                onClick={() => {
                  openExternal();
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] hover:bg-muted"
              >
                <ExternalLink size={13} /> Open in browser
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  desktop()?.openProvider("settings");
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] hover:bg-muted"
              >
                <Settings2 size={13} /> Open settings
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  desktop()?.resetPanelSize();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] hover:bg-muted"
              >
                <RotateCcw size={13} /> Reset panel size
              </button>
              <div className="my-1 h-px bg-border" />
              <button
                onClick={() => {
                  desktop()?.collapsePanel();
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] text-danger hover:bg-muted"
              >
                <Minus size={13} /> Collapse panel
              </button>
            </div>
          )}
        </div>
      </div>

      {updateInfo.status === "available" && (
        <button
          type="button"
          onClick={() => void openUpdateDownload()}
          className="flex items-center justify-between bg-emerald-500/15 px-3 py-1.5 text-left text-[11px] font-medium text-emerald-500 hover:bg-emerald-500/20"
        >
          <span>Update available: {updateInfo.latestVersion}</span>
          <span className="font-semibold underline">{updateInfo.downloadUrl ? "Download" : "View release"}</span>
        </button>
      )}

      {/* main embedded area */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {state === "ready" && keepProvidersMounted ? (
          <div className="relative h-full w-full flex-1">
            {(["messenger", "zalo"] as Provider[]).map((item) => (
              <div key={item} className={`absolute inset-0 ${provider === item ? "" : "invisible pointer-events-none"}`}>
                <WebView
                  provider={item}
                  onStateChange={(nextState) => {
                    if (provider === item) {
                      setState(nextState);
                    }
                  }}
                />
              </div>
            ))}
          </div>
        ) : state === "ready" ? (
          <WebView key={`${provider}-${reloadKey}`} provider={provider} onStateChange={setState} />
        ) : (
          <FailedState onReload={reload} />
        )}
      </div>
    </div>
  );
}
