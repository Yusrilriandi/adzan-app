const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');
const { schedulePrayerNotifications } = require('./services/scheduler');
const { getConfig, setConfig } = require('./services/config');
const { getPrayerTimes } = require('./services/prayerTimes');

const APP_ID = 'com.halovie.adzanapp';

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('quiet');
app.commandLine.appendSwitch('disable-logging');

if (process.platform === 'win32') {
  app.setAppUserModelId(APP_ID);
}

let tray = null;
let mainWindow = null;

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
}

function getAppIcon() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');

  if (fs.existsSync(iconPath)) {
    return nativeImage.createFromPath(iconPath);
  }

  return nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII='
  );
}

function shouldStartHidden() {
  const loginSettings = app.getLoginItemSettings();
  return process.argv.includes('--hidden') || loginSettings.wasOpenedAtLogin;
}

function enableAutoLaunch() {
  if (!app.isPackaged) return;

  app.setLoginItemSettings({
    openAtLogin: true,
    openAsHidden: true,
    args: ['--hidden']
  });
}

function showMainWindow() {
  if (!mainWindow) return;
  mainWindow.show();
  mainWindow.focus();
}

function createWindow(startHidden = false) {
  mainWindow = new BrowserWindow({
    width: 450,
    height: 780, // Sedikit ditinggikan untuk ruang jam & hijriah
    show: !startHidden,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false // FIX: Mencegah sistem mematikan alarm/audio saat aplikasi ditutup/minimize
    },
    icon: path.join(__dirname, 'assets', 'icon.ico')
  });

  mainWindow.loadFile('renderer/index.html');

  if (startHidden) {
    mainWindow.once('ready-to-show', () => {
      mainWindow.hide();
    });
  }

  mainWindow.on('close', function (event) {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon.ico');
  tray = new Tray(iconPath);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Buka Adzan App', click: showMainWindow },
    { type: 'separator' },
    { label: 'Keluar', click: () => { app.isQuiting = true; app.quit(); } }
  ]);
  tray.setToolTip('Adzan App - Jadwal Salat & Pengingat');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', showMainWindow);
}

ipcMain.handle('get-config', () => {
  return getConfig();
});

ipcMain.handle('set-config', (event, newConfig) => {
  setConfig(newConfig);
  return true;
});

ipcMain.handle('get-prayer-times', async () => {
  return await getPrayerTimes();
});

if (gotTheLock) {
  app.on('second-instance', () => {
    showMainWindow();
  });

  app.whenReady().then(async () => {
    enableAutoLaunch();
    createWindow(shouldStartHidden());
    try { createTray(); } catch (error) {}

    await schedulePrayerNotifications((prayerType) => {
      if (mainWindow) {
        mainWindow.webContents.send('trigger-adzan', prayerType);
      }
    });
  });

  app.on('activate', () => {
    if (!mainWindow) {
      createWindow(false);
    } else {
      showMainWindow();
    }
  });
}
