const axios = require('axios');
const { getConfig } = require('./config');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const cachePath = path.join(app.getPath('userData'), 'prayer-cache.json');
const CACHE_VERSION = 2;
const PRAYER_METHOD = 20;
const TUNE = '0,2,-2,2,2,2,0,2,0';

function normalizeCoordinate(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Number(numberValue.toFixed(6)) : null;
}

function getCacheContext(config, date) {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    latitude: normalizeCoordinate(config.latitude),
    longitude: normalizeCoordinate(config.longitude),
    method: Number(config.method) || PRAYER_METHOD,
  };
}

function buildCachePayload(context, monthData) {
  return {
    version: CACHE_VERSION,
    savedAt: new Date().toISOString(),
    ...context,
    data: monthData,
  };
}

function isSameCacheContext(cache, context) {
  return cache
    && cache.year === context.year
    && cache.month === context.month
    && cache.latitude === context.latitude
    && cache.longitude === context.longitude
    && cache.method === context.method;
}

function getLegacyCachedMonthData(monthData, context) {
  const firstGregorianDate = monthData?.[0]?.date?.gregorian;
  const cachedYear = Number(firstGregorianDate?.year);
  const cachedMonth = Number(firstGregorianDate?.month?.number);

  if (cachedYear && cachedMonth && (cachedYear !== context.year || cachedMonth !== context.month)) {
    return null;
  }

  return monthData;
}

function getCachedMonthData(context) {
  if (!fs.existsSync(cachePath)) return null;

  const cachedData = fs.readFileSync(cachePath, 'utf8');
  const parsedCache = JSON.parse(cachedData);

  if (Array.isArray(parsedCache)) {
    return getLegacyCachedMonthData(parsedCache, context);
  }

  if (parsedCache && Array.isArray(parsedCache.data) && isSameCacheContext(parsedCache, context)) {
    return parsedCache.data;
  }

  return null;
}

function writeCache(context, monthData) {
  fs.writeFileSync(cachePath, JSON.stringify(buildCachePayload(context, monthData)), 'utf8');
}

async function getPrayerTimes() {
  const config = getConfig();
  const date = new Date();
  const context = getCacheContext(config, date);
  const day = date.getDate() - 1; // Array index tanggal hari ini

  const url = `https://api.aladhan.com/v1/calendar/${context.year}/${context.month}?latitude=${context.latitude}&longitude=${context.longitude}&method=${context.method}&tune=${TUNE}`;

  try {
    // 1. COBA AMBIL DARI INTERNET (API)
    const response = await axios.get(url, { timeout: 10000 });
    
    // Ambil seluruh data satu bulan untuk disimpan
    const monthData = response.data.data;
    
    // Simpan ke file cache (ditimpa setiap kali berhasil online)
    try {
      writeCache(context, monthData);
    } catch (cacheWriteError) {
      console.error('Gagal menyimpan cache jadwal salat:', cacheWriteError);
    }
    
    // Kembalikan hanya jadwal hari ini
    return monthData?.[day]?.timings || {};

  } catch (error) {
    console.error('Gagal mengambil jadwal dari internet. Mencari cache lokal...');

    // 2. JIKA OFFLINE, BACA DARI FILE CACHE
    try {
      const monthData = getCachedMonthData(context);

      if (monthData?.[day]?.timings) {
        console.log('Berhasil memuat jadwal dari cache offline.');
        return monthData[day].timings;
      }
    } catch (cacheError) {
      console.error('Gagal membaca atau memproses file cache:', cacheError);
    }

    // 3. JIKA OFFLINE DAN CACHE TIDAK ADA
    console.error('Tidak ada koneksi dan tidak ada cache.');
    return {}; // Return objek kosong agar aplikasi tidak crash
  }
}

module.exports = { getPrayerTimes };
