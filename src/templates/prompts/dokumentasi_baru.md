# Dokumentasi Baru Modul
Sesi: {{unique_id}} | Repo: {{kode_repo}} | Branch: {{branch}}

## Tugas
Buat dokumentasi awal untuk modul berikut dengan membaca SELURUH kode di path-nya.
Temukan menu di dalam modul (menu di aplikasi), tentukan polanya (crud/lainnya), lalu
temukan halamannya dan tulis dokumentasi tiap halaman.
Saat membaca kode, perhatikan juga komentar/remark developer di dalamnya; itu bahan
dokumentasi (lihat aturan tulis).
{{daftar_modul_target}}

## Daftar valid lainnya (untuk bergantung_pada)
{{daftar_ringkas}}

## Teknologi repo
{{aturan_teknologi}}

Teknologi tercatat (referensi):
{{teknologi_tercatat}}
## Aturan tulis
{{aturan_tulis}}

## Output
Tulis ke `doc-generated/docs_{{kode_repo}}_{{unique_id}}.json`, jenis "dokumentasi_baru",
aksi modul "baru"/"ubah", aksi menu dan halaman "baru"; setiap bagian hanya berisi "tambah".
Format:
{{format_json}}
