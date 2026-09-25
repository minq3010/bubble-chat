const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  ipcMain,
  screen,
  shell,
  nativeImage,
  session,
  globalShortcut,
  net,
  nativeTheme,
  clipboard,
} = require("electron")
const path = require("node:path")
const fs = require("node:fs")
const crypto = require("node:crypto")
const os = require("node:os")
const { spawn } = require("node:child_process")
try {
  require("dotenv").config({ path: path.join(__dirname, "../.env") })
} catch {}
const { compareVersions, selectAsset } = require("./update-utils.cjs")
const { summarizeMemoryMetrics } = require("./memory-utils.cjs")
const { verifyTOTP } = require("./totp-utils.cjs")
const {
  STORAGE_SIZE_CACHE_TTL,
  getDirectorySize,
  invalidateDirectorySize,
} = require("./storage-utils.cjs")
const releaseConfig = require("./release-config.json")
const ENABLE_TOTP = app.isPackaged
  ? releaseConfig.totp === true
  : process.env.BUBBLE_ENABLE_TOTP === "true"

const DEV_URL = process.env.VITE_DEV_URL || "http://localhost:8443"
const isDev = !app.isPackaged
const APP_ICON_PATH = path.join(
  __dirname,
  isDev ? "../public/bubble-chat-icon.png" : "../dist/bubble-chat-icon.png",
)
const RELEASE_API =
  "https://api.github.com/repos/minq3010/bubble-chat/releases/latest"
const hasSingleInstanceLock = app.requestSingleInstanceLock()
if (!hasSingleInstanceLock) app.quit()

// Optimize Chromium RAM & V8 heap usage + allow seamless background media autoplay
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required")
app.commandLine.appendSwitch("js-flags", "--max-old-space-size=256")
app.commandLine.appendSwitch("renderer-process-limit", "3")
app.commandLine.appendSwitch("disable-gpu-shader-disk-cache")
app.commandLine.appendSwitch(
  "enable-features",
  "ResourceEfficientLayoutng,CalculateNativeWinOcclusion",
)

const BUBBLE = 88 // window size (room for bubble + shadow/badge without clipping)
const PANEL_MARGIN = 0 // zero outer margin, no blurry outer shadow halo
const PANEL_CONFIG = {
  defaultWidth: 260,
  minWidth: 200,
  maxWidth: 960,
  widthRatio: 0.16,
  defaultHeight: 370,
  minHeight: 250,
  maxHeight: 1200,
  heightRatio: 0.42,
}
const BUBBLE_ICONS = new Set(["default", "message", "spark", "heart", "bolt"])

let bubbleWin = null
let panelWin = null
let tray = null
let dragTimer = null
let dragOffset = null
const stateFile = path.join(app.getPath("userData"), "bubble-state.json")
const unreadCounts = { messenger: 0, zalo: 0, custom: 0 }
let closeOnBlur = true
let showBubbleOnStartup = true
let rememberPosition = true
let snapToEdge = true
let panelShowTimestamp = 0
let lastPanelBlurHide = 0
let panelWasVisibleBeforeDrag = false
let updateCheck = null
let updateInstall = null
let updateInfo = { status: "idle", currentVersion: app.getVersion() }
let lastChatMemoryMB = null
let currentPanelView = "chat"

// Secret resolution for TOTP and Shadow Store HMAC signing
let embeddedSecret = ""
if (ENABLE_TOTP) {
  try {
    embeddedSecret = require("./totp-secret.json").secret
  } catch {}
}

function getMachineFingerprint() {
  try {
    return crypto
      .createHash("sha256")
      .update(
        `${os.hostname()}-${os.platform()}-${os.arch()}-${os.userInfo()?.username || ""}`,
      )
      .digest("hex")
  } catch {
    return "default-machine-fp"
  }
}

const MACHINE_FP = getMachineFingerprint()

// Dynamic machine-derived Base32 fallback so no hardcoded secret exists in the public repository
function generateMachineBase32Fallback() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
  const hash = crypto
    .createHash("sha256")
    .update(`bubble-default-secret-${MACHINE_FP}`)
    .digest()
  let result = ""
  for (let i = 0; i < 32; i++) {
    result += chars[hash[i] % chars.length]
  }
  return result
}

const APP_TOTP_SECRET = ENABLE_TOTP
  ? app.isPackaged
    ? releaseConfig.secret
    : process.env.BUBBLE_TOTP_SECRET ||
      embeddedSecret ||
      generateMachineBase32Fallback()
  : ""
if (ENABLE_TOTP && !APP_TOTP_SECRET) {
  throw new Error("TOTP is enabled without a secret")
}

const SEC_ENC_KEY = ENABLE_TOTP
  ? crypto.scryptSync(APP_TOTP_SECRET, MACHINE_FP, 32)
  : null

function encryptSecurityPayload(obj) {
  try {
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv("aes-256-gcm", SEC_ENC_KEY, iv)
    const plain = Buffer.from(JSON.stringify(obj), "utf8")
    const enc = Buffer.concat([cipher.update(plain), cipher.final()])
    const authTag = cipher.getAuthTag()
    return Buffer.concat([iv, authTag, enc]).toString("base64")
  } catch (err) {
    console.error("[Security] Encryption error:", err)
    return ""
  }
}

function decryptSecurityPayload(base64Str) {
  try {
    const buf = Buffer.from(base64Str, "base64")
    if (buf.length < 28) return null // 12 IV + 16 authTag
    const iv = buf.subarray(0, 12)
    const authTag = buf.subarray(12, 28)
    const enc = buf.subarray(28)
    const decipher = crypto.createDecipheriv("aes-256-gcm", SEC_ENC_KEY, iv)
    decipher.setAuthTag(authTag)
    const dec = Buffer.concat([decipher.update(enc), decipher.final()])
    return JSON.parse(dec.toString("utf8"))
  } catch {
    return null
  }
}

function readState() {
  try {
    const raw = JSON.parse(fs.readFileSync(stateFile, "utf8"))
    if (!ENABLE_TOTP) return raw || {}
    if (raw && typeof raw._sec === "string") {
      const sec = decryptSecurityPayload(raw._sec)
      if (sec) {
        return { ...raw, ...sec, _secValid: true }
      } else {
        return { ...raw, _secTampered: true }
      }
    }
    return raw || {}
  } catch {
    return {}
  }
}

function getShadowStorePaths() {
  const paths = []
  try {
    if (process.platform === "win32") {
      const localApp = process.env.LOCALAPPDATA || os.homedir()
      paths.push(path.join(localApp, ".bubble-session.dat"))
    } else if (process.platform === "darwin") {
      paths.push(
        path.join(os.homedir(), "Library", "Caches", ".bubble-session.dat"),
      )
    } else {
      const xdgData =
        process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share")
      paths.push(path.join(xdgData, ".bubble-session.dat"))
    }
    paths.push(path.join(app.getPath("appData"), ".bubble-meta.dat"))
  } catch {}
  return paths
}

function writeShadowStores(data) {
  const enc = encryptSecurityPayload(data)
  const sig = crypto
    .createHmac("sha256", APP_TOTP_SECRET)
    .update(enc)
    .digest("hex")
  const encoded = Buffer.from(JSON.stringify({ enc, sig })).toString("base64")

  for (const p of getShadowStorePaths()) {
    try {
      fs.mkdirSync(path.dirname(p), { recursive: true })
      fs.writeFileSync(p, encoded, "utf8")
    } catch {}
  }
}

function readShadowStores() {
  const shadows = []
  for (const p of getShadowStorePaths()) {
    try {
      if (!fs.existsSync(p)) continue
      const raw = fs.readFileSync(p, "utf8").trim()
      if (!raw) continue
      const jsonStr = Buffer.from(raw, "base64").toString("utf8")
      const parsed = JSON.parse(jsonStr)
      if (typeof parsed.enc === "string" && typeof parsed.sig === "string") {
        const expectedSig = crypto
          .createHmac("sha256", APP_TOTP_SECRET)
          .update(parsed.enc)
          .digest("hex")
        if (parsed.sig === expectedSig) {
          const dec = decryptSecurityPayload(parsed.enc)
          if (dec) {
            shadows.push({ ...dec, path: p, valid: true })
          } else {
            shadows.push({ path: p, valid: false, tampered: true })
          }
        } else {
          shadows.push({ path: p, valid: false, tampered: true })
        }
      }
    } catch {}
  }
  return shadows
}

// 4-hour accumulated usage limit configuration
const DEFAULT_USAGE_LIMIT_SECONDS = 14400 // 4 hours = 240 minutes
const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 5 * 60 * 1000 // 5 minutes = 300,000 ms

function resolveInitialState(primary) {
  const shadows = readShadowStores()
  const now = Date.now()

  // Case 0: Tampered primary config file
  if (primary._secTampered) {
    console.warn("[Security] Primary config file was tampered with! Locking.")
    return {
      isLocked: true,
      remainingUsageSeconds: 0,
      failedOtpAttempts: 5,
      lockoutUntil: now + LOCKOUT_DURATION_MS,
      sessionCycleId: "tampered_primary",
      lastActiveTimestamp: now,
    }
  }

  // Case 1: Tampered signature in any shadow store
  const hasTamperedShadow = shadows.some((s) => s.tampered)
  if (hasTamperedShadow) {
    console.warn(
      "[Security] Tampered shadow store signature detected! Locking.",
    )
    return {
      isLocked: true,
      remainingUsageSeconds: 0,
      failedOtpAttempts: 5,
      lockoutUntil: now + LOCKOUT_DURATION_MS,
      sessionCycleId: "tampered_shadow",
      lastActiveTimestamp: now,
    }
  }

  const primaryHasUsage = typeof primary.remainingUsageSeconds === "number"
  const hasValidShadow = shadows.length > 0

  // Case 2: Primary file missing/emptied but shadow store exists (file deletion attempt)
  if (!primaryHasUsage && hasValidShadow) {
    console.warn(
      "[Security] State file missing but shadow store exists! File deletion tamper detected. Locking.",
    )
    return {
      isLocked: true,
      remainingUsageSeconds: 0,
      failedOtpAttempts: 5,
      lockoutUntil: now + LOCKOUT_DURATION_MS,
      sessionCycleId: "tampered_deletion",
      lastActiveTimestamp: now,
    }
  }

  // Case 3: Clean fresh install (neither primary nor shadow exists)
  if (!primaryHasUsage && !hasValidShadow) {
    const freshCycleId = crypto.randomBytes(8).toString("hex")
    return {
      isLocked: false,
      remainingUsageSeconds: DEFAULT_USAGE_LIMIT_SECONDS,
      failedOtpAttempts: 0,
      lockoutUntil: 0,
      sessionCycleId: freshCycleId,
      lastActiveTimestamp: now,
      initialInstallTimestamp: now,
    }
  }

  // Case 4: Both exist -> Cross-validation
  let minRemaining =
    typeof primary.remainingUsageSeconds === "number" &&
    primary.remainingUsageSeconds > 30
      ? primary.remainingUsageSeconds
      : DEFAULT_USAGE_LIMIT_SECONDS
  let locked = Boolean(primary.isLocked && minRemaining <= 0)
  let cycleId = primary.sessionCycleId || crypto.randomBytes(8).toString("hex")
  let lastTimestamp = primary.lastActiveTimestamp || 0
  let maxLockoutUntil = primary.lockoutUntil || 0
  let maxFailedAttempts = primary.failedOtpAttempts || 0

  for (const s of shadows) {
    if (s.isLocked && s.remainingUsageSeconds <= 0) locked = true
    if (
      s.remainingUsageSeconds > 30 &&
      s.remainingUsageSeconds < minRemaining
    ) {
      minRemaining = s.remainingUsageSeconds
    }
    if (s.lastActiveTimestamp > lastTimestamp) {
      lastTimestamp = s.lastActiveTimestamp
    }
    if (s.lockoutUntil && s.lockoutUntil > maxLockoutUntil) {
      maxLockoutUntil = s.lockoutUntil
    }
    if (s.failedOtpAttempts && s.failedOtpAttempts > maxFailedAttempts) {
      maxFailedAttempts = s.failedOtpAttempts
    }
  }

  // Reset test sessions back to full 4 hours
  if (minRemaining <= 30) {
    minRemaining = DEFAULT_USAGE_LIMIT_SECONDS
    locked = false
    maxLockoutUntil = 0
    maxFailedAttempts = 0
  }

  // Value manipulation check: primary store had higher seconds than shadow
  for (const s of shadows) {
    if (
      typeof primary.remainingUsageSeconds === "number" &&
      primary.remainingUsageSeconds > s.remainingUsageSeconds + 30
    ) {
      console.warn(
        "[Security] Primary store had higher seconds than shadow! Reverting to lowest shadow value.",
      )
      minRemaining = s.remainingUsageSeconds
    }
  }

  // Clock rollback check (system time set backwards by > 1 minute)
  if (lastTimestamp > 0 && now < lastTimestamp - 60000) {
    console.warn("[Security] System clock rollback detected! Locking.")
    locked = true
    minRemaining = 0
  }

  if (minRemaining <= 0) {
    locked = true
    minRemaining = 0
  }

  return {
    isLocked: locked,
    remainingUsageSeconds: minRemaining,
    failedOtpAttempts: maxFailedAttempts,
    lockoutUntil: maxLockoutUntil,
    sessionCycleId: cycleId,
    lastActiveTimestamp: Math.max(now, lastTimestamp),
    initialInstallTimestamp:
      primary.initialInstallTimestamp ||
      shadows[0]?.initialInstallTimestamp ||
      now,
  }
}

const savedSettings = readState()
closeOnBlur = savedSettings.closeOnBlur !== false
showBubbleOnStartup = savedSettings.showBubbleOnStartup !== false
rememberPosition = savedSettings.rememberPosition !== false
snapToEdge = savedSettings.snapToEdge !== false
let alwaysOnTop = savedSettings.alwaysOnTop !== false
let customPanelSize = savedSettings.panelSize || null
let customStorageThresholdMB =
  typeof savedSettings.customStorageThresholdMB === "number"
    ? savedSettings.customStorageThresholdMB
    : 500
if (savedSettings.theme) {
  nativeTheme.themeSource = savedSettings.theme.toLowerCase()
}

const resolvedUsage = ENABLE_TOTP
  ? resolveInitialState(savedSettings)
  : {
      remainingUsageSeconds: 0,
      isLocked: false,
      sessionCycleId: "",
      lastActiveTimestamp: 0,
      initialInstallTimestamp: 0,
      failedOtpAttempts: 0,
      lockoutUntil: 0,
    }
let remainingUsageSeconds = resolvedUsage.remainingUsageSeconds
let isLocked = resolvedUsage.isLocked
let sessionCycleId = resolvedUsage.sessionCycleId
let lastActiveTimestamp = resolvedUsage.lastActiveTimestamp
let initialInstallTimestamp = resolvedUsage.initialInstallTimestamp
let failedOtpAttempts = resolvedUsage.failedOtpAttempts || 0
let lockoutUntil = resolvedUsage.lockoutUntil || 0

function writeState(patch) {
  const current = readState()
  const next = { ...current, ...patch }

  if (!ENABLE_TOTP) {
    try {
      fs.mkdirSync(path.dirname(stateFile), { recursive: true })
      fs.writeFileSync(stateFile, JSON.stringify(next, null, 2))
    } catch {}
    return next
  }

  if (typeof patch.remainingUsageSeconds === "number") {
    remainingUsageSeconds = patch.remainingUsageSeconds
  }
  if (typeof patch.isLocked === "boolean") {
    isLocked = patch.isLocked
  }
  if (typeof patch.failedOtpAttempts === "number") {
    failedOtpAttempts = patch.failedOtpAttempts
  }
  if (typeof patch.lockoutUntil === "number") {
    lockoutUntil = patch.lockoutUntil
  }
  if (patch.sessionCycleId) {
    sessionCycleId = patch.sessionCycleId
  }
  if (patch.lastActiveTimestamp) {
    lastActiveTimestamp = patch.lastActiveTimestamp
  }

  const secBundle = {
    remainingUsageSeconds,
    isLocked,
    failedOtpAttempts,
    lockoutUntil,
    sessionCycleId,
    lastActiveTimestamp,
    initialInstallTimestamp,
  }

  const diskState = { ...next }
  delete diskState.remainingUsageSeconds
  delete diskState.isLocked
  delete diskState.failedOtpAttempts
  delete diskState.lockoutUntil
  delete diskState.sessionCycleId
  delete diskState.lastActiveTimestamp
  delete diskState.initialInstallTimestamp
  delete diskState._secValid
  delete diskState._secTampered

  diskState._sec = encryptSecurityPayload(secBundle)

  try {
    fs.mkdirSync(path.dirname(stateFile), { recursive: true })
    fs.writeFileSync(stateFile, JSON.stringify(diskState, null, 2))
  } catch {}

  writeShadowStores(secBundle)

  return next
}

// Initial sync to ensure all stores are aligned
if (ENABLE_TOTP) {
  writeState({
    remainingUsageSeconds,
    isLocked,
    failedOtpAttempts,
    lockoutUntil,
    sessionCycleId,
    lastActiveTimestamp,
    initialInstallTimestamp,
  })
}

if (ENABLE_TOTP) {
  // Background accumulated usage timer: decrements every second while active
  setInterval(() => {
    if (!isLocked) {
      const now = Date.now()
      if (lastActiveTimestamp > 0 && now < lastActiveTimestamp - 60000) {
        console.warn(
          "[Security] Clock rollback detected during active session! Locking.",
        )
        isLocked = true
        remainingUsageSeconds = 0
        writeState({
          remainingUsageSeconds: 0,
          isLocked: true,
          lastActiveTimestamp: now,
        })
        panelWin?.webContents.send("lock:status", {
          isLocked: true,
          remainingSeconds: 0,
        })
        return
      }

      lastActiveTimestamp = now
      remainingUsageSeconds = Math.max(0, remainingUsageSeconds - 1)
      if (remainingUsageSeconds <= 0) {
        isLocked = true
        writeState({
          remainingUsageSeconds: 0,
          isLocked: true,
          lastActiveTimestamp: now,
        })
        panelWin?.webContents.send("lock:status", {
          isLocked: true,
          remainingSeconds: 0,
        })
      }
    }
  }, 1000)

  // Periodic persistence
  setInterval(() => {
    writeState({
      remainingUsageSeconds,
      isLocked,
      sessionCycleId,
      lastActiveTimestamp,
    })
  }, 60000)
}

function keepBubbleOnScreen(x, y) {
  const display =
    screen
      .getAllDisplays()
      .find(
        ({ bounds }) =>
          x + BUBBLE / 2 >= bounds.x &&
          x + BUBBLE / 2 <= bounds.x + bounds.width &&
          y + BUBBLE / 2 >= bounds.y &&
          y + BUBBLE / 2 <= bounds.y + bounds.height,
      ) || screen.getPrimaryDisplay()
  const wa = display.workArea
  return {
    x: Math.min(Math.max(wa.x, x), wa.x + wa.width - BUBBLE),
    y: Math.min(Math.max(wa.y, y), wa.y + wa.height - BUBBLE),
  }
}

/** Resolve a renderer route in dev (Vite) or prod (built file + hash). */
function loadRoute(win, hash) {
  if (isDev) {
    win.loadURL(`${DEV_URL}/#${hash}`)
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"), { hash })
  }
}

function sendUpdateInfo(win) {
  if (win && !win.isDestroyed())
    win.webContents.send("update:status", updateInfo)
}

function setUpdateInfo(next) {
  updateInfo = next
  sendUpdateInfo(panelWin)
}

function isTrustedReleaseUrl(value) {
  try {
    const url = new URL(value)
    return (
      url.protocol === "https:" &&
      url.hostname === "github.com" &&
      url.pathname.startsWith("/minq3010/bubble-chat/releases/")
    )
  } catch {
    return false
  }
}

async function checkAppUpdate() {
  if (updateCheck) return updateCheck
  const currentVersion = app.getVersion()
  setUpdateInfo({ status: "checking", currentVersion })
  updateCheck = (async () => {
    try {
      const response = await net.fetch(RELEASE_API, {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        signal: AbortSignal.timeout(10000),
      })
      if (response.status === 404)
        return { status: "up-to-date", currentVersion }
      if (!response.ok) throw new Error(`GitHub returned ${response.status}`)
      const release = await response.json()
      const latestVersion =
        typeof release.tag_name === "string" ? release.tag_name : ""
      const comparison = compareVersions(latestVersion, currentVersion)
      if (comparison === null) throw new Error("Invalid release version")
      if (comparison <= 0)
        return { status: "up-to-date", currentVersion, latestVersion }
      const releaseUrl =
        typeof release.html_url === "string" &&
        isTrustedReleaseUrl(release.html_url)
          ? release.html_url
          : undefined
      const asset = selectAsset(release.assets, process.platform, process.arch)
      return {
        status: "available",
        currentVersion,
        latestVersion,
        releaseNotes:
          typeof release.body === "string"
            ? release.body.slice(0, 2000)
            : undefined,
        downloadUrl: isTrustedReleaseUrl(asset?.browser_download_url)
          ? asset.browser_download_url
          : undefined,
        releaseUrl,
      }
    } catch {
      return {
        status: "error",
        currentVersion,
        error: "Couldn't check for updates. Try again.",
      }
    }
  })()
  try {
    const next = await updateCheck
    setUpdateInfo(next)
    return next
  } finally {
    updateCheck = null
  }
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`
}

function launchUpdateScript(scriptPath) {
  const child = spawn("/bin/sh", [scriptPath], {
    detached: true,
    stdio: "ignore",
  })
  child.unref()
  setTimeout(() => app.quit(), 300)
}

async function installAppUpdate() {
  if (updateInstall) return updateInstall
  const url = updateInfo.downloadUrl
  if (!isTrustedReleaseUrl(url)) {
    throw new Error("No trusted update download is available")
  }

  updateInstall = (async () => {
    const currentVersion = app.getVersion()
    setUpdateInfo({ ...updateInfo, status: "downloading", currentVersion })
    const response = await net.fetch(url, {
      headers: { Accept: "application/octet-stream" },
      signal: AbortSignal.timeout(120000),
    })
    if (!response.ok) throw new Error(`Download failed (${response.status})`)

    const extension = path.extname(new URL(url).pathname).toLowerCase()
    const installerPath = path.join(
      app.getPath("temp"),
      `bubble-chat-update-${Date.now()}${extension}`,
    )
    await fs.promises.writeFile(
      installerPath,
      Buffer.from(await response.arrayBuffer()),
    )
    setUpdateInfo({ ...updateInfo, status: "installing", currentVersion })

    if (process.platform === "win32") {
      const installer = spawn(installerPath, ["/S"], {
        detached: true,
        stdio: "ignore",
        windowsHide: false,
      })
      installer.unref()
      setTimeout(() => app.quit(), 300)
      return { ...updateInfo, status: "installing", currentVersion }
    }

    if (process.platform === "darwin") {
      if (extension !== ".dmg" && extension !== ".zip") {
        throw new Error("Unsupported macOS installer")
      }
      const currentApp = path.resolve(
        path.dirname(process.execPath),
        "../../..",
      )
      const workDir = `${installerPath}.work`
      const sourceBlock =
        extension === ".dmg"
          ? `MOUNT=$(hdiutil attach ${shellQuote(installerPath)} -nobrowse -readonly | awk '/\\/Volumes\\// {print substr($0,index($0,"/Volumes/")); exit}')\nAPP=$(find "$MOUNT" -maxdepth 1 -name "*.app" -print -quit)`
          : `mkdir -p ${shellQuote(workDir)}\nditto -x -k ${shellQuote(installerPath)} ${shellQuote(workDir)}\nAPP=$(find ${shellQuote(workDir)} -maxdepth 2 -name "*.app" -print -quit)`
      const cleanup =
        extension === ".dmg"
          ? `hdiutil detach "$MOUNT" >/dev/null 2>&1 || true`
          : `rm -rf ${shellQuote(workDir)}`
      const scriptPath = `${installerPath}.sh`
      const script = `#!/bin/sh
set -eu
sleep 1
${sourceBlock}
test -n "$APP"
rm -rf ${shellQuote(currentApp)}
ditto "$APP" ${shellQuote(currentApp)}
${cleanup}
rm -f ${shellQuote(installerPath)} "$0"
open ${shellQuote(currentApp)}
`
      await fs.promises.writeFile(scriptPath, script, { mode: 0o700 })
      launchUpdateScript(scriptPath)
      return { ...updateInfo, status: "installing", currentVersion }
    }

    if (extension === ".deb") {
      const scriptPath = `${installerPath}.sh`
      const script = `#!/bin/sh
set -eu
sleep 1
if command -v pkexec >/dev/null 2>&1; then
  pkexec dpkg -i ${shellQuote(installerPath)}
  rm -f ${shellQuote(installerPath)} "$0"
  exec ${shellQuote(process.execPath)}
else
  xdg-open ${shellQuote(installerPath)} >/dev/null 2>&1 || true
fi
`
      await fs.promises.writeFile(scriptPath, script, { mode: 0o700 })
      launchUpdateScript(scriptPath)
      return { ...updateInfo, status: "installing", currentVersion }
    }

    throw new Error("Unsupported Linux installer")
  })()

  try {
    return await updateInstall
  } catch (error) {
    const currentVersion = app.getVersion()
    const next = {
      status: "error",
      currentVersion,
      error: error instanceof Error ? error.message : "Update failed",
    }
    setUpdateInfo(next)
    throw error
  } finally {
    updateInstall = null
  }
}

function createBubble() {
  const { workArea } = screen.getPrimaryDisplay()
  const saved = rememberPosition && readState().bubblePosition
  const start = saved
    ? keepBubbleOnScreen(saved.x, saved.y)
    : {
        x: workArea.x + workArea.width - BUBBLE - 24,
        y: workArea.y + Math.round(workArea.height * 0.4),
      }
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
  })
  bubbleWin.setIgnoreMouseEvents(false)
  bubbleWin.setAlwaysOnTop(alwaysOnTop, "screen-saver")
  bubbleWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  loadRoute(bubbleWin, "bubble")
  bubbleWin.webContents.on("did-finish-load", () =>
    bubbleWin?.webContents.send("notifications:unread", unreadCounts),
  )
  bubbleWin.on("closed", () => (bubbleWin = null))
}

function createPanel() {
  const { workArea } = screen.getPrimaryDisplay()
  const { width, height } = getPanelSize(workArea)
  panelWin = new BrowserWindow({
    icon: APP_ICON_PATH,
    width,
    height,
    frame: false,
    transparent: true,
    resizable: true,
    minWidth: PANEL_CONFIG.minWidth,
    minHeight: PANEL_CONFIG.minHeight,
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
      backgroundThrottling: false,
    },
  })
  panelWin.setAlwaysOnTop(alwaysOnTop, "screen-saver")
  panelWin.webContents.on("context-menu", (event, params) => {
    event.preventDefault()
    showWebContextMenu(panelWin.webContents, params, panelWin, false)
  })
  panelWin.webContents.on("did-attach-webview", (_event, guestContents) => {
    guestContents.on("context-menu", (event, params) => {
      event.preventDefault()
      showWebContextMenu(guestContents, params, panelWin, true)
    })
  })
  loadRoute(panelWin, "panel")
  panelWin.webContents.on("did-finish-load", () => {
    panelWin?.webContents.send("notifications:unread", unreadCounts)
    panelWin?.webContents.send("panel:visibility", panelWin.isVisible())
    const now = Date.now()
    const lockoutRemainingSeconds =
      lockoutUntil > now ? Math.ceil((lockoutUntil - now) / 1000) : 0
    if (ENABLE_TOTP) {
      panelWin?.webContents.send("lock:status", {
        isLocked,
        remainingSeconds: remainingUsageSeconds,
        lockoutRemainingSeconds,
        failedAttempts: failedOtpAttempts,
      })
    }
    sendUpdateInfo(panelWin)
  })
  panelWin.on("show", () =>
    panelWin?.webContents.send("panel:visibility", true),
  )
  panelWin.on("hide", () =>
    panelWin?.webContents.send("panel:visibility", false),
  )
  panelWin.on("closed", () => (panelWin = null))
  let panelResizeTimer = null
  panelWin.on("resize", () => {
    if (panelResizeTimer) clearTimeout(panelResizeTimer)
    panelResizeTimer = setTimeout(() => {
      if (!panelWin || panelWin.isDestroyed()) return
      const [width, height] = panelWin.getSize()
      customPanelSize = { width, height }
      writeState({ panelSize: customPanelSize })
    }, 250)
  })
  panelWin.on("blur", () => {
    if (Date.now() - panelShowTimestamp < 400) return
    setTimeout(() => {
      if (!panelWin || panelWin.isDestroyed()) return
      const isBubbleActive =
        BrowserWindow.getFocusedWindow() === bubbleWin || isCursorOverBubble()
      if (closeOnBlur && !isBubbleActive) {
        lastPanelBlurHide = Date.now()
        panelWin.hide()
      }
    }, 50)
  })
}

function isCursorOverBubble() {
  if (!bubbleWin || bubbleWin.isDestroyed()) return false
  const cursor = screen.getCursorScreenPoint()
  const [bx, by] = bubbleWin.getPosition()
  const [bw, bh] = bubbleWin.getSize()
  return (
    cursor.x >= bx &&
    cursor.x <= bx + bw &&
    cursor.y >= by &&
    cursor.y <= by + bh
  )
}

function getPanelSize(workArea) {
  if (
    customPanelSize &&
    typeof customPanelSize.width === "number" &&
    typeof customPanelSize.height === "number"
  ) {
    const width = Math.min(
      Math.max(PANEL_CONFIG.minWidth, Math.round(customPanelSize.width)),
      Math.min(PANEL_CONFIG.maxWidth, workArea.width),
    )
    const height = Math.min(
      Math.max(PANEL_CONFIG.minHeight, Math.round(customPanelSize.height)),
      Math.min(PANEL_CONFIG.maxHeight, workArea.height),
    )
    return { width, height }
  }
  const width = Math.min(PANEL_CONFIG.defaultWidth, workArea.width)
  const height = Math.min(PANEL_CONFIG.defaultHeight, workArea.height)
  return { width, height }
}

/** Position the panel beside the bubble, on whichever side has more room, preserving current dimensions. */
function positionPanelNearBubble() {
  if (!bubbleWin || !panelWin || panelWin.isDestroyed()) return
  const [bx, by] = bubbleWin.getPosition()
  const disp = screen.getDisplayNearestPoint({
    x: bx + BUBBLE / 2,
    y: by + BUBBLE / 2,
  })
  const wa = disp.workArea
  const [curW, curH] = panelWin.getSize()
  const fallback = getPanelSize(wa)
  const width = Math.min(
    Math.max(PANEL_CONFIG.minWidth, curW > 0 ? curW : fallback.width),
    wa.width,
  )
  const height = Math.min(
    Math.max(PANEL_CONFIG.minHeight, curH > 0 ? curH : fallback.height),
    wa.height,
  )
  const spaceRight = wa.x + wa.width - (bx + BUBBLE)
  const openRight = spaceRight >= width + 8
  let px = openRight ? bx + BUBBLE + 6 : bx - width - 6
  px = Math.min(Math.max(wa.x, px), Math.max(wa.x, wa.x + wa.width - width))
  let py = by - 30
  py = Math.min(Math.max(wa.y, py), Math.max(wa.y, wa.y + wa.height - height))
  panelWin.setBounds({ x: Math.round(px), y: Math.round(py), width, height })
}

function togglePanel() {
  if (Date.now() - lastPanelBlurHide < 350) return
  if (!panelWin) createPanel()
  if (panelWin.isVisible()) {
    panelWin.hide()
  } else {
    positionPanelNearBubble()
    panelShowTimestamp = Date.now()
    panelWin.show()
    panelWin.focus()
  }
}

/** Snap the bubble to the nearest vertical edge of its current display. */
function snapBubble() {
  if (!bubbleWin) return
  const [bx, by] = bubbleWin.getPosition()
  const disp = screen.getDisplayNearestPoint({
    x: bx + BUBBLE / 2,
    y: by + BUBBLE / 2,
  })
  const wa = disp.workArea
  const center = bx + BUBBLE / 2
  const toRight = center > wa.x + wa.width / 2
  const nx = toRight ? wa.x + wa.width - BUBBLE + 6 : wa.x - 6
  const ny = Math.min(Math.max(wa.y, by), wa.y + wa.height - BUBBLE)
  bubbleWin.setPosition(Math.round(nx), Math.round(ny))
}

function restoreBubbleIfOffscreen() {
  if (!bubbleWin) return
  const [x, y] = bubbleWin.getPosition()
  const visible = screen
    .getAllDisplays()
    .some(
      ({ workArea }) =>
        x + BUBBLE > workArea.x &&
        x < workArea.x + workArea.width &&
        y + BUBBLE > workArea.y &&
        y < workArea.y + workArea.height,
    )
  if (!visible) {
    const wa = screen.getPrimaryDisplay().workArea
    bubbleWin.setPosition(
      wa.x + wa.width - BUBBLE - 24,
      wa.y + Math.round(wa.height * 0.4),
    )
  }
}

function stopDrag() {
  if (dragTimer) clearInterval(dragTimer)
  dragTimer = null
  dragOffset = null
}

function buildTray() {
  const icon = nativeImage
    .createFromPath(APP_ICON_PATH)
    .resize({ width: 32, height: 32 })
  tray = new Tray(icon)
  tray.setToolTip("Bubble Chat — Messenger + Zalo")
  const menu = Menu.buildFromTemplate([
    {
      label: "Show / Hide Bubble Chat",
      click: () =>
        bubbleWin?.isVisible() ? bubbleWin.hide() : bubbleWin?.show(),
    },
    { type: "separator" },
    { label: "Messenger", click: () => openProvider("messenger") },
    { label: "Zalo", click: () => openProvider("zalo") },
    { type: "separator" },
    {
      label: "Start at Login",
      type: "checkbox",
      checked: app.getLoginItemSettings().openAtLogin,
      click: (i) => app.setLoginItemSettings({ openAtLogin: i.checked }),
    },
    {
      label: "Performance Mode",
      submenu: [
        { label: "Low Memory", click: () => setPerformanceMode("Low Memory") },
        { label: "Balanced", click: () => setPerformanceMode("Balanced") },
        {
          label: "Instant Switching",
          click: () => setPerformanceMode("Instant Switching"),
        },
      ],
    },
    { label: "Settings…", click: () => openProvider("settings") },
    { type: "separator" },
    { label: "Quit Bubble Chat", click: () => app.quit() },
  ])
  tray.setContextMenu(menu)
  tray.on("click", () => togglePanel())
}

function showBubbleContextMenu() {
  if (!bubbleWin) return
  Menu.buildFromTemplate([
    { label: "Open Messenger", click: () => openProvider("messenger") },
    { label: "Open Zalo", click: () => openProvider("zalo") },
    { type: "separator" },
    { label: "Hide bubble", click: () => bubbleWin?.hide() },
    { label: "Settings…", click: () => openProvider("settings") },
    { type: "separator" },
    { label: "Quit Bubble Chat", click: () => app.quit() },
  ]).popup({ window: bubbleWin })
}

function showWebContextMenu(target, params, popupWindow, includeNavigation) {
  if (!target || target.isDestroyed() || !popupWindow) return
  const items = []
  const openableUrl = (value) =>
    typeof value === "string" && /^https?:\/\//i.test(value)

  if (includeNavigation) {
    items.push(
      {
        label: "Back",
        enabled: target.canGoBack(),
        click: () => target.goBack(),
      },
      {
        label: "Forward",
        enabled: target.canGoForward(),
        click: () => target.goForward(),
      },
      { label: "Reload", click: () => target.reload() },
      { type: "separator" },
    )
  }

  if (openableUrl(params?.linkURL)) {
    items.push({
      label: "Open link in browser",
      click: () => shell.openExternal(params.linkURL),
    })
  }

  if (params?.mediaType === "image" && openableUrl(params.srcURL)) {
    items.push({
      label: "Download image",
      click: () => target.downloadURL(params.srcURL),
    })
  }

  if (params?.isEditable) {
    items.push(
      { label: "Undo", click: () => target.undo() },
      { label: "Redo", click: () => target.redo() },
      { type: "separator" },
      { label: "Cut", click: () => target.cut() },
      { label: "Copy", click: () => target.copy() },
      { label: "Paste", click: () => target.paste() },
      { label: "Select all", click: () => target.selectAll() },
    )
  } else if (params?.selectionText) {
    items.push({ label: "Copy", click: () => target.copy() })
  }

  if (items.length === 0) {
    items.push({ label: "Select all", click: () => target.selectAll() })
  }

  Menu.buildFromTemplate(items).popup({ window: popupWindow })
}

function openProvider(which) {
  if (!["messenger", "zalo", "custom", "settings"].includes(which)) return
  if (!panelWin) createPanel()
  if (which === "settings" && currentPanelView === "chat") {
    try {
      lastChatMemoryMB = readAppMemory().totalMB
    } catch {}
  }
  currentPanelView = which === "settings" ? "settings" : "chat"
  positionPanelNearBubble()
  panelShowTimestamp = Date.now()
  panelWin.show()
  panelWin.moveTop()
  panelWin.focus()
  panelWin.webContents.send("panel:navigate", which)
  if (which === "custom") {
    setTimeout(checkStorageWarning, 1200)
  }
}

function setPerformanceMode(mode) {
  writeState({ performanceMode: mode })
  panelWin?.webContents.send("settings:performance", mode)
}

function registerShortcuts() {
  globalShortcut.register("Alt+CommandOrControl+B", () => {
    bubbleWin?.isVisible() ? bubbleWin.hide() : bubbleWin?.show()
  })
  globalShortcut.register("Alt+CommandOrControl+M", () =>
    openProvider("messenger"),
  )
  globalShortcut.register("Alt+CommandOrControl+Z", () => openProvider("zalo"))
}

let isDragging = false

ipcMain.on("bubble:dragStart", () => {
  if (!bubbleWin) return
  stopDrag()
  isDragging = true
  panelWasVisibleBeforeDrag = Boolean(panelWin?.isVisible())
  if (panelWasVisibleBeforeDrag) {
    panelWin.hide()
  }
  const cursor = screen.getCursorScreenPoint()
  const [bx, by] = bubbleWin.getPosition()
  dragOffset = { x: cursor.x - bx, y: cursor.y - by }
  let lastBx = -1
  let lastBy = -1
  dragTimer = setInterval(() => {
    if (!bubbleWin || !dragOffset) return
    const c = screen.getCursorScreenPoint()
    const nx = Math.round(c.x - dragOffset.x)
    const ny = Math.round(c.y - dragOffset.y)
    if (nx === lastBx && ny === lastBy) return
    lastBx = nx
    lastBy = ny
    bubbleWin.setPosition(nx, ny)
  }, 16)
})
ipcMain.on("bubble:dragEnd", () => {
  stopDrag()
  if (!isDragging) return
  isDragging = false

  if (snapToEdge) {
    snapBubble()
  }
  if (bubbleWin) {
    const [x, y] = bubbleWin.getPosition()
    if (rememberPosition) writeState({ bubblePosition: { x, y } })
  }

  if (panelWasVisibleBeforeDrag) {
    if (!panelWin) createPanel()
    positionPanelNearBubble()
    panelShowTimestamp = Date.now()
    panelWin.show()
    panelWin.focus()
  }
  panelWasVisibleBeforeDrag = false
})
ipcMain.on("bubble:click", () => {
  stopDrag()
  isDragging = false
  togglePanel()
})
ipcMain.on("panel:collapse", () => panelWin?.hide())
ipcMain.on("panel:resetPosition", () => {
  if (panelWin && !panelWin.isDestroyed()) {
    positionPanelNearBubble()
  }
})
ipcMain.on("panel:resetSize", () => {
  customPanelSize = null
  writeState({ panelSize: null })
  if (panelWin && !panelWin.isDestroyed()) {
    panelWin.setSize(PANEL_CONFIG.defaultWidth, PANEL_CONFIG.defaultHeight)
    positionPanelNearBubble()
  }
})
ipcMain.handle("panel:getBounds", () => {
  if (!panelWin || panelWin.isDestroyed()) return null
  return panelWin.getBounds()
})
ipcMain.on("panel:setPosition", (_e, x, y) => {
  if (!panelWin || panelWin.isDestroyed()) return
  if (!Number.isFinite(x) || !Number.isFinite(y)) return
  panelWin.setPosition(Math.round(x), Math.round(y))
})
ipcMain.on("panel:setBounds", (_e, bounds) => {
  if (!panelWin || panelWin.isDestroyed() || !bounds) return
  const cur = panelWin.getBounds()
  const disp = screen.getDisplayNearestPoint({ x: cur.x, y: cur.y })
  const wa = disp.workArea
  const width = Math.max(
    PANEL_CONFIG.minWidth,
    Math.min(Math.round(bounds.width), wa.width),
  )
  const height = Math.max(
    PANEL_CONFIG.minHeight,
    Math.min(Math.round(bounds.height), wa.height),
  )
  const x = typeof bounds.x === "number" ? Math.round(bounds.x) : cur.x
  const y = typeof bounds.y === "number" ? Math.round(bounds.y) : cur.y
  panelWin.setBounds({ x, y, width, height })
})
ipcMain.on("open:external", (_e, url) => {
  if (
    typeof url === "string" &&
    (url.startsWith("https://") || url.startsWith("http://"))
  ) {
    shell.openExternal(url)
  }
})
ipcMain.on("bubble:show", () => bubbleWin?.show())
ipcMain.on("bubble:hide", () => bubbleWin?.hide())
ipcMain.on("bubble:contextMenu", showBubbleContextMenu)
ipcMain.on("provider:open", (_e, which) => openProvider(which))
ipcMain.on("app:quit", () => app.quit())
ipcMain.on("settings:login", (_e, enabled) => {
  const openAtLogin = Boolean(enabled)
  writeState({ startAtLogin: openAtLogin })
  app.setLoginItemSettings({ openAtLogin })
})
ipcMain.on("settings:alwaysOnTop", (_e, enabled) => {
  alwaysOnTop = Boolean(enabled)
  writeState({ alwaysOnTop })
  bubbleWin?.setAlwaysOnTop(alwaysOnTop, "screen-saver")
  panelWin?.setAlwaysOnTop(alwaysOnTop, "screen-saver")
})
ipcMain.on("settings:closeOnBlur", (_e, enabled) => {
  closeOnBlur = Boolean(enabled)
  writeState({ closeOnBlur })
})
ipcMain.on("settings:showBubbleOnStartup", (_e, enabled) => {
  showBubbleOnStartup = Boolean(enabled)
  writeState({ showBubbleOnStartup })
  if (showBubbleOnStartup) bubbleWin?.show()
  else bubbleWin?.hide()
})
ipcMain.on("settings:rememberPosition", (_e, enabled) => {
  rememberPosition = Boolean(enabled)
  writeState({ rememberPosition })
})
ipcMain.on("settings:snapToEdge", (_e, enabled) => {
  snapToEdge = Boolean(enabled)
  writeState({ snapToEdge })
})
ipcMain.on("settings:performance", (_e, mode) => setPerformanceMode(mode))
ipcMain.on("settings:appearance", (_e, data) => {
  const patch = {}
  if (data?.theme) {
    patch.theme = data.theme
    nativeTheme.themeSource = data.theme.toLowerCase()
  }
  if (data?.bubbleSize) patch.bubbleSize = data.bubbleSize
  if (Number.isFinite(data?.bubbleOpacity)) {
    patch.bubbleOpacity = Math.max(20, Math.min(100, data.bubbleOpacity))
  }
  if (BUBBLE_ICONS.has(data?.bubbleIcon)) patch.bubbleIcon = data.bubbleIcon
  if (Object.keys(patch).length === 0) return
  writeState(patch)
  bubbleWin?.webContents.send("settings:appearance", patch)
  panelWin?.webContents.send("settings:appearance", patch)
})
ipcMain.handle("settings:get", () => {
  const state = readState()
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
    bubbleOpacity: Number.isFinite(state.bubbleOpacity)
      ? Math.max(20, Math.min(100, state.bubbleOpacity))
      : 100,
    bubbleIcon: BUBBLE_ICONS.has(state.bubbleIcon)
      ? state.bubbleIcon
      : "default",
    panelSize: state.panelSize || null,
    bubblePosition:
      bubbleWin && !bubbleWin.isDestroyed()
        ? { x: bubbleWin.getPosition()[0], y: bubbleWin.getPosition()[1] }
        : state.bubblePosition || null,
    customStorageThresholdMB,
  }
})

function invalidateStorageSize(provider) {
  if (!provider) {
    invalidateDirectorySize()
    return
  }
  invalidateDirectorySize(
    path.join(app.getPath("userData"), "Partitions", provider),
  )
}

async function getStorageFootprint() {
  const partitionsDir = path.join(app.getPath("userData"), "Partitions")
  const [messengerBytes, zaloBytes, customBytes] = await Promise.all([
    getDirectorySize(path.join(partitionsDir, "messenger")),
    getDirectorySize(path.join(partitionsDir, "zalo")),
    getDirectorySize(path.join(partitionsDir, "custom")),
  ])
  const toMB = (bytes) => Math.round((bytes / (1024 * 1024)) * 10) / 10
  return {
    messengerMB: toMB(messengerBytes),
    zaloMB: toMB(zaloBytes),
    customMB: toMB(customBytes),
    totalMB: toMB(messengerBytes + zaloBytes + customBytes),
    warnThresholdMB: customStorageThresholdMB,
  }
}

let lastStorageWarningSent = 0
async function checkStorageWarning() {
  if (customStorageThresholdMB <= 0) return null
  const customBytes = await getDirectorySize(
    path.join(app.getPath("userData"), "Partitions", "custom"),
  )
  const customMB = Math.round((customBytes / (1024 * 1024)) * 10) / 10
  if (customMB >= customStorageThresholdMB) {
    const info = {
      provider: "custom",
      sizeMB: customMB,
      thresholdMB: customStorageThresholdMB,
    }
    if (Date.now() - lastStorageWarningSent > 30000) {
      lastStorageWarningSent = Date.now()
      panelWin?.webContents.send("storage:warning", info)
    }
    return info
  }
  return null
}

ipcMain.handle("storage:getUsage", async () => {
  return await getStorageFootprint()
})

ipcMain.handle("storage:clearCustomCache", async () => {
  try {
    await session.fromPartition("persist:custom").clearCache()
  } catch {}
  invalidateStorageSize("custom")
  return await getStorageFootprint()
})

ipcMain.on("settings:setStorageThreshold", (_e, thresholdMB) => {
  customStorageThresholdMB = Number(thresholdMB) || 0
  writeState({ customStorageThresholdMB })
  checkStorageWarning()
})
ipcMain.on("notifications:unread", (_e, provider, count) => {
  if (!Object.hasOwn(unreadCounts, provider)) return
  const next = Number.isFinite(Number(count))
    ? Math.max(0, Math.min(999, Math.floor(Number(count))))
    : 0
  if (unreadCounts[provider] === next) return
  unreadCounts[provider] = next
  panelWin?.webContents.send("notifications:unread", unreadCounts)
  bubbleWin?.webContents.send("notifications:unread", unreadCounts)
})
ipcMain.on("session:clear", async (_e, provider) => {
  if (!["messenger", "zalo", "custom", "cache"].includes(provider)) return
  if (provider === "cache") {
    await Promise.all([
      session.fromPartition("persist:messenger").clearCache(),
      session.fromPartition("persist:zalo").clearCache(),
      session.fromPartition("persist:custom").clearCache(),
    ]).catch(() => {})
    invalidateStorageSize()
  } else {
    await session
      .fromPartition(`persist:${provider}`)
      .clearStorageData()
      .catch(() => {})
    invalidateStorageSize(provider)
    panelWin?.webContents.send("provider:reload", provider)
  }
})
ipcMain.on("session:openStorage", () => shell.openPath(app.getPath("userData")))
ipcMain.on("developer:copyPhone", () => clipboard.writeText("0866007219"))
function readAppMemory() {
  return summarizeMemoryMetrics(app.getAppMetrics())
}

ipcMain.handle("system:getMemory", async () => {
  try {
    return {
      ...readAppMemory(),
      ...(Number.isFinite(lastChatMemoryMB)
        ? { chatMB: lastChatMemoryMB }
        : {}),
    }
  } catch {
    const mem = process.memoryUsage()
    return {
      totalMB: Math.round(mem.rss / (1024 * 1024)),
    }
  }
})
ipcMain.handle("totp:getStatus", () => {
  if (!ENABLE_TOTP) return { enabled: false, isLocked: false }
  const now = Date.now()
  const lockoutRemainingSeconds =
    lockoutUntil > now ? Math.ceil((lockoutUntil - now) / 1000) : 0
  return {
    enabled: true,
    isLocked,
    remainingSeconds: remainingUsageSeconds,
    lockoutRemainingSeconds,
    failedAttempts: failedOtpAttempts,
  }
})
ipcMain.handle("totp:verify", (_e, code) => {
  if (!ENABLE_TOTP) return { success: false, error: "disabled" }
  const now = Date.now()
  // Block attempts while locked out
  if (lockoutUntil > now) {
    const lockoutRemainingSeconds = Math.ceil((lockoutUntil - now) / 1000)
    return {
      success: false,
      error: "locked_out",
      lockoutRemainingSeconds,
      failedAttempts: failedOtpAttempts,
    }
  }

  const secret = APP_TOTP_SECRET
  const isValid = verifyTOTP(code, secret, 60, 1)
  if (isValid) {
    isLocked = false
    failedOtpAttempts = 0
    lockoutUntil = 0
    remainingUsageSeconds = DEFAULT_USAGE_LIMIT_SECONDS
    sessionCycleId = crypto.randomBytes(8).toString("hex")
    lastActiveTimestamp = Date.now()
    writeState({
      remainingUsageSeconds: DEFAULT_USAGE_LIMIT_SECONDS,
      isLocked: false,
      failedOtpAttempts: 0,
      lockoutUntil: 0,
      sessionCycleId,
      lastActiveTimestamp,
    })
    panelWin?.webContents.send("lock:status", {
      isLocked: false,
      remainingSeconds: remainingUsageSeconds,
      lockoutRemainingSeconds: 0,
      failedAttempts: 0,
    })
    return { success: true }
  }

  // Failed attempt
  failedOtpAttempts += 1
  let lockoutRemainingSeconds = 0
  if (failedOtpAttempts >= MAX_FAILED_ATTEMPTS) {
    lockoutUntil = now + LOCKOUT_DURATION_MS
    failedOtpAttempts = 0
    lockoutRemainingSeconds = Math.ceil(LOCKOUT_DURATION_MS / 1000)
  }

  writeState({
    failedOtpAttempts,
    lockoutUntil,
  })

  panelWin?.webContents.send("lock:status", {
    isLocked: true,
    remainingSeconds: remainingUsageSeconds,
    lockoutRemainingSeconds,
    failedAttempts: failedOtpAttempts,
  })

  return {
    success: false,
    error: lockoutRemainingSeconds > 0 ? "locked_out" : "invalid_code",
    lockoutRemainingSeconds,
    failedAttempts: failedOtpAttempts,
  }
})
ipcMain.handle("app:getVersion", () => app.getVersion())
ipcMain.handle("update:getInfo", () => updateInfo)
ipcMain.handle("update:check", () => checkAppUpdate())
ipcMain.handle("update:install", () => installAppUpdate())
ipcMain.handle("update:openDownload", async () => {
  const url = updateInfo.downloadUrl || updateInfo.releaseUrl
  if (!isTrustedReleaseUrl(url))
    throw new Error("No trusted update download is available")
  await shell.openExternal(url)
})

app.whenReady().then(() => {
  if (!hasSingleInstanceLock) return
  const AD_BLOCK_URLS = [
    "*://*.doubleclick.net/*",
    "*://*.googleads.g.doubleclick.net/*",
    "*://*.googlesyndication.com/*",
    "*://*.youtube.com/pagead/*",
    "*://*.youtube.com/api/stats/ads*",
    "*://*.youtube.com/get_midroll_info*",
    "*://*.google-analytics.com/*",
    "*://spclient.wg.spotify.com/ads/*",
    "*://spclient.wg.spotify.com/ad-logic/*",
  ]
  ;["persist:messenger", "persist:zalo", "persist:custom"].forEach(
    (partition) => {
      const ses = session.fromPartition(partition)
      const ALLOWED_PERMISSIONS = new Set([
        "notifications",
        "media",
        "storage-access",
        "persistent-storage",
        "clipboard-read",
        "clipboard-sanitized-write",
        "fullscreen",
        "downloads",
      ])
      ses.setPermissionRequestHandler((_webContents, permission, callback) => {
        callback(ALLOWED_PERMISSIONS.has(permission))
      })
      ses.setPermissionCheckHandler((_webContents, permission) => {
        return ALLOWED_PERMISSIONS.has(permission)
      })

      // Allow saving files and downloads from web tabs
      ses.on("will-download", (_event, item) => {
        const fileName = item.getFilename()
        const savePath = path.join(app.getPath("downloads"), fileName)
        item.setSavePath(savePath)

        item.once("done", (_e, state) => {
          if (state === "completed") {
            panelWin?.webContents.send("storage:downloadComplete", {
              fileName,
              savePath,
            })
          }
        })
      })

      try {
        ses.webRequest.onBeforeRequest(
          { urls: AD_BLOCK_URLS },
          (_details, callback) => {
            callback({ cancel: true })
          },
        )
      } catch {}
    },
  )

  setInterval(checkStorageWarning, STORAGE_SIZE_CACHE_TTL)

  createBubble()
  createPanel()
  buildTray()
  if (app.dock) {
    try {
      app.dock.setIcon(APP_ICON_PATH)
    } catch {}
  }
  registerShortcuts()
  setTimeout(() => void checkAppUpdate(), 5000)
  screen.on("display-removed", restoreBubbleIfOffscreen)
  screen.on("display-metrics-changed", () => {
    restoreBubbleIfOffscreen()
    if (panelWin?.isVisible()) positionPanelNearBubble()
  })
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createBubble()
  })
})

app.on("second-instance", () => {
  bubbleWin?.show()
  bubbleWin?.focus()
})

// Keep running in tray when all windows are closed.
app.on("window-all-closed", () => {})
app.on("will-quit", () => globalShortcut.unregisterAll())
