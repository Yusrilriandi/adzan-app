const { app, BrowserWindow, Notification, Tray, Menu, ipcMain } = require('electron');
const path = require('path');
const { schedulePrayerNotifications } = require('./services/scheduler');
const { getConfig, setConfig } = require('./services/config');
const { getPrayerTimes } = require('./services/prayerTimes');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('quiet');
app.commandLine.appendSwitch('disable-logging');

let tray = null;
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 450,
    height: 780, // Sedikit ditinggikan untuk ruang jam & hijriah
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false // FIX: Mencegah sistem mematikan alarm/audio saat aplikasi ditutup/minimize
    },
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  mainWindow.loadFile('renderer/index.html');

  mainWindow.on('close', function (event) {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png'); 
  tray = new Tray(iconPath);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Buka Adzan App', click: () => { mainWindow.show(); } },
    { type: 'separator' },
    { label: 'Keluar', click: () => { app.isQuiting = true; app.quit(); } }
  ]);
  tray.setToolTip('Adzan App - Jadwal Salat & Pengingat');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => { mainWindow.show(); });
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

app.whenReady().then(async () => {
  createWindow();
  try { createTray(); } catch (error) {}

  await schedulePrayerNotifications((prayerType) => {
    if (mainWindow) {
      mainWindow.webContents.send('trigger-adzan', prayerType);
    }
  });
});