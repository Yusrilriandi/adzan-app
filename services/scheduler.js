const schedule = require('node-schedule');
const { Notification } = require('electron');
const { getPrayerTimes } = require('./prayerTimes');

const prayerNames = {
  Fajr: 'Subuh',
  Dhuhr: 'Dzuhur',
  Asr: 'Ashar',
  Maghrib: 'Maghrib',
  Isha: 'Isya',
};

// Tambahkan parameter callback "onPlayAudio"
async function schedulePrayerNotifications(onPlayAudio) {
  const timings = await getPrayerTimes();
  console.log('Jadwal salat hari ini:');
  console.table(timings);

  const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

  prayers.forEach((prayer) => {
    const time = timings[prayer].split(' ')[0];
    const [hour, minute] = time.split(':').map(Number);

    const job = schedule.scheduleJob({ hour, minute }, () => {
      new Notification({
        title: '🕌 Waktu Salat',
        body: `Saatnya salat ${prayerNames[prayer]}`,
      }).show();

      console.log(`Waktu ${prayerNames[prayer]} tiba!`);
      
      // Kirim sinyal ke UI untuk memutar suara
      if (onPlayAudio) {
        onPlayAudio(prayer);
      }
    });
  });
}

module.exports = { schedulePrayerNotifications };