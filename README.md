# Mu'azzin

Aplikasi desktop pengingat waktu salat untuk Windows.

## Menjalankan Saat Development

```bash
npm install
npm start
```

## Membuat Installer Windows

```bash
npm run build:win
```

File installer akan dibuat di folder `dist` dengan nama seperti:

```text
Adzan App-Setup-1.0.0.exe
```

Bagikan file `.exe` tersebut ke pengguna. Mereka cukup menjalankan installer, mengikuti langkah instalasi, lalu aplikasi akan langsung bisa dipakai.

## Perilaku di Windows

- Aplikasi tetap berjalan di latar belakang ketika jendela ditutup.
- Aplikasi bisa dibuka lagi lewat tray Windows.
- Setelah ter-install, aplikasi otomatis aktif saat user login ke Windows setelah PC/laptop dinyalakan.
- Saat auto-start dari Windows, aplikasi berjalan tersembunyi di background supaya tidak mengganggu user.
- Hanya satu instance aplikasi yang berjalan, jadi startup Windows tidak membuat aplikasi dobel.
