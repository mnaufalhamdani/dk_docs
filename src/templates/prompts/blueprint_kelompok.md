# Pengerjaan Blueprint: {{judul_blueprint}}
Sesi: {{unique_id}} | Repo: {{kode_repo}} | Branch: {{branch}}
Modul: {{nama_modul}}   Urutan: prompt {{urutan}} dari {{total}}
Alasan urutan: {{alasan_urutan}}

## Blueprint lengkap (hanya konteks)
{{blueprint_lengkap}}

## Kerjakan hanya poin ini
{{poin_ditugaskan}}

## Poin terkait modul lain (jangan dikerjakan di sini)
{{poin_terkait}}

## Laporan kelompok sebelumnya
{{jalur_laporan_sebelumnya}}
(baca bila ada, agar tahu apa yang sudah berubah)

## Dokumentasi referensi (menu dan halaman relevan)
Ringkasan dari kode, bisa tertinggal. Jika berbeda dengan kode, kode yang benar dan
catat selisihnya di laporan.
{{dokumentasi_relevan}}

{{judul_menu_dan_halaman_lain}}

## Tahap
1. Analisis: baca kode modul terkait, catat kondisi awal tiap poin. Baca juga komentar/remark
   developer di kode (docblock, komentar function/blok/baris, TODO/NOTE, penanda CR/B): itu
   dokumentasi singkat tulisan tangan dan bahan memahami maksud kode. Bila komentar
   bertentangan dengan perilaku kode, kode yang benar; catat di "selisih dokumentasi".
2. Kerjakan poin demi poin, hanya file yang berkaitan dengan poin tersebut. Jangan commit.
3. Perubahan tabel/kolom: nama **snake_case**; tulis HANYA script migrasi (jangan
   dijalankan). Ikuti lokasi migrasi project; jika tidak ada, taruh di
   `doc-generated/migrasi/`. Untuk poin yang bergantung pada nama tabel/kolom,
   beri saran nama + alasan, lalu BERHENTI di poin itu dan minta keputusan.
   Poin lain tetap dilanjutkan.
4. Laporan: tulis `.md` ke `doc-generated/blueprint_{{kode_repo}}_{{unique_id}}.md`.

## Format laporan
Per poin: kondisi awal; yang dikerjakan/diubah (+ path file); status
(selesai | sebagian | belum | butuh keputusan); catatan.
Lalu: daftar file diubah, file baru, selisih dokumentasi (bila ada), saran nama
tabel/kolom (tabel/kolom, nama saran, alasan, dampak ke kode), dan ringkasan
kondisi sekarang.
