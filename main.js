const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { schedulePrayerNotifications } = require('./services/scheduler');
const { getConfig, setConfig } = require('./services/config');
const { getPrayerTimes } = require('./services/prayerTimes');
const { syncTime, startAggressiveSync, getOffsetMs } = require('./services/timeSync');
const { autoUpdater } = require('electron-updater');

const APP_ID = 'com.halovie.adzanapp';

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('quiet');
app.commandLine.appendSwitch('disable-logging');


autoUpdater.on('update-downloaded', () => {
  if (mainWindow) {
    mainWindow.webContents.send('update_ready');
  }
});

ipcMain.on('restart_app', () => {
  autoUpdater.quitAndInstall();
});

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

function sendToRenderer(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function playPrayerAudio(prayerType) {
  sendToRenderer('trigger-adzan', prayerType);
}

function notifyPrayerTimesUpdated(timings) {
  sendToRenderer('prayer-times-updated', timings);
}

function shouldClearScheduleOnEmpty(newConfig) {
  return ['city', 'latitude', 'longitude', 'method'].some((key) => (
    Object.prototype.hasOwnProperty.call(newConfig, key)
  ));
}

async function refreshPrayerSchedule(options = {}) {
  return await schedulePrayerNotifications(playPrayerAudio, notifyPrayerTimesUpdated, options);
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

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('app_version', app.getVersion());
  });

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

ipcMain.handle('save-safe-audio', (event, sourcePath, prefix) => {
  try {
    if (!sourcePath || !fs.existsSync(sourcePath)) {
      throw new Error('FILE_NOT_FOUND');
    }

    const safeAudioDir = path.join(app.getPath('userData'), 'custom_audio');
    fs.mkdirSync(safeAudioDir, { recursive: true });

    const extension = path.extname(sourcePath);
    const destinationPath = path.join(safeAudioDir, `adzan_${prefix}${extension}`);
    fs.copyFileSync(sourcePath, destinationPath);

    return destinationPath;
  } catch (error) {
    console.error('Gagal menyimpan audio ke direktori aman:', error);
    throw error;
  }
});

ipcMain.handle('get-time-offset', () => {
  return getOffsetMs();
});

ipcMain.handle('set-config', async (event, newConfig) => {
  setConfig(newConfig);
  await refreshPrayerSchedule({ clearOnEmpty: shouldClearScheduleOnEmpty(newConfig) });

  return true;
});

ipcMain.handle('get-prayer-times', async () => {
  return await getPrayerTimes();
});

ipcMain.handle('refresh-prayer-times', async () => {
  console.log('[System] Internet connection detected, syncing time...');
  await syncTime(); // Re-sync time when network recovers
  return await refreshPrayerSchedule();
});

if (gotTheLock) {
  app.on('second-instance', () => {
    showMainWindow();
  });

  app.whenReady().then(async () => {
    enableAutoLaunch();
    createWindow(shouldStartHidden()); // <-- Cukup satu createWindow di sini
    try { createTray(); } catch (error) { }

    startAggressiveSync(async () => {
      console.log('[System] Time synced successfully. Forcing UI to refresh...');
      if (mainWindow) {
        mainWindow.webContents.send('force-refresh-ui');
      }
    });
    
    await refreshPrayerSchedule();

    autoUpdater.autoDownload = true;
    autoUpdater.checkForUpdatesAndNotify();
  });

  app.on('activate', () => {
    if (!mainWindow) {
      createWindow(false);
    } else {
      showMainWindow();
    }
  });
}
