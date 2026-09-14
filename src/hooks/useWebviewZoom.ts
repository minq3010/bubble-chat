import { useCallback, useEffect, useRef, useState } from "react";
import {
  calculateNextZoom,
  clampZoomFactor,
  getStoredZoomFactor,
  saveStoredZoomFactor,
  ZoomDirection,
  ZOOM_CONFIG,
} from "../utils/zoomConfig";

interface UseWebviewZoomResult {
  zoomBadgeVisible: boolean;
  formattedZoomPercent: string;
  bindWebview: (element: HTMLElement | null) => void;
  triggerGuestResize: () => void;
}

export function useWebviewZoom(): UseWebviewZoomResult {
  const [zoomFactor, setZoomFactor] = useState<number>(() => getStoredZoomFactor());
  const [zoomBadgeVisible, setZoomBadgeVisible] = useState(false);
  const badgeTimerRef = useRef<number | null>(null);
  const webviewRef = useRef<HTMLElement | null>(null);
  const zoomFactorRef = useRef(zoomFactor);

  zoomFactorRef.current = zoomFactor;

  const showZoomIndicator = useCallback(() => {
    setZoomBadgeVisible(true);
    if (badgeTimerRef.current !== null) {
      window.clearTimeout(badgeTimerRef.current);
    }
    badgeTimerRef.current = window.setTimeout(() => {
      setZoomBadgeVisible(false);
      badgeTimerRef.current = null;
    }, 1200);
  }, []);

  const getEffectiveZoom = useCallback((baseZoom: number) => {
    if (typeof window === "undefined") return baseZoom;
    const width = window.innerWidth || 365;
    // Messenger/Zalo web require at least ~430px effective width to prevent responsive layout wrapping
    const minEffectiveWidth = 430;
    const baseEffectiveWidth = width / baseZoom;
    if (baseEffectiveWidth < minEffectiveWidth) {
      const targetZoom = width / minEffectiveWidth;
      return clampZoomFactor(Math.max(ZOOM_CONFIG.minZoom, targetZoom));
    }
    return baseZoom;
  }, []);

  const triggerGuestResize = useCallback(() => {
    const view = webviewRef.current as {
      executeJavaScript?: (code: string) => Promise<unknown>;
      insertCSS?: (code: string) => Promise<unknown>;
      setZoomFactor?: (f: number) => void;
    } | null;
    if (view) {
      if (typeof view.setZoomFactor === "function") {
        try {
          view.setZoomFactor(getEffectiveZoom(zoomFactorRef.current));
        } catch {}
      }
      if (typeof view.executeJavaScript === "function") {
        try {
          void view
            .executeJavaScript(
              `
              window.dispatchEvent(new Event('resize'));
              window.dispatchEvent(new UIEvent('resize'));
              setTimeout(() => window.dispatchEvent(new Event('resize')), 150);
              setTimeout(() => window.dispatchEvent(new Event('resize')), 450);
            `,
            )
            .catch(() => {});
        } catch {
          // The guest page can still be attaching when zoom is applied.
        }
      }
      if (typeof view.insertCSS === "function") {
        try {
          void view
            .insertCSS(
              `
              html, body {
                height: 100% !important;
                overflow: hidden !important;
              }
            `,
            )
            .catch(() => {});
        } catch {}
      }
    }
  }, [getEffectiveZoom]);

  const applyZoom = useCallback(
    (nextZoom: number) => {
      setZoomFactor(nextZoom);
      saveStoredZoomFactor(nextZoom);
      showZoomIndicator();

      const view = webviewRef.current as { setZoomFactor?: (f: number) => void } | null;
      if (view && typeof view.setZoomFactor === "function") {
        try {
          view.setZoomFactor(getEffectiveZoom(nextZoom));
          triggerGuestResize();
        } catch {
          // Ignore call failures if webview is not ready
        }
      }
    },
    [showZoomIndicator, triggerGuestResize, getEffectiveZoom],
  );

  const applyDirection = useCallback(
    (direction: ZoomDirection) => {
      const next = calculateNextZoom(zoomFactorRef.current, direction, ZOOM_CONFIG);
      applyZoom(next);
    },
    [applyZoom],
  );

  const bindWebview = useCallback(
    (element: HTMLElement | null) => {
      webviewRef.current = element;
      if (!element) {
        return;
      }

      const view = element as {
        setZoomFactor?: (f: number) => void;
        insertCSS?: (code: string) => Promise<unknown>;
      } & HTMLElement;

      const enforceZoom = () => {
        if (typeof view.setZoomFactor === "function") {
          try {
            view.setZoomFactor(getEffectiveZoom(zoomFactorRef.current));
            triggerGuestResize();
          } catch {
            // Webview might still be loading contents
          }
        }
        if (typeof view.insertCSS === "function") {
          try {
            void view.insertCSS(`
              html, body {
                height: 100% !important;
                overflow: hidden !important;
              }
            `).catch(() => {});
          } catch {}
        }
      };

      element.addEventListener("dom-ready", enforceZoom);
      element.addEventListener("did-finish-load", enforceZoom);

      const handleBeforeInput = (event: Event) => {
        const inputEvent = event as Event & {
          input?: {
            type?: string;
            key?: string;
            control?: boolean;
            meta?: boolean;
          };
        };
        const input = inputEvent.input;
        if (!input || input.type !== "keyDown") {
          return;
        }

        const isModifier = Boolean(input.control || input.meta);
        if (!isModifier) {
          return;
        }

        if (input.key === "=" || input.key === "+") {
          applyDirection("in");
        } else if (input.key === "-" || input.key === "_") {
          applyDirection("out");
        } else if (input.key === "0") {
          applyDirection("reset");
        }
      };

      element.addEventListener("before-input-event", handleBeforeInput);
    },
    [applyDirection],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isModifier = event.ctrlKey || event.metaKey;
      if (!isModifier) {
        return;
      }

      if (event.key === "=" || event.key === "+") {
        event.preventDefault();
        applyDirection("in");
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        applyDirection("out");
      } else if (event.key === "0") {
        event.preventDefault();
        applyDirection("reset");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (badgeTimerRef.current !== null) {
        window.clearTimeout(badgeTimerRef.current);
      }
    };
  }, [applyDirection]);

  const formattedZoomPercent = `${Math.round(zoomFactor * 100)}%`;

  return {
    zoomBadgeVisible,
    formattedZoomPercent,
    bindWebview,
    triggerGuestResize,
  };
}
