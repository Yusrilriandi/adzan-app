const axios = require('axios');
const { getConfig } = require('./config');

async function getPrayerTimes() {
  const config = getConfig();
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // Bulan di JS dimulai dari 0

  // Menggunakan latitude & longitude yang tersimpan di config
 const url = `https://api.aladhan.com/v1/calendar/${year}/${month}?latitude=${config.latitude}&longitude=${config.longitude}&method=20&tune=0,2,-2,2,2,2,0,2,0`;

  try {
    const response = await axios.get(url);
    const day = date.getDate() - 1; // Array index tanggal hari ini
    const timings = response.data.data[day].timings;
    return timings;
  } catch (error) {
    console.error('Gagal mengambil jadwal salat:', error);
    return {}; // Return objek kosong jika error
  }
}

module.exports = { getPrayerTimes };