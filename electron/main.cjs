const { app, BrowserWindow, Tray, Menu, ipcMain, screen, shell, nativeImage, session, globalShortcut } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

const DEV_URL = process.env.VITE_DEV_URL || "http://localhost:8443";
const isDev = !app.isPackaged;
const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) app.quit();

const BUBBLE = 76; // window size (bubble ~56 + shadow/badge room)
const PANEL_CONFIG = {
  defaultWidth: 365,
  minWidth: 340,
  maxWidth: 390,
  widthRatio: 0.25,
  defaultHeight: 510,
  minHeight: 460,
  maxHeight: 550,
  heightRatio: 0.57,
};

let bubbleWin = null;
let panelWin = null;
let tray = null;
let dragTimer = null;
let dragOffset = null;
const stateFile = path.join(app.getPath("userData"), "bubble-state.json");
const unreadCounts = { messenger: 0, zalo: 0 };
let closeOnBlur = true;
let showBubbleOnStartup = true;
let rememberPosition = true;
let snapToEdge = true;
let panelShowTimestamp = 0;

function readState() {
  try {
    return JSON.parse(fs.readFileSync(stateFile, "utf8"));
  } catch {
    return {};
  }
}

function writeState(patch) {
  const next = { ...readState(), ...patch };
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  fs.writeFileSync(stateFile, JSON.stringify(next));
  return next;
}

const savedSettings = readState();
closeOnBlur = savedSettings.closeOnBlur !== false;
showBubbleOnStartup = savedSettings.showBubbleOnStartup !== false;
rememberPosition = savedSettings.rememberPosition !== false;
snapToEdge = savedSettings.snapToEdge !== false;

function keepBubbleOnScreen(x, y) {
  const display = screen.getAllDisplays().find(({ bounds }) =>
    x + BUBBLE / 2 >= bounds.x && x + BUBBLE / 2 <= bounds.x + bounds.width &&
    y + BUBBLE / 2 >= bounds.y && y + BUBBLE / 2 <= bounds.y + bounds.height,
  ) || screen.getPrimaryDisplay();
  const wa = display.workArea;
  return {
    x: Math.min(Math.max(wa.x, x), wa.x + wa.width - BUBBLE),
    y: Math.min(Math.max(wa.y, y), wa.y + wa.height - BUBBLE),
  };
}

/** Resolve a renderer route in dev (Vite) or prod (built file + hash). */
function loadRoute(win, hash) {
  if (isDev) {
    win.loadURL(`${DEV_URL}/#${hash}`);
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"), { hash });
  }
}

function createBubble() {
  const { workArea } = screen.getPrimaryDisplay();
  const saved = rememberPosition && readState().bubblePosition;
  const start = saved ? keepBubbleOnScreen(saved.x, saved.y) : {
    x: workArea.x + workArea.width - BUBBLE - 24,
    y: workArea.y + Math.round(workArea.height * 0.4),
  };
  bubbleWin = new BrowserWindow({
    width: BUBBLE,
    height: BUBBLE,
    x: start.x,
    y: start.y,
    show: showBubbleOnStartup,
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  bubbleWin.setIgnoreMouseEvents(false);
  bubbleWin.setAlwaysOnTop(true, "screen-saver");
  bubbleWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  loadRoute(bubbleWin, "bubble");
  bubbleWin.webContents.on("did-finish-load", () => bubbleWin?.webContents.send("notifications:unread", unreadCounts));
  bubbleWin.on("closed", () => (bubbleWin = null));
}

function createPanel() {
  const { workArea } = screen.getPrimaryDisplay();
  const { width, height } = getPanelSize(workArea);
  panelWin = new BrowserWindow({
    width,
    height,
    frame: false,
    transparent: true,
    resizable: true,
    minWidth: PANEL_CONFIG.minWidth,
    minHeight: PANEL_CONFIG.minHeight,
    show: false,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true, // enables <webview> for Messenger/Zalo
    },
  });
  panelWin.setAlwaysOnTop(true, "screen-saver");
  loadRoute(panelWin, "panel");
  panelWin.webContents.on("did-finish-load", () => panelWin?.webContents.send("notifications:unread", unreadCounts));
  panelWin.on("closed", () => (panelWin = null));
  panelWin.on("blur", () => {
    if (Date.now() - panelShowTimestamp < 400) return;
    setTimeout(() => {
      if (!panelWin || panelWin.isDestroyed()) return;
      const isBubbleActive = BrowserWindow.getFocusedWindow() === bubbleWin || isCursorOverBubble();
      if (closeOnBlur && !isBubbleActive) {
        panelWin.hide();
      }
    }, 50);
  });
}

function isCursorOverBubble() {
  if (!bubbleWin || bubbleWin.isDestroyed()) return false;
  const cursor = screen.getCursorScreenPoint();
  const [bx, by] = bubbleWin.getPosition();
  const [bw, bh] = bubbleWin.getSize();
  return (
    cursor.x >= bx && cursor.x <= bx + bw &&
    cursor.y >= by && cursor.y <= by + bh
  );
}

function getPanelSize(workArea) {
  const targetWidth = Math.min(PANEL_CONFIG.maxWidth, Math.max(PANEL_CONFIG.minWidth, Math.round(workArea.width * PANEL_CONFIG.widthRatio)));
  const width = targetWidth || PANEL_CONFIG.defaultWidth;
  const targetHeight = Math.min(PANEL_CONFIG.maxHeight, Math.max(PANEL_CONFIG.minHeight, Math.round(workArea.height * PANEL_CONFIG.heightRatio)));
  const height = targetHeight || PANEL_CONFIG.defaultHeight;
  return { width, height };
}

/** Position the panel beside the bubble, on whichever side has more room. */
function positionPanelNearBubble() {
  if (!bubbleWin || !panelWin) return;
  const [bx, by] = bubbleWin.getPosition();
  const disp = screen.getDisplayNearestPoint({ x: bx + BUBBLE / 2, y: by + BUBBLE / 2 });
  const wa = disp.workArea;
  const { width, height } = getPanelSize(wa);
  const spaceRight = wa.x + wa.width - (bx + BUBBLE);
  const openRight = spaceRight >= width + 16;
  let px = openRight ? bx + BUBBLE - 8 : bx - width + 8;
  px = Math.min(Math.max(wa.x + 8, px), Math.max(wa.x + 8, wa.x + wa.width - width - 8));
  let py = by - 40;
  py = Math.min(Math.max(wa.y + 8, py), Math.max(wa.y + 8, wa.y + wa.height - height - 8));
  panelWin.setBounds({ x: Math.round(px), y: Math.round(py), width, height });
}

function togglePanel() {
  if (!panelWin) createPanel();
  if (panelWin.isVisible()) {
    panelWin.hide();
  } else {
    positionPanelNearBubble();
    panelShowTimestamp = Date.now();
    panelWin.show();
    panelWin.focus();
  }
}

/** Snap the bubble to the nearest vertical edge of its current display. */
function snapBubble() {
  if (!bubbleWin) return;
  const [bx, by] = bubbleWin.getPosition();
  const disp = screen.getDisplayNearestPoint({ x: bx + BUBBLE / 2, y: by + BUBBLE / 2 });
  const wa = disp.workArea;
  const center = bx + BUBBLE / 2;
  const toRight = center > wa.x + wa.width / 2;
  const nx = toRight ? wa.x + wa.width - BUBBLE : wa.x;
  const ny = Math.min(Math.max(wa.y, by), wa.y + wa.height - BUBBLE);
  bubbleWin.setPosition(Math.round(nx), Math.round(ny));
}

function restoreBubbleIfOffscreen() {
  if (!bubbleWin) return;
  const [x, y] = bubbleWin.getPosition();
  const visible = screen.getAllDisplays().some(({ workArea }) =>
    x + BUBBLE > workArea.x && x < workArea.x + workArea.width &&
    y + BUBBLE > workArea.y && y < workArea.y + workArea.height,
  );
  if (!visible) {
    const wa = screen.getPrimaryDisplay().workArea;
    bubbleWin.setPosition(wa.x + wa.width - BUBBLE - 24, wa.y + Math.round(wa.height * 0.4));
  }
}

function stopDrag() {
  if (dragTimer) clearInterval(dragTimer);
  dragTimer = null;
  dragOffset = null;
}

function buildTray() {
  const traySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#3d96ff"/><stop offset="1" stop-color="#b566ff"/></linearGradient></defs>
    <rect x="1" y="1" width="30" height="30" rx="9" fill="url(#g)"/>
    <path fill="#fff" d="M16 7c-5 0-9 3.6-9 8.1 0 2.5 1.24 4.72 3.2 6.2v3.1l2.94-1.6c.9.22 1.86.35 2.86.35 5 0 9-3.6 9-8.05S21 7 16 7Z"/>
    <circle cx="12.5" cy="15" r="1.4" fill="#6c7cff"/><circle cx="16" cy="15" r="1.4" fill="#6c7cff"/><circle cx="19.5" cy="15" r="1.4" fill="#6c7cff"/>
  </svg>`;
  const icon = nativeImage.createFromDataURL(
    `data:image/svg+xml;base64,${Buffer.from(traySvg).toString("base64")}`,
  );
  tray = new Tray(icon);
  tray.setToolTip("Bubble Chat — Messenger + Zalo");
  const menu = Menu.buildFromTemplate([
    { label: "Show / Hide Bubble Chat", click: () => (bubbleWin?.isVisible() ? bubbleWin.hide() : bubbleWin?.show()) },
    { type: "separator" },
    { label: "Messenger", click: () => openProvider("messenger") },
    { label: "Zalo", click: () => openProvider("zalo") },
    { type: "separator" },
    { label: "Start at Login", type: "checkbox", checked: app.getLoginItemSettings().openAtLogin, click: (i) => app.setLoginItemSettings({ openAtLogin: i.checked }) },
    { label: "Performance Mode", submenu: [
      { label: "Low Memory", click: () => setPerformanceMode("Low Memory") },
      { label: "Balanced", click: () => setPerformanceMode("Balanced") },
      { label: "Instant Switching", click: () => setPerformanceMode("Instant Switching") },
    ] },
    { label: "Settings…", click: () => openProvider("settings") },
    { type: "separator" },
    { label: "Quit Bubble Chat", click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
  tray.on("click", () => togglePanel());
}

function showBubbleContextMenu() {
  if (!bubbleWin) return;
  Menu.buildFromTemplate([
    { label: "Open Messenger", click: () => openProvider("messenger") },
    { label: "Open Zalo", click: () => openProvider("zalo") },
    { type: "separator" },
    { label: "Hide bubble", click: () => bubbleWin?.hide() },
    { label: "Settings…", click: () => openProvider("settings") },
    { type: "separator" },
    { label: "Quit Bubble Chat", click: () => app.quit() },
  ]).popup({ window: bubbleWin });
}

function openProvider(which) {
  if (!["messenger", "zalo", "settings"].includes(which)) return;
  if (!panelWin) createPanel();
  positionPanelNearBubble();
  panelShowTimestamp = Date.now();
  panelWin.show();
  panelWin.moveTop();
  panelWin.focus();
  panelWin.webContents.send("panel:navigate", which);
}

function setPerformanceMode(mode) {
  writeState({ performanceMode: mode });
  panelWin?.webContents.send("settings:performance", mode);
}

function registerShortcuts() {
  globalShortcut.register("Alt+CommandOrControl+B", () => {
    bubbleWin?.isVisible() ? bubbleWin.hide() : bubbleWin?.show();
  });
  globalShortcut.register("Alt+CommandOrControl+M", () => openProvider("messenger"));
  globalShortcut.register("Alt+CommandOrControl+Z", () => openProvider("zalo"));
}

let isDragging = false;

ipcMain.on("bubble:dragStart", () => {
  if (!bubbleWin) return;
  stopDrag();
  isDragging = true;
  if (panelWin && panelWin.isVisible()) {
    panelWin.hide();
  }
  const cursor = screen.getCursorScreenPoint();
  const [bx, by] = bubbleWin.getPosition();
  dragOffset = { x: cursor.x - bx, y: cursor.y - by };
  let lastBx = -1;
  let lastBy = -1;
  dragTimer = setInterval(() => {
    if (!bubbleWin || !dragOffset) return;
    const c = screen.getCursorScreenPoint();
    const nx = Math.round(c.x - dragOffset.x);
    const ny = Math.round(c.y - dragOffset.y);
    if (nx === lastBx && ny === lastBy) return;
    lastBx = nx;
    lastBy = ny;
    bubbleWin.setPosition(nx, ny);
  }, 10);
});
ipcMain.on("bubble:dragEnd", () => {
  stopDrag();
  if (!isDragging) return;
  isDragging = false;

  if (snapToEdge) {
    snapBubble();
  }
  if (bubbleWin) {
    const [x, y] = bubbleWin.getPosition();
    if (rememberPosition) writeState({ bubblePosition: { x, y } });
  }

  // Tự động xuất hiện lại popup chat phù hợp tại vị trí mới sau khi thả bóng chat
  if (!panelWin) createPanel();
  positionPanelNearBubble();
  panelShowTimestamp = Date.now();
  panelWin.show();
  panelWin.focus();
});
ipcMain.on("bubble:click", () => {
  stopDrag();
  togglePanel();
});
ipcMain.on("panel:collapse", () => panelWin?.hide());
ipcMain.on("open:external", (_e, url) => {
  if (url === "https://www.messenger.com" || url === "https://chat.zalo.me") shell.openExternal(url);
});
ipcMain.on("bubble:show", () => bubbleWin?.show());
ipcMain.on("bubble:hide", () => bubbleWin?.hide());
ipcMain.on("bubble:contextMenu", showBubbleContextMenu);
ipcMain.on("provider:open", (_e, which) => openProvider(which));
ipcMain.on("app:quit", () => app.quit());
ipcMain.on("settings:login", (_e, enabled) => app.setLoginItemSettings({ openAtLogin: Boolean(enabled) }));
ipcMain.on("settings:alwaysOnTop", (_e, enabled) => {
  bubbleWin?.setAlwaysOnTop(Boolean(enabled), "screen-saver");
  panelWin?.setAlwaysOnTop(Boolean(enabled), "screen-saver");
});
ipcMain.on("settings:closeOnBlur", (_e, enabled) => {
  closeOnBlur = Boolean(enabled);
  writeState({ closeOnBlur });
});
ipcMain.on("settings:showBubbleOnStartup", (_e, enabled) => {
  showBubbleOnStartup = Boolean(enabled);
  writeState({ showBubbleOnStartup });
  if (showBubbleOnStartup) bubbleWin?.show();
  else bubbleWin?.hide();
});
ipcMain.on("settings:rememberPosition", (_e, enabled) => {
  rememberPosition = Boolean(enabled);
  writeState({ rememberPosition });
});
ipcMain.on("settings:snapToEdge", (_e, enabled) => {
  snapToEdge = Boolean(enabled);
  writeState({ snapToEdge });
});
ipcMain.on("settings:performance", (_e, mode) => setPerformanceMode(mode));
ipcMain.on("notifications:unread", (_e, provider, count) => {
  if (!Object.hasOwn(unreadCounts, provider)) return;
  const next = Number.isFinite(Number(count)) ? Math.max(0, Math.min(999, Math.floor(Number(count)))) : 0;
  if (unreadCounts[provider] === next) return;
  unreadCounts[provider] = next;
  panelWin?.webContents.send("notifications:unread", unreadCounts);
  bubbleWin?.webContents.send("notifications:unread", unreadCounts);
});
ipcMain.on("session:clear", (_e, provider) => {
  if (!["messenger", "zalo", "cache"].includes(provider)) return;
  const partitions = provider === "cache" ? ["persist:messenger", "persist:zalo"] : [`persist:${provider}`];
  Promise.all(partitions.map((partition) => session.fromPartition(partition).clearStorageData())).catch(() => {});
});
ipcMain.on("session:openStorage", () => shell.openPath(app.getPath("userData")));

app.whenReady().then(() => {
  if (!hasSingleInstanceLock) return;
  ["persist:messenger", "persist:zalo"].forEach((partition) => {
    const ses = session.fromPartition(partition);
    ses.setPermissionRequestHandler((_webContents, permission, callback) => {
      callback(permission === "notifications");
    });
    ses.setPermissionCheckHandler((_webContents, permission) => {
      return permission === "notifications";
    });
  });

  createBubble();
  createPanel();
  buildTray();
  registerShortcuts();
  screen.on("display-removed", restoreBubbleIfOffscreen);
  screen.on("display-metrics-changed", () => {
    restoreBubbleIfOffscreen();
    if (panelWin?.isVisible()) positionPanelNearBubble();
  });
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createBubble();
  });
});

app.on("second-instance", () => {
  bubbleWin?.show();
  bubbleWin?.focus();
});

// Keep running in tray when all windows are closed.
app.on("window-all-closed", () => {});
app.on("will-quit", () => globalShortcut.unregisterAll());
