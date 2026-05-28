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
let scheduleRunId = 0;

function parsePrayerTime(timing) {
  const match = String(timing || '').match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return { hour, minute };
}

function scheduleDailyRefresh(onPlayAudio, onScheduleUpdated) {
  if (refreshJob) {
    refreshJob.cancel();
    refreshJob = null;
  }

  refreshJob = schedule.scheduleJob('1 0 * * *', () => {
    schedulePrayerNotifications(onPlayAudio, onScheduleUpdated);
  });
}

async function schedulePrayerNotifications(onPlayAudio, onScheduleUpdated, options = {}) {
  const runId = ++scheduleRunId;

  try {
    const timings = await getPrayerTimes();
    const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    const nextJobs = [];

    prayers.forEach((prayer) => {
      const parsedTime = parsePrayerTime(timings?.[prayer]);
      if (!parsedTime) return;

      const job = schedule.scheduleJob(parsedTime, () => {
        new Notification({
          title: '🇲🇨 Waktu Salat Tiba',
          body: `Saatnya menunaikan ibadah salat ${prayerNames[prayer]}`,
        }).show();

        if (onPlayAudio) {
          onPlayAudio(prayer);
        }
      });

      if (job) nextJobs.push(job);
    });

    if (runId !== scheduleRunId) {
      nextJobs.forEach(job => job.cancel());
      return timings || {};
    }

    if (nextJobs.length === 0) {
      if (options.clearOnEmpty) {
        activeJobs.forEach(job => job.cancel());
        activeJobs = [];
      }

      if (!refreshJob) scheduleDailyRefresh(onPlayAudio, onScheduleUpdated);
      console.error('Tidak ada jadwal valid untuk disusun.');
      return timings || {};
    }

    activeJobs.forEach(job => job.cancel());
    activeJobs = nextJobs;

    // Otomatis merombak & mengambil jadwal baru setiap tengah malam (00:01)
    scheduleDailyRefresh(onPlayAudio, onScheduleUpdated);

    if (onScheduleUpdated) {
      onScheduleUpdated(timings);
    }

    return timings;

  } catch (error) {
    console.error("Gagal memuat cron penjadwalan adzan:", error);
    if (!refreshJob) scheduleDailyRefresh(onPlayAudio, onScheduleUpdated);
    return {};
  }
}

module.exports = { schedulePrayerNotifications };
