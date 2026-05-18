const { getPrayerTimes } = require('../services/prayerTimes');
const { getConfig, setConfig } = require('../services/config');

async function loadPrayerTimes() {
  const data = await getPrayerTimes();

  const container = document.getElementById('schedule');
  container.innerHTML = '';

  Object.entries(data).forEach(([key, value]) => {
    container.innerHTML += `
      <div class="row">
        <span>${key}</span>
        <span>${value}</span>
      </div>
    `;
  });
}

function loadConfig() {
  const config = getConfig();

  document.getElementById('city').value = config.city;
  document.getElementById('lat').value = config.latitude;
  document.getElementById('lon').value = config.longitude;
  document.getElementById('adzanMode').value = config.adzanMode;

  document.getElementById('audioInfo').innerText =
    `Mode aktif: ${config.adzanMode.toUpperCase()}`;
}

function saveLocation() {
  const config = getConfig();

  setConfig({
    ...config,
    city: document.getElementById('city').value,
    latitude: parseFloat(document.getElementById('lat').value),
    longitude: parseFloat(document.getElementById('lon').value)
  });

  alert('Lokasi disimpan!');
}

function saveAudio() {
  const config = getConfig();

  setConfig({
    ...config,
    adzanMode: document.getElementById('adzanMode').value
  });

  alert('Audio mode disimpan!');
}

function testAdzan() {
  alert("Test adzan akan kita sambungkan ke backend next step 🔊");
}

loadConfig();
loadPrayerTimes();