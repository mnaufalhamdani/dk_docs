# Audit Commit bugfix
Sesi: {{unique_id}} | Repo: {{kode_repo}} | Branch: {{branch}}

## Tugas
Audit commit di branch {{branch}} dari {{hash_terakhir}} sampai HEAD:
  git log {{branch}} {{hash_terakhir}}..{{branch}} --no-merges --format="%H %s"
(Jika hash tidak ditemukan, pakai: --since="{{tanggal_terakhir}}".)
{{catatan_audit}}
Pesan commit di project ini TIDAK bisa dipercaya: tidak semua developer mengikuti aturan
penulisan (awalan seperti "bugfix:" mungkin tidak ada, salah, atau pesannya asal). Jangan
menyaring commit dari pesan atau awalannya. Dasar penilaian adalah ISI diff.

Langkah:
1. Lewati hanya commit yang pesannya memuat nomor CR/B (12 digit, mis. 202507220021 atau
   berawalan B): perubahan itu dicatat lewat jalur CR/B (Sync, lalu Usulan perubahan), supaya
   dokumentasinya terhubung ke nomor di database sumber. Agar tidak ada yang terlewat, tulis
   setiap nomor CR/B yang kamu lewati di `selisih_dokumentasi` dengan format
   "CR/B dilewati: <nomor> (<hash>)" supaya bisa dicek apakah sudah di-sync.
2. Untuk SETIAP commit lain, apa pun pesannya, baca diff (`git show <hash>`) dan file terkait.
3. Tentukan apakah perilaku yang terdokumentasi berubah: alur, validasi, komponen UI, atau API.
   Lewati commit yang hanya mengubah format, nama variabel, komentar, test, atau struktur kode
   tanpa mengubah perilaku.
4. Jika berubah, cocokkan dengan modul/menu/halaman pada daftar valid, bandingkan dengan
   dokumentasi saat ini, lalu tulis perubahan dokumentasinya sesuai KODE yang ada sekarang,
   bukan sesuai klaim pesan commit.
   Jika diff menambahkan menu atau halaman yang BELUM ada di daftar valid, tulis sebagai
   aksi "baru" lengkap dengan dokumentasinya (baca kode menu/halaman itu sampai tuntas),
   jangan hanya mencatat perubahan kecil.
5. Jika sebuah commit ambigu (tidak jelas perilaku berubah atau tidak, atau tidak jelas
   milik modul mana), jangan menebak: catat hash dan alasannya di `selisih_dokumentasi`
   agar ditinjau manual.

## Dokumentasi saat ini (referensi)
{{dokumentasi_terkait}}

## Daftar valid (modul, menu, halaman ringkas)
{{daftar_ringkas}}

## Aturan tulis
{{aturan_tulis}}
## Aturan penanda poin (id, nomor CR/B, [PENDING])
{{aturan_poin}}

## Output
Tulis ke `doc-generated/docs_{{kode_repo}}_{{unique_id}}.json`, jenis "audit_bugfix",
isi "hash_terakhir_diaudit" dengan hash HEAD branch saat ini (git rev-parse).
Format:
{{format_json}}
