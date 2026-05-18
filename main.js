const { app, BrowserWindow, Notification, Tray, Menu } = require('electron');
const path = require('path');
const { schedulePrayerNotifications } = require('./services/scheduler');

// === SOLUSI ERROR AUTOPLAY AUDIO ===
// Mematikan aturan wajib klik sebelum memutar audio
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// Sembunyikan pesan log/warning internal Chromium di terminal
app.commandLine.appendSwitch('quiet');
app.commandLine.appendSwitch('disable-logging');

let tray = null;
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 450,
    height: 700,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
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

app.whenReady().then(async () => {
  createWindow();
  try { createTray(); } catch (error) {}

  // Panggil scheduler dan kirim pesan IPC ke Renderer jika jadwal tiba
  await schedulePrayerNotifications((prayerType) => {
    if (mainWindow) {
      mainWindow.webContents.send('trigger-adzan', prayerType);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {}
});