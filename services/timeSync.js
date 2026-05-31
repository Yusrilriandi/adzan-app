const { net } = require('electron');

const TIME_SOURCES = [
  {
    url: 'https://timeapi.io/api/time/current/zone?timeZone=Etc/UTC',
    parse: (data) => Date.parse(data?.dateTime + 'Z'),
  },
  {
    url: 'https://worldtimeapi.org/api/timezone/Etc/UTC',
    parse: (data) => Date.parse(data?.utc_datetime || data?.datetime),
  },
  {
    url: 'https://www.ntppool.org/api/data/server/time',
    parse: (data) => Math.floor(Number(data?.ts) * 1000),
  },
];

let offsetMs = 0;
let isSynced = false;

async function fetchTimeFromSource(source) {
  // net.fetch uses Chromium's network engine, bypassing Windows Defender blocks
  const response = await net.fetch(source.url, { 
    signal: AbortSignal.timeout(8000)
  });
  
  if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
  const data = await response.json();
  const internetTime = source.parse(data);
  if (!Number.isFinite(internetTime)) throw new Error(`Invalid time from ${source.url}`);
  
  return internetTime;
}

async function syncTime() {
  for (const source of TIME_SOURCES) {
    try {
      const internetTime = await fetchTimeFromSource(source);
      offsetMs = internetTime - Date.now();
      isSynced = true;
      console.log(`[TimeSync] Success from ${source.url}. Offset: ${offsetMs}ms`);
      return true;
    } catch (error) {
      console.warn(`[TimeSync] Failed from ${source.url}:`, error.message);
    }
  }
  console.error('[TimeSync] Offline/Failed all sources.');
  return false;
}

// Aggressive polling: Keep trying every 10 seconds until successful
function startAggressiveSync(onSuccessCallback) {
  if (isSynced) return;
  
  syncTime().then((success) => {
    if (success) {
      if (onSuccessCallback) onSuccessCallback();
    } else {
      console.log('[TimeSync] Retrying in 10 seconds...');
      setTimeout(() => startAggressiveSync(onSuccessCallback), 10000);
    }
  });
}

function getTrueDate() {
  return new Date(Date.now() + offsetMs);
}

module.exports = { syncTime, getTrueDate, startAggressiveSync };

// Tambahkan fungsi ini di atas module.exports
function getOffsetMs() {
  return offsetMs;
}

// Ubah baris module.exports Anda menjadi seperti ini:
module.exports = { syncTime, getTrueDate, startAggressiveSync, getOffsetMs };