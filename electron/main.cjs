const { app, BrowserWindow, Tray, Menu, ipcMain, screen, shell, nativeImage, session, globalShortcut, net, nativeTheme, clipboard } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { compareVersions, selectAsset } = require("./update-utils.cjs");

const DEV_URL = process.env.VITE_DEV_URL || "http://localhost:8443";
const isDev = !app.isPackaged;
const APP_ICON_PATH = path.join(__dirname, isDev ? "../public/bubble-chat-icon.png" : "../dist/bubble-chat-icon.png");
const RELEASE_API = "https://api.github.com/repos/minq3010/bubble-chat/releases/latest";
const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) app.quit();

const BUBBLE = 88; // window size (room for bubble + shadow/badge without clipping)
const PANEL_MARGIN = 12; // transparent margin around panel to prevent shadow and corner clipping
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
let lastPanelBlurHide = 0;
let panelWasVisibleBeforeDrag = false;
let updateCheck = null;
let updateInfo = { status: "idle", currentVersion: app.getVersion() };

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
let alwaysOnTop = savedSettings.alwaysOnTop !== false;
if (savedSettings.theme) {
  nativeTheme.themeSource = savedSettings.theme.toLowerCase();
}

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

function sendUpdateInfo(win) {
  if (win && !win.isDestroyed()) win.webContents.send("update:status", updateInfo);
}

function setUpdateInfo(next) {
  updateInfo = next;
  sendUpdateInfo(panelWin);
}

function isTrustedReleaseUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "github.com" && url.pathname.startsWith("/minq3010/bubble-chat/releases/");
  } catch {
    return false;
  }
}

async function checkAppUpdate() {
  if (updateCheck) return updateCheck;
  const currentVersion = app.getVersion();
  setUpdateInfo({ status: "checking", currentVersion });
  updateCheck = (async () => {
    try {
      const response = await net.fetch(RELEASE_API, {
        headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
        signal: AbortSignal.timeout(10000),
      });
      if (response.status === 404) return { status: "up-to-date", currentVersion };
      if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
      const release = await response.json();
      const latestVersion = typeof release.tag_name === "string" ? release.tag_name : "";
      const comparison = compareVersions(latestVersion, currentVersion);
      if (comparison === null) throw new Error("Invalid release version");
      if (comparison <= 0) return { status: "up-to-date", currentVersion, latestVersion };
      const releaseUrl = typeof release.html_url === "string" && isTrustedReleaseUrl(release.html_url) ? release.html_url : undefined;
      const asset = selectAsset(release.assets, process.platform, process.arch);
      return {
        status: "available",
        currentVersion,
        latestVersion,
        releaseNotes: typeof release.body === "string" ? release.body.slice(0, 2000) : undefined,
        downloadUrl: isTrustedReleaseUrl(asset?.browser_download_url) ? asset.browser_download_url : undefined,
        releaseUrl,
      };
    } catch {
      return { status: "error", currentVersion, error: "Couldn't check for updates. Try again." };
    }
  })();
  try {
    const next = await updateCheck;
    setUpdateInfo(next);
    return next;
  } finally {
    updateCheck = null;
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
    icon: APP_ICON_PATH,
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
  bubbleWin.setAlwaysOnTop(alwaysOnTop, "screen-saver");
  bubbleWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  loadRoute(bubbleWin, "bubble");
  bubbleWin.webContents.on("did-finish-load", () => bubbleWin?.webContents.send("notifications:unread", unreadCounts));
  bubbleWin.on("closed", () => (bubbleWin = null));
}

function createPanel() {
  const { workArea } = screen.getPrimaryDisplay();
  const { width, height } = getPanelSize(workArea);
  panelWin = new BrowserWindow({
    icon: APP_ICON_PATH,
    width,
    height,
    frame: false,
    transparent: true,
    resizable: true,
    minWidth: PANEL_CONFIG.minWidth + PANEL_MARGIN * 2,
    minHeight: PANEL_CONFIG.minHeight + PANEL_MARGIN * 2,
    show: false,
    hasShadow: false,
    alwaysOnTop,
    skipTaskbar: true,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true, // enables <webview> for Messenger/Zalo
    },
  });
  panelWin.setAlwaysOnTop(alwaysOnTop, "screen-saver");
  loadRoute(panelWin, "panel");
  panelWin.webContents.on("did-finish-load", () => {
    panelWin?.webContents.send("notifications:unread", unreadCounts);
    sendUpdateInfo(panelWin);
  });
  panelWin.on("closed", () => (panelWin = null));
  panelWin.on("blur", () => {
    if (Date.now() - panelShowTimestamp < 400) return;
    setTimeout(() => {
      if (!panelWin || panelWin.isDestroyed()) return;
      const isBubbleActive = BrowserWindow.getFocusedWindow() === bubbleWin || isCursorOverBubble();
      if (closeOnBlur && !isBubbleActive) {
        lastPanelBlurHide = Date.now();
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
  const width = (targetWidth || PANEL_CONFIG.defaultWidth) + PANEL_MARGIN * 2;
  const targetHeight = Math.min(PANEL_CONFIG.maxHeight, Math.max(PANEL_CONFIG.minHeight, Math.round(workArea.height * PANEL_CONFIG.heightRatio)));
  const height = (targetHeight || PANEL_CONFIG.defaultHeight) + PANEL_MARGIN * 2;
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
  const openRight = spaceRight >= width - PANEL_MARGIN * 2;
  let px = openRight ? bx + BUBBLE - PANEL_MARGIN : bx - width + PANEL_MARGIN;
  px = Math.min(Math.max(wa.x - PANEL_MARGIN, px), Math.max(wa.x - PANEL_MARGIN, wa.x + wa.width - width + PANEL_MARGIN));
  let py = by - 40;
  py = Math.min(Math.max(wa.y - PANEL_MARGIN, py), Math.max(wa.y - PANEL_MARGIN, wa.y + wa.height - height + PANEL_MARGIN));
  panelWin.setBounds({ x: Math.round(px), y: Math.round(py), width, height });
}

function togglePanel() {
  if (Date.now() - lastPanelBlurHide < 350) return;
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
  const nx = toRight ? wa.x + wa.width - BUBBLE + 6 : wa.x - 6;
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
  const icon = nativeImage.createFromPath(APP_ICON_PATH).resize({ width: 32, height: 32 });
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
  panelWasVisibleBeforeDrag = Boolean(panelWin?.isVisible());
  if (panelWasVisibleBeforeDrag) {
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
  }, 16);
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

  if (panelWasVisibleBeforeDrag) {
    if (!panelWin) createPanel();
    positionPanelNearBubble();
    panelShowTimestamp = Date.now();
    panelWin.show();
    panelWin.focus();
  }
  panelWasVisibleBeforeDrag = false;
});
ipcMain.on("bubble:click", () => {
  stopDrag();
  isDragging = false;
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
ipcMain.on("settings:login", (_e, enabled) => {
  const openAtLogin = Boolean(enabled);
  writeState({ startAtLogin: openAtLogin });
  app.setLoginItemSettings({ openAtLogin });
});
ipcMain.on("settings:alwaysOnTop", (_e, enabled) => {
  alwaysOnTop = Boolean(enabled);
  writeState({ alwaysOnTop });
  bubbleWin?.setAlwaysOnTop(alwaysOnTop, "screen-saver");
  panelWin?.setAlwaysOnTop(alwaysOnTop, "screen-saver");
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
ipcMain.on("settings:appearance", (_e, data) => {
  const patch = {};
  if (data?.theme) {
    patch.theme = data.theme;
    nativeTheme.themeSource = data.theme.toLowerCase();
  }
  if (data?.bubbleSize) patch.bubbleSize = data.bubbleSize;
  writeState(patch);
  bubbleWin?.webContents.send("settings:appearance", data);
  panelWin?.webContents.send("settings:appearance", data);
});
ipcMain.handle("settings:get", () => {
  const state = readState();
  return {
    startAtLogin: state.startAtLogin ?? app.getLoginItemSettings().openAtLogin,
    showBubbleOnStartup: state.showBubbleOnStartup !== false,
    rememberPosition: state.rememberPosition !== false,
    snapToEdge: state.snapToEdge !== false,
    closeOnBlur: state.closeOnBlur !== false,
    alwaysOnTop: state.alwaysOnTop !== false,
    performanceMode: state.performanceMode || "Balanced",
    theme: state.theme || "System",
    bubbleSize: state.bubbleSize || "Medium",
  };
});
ipcMain.on("notifications:unread", (_e, provider, count) => {
  if (!Object.hasOwn(unreadCounts, provider)) return;
  const next = Number.isFinite(Number(count)) ? Math.max(0, Math.min(999, Math.floor(Number(count)))) : 0;
  if (unreadCounts[provider] === next) return;
  unreadCounts[provider] = next;
  panelWin?.webContents.send("notifications:unread", unreadCounts);
  bubbleWin?.webContents.send("notifications:unread", unreadCounts);
});
ipcMain.on("session:clear", async (_e, provider) => {
  if (!["messenger", "zalo", "cache"].includes(provider)) return;
  if (provider === "cache") {
    await Promise.all([
      session.fromPartition("persist:messenger").clearCache(),
      session.fromPartition("persist:zalo").clearCache(),
    ]).catch(() => {});
  } else {
    await session.fromPartition(`persist:${provider}`).clearStorageData().catch(() => {});
    panelWin?.webContents.send("provider:reload", provider);
  }
});
ipcMain.on("session:openStorage", () => shell.openPath(app.getPath("userData")));
ipcMain.on("developer:copyPhone", () => clipboard.writeText("0866007219"));
ipcMain.handle("app:getVersion", () => app.getVersion());
ipcMain.handle("update:getInfo", () => updateInfo);
ipcMain.handle("update:check", () => checkAppUpdate());
ipcMain.handle("update:openDownload", async () => {
  const url = updateInfo.downloadUrl || updateInfo.releaseUrl;
  if (!isTrustedReleaseUrl(url)) throw new Error("No trusted update download is available");
  await shell.openExternal(url);
});

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
  if (app.dock) {
    try {
      app.dock.setIcon(APP_ICON_PATH);
    } catch {}
  }
  registerShortcuts();
  setTimeout(() => void checkAppUpdate(), 5000);
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
