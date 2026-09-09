export interface ZoomConfig {
  defaultZoom: number;
  minZoom: number;
  maxZoom: number;
  zoomStep: number;
  storageKey: string;
}

export const ZOOM_CONFIG: ZoomConfig = {
  defaultZoom: 0.8,
  minZoom: 0.4,
  maxZoom: 1.4,
  zoomStep: 0.05,
  storageKey: "bubble.zoomFactor",
};

export function clampZoomFactor(factor: number, config: ZoomConfig = ZOOM_CONFIG): number {
  const precisionFactor = Math.round(factor * 100) / 100;
  return Math.min(config.maxZoom, Math.max(config.minZoom, precisionFactor));
}

export function getStoredZoomFactor(config: ZoomConfig = ZOOM_CONFIG): number {
  if (typeof window === "undefined") {
    return config.defaultZoom;
  }
  try {
    const saved = localStorage.getItem(config.storageKey);
    if (!saved) {
      return config.defaultZoom;
    }
    const parsed = parseFloat(saved);
    if (Number.isNaN(parsed)) {
      return config.defaultZoom;
    }
    if (Math.abs(parsed - 0.7) < 0.01) {
      localStorage.setItem(config.storageKey, config.defaultZoom.toString());
      return config.defaultZoom;
    }
    return clampZoomFactor(parsed, config);
  } catch {
    return config.defaultZoom;
  }
}

export function saveStoredZoomFactor(factor: number, config: ZoomConfig = ZOOM_CONFIG): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const clamped = clampZoomFactor(factor, config);
    localStorage.setItem(config.storageKey, clamped.toString());
  } catch {
    // Ignore storage write errors in restricted environments
  }
}

export type ZoomDirection = "in" | "out" | "reset";

export function calculateNextZoom(
  currentZoom: number,
  direction: ZoomDirection,
  config: ZoomConfig = ZOOM_CONFIG,
): number {
  switch (direction) {
    case "in":
      return clampZoomFactor(currentZoom + config.zoomStep, config);
    case "out":
      return clampZoomFactor(currentZoom - config.zoomStep, config);
    case "reset":
      return config.defaultZoom;
    default:
      return currentZoom;
  }
}
