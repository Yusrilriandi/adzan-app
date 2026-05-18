const { ipcRenderer } = require('electron');
const path = require('path');
const { getConfig, setConfig } = require('../services/config');
const { getPrayerTimes } = require('../services/prayerTimes');

// 1. KAMUS TERJEMAHAN
const translations = {
  id: {
    locSettings: 'Pengaturan Lokasi', chooseRegion: 'Pilih Daerah', customRegionName: 'Nama Daerah Kustom',
    customRegionPlaceholder: 'Masukkan nama daerah baru...', saveLocBtn: 'Simpan Lokasi',
    audioSettings: 'Audio Adzan', audioMode: 'Mode Audio', modeAll: 'Sama untuk semua waktu (Default)',
    modeCustom: 'Berbeda tiap waktu', customAudioLabel: 'Pilih file .mp3 untuk masing-masing waktu:',
    saveAudioBtn: 'Simpan Audio', testBtn: 'Test Utama', scheduleTitle: 'Jadwal Salat Hari Ini',
    fajr: 'Subuh', dhuhr: 'Dzuhur', asr: 'Ashar', maghrib: 'Maghrib', isha: 'Isya',
    customOption: 'Gunakan Koordinat Kustom',
    alertLocSave: 'Lokasi berhasil disimpan! Jadwal diperbarui.', alertCustomEmpty: 'Harap masukkan nama daerah kustom!',
    alertCoordInvalid: 'Harap masukkan angka koordinat Latitude & Longitude yang valid!',
    alertAudioSave: 'Pengaturan Audio Disimpan!', alertTest: 'Memutar Adzan... Pastikan volume PC menyala.'
  },
  en: {
    locSettings: 'Location Settings', chooseRegion: 'Select Region', customRegionName: 'Custom Region Name',
    customRegionPlaceholder: 'Enter new region name...', saveLocBtn: 'Save Location',
    audioSettings: 'Adzan Audio', audioMode: 'Audio Mode', modeAll: 'Same for all times (Default)',
    modeCustom: 'Different for each time', customAudioLabel: 'Select .mp3 file for each time:',
    saveAudioBtn: 'Save Audio', testBtn: 'Main Test', scheduleTitle: 'Today\'s Prayer Schedule',
    fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha',
    customOption: 'Use Custom Coordinates',
    alertLocSave: 'Location saved! Schedule updated.', alertCustomEmpty: 'Please enter a custom region name!',
    alertCoordInvalid: 'Please enter valid Latitude & Longitude coordinates!',
    alertAudioSave: 'Audio Settings Saved!', alertTest: 'Playing Adzan... Make sure PC volume is up.'
  }
};

let currentLang = 'id';

function applyLanguage() {
  const texts = translations[currentLang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (texts[key]) {
      if (el.tagName === 'INPUT') el.placeholder = texts[key];
      else if (el.tagName === 'OPTION') el.textContent = texts[key];
      else el.textContent = texts[key];
    }
  });
  document.getElementById('langText').textContent = currentLang === 'id' ? 'ID' : 'EN';
}

window.toggleLanguage = function() {
  currentLang = currentLang === 'id' ? 'en' : 'id';
  setConfig({ language: currentLang });
  applyLanguage();
}

// 2. LOGIKA AUDIO PLAYER (LANGSUNG DI UI)
// Fitur ini tidak lagi membutuhkan library eksternal atau file terpisah
function playLocalAdzan(prayerType = 'Default') {
  const config = getConfig();
  let audioPath = config.adzanAll;

  // Cek apakah pakai mode custom dan apakah filenya ada
  if (config.adzanMode === 'custom' && config.adzanCustom && config.adzanCustom[prayerType]) {
    audioPath = config.adzanCustom[prayerType];
  }

  // Fallback ke adzan.mp3 default jika kosong
  if (!audioPath || audioPath === '') {
    audioPath = path.join(__dirname, '..', 'assets', 'adzan.mp3');
  }

  // Konversi path Windows ke URL HTML5
  const fileUrl = 'file:///' + audioPath.replace(/\\/g, '/');
  
  const audio = new window.Audio(fileUrl);
  audio.play().catch((err) => {
    console.error("Gagal putar:", err);
    alert(`Gagal memutar audio. Pastikan file tidak rusak/hilang.`);
  });
}

// 3. LOGIKA APLIKASI LAINNYA
const cityCoordinates = {
  jakarta: { lat: -6.2088, lon: 106.8456 }, bandung: { lat: -6.9175, lon: 107.6191 },
  surabaya: { lat: -7.2504, lon: 112.7688 }, sambas: { lat: 1.3616, lon: 109.3089 }
};

window.toggleLocationInputs = function() {
  const citySelect = document.getElementById('citySelect').value;
  const customDiv = document.getElementById('customLocationDiv');
  if (citySelect === 'custom') {
    customDiv.classList.remove('hidden'); customDiv.classList.add('flex');
    document.getElementById('customCityName').value = '';
  } else {
    customDiv.classList.add('hidden'); customDiv.classList.remove('flex');
    const config = getConfig();
    if (cityCoordinates[citySelect]) {
      document.getElementById('lat').value = cityCoordinates[citySelect].lat;
      document.getElementById('lon').value = cityCoordinates[citySelect].lon;
    } else if (config.customCities && config.customCities[citySelect]) {
      document.getElementById('lat').value = config.customCities[citySelect].lat;
      document.getElementById('lon').value = config.customCities[citySelect].lon;
    }
  }
}

window.toggleAudioInputs = function() {
  const adzanMode = document.getElementById('adzanMode').value;
  const customDiv = document.getElementById('customAudioDiv');
  if (adzanMode === 'custom') {
    customDiv.classList.remove('hidden'); customDiv.classList.add('flex');
  } else {
    customDiv.classList.add('hidden'); customDiv.classList.remove('flex');
  }
}

async function renderPrayerTimes() {
  const data = await getPrayerTimes();
  const container = document.getElementById('schedule');
  container.innerHTML = '';
  const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  
  prayers.forEach((prayer) => {
    if(data[prayer]) {
      const displayPrayerName = translations[currentLang][prayer.toLowerCase()] || prayer;
      container.innerHTML += `
        <div class="flex justify-between items-center p-3 rounded-lg bg-gray-800/50 border border-gray-700/50 hover:border-green-500/50 transition">
          <span class="text-gray-300 font-medium">${displayPrayerName}</span>
          <span class="text-xl font-bold text-white tracking-wider">${data[prayer]}</span>
        </div>
      `;
    }
  });
}

function init() {
  const config = getConfig();
  currentLang = config.language || 'id'; 
  const citySelectEl = document.getElementById('citySelect');
  
  citySelectEl.innerHTML = `
    <option value="jakarta">Jakarta</option>
    <option value="bandung">Bandung</option>
    <option value="surabaya">Surabaya</option>
    <option value="sambas">Sambas</option>
    <option value="custom" data-i18n="customOption">Gunakan Koordinat Kustom</option>
  `;
  
  if (config.customCities) {
    Object.keys(config.customCities).forEach(cityName => {
      const option = document.createElement('option');
      option.value = cityName;
      option.textContent = cityName.charAt(0).toUpperCase() + cityName.slice(1);
      citySelectEl.insertBefore(option, citySelectEl.lastElementChild);
    });
  }
  
  document.getElementById('citySelect').value = config.city || 'jakarta';
  document.getElementById('lat').value = config.latitude;
  document.getElementById('lon').value = config.longitude;
  document.getElementById('adzanMode').value = config.adzanMode;

  applyLanguage();
  toggleLocationInputs();
  toggleAudioInputs();
  renderPrayerTimes();
}

window.saveLocation = function() {
  const citySelect = document.getElementById('citySelect').value;
  let lat = parseFloat(document.getElementById('lat').value);
  let lon = parseFloat(document.getElementById('lon').value);

  if (citySelect === 'custom') {
    const customName = document.getElementById('customCityName').value.trim();
    if (!customName) return alert(translations[currentLang].alertCustomEmpty);
    if (isNaN(lat) || isNaN(lon)) return alert(translations[currentLang].alertCoordInvalid);

    const config = getConfig();
    const updatedCustomCities = { ...config.customCities };
    updatedCustomCities[customName.toLowerCase()] = { lat: lat, lon: lon };

    setConfig({ city: customName.toLowerCase(), latitude: lat, longitude: lon, customCities: updatedCustomCities });
    
    const msg = currentLang === 'id' ? `Daerah "${customName}" berhasil disimpan!` : `Region "${customName}" saved!`;
    alert(msg);
    init(); 
    return;
  }

  setConfig({ city: citySelect, latitude: lat, longitude: lon });
  alert(translations[currentLang].alertLocSave);
  renderPrayerTimes();
}

window.saveAudio = function() {
  const adzanMode = document.getElementById('adzanMode').value;
  let newConfig = { adzanMode: adzanMode };
  const currentConfig = getConfig();

  if (adzanMode === 'all') {
    const fileAll = document.getElementById('audioAll')?.files[0];
    if (fileAll) newConfig.adzanAll = fileAll.path;
  } else {
    newConfig.adzanCustom = {
      Fajr: document.getElementById('audioFajr').files[0]?.path || currentConfig.adzanCustom.Fajr,
      Dhuhr: document.getElementById('audioDhuhr').files[0]?.path || currentConfig.adzanCustom.Dhuhr,
      Asr: document.getElementById('audioAsr').files[0]?.path || currentConfig.adzanCustom.Asr,
      Maghrib: document.getElementById('audioMaghrib').files[0]?.path || currentConfig.adzanCustom.Maghrib,
      Isha: document.getElementById('audioIsha').files[0]?.path || currentConfig.adzanCustom.Isha
    };
  }
  setConfig(newConfig);
  alert(translations[currentLang].alertAudioSave);
}

window.testAdzan = function() {
  playLocalAdzan('Fajr');
  alert(translations[currentLang].alertTest);
}

window.testSpecificAdzan = function(prayerType) {
  playLocalAdzan(prayerType);
}

// === LISTENER DARI BACKGROUND SCHEDULER ===
ipcRenderer.on('trigger-adzan', (event, prayerType) => {
  playLocalAdzan(prayerType);
});

document.addEventListener('DOMContentLoaded', init);