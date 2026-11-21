# Usulan Perubahan Dokumentasi: {{nomor_perubahan}}
Sesi: {{unique_id}} | Repo: {{kode_repo}} | Branch: {{branch}}

## Tugas
Temukan semua perubahan kode untuk "{{nomor_perubahan}}" dengan DUA cara, lalu gabungkan:
1. Pesan commit di branch {{branch}}:
     git log {{branch}} --grep="{{nomor_perubahan}}" --format="%H %s"
2. Penanda di dalam kode (developer sering menandai dengan komentar/remark, dan pesan commit
   tidak selalu memuat nomornya). Cari nomor itu di kode saat ini dan di riwayat:
     git grep -n "{{nomor_perubahan}}"
     git log {{branch}} -S"{{nomor_perubahan}}" --format="%H %s"
   Baris kode di sekitar komentar itu adalah bagian yang berubah untuk perubahan ini.
Baca diff tiap commit dan file terkait (pemanggil, import, komponen turunan) untuk
memahami alurnya. Tentukan modul, menu, dan halaman yang dokumentasinya berubah, lalu
tulis perubahannya (poin ditambah/diubah/dihapus). Hanya baca, jangan ubah kode.

Aturan penting:
- Bandingkan dengan "Dokumentasi saat ini" di bawah. Jangan menulis "tambah" untuk hal yang sudah
  terdokumentasi dengan makna yang sama; pakai "ubah" bila ada yang berbeda, atau biarkan.
- Jika sebuah halaman memang disentuh perubahan ini tetapi dokumentasinya SUDAH sesuai dengan kode,
  tetap cantumkan halaman itu dengan aksi "ubah" dan `bagian` kosong ({}). Dengan begitu nomor
  perubahan tercatat di Riwayat halaman tersebut tanpa mengubah isinya.
- Nomor perubahan tidak perlu ditulis di dalam teks poin.

## Konteks pengerjaan (dari database)
{{daftar_pesan_pengerjaan}}

## Dokumentasi saat ini (referensi, bisa tertinggal)
Jika berbeda dengan kode, kode yang benar; catat selisihnya di "selisih_dokumentasi".
{{dokumentasi_terkait}}

## Daftar valid lainnya (modul, menu, halaman ringkas)
{{daftar_ringkas}}{{hasil_uji_cr}}

## Teknologi repo
{{aturan_teknologi}}

Teknologi tercatat (referensi):
{{teknologi_tercatat}}
## Aturan tulis
{{aturan_tulis}}
## Aturan penanda poin (id, nomor CR/B, [PENDING])
{{aturan_poin}}

## Output
Tulis JSON ke file `doc-generated/docs_{{kode_repo}}_{{unique_id}}.json` dengan
jenis "usulan_perubahan". Jangan menulis JSON di chat.
Format:
{{format_json}}
