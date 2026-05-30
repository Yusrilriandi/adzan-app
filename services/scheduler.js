const { Notification } = require('electron');
const { getPrayerTimes } = require('./prayerTimes');
const { getTrueDate } = require('./timeSync');

const CHECK_INTERVAL_MS = 10 * 1000;
const GRACE_PERIOD_MS = 5 * 60 * 1000;

const prayerNames = {
  Fajr: 'Subuh',
  Dhuhr: 'Dzuhur',
  Asr: 'Ashar',
  Maghrib: 'Maghrib',
  Isha: 'Isya',
};

const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

let schedulerInterval = null;
let scheduleRunId = 0;
let currentTimings = {};
let schedulerCallbacks = {
  onPlayAudio: null,
  onScheduleUpdated: null,
};
let lastTriggered = {};
let lastRefreshDateString = null;
let isRefreshing = false;

function parsePrayerTime(timing) {
  const match = String(timing || '').match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return { hour, minute };
}

function getPrayerDate(now, parsedTime) {
  const prayerDate = new Date(now.getTime());
  prayerDate.setHours(parsedTime.hour, parsedTime.minute, 0, 0);

  return prayerDate;
}

function triggerPrayer(prayer) {
  new Notification({
    title: '🇲🇨 Waktu Salat Tiba',
    body: `Saatnya menunaikan ibadah salat ${prayerNames[prayer]}`,
  }).show();

  if (schedulerCallbacks.onPlayAudio) {
    schedulerCallbacks.onPlayAudio(prayer);
  }
}

function checkPrayerTriggers(now) {
  const today = now.toDateString();

  prayers.forEach((prayer) => {
    if (lastTriggered[prayer] === today) return;

    const parsedTime = parsePrayerTime(currentTimings?.[prayer]);
    if (!parsedTime) return;

    const prayerDate = getPrayerDate(now, parsedTime);
    const elapsedMs = now.getTime() - prayerDate.getTime();

    if (elapsedMs >= 0 && elapsedMs <= GRACE_PERIOD_MS) {
      lastTriggered[prayer] = today;
      triggerPrayer(prayer);
    }
  });
}

function shouldRefreshDaily(now) {
  const today = now.toDateString();

  return now.getHours() === 0
    && now.getMinutes() === 1
    && lastRefreshDateString !== today;
}

async function runSchedulerTick() {
  const now = getTrueDate();

  checkPrayerTriggers(now);

  if (!shouldRefreshDaily(now) || isRefreshing) {
    return;
  }

  lastRefreshDateString = now.toDateString();
  isRefreshing = true;

  try {
    await schedulePrayerNotifications(
      schedulerCallbacks.onPlayAudio,
      schedulerCallbacks.onScheduleUpdated
    );
  } finally {
    isRefreshing = false;
  }
}

function ensureSchedulerInterval() {
  if (schedulerInterval) return;

  schedulerInterval = setInterval(() => {
    runSchedulerTick().catch((error) => {
      console.error('Gagal menjalankan interval penjadwalan adzan:', error);
    });
  }, CHECK_INTERVAL_MS);
}

async function schedulePrayerNotifications(onPlayAudio, onScheduleUpdated, options = {}) {
  const runId = ++scheduleRunId;
  schedulerCallbacks = { onPlayAudio, onScheduleUpdated };
  ensureSchedulerInterval();

  try {
    const timings = await getPrayerTimes();

    if (runId !== scheduleRunId) {
      return timings || {};
    }

    const hasValidSchedule = prayers.some((prayer) => parsePrayerTime(timings?.[prayer]));

    if (!hasValidSchedule) {
      if (options.clearOnEmpty) {
        currentTimings = {};
      }

      console.error('Tidak ada jadwal valid untuk disusun.');
      return timings || {};
    }

    currentTimings = timings || {};

    if (onScheduleUpdated) {
      onScheduleUpdated(timings);
    }

    checkPrayerTriggers(getTrueDate());

    return timings;

  } catch (error) {
    console.error("Gagal memuat penjadwalan adzan:", error);
    return {};
  }
}

module.exports = { schedulePrayerNotifications };
