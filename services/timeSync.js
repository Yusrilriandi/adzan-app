const axios = require('axios');

const TIME_SOURCES = [
  {
    url: 'https://timeapi.io/api/time/current/zone?timeZone=Etc/UTC',
    parse: (data) => Date.parse(data?.dateTime + 'Z'),
  },
  {
    url: 'http://worldtimeapi.org/api/timezone/Etc/UTC',
    parse: (data) => Date.parse(data?.utc_datetime || data?.datetime),
  },
  {
    url: 'https://www.ntppool.org/api/data/server/time',
    parse: (data) => Math.floor(Number(data?.ts) * 1000),
  },
];

let offsetMs = 0;

async function fetchTimeFromSource(source) {
  const response = await axios.get(source.url, { timeout: 8000 });
  const internetTime = source.parse(response.data);

  if (!Number.isFinite(internetTime)) {
    throw new Error(`Invalid time from ${source.url}`);
  }

  return internetTime;
}

async function syncTime() {
  for (const source of TIME_SOURCES) {
    try {
      const internetTime = await fetchTimeFromSource(source);
      offsetMs = internetTime - Date.now();
      return offsetMs;
    } catch (error) {
      console.warn(`Gagal sinkronisasi dari ${source.url}:`, error.message || error.code);
    }
  }

  console.error('Gagal sinkronisasi waktu dari semua sumber. Menggunakan jam lokal (offset = 0).');
  return offsetMs;
}

function getTrueDate() {
  return new Date(Date.now() + offsetMs);
}

module.exports = { syncTime, getTrueDate };
