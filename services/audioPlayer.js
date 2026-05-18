const path = require('path');
const player = require('play-sound')();

function playAdzan() {
  const audioPath = path.join(__dirname, '..', 'assets', 'adzan.mp3');

  player.play(audioPath, (err) => {
    if (err) {
      console.error('Gagal memutar audio:', err);
    } else {
      console.log('Audio adzan berhasil diputar.');
    }
  });
}

module.exports = { playAdzan };