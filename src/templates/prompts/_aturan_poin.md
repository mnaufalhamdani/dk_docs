- Format poin pada "Dokumentasi saat ini": awalan dalam tanda kurung siku BUKAN bagian dari teks poin.
  `[id: ...]` = id poin; `[CR ...]` / `[B ...]` = nomor perubahan yang menghasilkan poin itu. Saat menyalin
  teks poin ke `dari` atau `hapus`, salin teksnya saja tanpa awalan. Untuk poin yang sudah ada, sebut id-nya
  di `poin_id` (string, jangan angka) pada `ubah` dan pada `hapus` berbentuk { "teks": "...", "poin_id": "..." }.
- Poin bertanda `[PENDING]` sengaja ditahan. Tetap jadikan referensi, tetapi: jangan menambahkan poin yang
  sama lagi, dan jangan mengubah atau menghapusnya kecuali CR/B yang sedang dikerjakan jelas membatalkan
  atau melaksanakannya.
