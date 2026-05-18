const { app, BrowserWindow, Notification } = require('electron');
const path = require('path');
const { schedulePrayerNotifications } = require('./services/scheduler');

function createWindow() {
  const win = new BrowserWindow({
    width: 400,
    height: 600,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile('renderer/index.html');
}

app.whenReady().then(async () => {
  createWindow();
  await schedulePrayerNotifications();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});