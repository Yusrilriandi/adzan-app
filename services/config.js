const Store = require('electron-store').default;
const fs = require('fs');
const path = require('path');

const configDir = path.join(__dirname, '..', 'data', 'config');
fs.mkdirSync(configDir, { recursive: true });

const store = new Store({
  projectName: 'adzan-app',
  cwd: configDir,
  defaults: {
    language: 'id', // Default bahasa Indonesia
    city: 'jakarta',
    latitude: -6.2088,
    longitude: 106.8456,
    method: 20,
    adzanMode: 'all', 
    adzanAll: path.join(__dirname, '..', 'assets', 'adzan.mp3'),
    adzanCustom: {
      Fajr: '',
      Dhuhr: '',
      Asr: '',
      Maghrib: '',
      Isha: ''
    },
    customCities: {} 
  }
});

function getConfig() {
  return store.store;
}

function setConfig(newConfig) {
  store.set({ ...store.store, ...newConfig });
}

module.exports = { getConfig, setConfig };