const { ipcRenderer } = require('electron');
const path = require('path');
const url = require('url');

const translations = {
  id: {
    locSettings: 'Pengaturan Lokasi', chooseRegion: 'Pilih Daerah', customRegionName: 'Nama Daerah Kustom',
    customRegionPlaceholder: 'Masukkan nama daerah baru...', saveLocBtn: 'Simpan Lokasi',
    audioSettings: 'Audio Adzan', audioMode: 'Mode Audio', modeAll: 'Sama untuk semua waktu (Default)',
    modeCustom: 'Berbeda tiap waktu', customAudioLabel: 'Pilih file .mp3 untuk masing-masing waktu:',
    allAudioLabel: 'Pilih file .mp3 utama:', saveAudioBtn: 'Simpan Audio', testBtn: 'Test Utama', 
    scheduleTitle: 'Jadwal Salat Hari Ini', fajr: 'Subuh', dhuhr: 'Dzuhur', asr: 'Ashar', 
    maghrib: 'Maghrib', isha: 'Isya', customOption: 'Gunakan Koordinat Kustom',
    alertLocSave: 'Lokasi berhasil disimpan! Jadwal diperbarui.', alertCustomEmpty: 'Harap masukkan nama daerah kustom!',
    alertCoordInvalid: 'Harap masukkan angka koordinat Latitude & Longitude yang valid!',
    alertAudioSave: 'Pengaturan Audio Disimpan!', alertTest: 'Memutar Adzan... Pastikan volume PC menyala.',
    hijriLabel: 'Tanggal Hijriah'
  },
  en: {
    locSettings: 'Location Settings', chooseRegion: 'Select Region', customRegionName: 'Custom Region Name',
    customRegionPlaceholder: 'Enter new region name...', saveLocBtn: 'Save Location',
    audioSettings: 'Adzan Audio', audioMode: 'Audio Mode', modeAll: 'Same for all times (Default)',
    modeCustom: 'Different for each time', customAudioLabel: 'Select .mp3 file for each time:',
    allAudioLabel: 'Select main .mp3 file:', saveAudioBtn: 'Save Audio', testBtn: 'Main Test', 
    scheduleTitle: 'Today\'s Prayer Schedule', fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', 
    maghrib: 'Maghrib', isha: 'Isha', customOption: 'Use Custom Coordinates',
    alertLocSave: 'Location saved! Schedule updated.', alertCustomEmpty: 'Please enter a custom region name!',
    alertCoordInvalid: 'Please enter valid Latitude & Longitude coordinates!',
    alertAudioSave: 'Audio Settings Saved!', alertTest: 'Playing Adzan... Make sure PC volume is up.',
    hijriLabel: 'Hijri Date'
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
  updateTimeUI(); // Segera perbarui format tanggal jam ke bahasa baru
}

window.toggleLanguage = async function() {
  currentLang = currentLang === 'id' ? 'en' : 'id';
  await ipcRenderer.invoke('set-config', { language: currentLang });
  applyLanguage();
}

// === WIDGET JAM REALTIME & HIJRIAH (NATIVE ENGINE) ===
function startLiveClock() {
  setInterval(() => {
    updateTimeUI();
  }, 1000);
}

function updateTimeUI() {
  const now = new Date();
  
  // 1. Format Jam:Menit:Detik
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  document.getElementById('liveClock').textContent = `${hours}:${minutes}:${seconds}`;

  // 2. Format Tanggal Masehi Lokal (Menyesuaikan Bahasa)
  const localeStr = currentLang === 'id' ? 'id-ID' : 'en-US';
  const masehiOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  document.getElementById('masehiDate').textContent = new Intl.DateTimeFormat(localeStr, masehiOptions).format(now);

  // 3. Format Tanggal Hijriah secara Otomatis menggunakan Engine Intl Bawaan Chromium
  const hijriOptions = { calendar: 'islamic-umalqura', day: 'numeric', month: 'long', year: 'numeric' };
  let hijriStr = new Intl.DateTimeFormat(localeStr, hijriOptions).format(now);
  
  // Merapikan string akhiran tahun Hijriah (misal AH / H) agar lebih ramah dibaca
  if(currentLang === 'id') {
    hijriStr = hijriStr.replace('AH', 'H').replace('ERA1', 'H');
  }
  document.getElementById('hijriDate').textContent = hijriStr;
}

// === LOGIKA AUDIO ENGINE HTML5 ===
async function playLocalAdzan(prayerType = 'Default') {
  const config = await ipcRenderer.invoke('get-config');
  let audioPath = '';

  if (config.adzanMode === 'custom' && config.adzanCustom && config.adzanCustom[prayerType]) {
    audioPath = config.adzanCustom[prayerType];
  } else if (config.adzanMode === 'all' && config.adzanAll) {
    audioPath = config.adzanAll;
  }

  if (!audioPath || audioPath === '') {
    audioPath = path.join(__dirname, '..', 'assets', 'adzan.mp3');
  }

  try {
    const fileUrl = url.pathToFileURL(audioPath).href;
    const audio = new window.Audio(fileUrl);
    audio.play().catch((err) => console.error("Gagal putar adzan kustom:", err));
  } catch (err) {
    console.error("Path file tidak valid:", err);
  }
}

const cityCoordinates = {
  jakarta: { lat: -6.2088, lon: 106.8456 }, bandung: { lat: -6.9175, lon: 107.6191 },
  surabaya: { lat: -7.2504, lon: 112.7688 }, sambas: { lat: 1.3616, lon: 109.3089 }
};

window.toggleLocationInputs = async function() {
  const citySelect = document.getElementById('citySelect').value;
  const customDiv = document.getElementById('customLocationDiv');
  if (citySelect === 'custom') {
    customDiv.classList.remove('hidden'); customDiv.classList.add('flex');
    document.getElementById('customCityName').value = '';
  } else {
    customDiv.classList.add('hidden'); customDiv.classList.remove('flex');
    const config = await ipcRenderer.invoke('get-config');
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
  const allDiv = document.getElementById('allAudioDiv');
  if (adzanMode === 'custom') {
    customDiv.classList.remove('hidden'); customDiv.classList.add('flex');
    allDiv.classList.add('hidden'); allDiv.classList.remove('flex');
  } else {
    customDiv.classList.add('hidden'); customDiv.classList.remove('flex');
    allDiv.classList.remove('hidden'); allDiv.classList.add('flex');
  }
}

async function renderPrayerTimes() {
  const data = await ipcRenderer.invoke('get-prayer-times');
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

async function init() {
  const config = await ipcRenderer.invoke('get-config');
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

  document.getElementById('pathAll').textContent = config.adzanAll ? `Aktif: ${path.basename(config.adzanAll)}` : '';
  document.getElementById('pathFajr').textContent = config.adzanCustom?.Fajr ? `Aktif: ${path.basename(config.adzanCustom.Fajr)}` : '';
  document.getElementById('pathDhuhr').textContent = config.adzanCustom?.Dhuhr ? `Aktif: ${path.basename(config.adzanCustom.Dhuhr)}` : '';
  document.getElementById('pathAsr').textContent = config.adzanCustom?.Asr ? `Aktif: ${path.basename(config.adzanCustom.Asr)}` : '';
  document.getElementById('pathMaghrib').textContent = config.adzanCustom?.Maghrib ? `Aktif: ${path.basename(config.adzanCustom.Maghrib)}` : '';
  document.getElementById('pathIsha').textContent = config.adzanCustom?.Isha ? `Aktif: ${path.basename(config.adzanCustom.Isha)}` : '';

  applyLanguage();
  toggleLocationInputs();
  toggleAudioInputs();
  renderPrayerTimes();
  startLiveClock(); // Nyalakan mesin jam detik berjalan
}

window.saveLocation = async function() {
  const citySelect = document.getElementById('citySelect').value;
  let lat = parseFloat(document.getElementById('lat').value);
  let lon = parseFloat(document.getElementById('lon').value);

  if (citySelect === 'custom') {
    const customName = document.getElementById('customCityName').value.trim();
    if (!customName) return alert(translations[currentLang].alertCustomEmpty);
    if (isNaN(lat) || isNaN(lon)) return alert(translations[currentLang].alertCoordInvalid);

    const config = await ipcRenderer.invoke('get-config');
    const updatedCustomCities = { ...config.customCities };
    updatedCustomCities[customName.toLowerCase()] = { lat: lat, lon: lon };

    await ipcRenderer.invoke('set-config', { city: customName.toLowerCase(), latitude: lat, longitude: lon, customCities: updatedCustomCities });
    
    const msg = currentLang === 'id' ? `Daerah "${customName}" berhasil disimpan!` : `Region "${customName}" saved!`;
    alert(msg);
    await init(); 
    return;
  }

  await ipcRenderer.invoke('set-config', { city: citySelect, latitude: lat, longitude: lon });
  alert(translations[currentLang].alertLocSave);
  renderPrayerTimes();
}

window.saveAudio = async function() {
  const adzanMode = document.getElementById('adzanMode').value;
  let newConfig = { adzanMode: adzanMode };
  const currentConfig = await ipcRenderer.invoke('get-config');

  if (adzanMode === 'all') {
    const fileAll = document.getElementById('audioAll')?.files[0];
    newConfig.adzanAll = fileAll ? fileAll.path : (currentConfig.adzanAll || '');
  } else {
    newConfig.adzanCustom = {
      Fajr: document.getElementById('audioFajr').files[0]?.path || currentConfig.adzanCustom?.Fajr || '',
      Dhuhr: document.getElementById('audioDhuhr').files[0]?.path || currentConfig.adzanCustom?.Dhuhr || '',
      Asr: document.getElementById('audioAsr').files[0]?.path || currentConfig.adzanCustom?.Asr || '',
      Maghrib: document.getElementById('audioMaghrib').files[0]?.path || currentConfig.adzanCustom?.Maghrib || '',
      Isha: document.getElementById('audioIsha').files[0]?.path || currentConfig.adzanCustom?.Isha || ''
    };
  }
  
  await ipcRenderer.invoke('set-config', newConfig);
  alert(translations[currentLang].alertAudioSave);
  await init(); 
}

window.testAdzan = async function() {
  const config = await ipcRenderer.invoke('get-config');
  if (config.adzanMode === 'custom') {
    playLocalAdzan('Fajr');
  } else {
    playLocalAdzan('Default');
  }
  alert(translations[currentLang].alertTest);
}

window.testSpecificAdzan = function(prayerType) {
  playLocalAdzan(prayerType);
}

ipcRenderer.on('trigger-adzan', (event, prayerType) => {
  playLocalAdzan(prayerType);
});

document.addEventListener('DOMContentLoaded', init);