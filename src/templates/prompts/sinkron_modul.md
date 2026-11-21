# Sinkronkan Dokumentasi Modul dengan Kode
Sesi: {{unique_id}} | Repo: {{kode_repo}} | Branch: {{branch}}

## Tugas
Samakan dokumentasi modul berikut dengan KODE yang ada sekarang di branch {{branch}}.
Riwayat commit dan pesan commit TIDAK dipakai; satu-satunya kebenaran adalah isi kode saat ini.
{{daftar_modul_target}}

Langkah:
1. Baca SELURUH kode di path_kode modul, termasuk komentar/remark developer (bahan
   dokumentasi, lihat aturan tulis). Daftar semua menu yang benar-benar ada di kode
   (menu di aplikasi), dan untuk tiap menu daftar semua halamannya (daftar/form/detail/lainnya).
2. Bandingkan hasil temuan dengan "Dokumentasi saat ini" di bawah, lalu tentukan per level:
   - Menu atau halaman ada di kode tetapi BELUM terdaftar: tulis aksi "baru" dengan dokumentasi
     lengkap (semua bagian yang relevan, hanya "tambah").
   - Menu atau halaman sudah terdaftar dan masih ada di kode: aksi "ubah". Cek tiap poin terhadap
     kode. Poin yang masih benar jangan disentuh. Poin yang salah atau basi masuk "ubah"
     (salin teks lama persis ke `dari`). Poin yang sudah tidak berlaku masuk "hapus".
     Perilaku yang ada di kode tetapi belum didokumentasikan masuk "tambah".
   - Menu atau halaman terdaftar tetapi sudah TIDAK ADA di kode (sudah dihapus atau dipindah):
     aksi "hapus". Pastikan dulu bukan hanya berpindah path atau berganti nama; bila ragu,
     jangan dihapus, catat di `selisih_dokumentasi`.
3. Menu atau halaman yang dokumentasinya sudah sesuai dengan kode jangan dimasukkan ke JSON.
4. Catat setiap temuan yang tidak bisa diputuskan sendiri di `selisih_dokumentasi`.
5. Poin yang berasal dari CR/B (ditandai `[CR ...]` atau `[B ...]` dan punya `[id: ...]`): nilai apakah
   poin itu MASIH SESUAI dengan kode terbaru. Jika sesuai, jangan buat operasi apa pun. Jika tidak
   sesuai, pakai aksi `hapus` (sudah tidak berlaku) atau `ubah` (ganti dengan teks dari kode terbaru),
   sertakan `poin_id` poin tersebut. Tautan ke CR/B itu dicatat otomatis oleh DK Docs sebagai
   "sudah berubah dari kode terbaru"; kamu tidak perlu menyebut nomor CR/B di JSON.
6. Poin bertanda `[PENDING]` BUKAN bahan perbandingan: jangan diubah atau dihapus, cukup jadi referensi.

## Dokumentasi saat ini (referensi)
{{dokumentasi_terkait}}

## Daftar valid lainnya (untuk bergantung_pada)
{{daftar_ringkas}}

## Teknologi repo
{{aturan_teknologi}}

Teknologi tercatat (referensi):
{{teknologi_tercatat}}
## Aturan tulis
{{aturan_tulis}}
## Aturan penanda poin (id, nomor CR/B, [PENDING])
{{aturan_poin}}

## Output
Tulis ke `doc-generated/docs_{{kode_repo}}_{{unique_id}}.json`, jenis "sinkron_modul".
`aksi` modul: "ubah" (modul sudah terdaftar). Isi `ringkasan` dan `path_kode` modul hanya
bila berbeda dari yang terdaftar.
Format:
{{format_json}}
