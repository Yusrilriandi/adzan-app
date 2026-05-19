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

let activeJobs = [];
let refreshJob = null;

async function schedulePrayerNotifications(onPlayAudio) {
  // Bersihkan jadwal lama sebelum menyusun jadwal hari baru
  activeJobs.forEach(job => job.cancel());
  activeJobs = [];
  if (refreshJob) {
    refreshJob.cancel();
    refreshJob = null;
  }

  try {
    const timings = await getPrayerTimes();
    const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

    prayers.forEach((prayer) => {
      if (!timings[prayer]) return;
      const time = timings[prayer].split(' ')[0];
      const [hour, minute] = time.split(':').map(Number);

      // Mendaftarkan jadwal otomatis harian
      const job = schedule.scheduleJob({ hour, minute }, () => {
        new Notification({
          title: '🇲🇨 Waktu Salat Tiba',
          body: `Saatnya menunaikan ibadah salat ${prayerNames[prayer]}`,
        }).show();

        if (onPlayAudio) {
          onPlayAudio(prayer);
        }
      });

      if (job) activeJobs.push(job);
    });

    // Otomatis merombak & mengambil jadwal baru setiap tengah malam (00:01)
    refreshJob = schedule.scheduleJob('1 0 * * *', () => {
      schedulePrayerNotifications(onPlayAudio);
    });

  } catch (error) {
    console.error("Gagal memuat cron penjadwalan adzan:", error);
  }
}

module.exports = { schedulePrayerNotifications };
