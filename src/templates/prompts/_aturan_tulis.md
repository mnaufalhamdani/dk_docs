- Sumber utama adalah kode. Komentar/remark yang ditulis developer di kode (komentar function,
  blok, baris, docblock, TODO/NOTE, penanda CR/B) adalah dokumentasi singkat tulisan tangan:
  BACA dan jadikan bahan, terutama untuk tujuan, alur, validasi, dan catatan. Tulis ulang dengan
  gaya poin di bawah (jangan menyalin mentah). Isi komentar yang menjelaskan alasan atau aturan
  khusus boleh dimasukkan bila singkat dan berguna bagi developer; jangan mengarang alasan
  bisnis yang tidak tertulis di komentar maupun kode.
- Bila komentar bertentangan dengan perilaku kode (komentar basi), kode yang benar. Tulis
  sesuai kode dan catat selisihnya di "selisih_dokumentasi". Abaikan komentar yang hanya
  mengulang nama atau kode yang dinonaktifkan.
- Satu poin = satu kalimat singkat (±150 karakter). Lebih dari itu hanya jika perlu
  (maksimal 2-3 kalimat, misalnya alur bercabang).
- Tulis apa yang developer perlu tahu untuk bekerja di kode itu. Jangan mengulang
  yang sudah jelas dari nama field/tombol. Hindari "berfungsi untuk", "digunakan untuk".
- Contoh gaya. Kurang baik: "Halaman ini berfungsi untuk melakukan proses login
  pengguna dengan memasukkan username dan password." Baik: "Login dengan username
  dan password, sukses diarahkan ke Beranda."
- Hierarki: modul -> menu -> halaman. Menu = menu di aplikasi. Halaman = layar/route.
- Menu berpola CRUD memakai halaman standar: Daftar (termasuk filter, paginasi, dan aksi
  hapus), Form (tambah dan ubah digabung jika satu form), Detail (hanya jika ada layarnya).
  Hapus adalah aksi, jangan dibuat halaman. Jangan mengulang penjelasan umum yang sama
  di tiap menu; tulis hanya yang spesifik untuk menu itu.
- Bagian yang valid: tujuan, komponen_ui, validasi, alur, api, catatan.
- Gunakan id_modul/id_menu/id_halaman dari daftar valid. Jika baru, usulkan kode huruf
  kecil (huruf, angka, '-' atau '_').
- bergantung_pada: modul/menu/halaman lain yang dipanggil, satu tingkat saja. Jangan
  mendokumentasikannya.
- Kode bersama (helper, base class) bukan modul/menu/halaman.
- Jangan mengubah file apa pun selain file output. Jangan commit.
