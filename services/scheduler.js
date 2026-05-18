const schedule = require('node-schedule');
const { Notification } = require('electron');
const { getPrayerTimes } = require('./prayerTimes');
const { playAdzan } = require('./audioPlayer');

const prayerNames = {
  Fajr: 'Subuh',
  Dhuhr: 'Dzuhur',
  Asr: 'Ashar',
  Maghrib: 'Maghrib',
  Isha: 'Isya',
};

async function schedulePrayerNotifications() {
  const timings = await getPrayerTimes();

  console.log('Jadwal salat hari ini:');
  console.table(timings);

  const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

  prayers.forEach((prayer) => {
    const time = timings[prayer].split(' ')[0]; // menghapus timezone jika ada
    const [hour, minute] = time.split(':').map(Number);

    const job = schedule.scheduleJob({ hour, minute }, () => {
      new Notification({
        title: '🕌 Waktu Salat',
        body: `Saatnya salat ${prayerNames[prayer]}`,
      }).show();

      playAdzan();
      console.log(`Adzan ${prayerNames[prayer]} diputar.`);
    });

    if (job) {
      console.log(
        `${prayerNames[prayer]} dijadwalkan pukul ${hour
          .toString()
          .padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      );
    }
  });
}

module.exports = { schedulePrayerNotifications };