const Store = require('electron-store').default;
const fs = require('fs');
const path = require('path');

const configDir = path.join(__dirname, '..', 'data', 'config');
fs.mkdirSync(configDir, { recursive: true });

const store = new Store({
  projectName: 'adzan-app',
  cwd: configDir,
  defaults: {
    city: 'Sambas',
    latitude: 1.3616,
    longitude: 109.3089,
    method: 20,

    adzanMode: 'all',

    adzanAll: 'assets/adzan.mp3',

    adzanCustom: {
      Fajr: 'assets/fajr.mp3',
      Dhuhr: 'assets/dhuhr.mp3',
      Asr: 'assets/asr.mp3',
      Maghrib: 'assets/maghrib.mp3',
      Isha: 'assets/isha.mp3'
    }
  }
});

function getConfig() {
  return store.store;
}

function setConfig(newConfig) {
  store.set(newConfig);
}

module.exports = { getConfig, setConfig };
