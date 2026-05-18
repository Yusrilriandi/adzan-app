const axios = require('axios');
const { getConfig } = require('./config');

async function getPrayerTimes() {
  const config = getConfig();

  const url = `https://api.aladhan.com/v1/timings?latitude=${config.latitude}&longitude=${config.longitude}&method=${config.method}`;

  const response = await axios.get(url);
  const timings = response.data.data.timings;

  return {
    Fajr: timings.Fajr,
    Dhuhr: timings.Dhuhr,
    Asr: timings.Asr,
    Maghrib: timings.Maghrib,
    Isha: timings.Isha,
  };
}

module.exports = { getPrayerTimes };