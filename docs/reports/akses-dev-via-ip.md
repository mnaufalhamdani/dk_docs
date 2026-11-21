# Akses dev via IP / perangkat lain tidak berfungsi

## Ringkasan

Saat DK Docs dibuka lewat alamat IP (contoh `http://172.21.32.1:3100`) atau dari perangkat lain, tombol, form, dan mode gelap tidak merespons. Diperbaiki dengan menambahkan `allowedDevOrigins` di `next.config.mjs`.

## Masalah

- Gejala:
  - Tombol "Cari menu, halaman, modul..." dan "Mode gelap" tidak bisa diklik.
  - Form Ubah repo tidak tersimpan dan tidak menampilkan error atau notifikasi sukses.
  - Konsol browser selalu menampilkan kegagalan koneksi WebSocket HMR.
  - Beberapa menu tidak bisa diakses normal bila dibuka lewat IP atau perangkat lain.
- Akar penyebab: Next.js 16 pada mode development memblokir permintaan lintas-origin ke aset dev (chunk JS dan endpoint HMR) dari hostname selain `localhost` dan hostname server yang dijalankan. Halaman tetap tampil (HTML dirender server), tetapi JavaScript client tidak termuat, sehingga React tidak pernah hydrate. Semua interaksi client (`onClick`, `onSubmit`, Server Action) mati tanpa pesan error di UI.

## Error

```
WebSocket connection to 'ws://172.21.32.1:3100/_next/hmr?id=...' failed
```

## Solusi

Menambahkan `allowedDevOrigins` di `next.config.mjs`:
`172.21.32.1`, `172.*.*.*`, `192.168.*.*`, `10.*.*.*`, dan `*.local`.

- Satu `*` mewakili tepat satu segmen hostname (satu oktet pada IP), sehingga rentang jaringan privat umum tercakup walaupun IP adapter berubah (misalnya adapter WSL/Hyper-V).
- Hanya berlaku untuk `next dev`. Mode produksi (`next start`) tidak terpengaruh dan tidak memakai daftar ini.
- **Wajib restart `next dev`** setelah perubahan konfigurasi.
- Bila host lain dipakai (nama komputer, domain tunnel), tambahkan entrinya di daftar tersebut.

## File diubah

- `next.config.mjs`

## File baru

- `docs/reports/akses-dev-via-ip.md`
