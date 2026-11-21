# Ringkasan Implementasi DK Docs terhadap Rancangan Awal

Dibuat: 23 Oktober 2026. Dasar perbandingan: `PROMPT_BUILD_DK_DOCS.md`, `schema.sql`, kode di `src/` dan `scripts/`, serta catatan pengerjaan.

Catatan metode: `schema.sql` versi awal tidak tersimpan di git project ini (git di folder ini milik repositori induk `D:/server`), jadi perbandingan skema di bagian 1.B berdasarkan catatan pengerjaan, bukan diff otomatis. Ringkasan ini tidak menyalin isi kode.

---

## 1. Perubahan dari rancangan awal

### A. Fitur dan alur

| Area | Rancangan awal | Kondisi sekarang | Alasan (bila diketahui) |
|---|---|---|---|
| Tipe CR/B | Ditentukan dari awalan nomor (`CR` / `B`) | Ditentukan oleh **tabel sumber yang dipilih** (CR: `cr` + `cr_history_dev`; B: `cr_monitoring_bugs` + `cr_monitoring_bugs_history`). Nomor sumber 12 digit, bugfix biasanya berawalan `B`. | Struktur database `webfuzo` ternyata begitu; nomor tidak bisa dipakai membedakan tipe. |
| Nama mentah modul/menu | Satu kolom `modul` (bisa level modul atau menu) | Dua nilai: modul mentah dan menu mentah, diambil dari tabel induk (`cr.modul`, `cr.menu`). Keduanya dipakai pemetaan alias. | Sumber memang punya dua kolom. |
| Sync | Pratinjau lalu simpan semua pesan; yang sudah ada dilewati | Pratinjau punya **kotak centang per pesan**, penanda **berubah di sumber** (bisa diperbarui), dan **hilang di sumber** (hapus opsional, bawaan dibiarkan). Pesan baru yang tidak dicentang diingat sebagai diabaikan. | Permintaan user: tidak semua pesan CR/B berguna (ada yang iseng). |
| Prompt audit (template C) | Hanya commit berawalan `bugfix:`; abaikan `refactor:`, `optimize:`, `docs:` dan yang bernomor CR/B | Tidak menyaring dari pesan commit; semua commit tanpa nomor CR/B dinilai dari **isi diff**; commit ambigu dicatat di `selisih_dokumentasi`; nomor CR/B yang dilewati dicatat agar bisa dicek sudah di-Sync atau belum; menu/halaman baru di diff ditulis sebagai "baru". Ditambah `{{catatan_audit}}` untuk repo yang belum pernah diaudit. | Developer tidak selalu mengikuti aturan penulisan commit. |
| Jenis prompt | A usulan_perubahan, B dokumentasi_baru, C audit_bugfix, D blueprint | Ditambah jenis **`sinkron_modul`**: menyamakan dokumentasi satu modul dengan kode saat ini (menu/halaman baru ditulis "baru", yang basi diubah/dihapus). Tombolnya di halaman detail modul. | Menangani menu baru di modul yang sudah terdokumentasi tanpa bergantung pada commit. |
| Sumber bahan dokumentasi | "Hanya berdasarkan kode" | Komentar/remark developer juga dibaca sebagai bahan (semua template, lewat `_aturan_tulis`); bila bertentangan dengan kode, kode menang dan selisih dicatat. Prompt usulan juga mencari nomor CR/B di komentar kode (`git grep`, `git log -S`). | Komentar ditulis manual developer sebagai dokumentasi singkat. |
| Impor | Dampak dicatat dari yang benar-benar berubah | Untuk `usulan_perubahan`, halaman yang disebut agen dengan aksi `ubah` dan bagian kosong **tetap dicatat sebagai dampak**; perintah `tambah` yang isinya identik dengan poin yang ada **dilewati** (selain penanda duplikat di halaman review). | Agar CR tertaut ke halaman walau teks sudah sesuai; mencegah poin dobel. |
| Pencarian | Palet grup hasil | Hasil "isi dokumentasi" membuka halaman dengan `&p=<id poin>`; poin yang dicari **digulung ke tengah, dibuka bila terlipat, dan disorot** kilatan kuning. | Permintaan user. |
| Halaman dokumentasi | Tab halaman, bagian, file utama, gambar, Riwayat | Ditambah bagian **"Perubahan terkait"** (nomor CR/B yang pernah menyentuh halaman, bisa diklik). | Agar nomor CR/B terlihat tanpa menulisnya di teks poin. |
| Topbar | Pencarian dan aksi utama (Sync, Impor, Blueprint) | Ditambah tautan **Perubahan** dan **Prompt**. | Kedua menu itu perlu akses langsung. |
| Akses dev lewat IP | Tidak dibahas | `allowedDevOrigins` di `next.config.mjs` (172.*, 192.168.*, 10.*, `*.local`); laporan di `docs/reports/akses-dev-via-ip.md`. | Next 16 memblokir asset dev dari origin non-localhost sehingga hidrasi gagal (tombol cari/dark mode mati, "Ubah repo" tidak menyimpan). |
| AI | Kontrak + implementasi aturan + stub AI | Sesuai rancangan. | - |
| Dependensi | Disimpan satu tingkat; tampil di detail modul | Dependensi **disimpan** lewat impor (tautkan / stub / abaikan), tetapi **tidak ada tampilan** di detail modul/menu/halaman dan **tidak ada UI kelola manual**. | Tidak dikerjakan (tercatat di README sebagai penyimpangan). |

### B. Skema database

| Perubahan | Keterangan | Alasan |
|---|---|---|
| Semua primary key dan foreign key menjadi `BIGINT UNSIGNED` **tanpa AUTO_INCREMENT** | Kolom `*_kunci` (generated) juga `BIGINT UNSIGNED`. Hanya `perubahan_pesan.user_id` tetap `INT UNSIGNED` (id user sumber, bukan FK). ID dibuat aplikasi (`<timestamp ms><SERVER_ID 2 digit><counter>`, 17-18 digit). | Permintaan user memakai `IdGenerator` miliknya; display width `BIGINT(20)` tidak bermakna. |
| `perubahan_pesan`: `user_id` + `user_name` (bukan satu kolom developer), kolom `menu_sumber` baru, indeks developer pada `user_name` | Mengikuti kolom nyata di sumber. | Struktur sumber. |
| `sesi_prompt.jenis` ditambah nilai `sinkron_modul` | Enum sekarang: usulan_perubahan, dokumentasi_baru, audit_bugfix, blueprint, sinkron_modul. | Fitur sinkron modul. |
| Tabel baru **`perubahan_pesan_abaikan`** | Menyimpan (perubahan, sumber_id) pesan yang sengaja tidak disimpan saat Sync. | Agar Sync berikutnya tidak mencentangnya lagi. |
| Jumlah tabel 27 menjadi **28** | Selain tabel di atas, nama tabel dan kolom lain tidak diubah. | - |
| Komentar header `schema.sql` diperbarui | Menjelaskan konvensi ID dan larangan mengisi kolom `*_kunci`. | Dokumentasi. |
| Basis data: **MariaDB 11.8** (port 3307), bukan MySQL 8 | Kolom JSON berupa teks di MariaDB; kode menangani bentuk teks maupun objek. | Lingkungan pengerjaan. |

Pool mysql2 sekarang memakai `supportBigNumbers` + `bigNumberStrings`: ID dan hasil `COUNT(*)` berupa string di JavaScript. Seluruh validasi ID memakai teks digit, bukan angka.

### C. Struktur folder dan teknis

| Rancangan | Kondisi sekarang | Alasan |
|---|---|---|
| Folder project `dk-apps/dk-docs/` | Project berada langsung di root workspace. | Workspace sudah berupa folder project. |
| `src/app/api/v1/<modul>/route.js` per modul | **Satu** route `api/v1/[modul]/[[...path]]` yang membaca `<modul>.routes.js` (digabung di `modules/routes.index.js`). | Lebih ringkas; tetap menyalurkan ke daftar routes modul. |
| Pola file modul tanpa actions | Tiap modul yang mengubah data punya **`<modul>.actions.js`** (Server Actions dibungkus `jalankanAction`). | Spesifikasi sendiri menyebut Actions sebagai jalur ubah data. |
| `<modul>.routes.js` tiap modul | Hanya modul yang butuh endpoint HTTP (health, pencarian, pengaturan, perubahan, prompt, sync, dokumentasi/gambar). | Sesuai niat spesifikasi: routes hanya untuk yang tidak cocok dengan Actions. |
| Komponen editor poin dan diff di `modules/shared` | Editor poin ada di `modules/dokumentasi`; diff/review ada di `modules/impor`; `shared` berisi badge, tombol, form entitas, utilitas poin. | Lebih dekat ke pemakainya. |
| `middlewares/` untuk validasi dan error global | Ada `routeHandler.js`; validasi zod berjalan di controller lewat utilitas `validasi`. | Mengikuti aturan "controller memvalidasi dengan `*.schema.js`". |
| Modul `layout` hanya tampilan | Punya juga controller, usecase, dan model (pohon sidebar). | Pohon butuh data dari database. |
| `utils/` | Berisi lebih banyak helper dari yang diperkirakan: `appError`, `fulltext`, `i18n`, `idGenerator`, `jsonKolom`, `muat`, `pemecahPoin`, `pemilihImplementasi`, `penyimpananFile`, `responseHandler`, `schemaDasar`, `slug`, `templatePrompt`, `uniqueId`, `validasi`. | Logika berulang diekstrak sesuai aturan kompleksitas. |
| `sync.service.js` (opsional) | Tidak dibuat. | Belum ada API pengganti. |
| `apiClient`, `guard`, `pinia`, `router` | Tidak dibuat (sesuai spesifikasi). | - |
| Dibawa ke luar spesifikasi | `scripts/` (`db-init`, `db-seed`, `db-migrasi-id`, `_idGen`, `_koneksi`), `.kiro/steering/` (aturan kerja dan konteks project), `docs/reports/`, `backup/` (dump migrasi ID, di-gitignore), `README.md`. | Kebutuhan operasional. |
| Container DI | Ditambah registrasi `idGen` (singleton lewat `globalThis`). Bundle Next bisa terduplikasi, jadi generator tidak boleh punya state per-bundle. | Mencegah ID kembar. |
| Versi paket | Next 16.4.2, React 19.3.1, Tailwind 4.3.3, zod 4.6.7, awilix 13.0.5, mysql2 3.24.6, TypeScript 5.9.3, `@dnd-kit/*`. Semua di-pin. | Aturan: tanpa `^`. |

### D. Lingkungan dan konfigurasi

- `.env` / `.env.example`: ditambah `SERVER_ID` (aplikasi) dan `SCRIPT_SERVER_ID` (script, default 99).
- `rules.md` dan `architecture.md` yang disebut spesifikasi **tidak ada** di project; aturan dipegang oleh `.kiro/steering/working-rules.md` dan `project-context.md`. Tidak ada konflik yang tercatat.
- Tanpa test otomatis (sesuai aturan kerja); jumlah berkas test: 0.

---

## 2. Kondisi tiap fase

| Fase | Isi | Status | Catatan |
|---|---|---|---|
| 1. Fondasi, registry, dokumentasi | Setup, DI, CRUD repo/modul/menu/halaman, editor poin, tampilan baca, pencarian, seed | **Selesai** (sebagian kecil belum) | Tidak ada tampilan dependensi di detail modul dan tidak ada UI kelola dependensi. Interaksi browser (drag, dropdown, unggah gambar) belum diuji manual. |
| 2. Sync CR/B dan riwayat | Sync, pemetaan, riwayat, halaman Perubahan | **Selesai** | Diperluas: kotak centang, pesan berubah/hilang/diabaikan. |
| 3. Generator prompt dan Impor | Prompt A/B/C, unggah/tempel JSON, review, simpan transaksional | **Selesai** | Diperluas: jenis `sinkron_modul`, audit berbasis diff, dedupe poin, dampak halaman tanpa perubahan teks. Impor dengan JSON asli dari agen belum diuji setelah perubahan template terakhir. |
| 4. Blueprint | Poin, pencocokan, kelompok, urutan + alasan, prompt D | **Selesai** | Pemilik poin hanya saran heuristik; menyimpan ulang poin/pencocokan menghapus kelompok. |
| 5. Kerangka titik AI | Kontrak, implementasi aturan, stub AI, pemilihan lewat pengaturan | **Selesai** | Mode `ai` selalu kembali ke aturan; metode `ai.*.js` belum diisi (sesuai rancangan). |
| Tambahan setelah Fase 5 | Migrasi ID, akses via IP, audit berbasis diff, sinkron modul, sorotan pencarian, perubahan terkait, Sync dengan pilihan | **Selesai** | Dibangun atas permintaan di luar spesifikasi. Diuji lewat build dan uji sementara (sudah dihapus); tampilan di browser belum diperiksa langsung. |

---

## 3. Daftar modul dan file utamanya

Pola umum: `<modul>.controller.ts` -> `<modul>.usecase.ts` -> `<modul>.model.js` (semua SQL), `<modul>.schema.js` (validasi zod), `<modul>.actions.js` (Server Actions), `<modul>.routes.js` (bila ada endpoint HTTP).

| Modul (`src/modules/`) | Tanggung jawab | File utama selain pola umum |
|---|---|---|
| `repo` | CRUD repo, hitung modul | `DaftarRepo`, `FormRepo`, `RepoDetail` (tombol audit commit) |
| `modul` | CRUD modul, alias, tombol "Sinkronkan dengan kode" | `FormModul`, `ModulDetail` |
| `menu` | CRUD menu, alias, halaman standar CRUD | `FormMenu`, `MenuDetail` (tab halaman, Riwayat, parameter sorot `p`) |
| `halaman` | CRUD halaman, jenis, route, file utama, kata kunci | `FormHalaman` |
| `dokumentasi` | Poin, beta/live, "jadikan semua live", versi, gambar, DocPolisher | `HalamanView`, `PoinEditor`, `GaleriGambar`, `SorotPoin`; `polishers/` (`docPolisher.kontrak`, `aturan.docPolisher`, `ai.docPolisher`) |
| `perubahan` | Daftar/detail CR/B, pemetaan, dampak, riwayat, filter | `DaftarPerubahan`, `DetailPerubahan`, `PetakanForm`, `TimelineRiwayat`, `PerubahanTerkait` |
| `sync` | Baca database sumber (read-only), pratinjau, simpan dengan pilihan | `sync.pemetaan`, `FormSync`, `SyncHalaman`; konfigurasi di `src/config/sumber.config.js` |
| `prompt` | Sesi prompt A/B/C/sinkron, unduh `.md` | `prompt.dokumen` (pemformat teks prompt), `HalamanUsulan`, `PilihRepoUsulan`, `PilihModulBaru`, `HalamanDokumentasiBaru`, `HalamanPrompt`, `TabPrompt`, `DaftarPrompt` |
| `impor` | Validasi JSON agen, rencana review, simpan transaksional | `impor.rencana`, `impor.terapkan`, `impor.dependensi`, `impor.kemiripan`, `rencana.util`, `FormImpor`, `HalamanImpor`, `HalamanReview`, `ReviewImpor`, `KartuRencana`, `BarisRencana` |
| `blueprint` | Poin, pencocokan, kelompok, urutan, prompt D | `blueprint.pencocokan`, `blueprint.kelompok`, `blueprint.urutan`, `blueprint.dokumen`; tampilan `FormBlueprintBaru`, `HalamanBlueprint`, `SeksiPoin`, `SeksiPencocokan`, `SeksiKelompok`, `HalamanPromptBlueprint`, `DaftarBlueprint`; `analyzers/` dan `matchers/` (kontrak, aturan, ai) |
| `pencarian` | Pencarian global (FULLTEXT + LIKE) | `pencarian.usecase` (membentuk tautan, termasuk sorot poin) |
| `layout` | Kerangka aplikasi dan pohon sidebar | `AppShell`, `SidebarPohon`, `PaletPencarian`, `ThemeToggle` |
| `pengaturan` | Tabel `pengaturan` | `FormPengaturan` |
| `health` | Cek health | - |
| `shared` | Komponen lintas modul | `Badge`, `TombolAksi`, `CopyButton`, `HeaderHalaman`, `EntityForm`, `fieldDefs`, `BelumAdaDokumentasi`, `poin.util`, `ui` |

Struktur pendukung:

| Lokasi | Isi |
|---|---|
| `src/app/` | Routing tipis (beranda, repo, modul, menu, halaman, perubahan, prompt, impor, blueprint, sync, pengaturan) dan satu route API |
| `src/di/container.js` | Registrasi awilix: model, usecase, controller, `idGen`, logger, penyimpanan file, pemilih implementasi AI |
| `src/config/` | `database.js` (dashboard), `database.sumber.js` (read-only), `sumber.config.js` |
| `src/templates/prompts/` | `usulan_perubahan`, `dokumentasi_baru`, `audit_bugfix`, `sinkron_modul`, `blueprint_kelompok`, blok `_aturan_tulis` dan `_format_json` |
| `src/utils/` | Helper global (lihat 1.C), termasuk `idGenerator.js` (disalin persis dari milik user) |
| `src/enums/`, `src/locales/id_ID.json`, `src/logger/`, `src/middlewares/` | Konstanta, teks UI Indonesia, pencatat error, pembungkus endpoint |
| `src/assets/contoh-impor.json` | Contoh JSON impor untuk uji manual |
| `scripts/` | `db-init`, `db-seed`, `db-migrasi-id`, `_idGen`, `_koneksi` |
| `uploads/` | Gambar halaman (di-gitignore, hanya `.gitkeep`) |
| `docs/reports/` | `akses-dev-via-ip.md` |
| `.kiro/steering/` | `working-rules.md`, `project-context.md` |
| `schema.sql` | 28 tabel |

---

## 4. Yang belum jadi atau masih bermasalah

### Belum dikerjakan
- **Dependensi tidak tampil.** Data `dependensi_modul/menu/halaman` terisi lewat impor, tetapi tidak ada tampilan di detail modul/menu/halaman dan tidak ada UI untuk mengelolanya secara manual.
- **AI sungguhan.** Tiga berkas `ai.*.js` masih stub (sesuai rancangan Fase 5); mode `ai` otomatis memakai aturan.
- **`sync.service.js`** (versi API) belum dibuat; sumber CR/B masih dibaca langsung dari database.
- **Penamaan:** jenis `audit_bugfix` dan label "Audit commit bugfix" belum diganti padahal kini mencakup semua commit tanpa nomor CR/B. Perubahan nama menyentuh enum database, JSON agen, dan teks UI sehingga ditunda menunggu keputusan.

### Belum diuji
- Interaksi browser: drag editor poin dan blueprint, dropdown, tombol Salin, unggah gambar, drawer layar sempit, sorotan kilat dan kotak centang Sync (hanya sisi server dan build yang diperiksa).
- Alur penuh Impor dengan JSON nyata dari agen untuk template yang baru diubah (audit berbasis diff, sinkron modul, aturan komentar) dan jenis `sinkron_modul`.
- Mode produksi (`next start`) hanya diuji sebagian (halaman utama dan beberapa alur lewat route uji sementara), bukan semua alur.
- MySQL 8 asli (spesifikasi menyebut MySQL 8; yang dipakai MariaDB 11.8).
- Perilaku bila dua instance aplikasi menulis ke database yang sama dengan `SERVER_ID` berbeda.

### Masalah dan risiko yang diketahui
- **Kredensial sumber:** `SUMBER_DB_USER` masih `root`. Spesifikasi mewajibkan user read-only. Koneksi sumber memang dipaksa sesi `READ ONLY`, tetapi akun sebaiknya tetap diganti.
- **Tanpa autentikasi:** semua halaman, route API, dan Server Actions terbuka bagi siapa pun di jaringan; sesuai rancangan (jaringan internal), tetapi perlu diingat.
- **ID dan urutan:** `ORDER BY id` diandalkan sebagai urutan waktu, sementara counter generator hanya 2 digit. Bila 100 atau lebih ID dibuat dalam satu milidetik urutan bisa tidak naik; mundurnya jam server juga berisiko. Risiko ini sudah diterima user. Script migrasi dan seed menghindarinya dengan menunggu pergantian milidetik; aplikasi biasa tidak.
- **Skema yang sudah terpasang:** `db:init` melewati database yang sudah ada. Database lain yang dibuat dari skema lama perlu `ALTER` enum `sesi_prompt.jenis` dan pembuatan tabel `perubahan_pesan_abaikan` secara manual (database `dk_docs` lokal sudah diperbarui).
- **Skrip migrasi ID** tidak mencakup tabel `perubahan_pesan_abaikan` dan hanya cocok untuk skema lama. ID lama di dalam teks `isi_prompt` dan `json_mentah` hasil impor lama tidak ikut dipetakan (hanya riwayat).
- **Sync:** pesan CR/B disimpan apa adanya tanpa perapian bahasa. Menghapus pesan yang hilang di sumber juga menghapus pemetaannya, tetapi dampak dokumentasi yang sudah tercatat tidak dibatalkan. Daftar pesan yang diabaikan hanya terlihat saat Sync ulang nomor yang sama.
- **Prompt:** branch di prompt mengikuti "Branch utama" pada repo; prompt audit memakainya langsung di perintah git, sedangkan prompt lain hanya mencantumkannya sebagai keterangan. Berganti branch di tengah jalan membuat `hash_audit_terakhir` kurang bermakna.
- **Komentar kode sebagai sumber:** komentar basi bisa menyesatkan agen; mitigasinya hanya aturan "kode menang" dan halaman review.
- **Dokumen turunan sudah sebagian usang:** `README.md` belum menyebut jenis `sinkron_modul`, tabel `perubahan_pesan_abaikan`, dan audit berbasis diff; `project-context.md` memuat Sync dan ID tetapi belum jenis `sinkron_modul`. Bagian "Penyimpangan" README juga masih menyebut Template C hanya ditambah `{{catatan_audit}}`, padahal isinya sudah berubah.
- **Git:** repositori git ada di folder induk (`D:/server`), bukan di project ini; perubahan project belum di-commit sesuai aturan.
- **Data lokal:** database `dk_docs` berisi data nyata hasil pengerjaan; folder `backup/` menyimpan dump JSON sebelum migrasi ID (di-gitignore).

---

## 5. Pemeriksaan SSL pada health check URL beta/live

Ditambahkan setelah pemeriksaan URL beta/live di endpoint health. Detail ada di `README.md`.

| Area | Kondisi sekarang | Alasan |
|---|---|---|
| Hasil per URL | Ditambah field `ssl`: `berlaku_sampai`, `berlaku_sampai_teks` (WIB), `sisa_hari`, `pesan_error`, `peringatan`. Field lama tidak berubah. `ssl` bernilai `null` untuk URL `http`. | Tanggal kedaluwarsa harus selalu terlihat, pesan error hanya bila SSL error. |
| Pembacaan sertifikat | `health.sertifikat.js` memakai `tls.connect` ke host dan port dari URL (port non-standar dihormati), `rejectUnauthorized: false`, hasil verifikasi dari `authorized`/`authorizationError`, nama host lewat `checkServerIdentity`. Pesan Bahasa Indonesia per kode galat. | Sertifikat bermasalah tetap harus terbaca. |
| Klasifikasi status | Server menjawab tetapi SSL error menjadi `bermasalah`; `offline` hanya bila server tidak terjangkau. Sebelumnya pemeriksaan HTTP memakai `fetch` dengan verifikasi aktif, sehingga galat sertifikat dilaporkan `offline`. Sekarang memakai `node:http(s)` tanpa verifikasi (hanya `HEAD`/`GET`). Kode `fetch` lama dibiarkan sebagai arsip tak terpakai. | Kegagalan sertifikat bukan berarti server mati. |
| Peringatan | Sisa kurang dari 30 hari mengisi `peringatan`, status tetap `online`. | Peringatan dini tanpa memicu status buruk. |
| Batas waktu | SSL 3 detik (prompt menyebut ± 4 detik); disamakan di bawah batas 4 detik klien halaman Sync. | Menghindari Sync salah menampilkan Offline. |

Belum diuji: kasus rantai "sertifikat urutan 0 dari penerbit A, urutan 1-2 dari penerbit B" pada server sebenarnya (hanya `incomplete-chain.badssl.com` yang dicoba, kodenya `UNABLE_TO_VERIFY_LEAF_SIGNATURE`); `NODE_EXTRA_CA_CERTS` dengan CA internal; tidak ada tampilan UI yang membaca hasil URL, jadi tidak ada UI yang diubah.
