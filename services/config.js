const ElectronStore = require('electron-store');
const Store = ElectronStore.default || ElectronStore;

const store = new Store({
  projectName: 'adzan-app',
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

function removeUndefined(value) {
  if (Array.isArray(value)) {
    return value.map(removeUndefined).filter((item) => item !== undefined);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, removeUndefined(item)])
    );
  }

  return value;
}

function setConfig(newConfig) {
  // Simpan data kustom baru dengan aman
  store.set(removeUndefined({ ...store.store, ...newConfig }));
}

module.exports = { getConfig, setConfig };
