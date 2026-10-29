// Arah Assist Notch: jendela transparan tanpa bingkai yang menempel di tepi layar (atas tengah, kiri tengah,
// atau kanan tengah), selalu di atas aplikasi lain. Isinya adalah halaman /notch dari server Arah Assist.
const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  globalShortcut,
  ipcMain,
  nativeImage,
  net,
  screen,
  shell,
} = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const BASE_URL = (process.env.ARAH_URL || "http://localhost:3000").replace(/\/$/, "");
const ORIGIN = new URL(BASE_URL).origin;

// Jendela dibuat sedikit lebih besar dari kapsul agar bayangannya tidak terpotong.
// peek: kapsul kecil saat tidak disentuh (area ini juga yang mendeteksi kursor), idle: bentuk normal, expanded: panel terbuka.
// Di tepi kiri/kanan kapsul kecil dan bentuk normal berdiri vertikal, panelnya tetap sama.
const SIZE = {
  top: {
    peek: { width: 240, height: 46 },
    idle: { width: 430, height: 72 },
    expanded: { width: 760, height: 470 },
  },
  side: {
    peek: { width: 50, height: 210 },
    idle: { width: 130, height: 300 },
    expanded: { width: 760, height: 480 },
  },
};
const DOCKS = ["top", "left", "right"];
const DRAG_FPS_MS = 16;
const RANK = { peek: 0, idle: 1, expanded: 2 };
// Saat menutup, tunggu animasi kapsul mengecil selesai sebelum jendela ikut mengecil
const COLLAPSE_DELAY_MS = 480;
const RETRY_MS = 3000;

let notchWin = null;
let loginWin = null;
let tray = null;
let collapseTimer = null;
let level = "peek";
let offlineTimer = null;
let shortcutLabel = null;
let drag = null;

// Pengaturan Notch (posisi) disimpan di folder data aplikasi
const settingsFile = () => path.join(app.getPath("userData"), "notch-settings.json");
let settings = { dock: "top", displayId: null };

function loadSettings() {
  try {
    settings = { ...settings, ...JSON.parse(fs.readFileSync(settingsFile(), "utf8")) };
  } catch {
    // belum pernah disimpan: pakai bawaan
  }
  if (!DOCKS.includes(settings.dock)) settings.dock = "top";
}

function saveSettings() {
  try {
    fs.writeFileSync(settingsFile(), JSON.stringify(settings));
  } catch (err) {
    console.warn("[notch] gagal menyimpan pengaturan:", err.message);
  }
}

function targetDisplay() {
  return screen.getAllDisplays().find((d) => d.id === settings.displayId) ?? screen.getPrimaryDisplay();
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

function placeNotch() {
  if (!notchWin || drag) return;
  const dock = settings.dock;
  const size = SIZE[dock === "top" ? "top" : "side"][level];
  const { bounds } = targetDisplay();
  const x =
    dock === "top"
      ? bounds.x + (bounds.width - size.width) / 2
      : dock === "left"
        ? bounds.x
        : bounds.x + bounds.width - size.width;
  const y = dock === "top" ? bounds.y : bounds.y + (bounds.height - size.height) / 2;
  notchWin.setBounds({ x: Math.round(x), y: Math.round(y), width: size.width, height: size.height });
}

function setDock(dock, displayId = settings.displayId) {
  settings = { ...settings, dock, displayId };
  saveSettings();
  placeNotch();
  notchWin?.webContents.send("notch:dock", dock);
}

function isAppUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.origin === ORIGIN;
  } catch {
    return false;
  }
}

// Tautan ke luar server Arah Assist tidak dibuka di dalam aplikasi
function guardNavigation(win) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (!isAppUrl(url)) {
      event.preventDefault();
      if (/^https?:\/\//.test(url)) shell.openExternal(url);
    }
  });
}

function createNotch() {
  notchWin = new BrowserWindow({
    ...SIZE.top.peek,
    title: "Arah Assist Notch",
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      sandbox: true,
      // Bunyi pengingat harus bisa diputar tanpa menunggu klik
      autoplayPolicy: "no-user-gesture-required",
    },
  });
  notchWin.setAlwaysOnTop(true, "screen-saver");
  notchWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  placeNotch();
  guardNavigation(notchWin);

  notchWin.once("ready-to-show", () => notchWin.showInactive());
  // Server belum berjalan (mis. npm run dev belum dinyalakan): tampilkan kapsul "server belum berjalan"
  // supaya Notch tetap terlihat, lalu sambungkan otomatis begitu server hidup
  notchWin.webContents.on("did-fail-load", (_event, code, _desc, url, isMainFrame) => {
    if (!isMainFrame || code === -3 || url.startsWith("file:")) return;
    console.warn(`[notch] gagal memuat ${url} (${code}), menunggu server...`);
    showOffline();
  });
  notchWin.on("closed", () => {
    notchWin = null;
  });

  notchWin.loadURL(`${BASE_URL}/notch`);
}

function showOffline() {
  if (!notchWin || offlineTimer) return;
  clearTimeout(collapseTimer);
  level = "idle";
  placeNotch();
  notchWin.loadFile(path.join(__dirname, "offline.html"), { query: { server: BASE_URL } });
  offlineTimer = setInterval(async () => {
    try {
      const res = await net.fetch(`${BASE_URL}/notch`, { method: "HEAD" });
      if (!res.ok) return;
    } catch {
      return;
    }
    clearInterval(offlineTimer);
    offlineTimer = null;
    notchWin?.loadURL(`${BASE_URL}/notch`);
  }, RETRY_MS);
}

function openLogin() {
  if (loginWin) {
    loginWin.focus();
    return;
  }
  loginWin = new BrowserWindow({
    width: 460,
    height: 720,
    title: "Masuk ke Arah Assist",
    icon: path.join(__dirname, "assets", "icon.png"),
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  guardNavigation(loginWin);

  // Setelah login berhasil halaman pindah ke /notch/terhubung: muat ulang Notch dengan sesi baru
  const onNavigate = (_event, url) => {
    if (isAppUrl(url) && new URL(url).pathname === "/notch/terhubung") {
      notchWin?.reload();
      setTimeout(() => loginWin?.close(), 1200);
    }
  };
  loginWin.webContents.on("did-navigate", onNavigate);
  loginWin.webContents.on("did-navigate-in-page", onNavigate);
  loginWin.on("closed", () => {
    loginWin = null;
  });
  loginWin.loadURL(`${BASE_URL}/masuk?next=${encodeURIComponent("/notch/terhubung")}`);
}

function sendCommand(command) {
  if (!notchWin) return;
  if (command === "plan") {
    notchWin.show();
    notchWin.focus();
  }
  notchWin.webContents.send("notch:command", command);
}

function registerShortcut() {
  for (const accelerator of ["Alt+Space", "CommandOrControl+Alt+Space"]) {
    try {
      if (globalShortcut.register(accelerator, () => sendCommand("plan"))) {
        shortcutLabel = accelerator.replace("CommandOrControl", "Ctrl");
        return;
      }
    } catch {
      // coba pintasan berikutnya
    }
  }
}

// Ikon tray: maskot Arah Assist (dirender dari src/app/icon.svg)
function trayIcon() {
  return nativeImage.createFromPath(path.join(__dirname, "assets", "tray.png")).resize({ width: 32, height: 32, quality: "best" });
}

function createTray() {
  tray = new Tray(trayIcon());
  tray.setToolTip("Arah Assist Notch");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: shortcutLabel ? `Ketik rencana (${shortcutLabel})` : "Ketik rencana",
        click: () => sendCommand("plan"),
      },
      { label: "Buka Workspace di browser", click: () => sendCommand("open-workspace") },
      { label: "Muat ulang Notch", click: () => notchWin?.reload() },
      { type: "separator" },
      { label: "Keluar", click: () => app.quit() },
    ]),
  );
  tray.on("click", () => sendCommand("plan"));
}

// Membesar langsung (sebelum animasi kapsul), mengecil setelah animasi kapsul selesai
ipcMain.on("notch:set-level", (event, next) => {
  if (!notchWin || event.sender !== notchWin.webContents || !(next in SIZE.top)) return;
  clearTimeout(collapseTimer);
  if (RANK[next] >= RANK[level]) {
    level = next;
    placeNotch();
  } else {
    collapseTimer = setTimeout(() => {
      level = next;
      placeNotch();
    }, COLLAPSE_DELAY_MS);
  }
});

// Hanya tautan ke server Arah Assist (mis. tautan masuk Workspace) yang boleh dibuka dari Notch
ipcMain.on("notch:open-external", (event, url) => {
  if (!notchWin || event.sender !== notchWin.webContents) return;
  if (isAppUrl(url)) shell.openExternal(url);
});

ipcMain.on("notch:open-login", (event) => {
  if (!notchWin || event.sender !== notchWin.webContents) return;
  openLogin();
});

ipcMain.handle("notch:get-settings", () => ({ dock: settings.dock }));

ipcMain.on("notch:set-dock", (event, dock) => {
  if (!notchWin || event.sender !== notchWin.webContents || !DOCKS.includes(dock)) return;
  setDock(dock);
});

// Menyeret: jendela mengikuti kursor, lalu saat dilepas menempel ke tepi terdekat (atas, kiri, atau kanan)
ipcMain.on("notch:drag-start", (event) => {
  if (!notchWin || event.sender !== notchWin.webContents || drag) return;
  clearTimeout(collapseTimer);
  const cursor = screen.getCursorScreenPoint();
  const bounds = notchWin.getBounds();
  drag = { dx: cursor.x - bounds.x, dy: cursor.y - bounds.y };
  drag.timer = setInterval(() => {
    const c = screen.getCursorScreenPoint();
    notchWin?.setPosition(Math.round(c.x - drag.dx), Math.round(c.y - drag.dy));
  }, DRAG_FPS_MS);
});

ipcMain.on("notch:drag-end", (event) => {
  if (!notchWin || event.sender !== notchWin.webContents || !drag) return;
  clearInterval(drag.timer);
  drag = null;
  const c = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(c);
  const b = display.bounds;
  const distance = { top: c.y - b.y, left: c.x - b.x, right: b.x + b.width - c.x };
  const dock = DOCKS.reduce((best, d) => (distance[d] < distance[best] ? d : best), "top");
  setDock(dock, display.id);
});

app.on("second-instance", () => sendCommand("plan"));

app.whenReady().then(() => {
  app.setAppUserModelId("Arah Assist");
  loadSettings();
  createNotch();
  registerShortcut();
  createTray();
  for (const event of ["display-added", "display-removed", "display-metrics-changed"]) {
    screen.on(event, placeNotch);
  }
});

// Notch tetap hidup walau jendela login ditutup; keluar lewat menu tray
app.on("window-all-closed", () => {});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
