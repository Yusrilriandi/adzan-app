const Store = require('electron-store');

const store = new Store({
  name: 'user-preferences', // Biarkan Electron mengatur tempat amannya sendiri
  defaults: {
    language: 'id',
    city: 'jakarta',
    latitude: -6.2088,
    longitude: 106.8456,
    method: 20,
    adzanMode: 'all', 
    adzanAll: '',
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
  // Simpan data kustom baru dengan aman
  store.set({ ...store.store, ...newConfig });
}

module.exports = { getConfig, setConfig };