-- =====================================================================
-- DK Docs: skema database (MySQL 8+)
-- Hierarki: repo -> modul -> menu -> halaman -> poin dokumentasi
-- Konvensi: snake_case, nama tabel singular, created_at/updated_at.
-- Database sumber CR/B TIDAK dibuat di sini (terpisah, read-only).
-- Catatan FULLTEXT InnoDB: token minimal default 3 karakter
-- (innodb_ft_min_token_size). Turunkan ke 2 bila perlu mencari kata pendek.
-- Kolom *_kunci (generated) dipakai agar UNIQUE tetap bekerja pada kolom
-- opsional yang bernilai NULL (MySQL menganggap NULL selalu berbeda).
-- ID: semua primary key (dan foreign key-nya) bertipe BIGINT UNSIGNED tanpa AUTO_INCREMENT.
-- ID dibuat aplikasi (src/utils/idGenerator.js: <timestamp ms><SERVER_ID><counter>, 17-18 digit)
-- dan HARUS diperlakukan sebagai string di JavaScript. Pool mysql2 memakai bigNumberStrings.
-- Jangan mengisi kolom *_kunci saat INSERT.
-- Jumlah tabel: 30 (poin_perubahan = tautan poin dokumentasi ke CR/B, lihat bagian 4;
-- repo_teknologi = teknologi per repo, lihat bagian 1).
-- Database yang sudah terpasang tidak berubah otomatis oleh db:init; jalankan sesuai kebutuhan:
--   npm run db:migrasi-poin-perubahan   (tabel poin_perubahan)
--   npm run db:migrasi-info-repo        (kolom url_git/url_beta/url_live + tabel repo_teknologi)
--   npm run db:migrasi-indeks-dashboard (indeks tambahan untuk beranda dashboard)
-- =====================================================================

CREATE DATABASE IF NOT EXISTS dk_docs
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE dk_docs;

-- ---------------------------------------------------------------------
-- 1. REGISTRY: repo -> modul -> menu -> halaman
-- ---------------------------------------------------------------------

-- Satu repo git (contoh: DK Apps). `kode` dipakai di nama file
-- (docs_<kode>_<uniqueId>.json): hanya huruf kecil, angka, '-' atau '_'.
CREATE TABLE repo (
  id                      BIGINT UNSIGNED NOT NULL,
  kode                    VARCHAR(60)  NOT NULL,
  nama                    VARCHAR(150) NOT NULL,
  platform                VARCHAR(30)  NOT NULL DEFAULT 'js',          -- js, php, flutter, kotlin, lainnya
  branch_utama            VARCHAR(100) NOT NULL DEFAULT 'development', -- branch yang dibaca agent
  url_git                 VARCHAR(500) NULL,                           -- tautan repo git (manual, tanpa kredensial)
  url_beta                VARCHAR(500) NULL,                           -- tautan aplikasi beta (hanya tautan, tanpa cek status)
  url_live                VARCHAR(500) NULL,                           -- tautan aplikasi live (hanya tautan, tanpa cek status)
  hash_audit_terakhir     VARCHAR(64)  NULL,                           -- hash commit terakhir yang sudah diaudit
  tanggal_audit_terakhir  DATETIME     NULL,                           -- cadangan jika hash tidak ditemukan
  created_at              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_repo_kode (kode)
) ENGINE=InnoDB;

-- Teknologi sebuah repo (bahasa/runtime dan framework utama beserta versinya).
-- Diisi manual atau dari JSON agent (bagian `teknologi`); bukan poin dokumentasi.
CREATE TABLE repo_teknologi (
  id           BIGINT UNSIGNED NOT NULL,
  repo_id      BIGINT UNSIGNED NOT NULL,
  nama         VARCHAR(100) NOT NULL,                                  -- misal Flutter, Dart, Kotlin, PHP, Node.js, Next.js
  versi        VARCHAR(50)  NULL,
  sumber_file  VARCHAR(255) NULL,                                      -- file manifest asal, misal pubspec.yaml
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_repo_teknologi (repo_id, nama),
  CONSTRAINT fk_repo_teknologi_repo FOREIGN KEY (repo_id) REFERENCES repo (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Modul = folder module, atau path di luar folder module (contoh: Transport).
-- is_stub = 1: terdaftar (misal dari dependensi) tapi belum didokumentasikan.
CREATE TABLE modul (
  id          BIGINT UNSIGNED NOT NULL,
  repo_id     BIGINT UNSIGNED NOT NULL,
  kode        VARCHAR(80)  NOT NULL,
  nama        VARCHAR(150) NOT NULL,
  path_kode   VARCHAR(500) NULL,
  ringkasan   VARCHAR(300) NULL,
  is_stub     TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_modul_repo_kode (repo_id, kode),
  KEY idx_modul_stub (is_stub, repo_id),                 -- dashboard: modul stub per repo
  CONSTRAINT fk_modul_repo FOREIGN KEY (repo_id) REFERENCES repo (id)
) ENGINE=InnoDB;

-- Alias modul. jenis 'database'  : nama di data CR/B sumber (untuk sync).
--              jenis 'kata_kunci': istilah pencarian/pencocokan blueprint.
-- Satu alias boleh menunjuk beberapa modul (modul sama di repo berbeda).
CREATE TABLE modul_alias (
  id        BIGINT UNSIGNED NOT NULL,
  modul_id  BIGINT UNSIGNED NOT NULL,
  alias     VARCHAR(150) NOT NULL,
  jenis     ENUM('database','kata_kunci') NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_modul_alias (modul_id, jenis, alias),
  KEY idx_modul_alias_alias (alias),
  CONSTRAINT fk_modul_alias_modul FOREIGN KEY (modul_id) REFERENCES modul (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Menu = menu di aplikasi (contoh: Transport Daily). Milik satu modul.
-- pola: 'crud' (Daftar/Form/Detail standar) atau 'lainnya'.
CREATE TABLE menu (
  id          BIGINT UNSIGNED NOT NULL,
  modul_id    BIGINT UNSIGNED NOT NULL,
  kode        VARCHAR(80)  NOT NULL,
  nama        VARCHAR(150) NOT NULL,
  route       VARCHAR(300) NULL,
  path_kode   VARCHAR(500) NULL,
  ringkasan   VARCHAR(300) NULL,
  pola        VARCHAR(30)  NOT NULL DEFAULT 'lainnya',
  urutan      SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_stub     TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_menu_modul_kode (modul_id, kode),
  CONSTRAINT fk_menu_modul FOREIGN KEY (modul_id) REFERENCES modul (id)
) ENGINE=InnoDB;

CREATE TABLE menu_alias (
  id        BIGINT UNSIGNED NOT NULL,
  menu_id   BIGINT UNSIGNED NOT NULL,
  alias     VARCHAR(150) NOT NULL,
  jenis     ENUM('database','kata_kunci') NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_menu_alias (menu_id, jenis, alias),
  KEY idx_menu_alias_alias (alias),
  CONSTRAINT fk_menu_alias_menu FOREIGN KEY (menu_id) REFERENCES menu (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Halaman = layar/route di dalam menu. Tempat dokumentasi detail berada.
-- jenis: daftar, form, detail, lainnya (hapus adalah aksi di Daftar, bukan halaman).
-- file_utama: JSON array path file, misal ["src/modules/transport/daily/list.js"].
CREATE TABLE halaman (
  id          BIGINT UNSIGNED NOT NULL,
  menu_id     BIGINT UNSIGNED NOT NULL,
  kode        VARCHAR(80)  NOT NULL,
  nama        VARCHAR(150) NOT NULL,
  jenis       VARCHAR(30)  NOT NULL DEFAULT 'lainnya',
  route       VARCHAR(300) NULL,
  file_utama  JSON         NULL,
  urutan      SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_stub     TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_halaman_menu_kode (menu_id, kode),
  KEY idx_halaman_route (route(100)),
  CONSTRAINT fk_halaman_menu FOREIGN KEY (menu_id) REFERENCES menu (id)
) ENGINE=InnoDB;

CREATE TABLE halaman_kata_kunci (
  id          BIGINT UNSIGNED NOT NULL,
  halaman_id  BIGINT UNSIGNED NOT NULL,
  kata_kunci  VARCHAR(150) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_halaman_kata_kunci (halaman_id, kata_kunci),
  KEY idx_halaman_kata_kunci (kata_kunci),
  CONSTRAINT fk_hkk_halaman FOREIGN KEY (halaman_id) REFERENCES halaman (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 2. ISI DOKUMENTASI (poin per bagian, flag per poin)
-- ---------------------------------------------------------------------

-- bagian: tujuan, komponen_ui, validasi, alur, api, catatan (divalidasi di aplikasi).
-- status: beta = masih testing, live = sudah rilis. Poin hasil impor default beta.
-- asal  : dari mana poin berasal (untuk membandingkan aturan vs AI nanti).
CREATE TABLE poin_dokumentasi (
  id          BIGINT UNSIGNED NOT NULL,
  halaman_id  BIGINT UNSIGNED NOT NULL,
  bagian      VARCHAR(30)  NOT NULL,
  isi         TEXT         NOT NULL,
  status      ENUM('beta','live') NOT NULL DEFAULT 'beta',
  urutan      SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  asal        ENUM('manual','impor','aturan','ai') NOT NULL DEFAULT 'manual',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_poin_halaman_bagian (halaman_id, bagian, urutan),
  KEY idx_poin_status_updated (status, updated_at),       -- dashboard: poin beta
  KEY idx_poin_halaman_updated (halaman_id, updated_at),  -- dashboard: kelengkapan modul
  FULLTEXT KEY ft_poin_isi (isi),
  CONSTRAINT fk_poin_halaman FOREIGN KEY (halaman_id) REFERENCES halaman (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Gambar pendukung (opsional). File di disk, tabel ini menyimpan path-nya.
CREATE TABLE gambar_halaman (
  id          BIGINT UNSIGNED NOT NULL,
  halaman_id  BIGINT UNSIGNED NOT NULL,
  nama_file   VARCHAR(200) NOT NULL,
  path_file   VARCHAR(500) NOT NULL,
  keterangan  VARCHAR(300) NULL,
  urutan      SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_gambar_halaman (halaman_id, urutan),
  CONSTRAINT fk_gambar_halaman FOREIGN KEY (halaman_id) REFERENCES halaman (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Dependensi satu tingkat sebagai referensi (bukan dokumentasi berantai).
CREATE TABLE dependensi_modul (
  id           BIGINT UNSIGNED NOT NULL,
  modul_id     BIGINT UNSIGNED NOT NULL,
  ke_modul_id  BIGINT UNSIGNED NOT NULL,
  keterangan   VARCHAR(300) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_dependensi_modul (modul_id, ke_modul_id),
  CONSTRAINT fk_depmodul_dari FOREIGN KEY (modul_id)    REFERENCES modul (id) ON DELETE CASCADE,
  CONSTRAINT fk_depmodul_ke   FOREIGN KEY (ke_modul_id) REFERENCES modul (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE dependensi_menu (
  id          BIGINT UNSIGNED NOT NULL,
  menu_id     BIGINT UNSIGNED NOT NULL,
  ke_menu_id  BIGINT UNSIGNED NOT NULL,
  keterangan  VARCHAR(300) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_dependensi_menu (menu_id, ke_menu_id),
  CONSTRAINT fk_depmenu_dari FOREIGN KEY (menu_id)    REFERENCES menu (id) ON DELETE CASCADE,
  CONSTRAINT fk_depmenu_ke   FOREIGN KEY (ke_menu_id) REFERENCES menu (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE dependensi_halaman (
  id             BIGINT UNSIGNED NOT NULL,
  halaman_id     BIGINT UNSIGNED NOT NULL,
  ke_halaman_id  BIGINT UNSIGNED NOT NULL,
  keterangan     VARCHAR(300) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_dependensi_halaman (halaman_id, ke_halaman_id),
  CONSTRAINT fk_dephal_dari FOREIGN KEY (halaman_id)    REFERENCES halaman (id) ON DELETE CASCADE,
  CONSTRAINT fk_dephal_ke   FOREIGN KEY (ke_halaman_id) REFERENCES halaman (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 3. PERUBAHAN CR/B (hasil sync dari database sumber)
-- ---------------------------------------------------------------------

-- Satu baris per nomor CR/B. nomor disimpan persis seperti di sumber
-- (misal CR2605060003, B2609090002).
CREATE TABLE perubahan (
  id          BIGINT UNSIGNED NOT NULL,
  tipe        ENUM('CR','B') NOT NULL,
  nomor       VARCHAR(60)  NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_perubahan_tipe_nomor (tipe, nomor)
) ENGINE=InnoDB;

-- Satu nomor bisa punya banyak pesan pengerjaan.
-- sumber_id    = id baris di database sumber (mencegah duplikat saat sync ulang).
-- modul_sumber = nama modul mentah dari sumber (sebelum dipetakan).
-- menu_sumber  = nama menu mentah dari sumber (sebelum dipetakan).
CREATE TABLE perubahan_pesan (
  id            BIGINT UNSIGNED NOT NULL,
  perubahan_id  BIGINT UNSIGNED NOT NULL,
  sumber_id     VARCHAR(100) NOT NULL,
  pesan         TEXT         NOT NULL,
  user_id       INT UNSIGNED NULL,
  user_name     VARCHAR(150) NULL,
  tanggal       DATETIME     NULL,
  modul_sumber  VARCHAR(200) NULL,
  menu_sumber   VARCHAR(200) NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pesan_perubahan_sumber (perubahan_id, sumber_id),
  KEY idx_pesan_tanggal (tanggal),
  KEY idx_pesan_tanggal_perubahan (tanggal, perubahan_id), -- dashboard: rentang tanggal CR/B
  KEY idx_pesan_created (created_at),                      -- dashboard: waktu Sync terakhir
  KEY idx_pesan_developer (user_name),
  FULLTEXT KEY ft_pesan_isi (pesan),
  CONSTRAINT fk_pesan_perubahan FOREIGN KEY (perubahan_id) REFERENCES perubahan (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Pesan sumber yang sengaja TIDAK disimpan user saat Sync (tidak dicentang di pratinjau).
-- Hanya mengingat sumber_id agar sync berikutnya tidak mencentangnya lagi secara bawaan.
CREATE TABLE perubahan_pesan_abaikan (
  id            BIGINT UNSIGNED NOT NULL,
  perubahan_id  BIGINT UNSIGNED NOT NULL,
  sumber_id     VARCHAR(100) NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_abaikan (perubahan_id, sumber_id),
  CONSTRAINT fk_abaikan_perubahan FOREIGN KEY (perubahan_id) REFERENCES perubahan (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Pemetaan pesan -> modul (dan menu bila alias database cocok di level menu).
-- Pesan tanpa baris di sini = "belum dipetakan". Bisa lebih dari satu (beda repo).
CREATE TABLE perubahan_pesan_peta (
  id                  BIGINT UNSIGNED NOT NULL,
  perubahan_pesan_id  BIGINT UNSIGNED NOT NULL,
  modul_id            BIGINT UNSIGNED NOT NULL,
  menu_id             BIGINT UNSIGNED NULL,
  menu_kunci          BIGINT UNSIGNED AS (IFNULL(menu_id, 0)) VIRTUAL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_peta (perubahan_pesan_id, modul_id, menu_kunci),
  KEY idx_peta_modul (modul_id),
  KEY idx_peta_menu (menu_id),
  KEY idx_peta_modul_pesan (modul_id, perubahan_pesan_id), -- dashboard: filter repo CR/B
  CONSTRAINT fk_peta_pesan FOREIGN KEY (perubahan_pesan_id) REFERENCES perubahan_pesan (id) ON DELETE CASCADE,
  CONSTRAINT fk_peta_modul FOREIGN KEY (modul_id)           REFERENCES modul (id) ON DELETE CASCADE,
  CONSTRAINT fk_peta_menu  FOREIGN KEY (menu_id)            REFERENCES menu (id)  ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4. SESI PROMPT & IMPOR (alur salin prompt -> agent -> impor JSON)
-- ---------------------------------------------------------------------

-- unique_id dipakai bersama semua prompt satu sesi (satu per repo),
-- sehingga kuncinya (unique_id, repo_id).
CREATE TABLE sesi_prompt (
  id            BIGINT UNSIGNED NOT NULL,
  unique_id     VARCHAR(40)  NOT NULL,
  repo_id       BIGINT UNSIGNED NOT NULL,
  jenis         ENUM('usulan_perubahan','dokumentasi_baru','audit_bugfix','blueprint','sinkron_modul') NOT NULL,
  perubahan_id  BIGINT UNSIGNED NULL,
  isi_prompt    MEDIUMTEXT   NOT NULL,
  status        ENUM('dibuat','diimpor','disimpan','dibatalkan') NOT NULL DEFAULT 'dibuat',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sesi_unique_repo (unique_id, repo_id),
  KEY idx_sesi_perubahan (perubahan_id),
  CONSTRAINT fk_sesi_repo      FOREIGN KEY (repo_id)      REFERENCES repo (id),
  CONSTRAINT fk_sesi_perubahan FOREIGN KEY (perubahan_id) REFERENCES perubahan (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Modul target sebuah sesi (dokumentasi_baru, blueprint, atau modul terdampak CR/B).
CREATE TABLE sesi_prompt_modul (
  sesi_prompt_id  BIGINT UNSIGNED NOT NULL,
  modul_id        BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (sesi_prompt_id, modul_id),
  KEY idx_spm_modul (modul_id),
  CONSTRAINT fk_spm_sesi  FOREIGN KEY (sesi_prompt_id) REFERENCES sesi_prompt (id) ON DELETE CASCADE,
  CONSTRAINT fk_spm_modul FOREIGN KEY (modul_id)       REFERENCES modul (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- JSON mentah hasil agent yang diunggah/ditempel (disimpan sebelum direview).
CREATE TABLE impor_hasil (
  id              BIGINT UNSIGNED NOT NULL,
  sesi_prompt_id  BIGINT UNSIGNED NOT NULL,
  json_mentah     LONGTEXT     NOT NULL,
  status          ENUM('menunggu_review','disimpan','dibatalkan') NOT NULL DEFAULT 'menunggu_review',
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_impor_sesi (sesi_prompt_id),
  CONSTRAINT fk_impor_sesi FOREIGN KEY (sesi_prompt_id) REFERENCES sesi_prompt (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Dampak perubahan CR/B: modul/menu/halaman yang benar-benar berubah,
-- diambil dari JSON impor yang disimpan. Dasar tab Riwayat per level.
CREATE TABLE perubahan_dampak (
  id              BIGINT UNSIGNED NOT NULL,
  perubahan_id    BIGINT UNSIGNED NOT NULL,
  modul_id        BIGINT UNSIGNED NOT NULL,
  menu_id         BIGINT UNSIGNED NULL,
  halaman_id      BIGINT UNSIGNED NULL,
  impor_hasil_id  BIGINT UNSIGNED NULL,
  menu_kunci      BIGINT UNSIGNED AS (IFNULL(menu_id, 0)) VIRTUAL,
  halaman_kunci   BIGINT UNSIGNED AS (IFNULL(halaman_id, 0)) VIRTUAL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_dampak (perubahan_id, modul_id, menu_kunci, halaman_kunci),
  KEY idx_dampak_modul (modul_id),
  KEY idx_dampak_menu (menu_id),
  KEY idx_dampak_halaman (halaman_id),
  CONSTRAINT fk_dampak_perubahan FOREIGN KEY (perubahan_id)   REFERENCES perubahan (id)   ON DELETE CASCADE,
  CONSTRAINT fk_dampak_modul     FOREIGN KEY (modul_id)       REFERENCES modul (id)       ON DELETE CASCADE,
  CONSTRAINT fk_dampak_menu      FOREIGN KEY (menu_id)        REFERENCES menu (id)        ON DELETE CASCADE,
  CONSTRAINT fk_dampak_halaman   FOREIGN KEY (halaman_id)     REFERENCES halaman (id)     ON DELETE CASCADE,
  CONSTRAINT fk_dampak_impor     FOREIGN KEY (impor_hasil_id) REFERENCES impor_hasil (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Tautan poin dokumentasi ke CR/B. Dibuat saat impor "usulan_perubahan" disimpan (poin yang ditambah/diubah).
-- poin_id boleh NULL: bila poinnya dihapus, tautan tetap ada (ON DELETE SET NULL) dan teks_poin
-- menjadi dasar tampilan riwayat. halaman_id disimpan agar riwayat tetap menunjuk halaman.
-- status: aktif = poin masih hasil CR/B ini; pending = ditahan (poin tampil redup & tercoret);
--         sudah_berubah = poin diganti/dihapus oleh impor "sinkron_modul" (teks_poin tetap teks lama).
-- Tidak ada UNIQUE (poin_id, perubahan_id) karena poin_id bisa NULL; duplikat dicegah di logika simpan.
CREATE TABLE poin_perubahan (
  id            BIGINT UNSIGNED NOT NULL,
  poin_id       BIGINT UNSIGNED NULL,
  perubahan_id  BIGINT UNSIGNED NOT NULL,
  halaman_id    BIGINT UNSIGNED NOT NULL,
  teks_poin     TEXT         NOT NULL,
  status        ENUM('aktif','pending','sudah_berubah') NOT NULL DEFAULT 'aktif',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pp_perubahan (perubahan_id),
  KEY idx_pp_poin (poin_id),
  KEY idx_pp_halaman (halaman_id),
  KEY idx_pp_status (status),
  KEY idx_pp_status_halaman (status, halaman_id),         -- dashboard: poin pending
  CONSTRAINT fk_pp_poin      FOREIGN KEY (poin_id)      REFERENCES poin_dokumentasi (id) ON DELETE SET NULL,
  CONSTRAINT fk_pp_perubahan FOREIGN KEY (perubahan_id) REFERENCES perubahan (id)        ON DELETE CASCADE,
  CONSTRAINT fk_pp_halaman   FOREIGN KEY (halaman_id)   REFERENCES halaman (id)          ON DELETE CASCADE
) ENGINE=InnoDB;

-- Riwayat versi di belakang layar: snapshot seluruh poin halaman tiap disimpan.
CREATE TABLE halaman_versi (
  id              BIGINT UNSIGNED NOT NULL,
  halaman_id      BIGINT UNSIGNED NOT NULL,
  snapshot        JSON         NOT NULL,
  alasan          VARCHAR(200) NULL,
  sesi_prompt_id  BIGINT UNSIGNED NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_versi_halaman (halaman_id, created_at),
  KEY idx_versi_created (created_at),                     -- dashboard: aktivitas dokumentasi
  CONSTRAINT fk_versi_halaman FOREIGN KEY (halaman_id)     REFERENCES halaman (id) ON DELETE CASCADE,
  CONSTRAINT fk_versi_sesi    FOREIGN KEY (sesi_prompt_id) REFERENCES sesi_prompt (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Entri "audit bugfix" (commit bugfix: tanpa nomor CR/B) agar muncul di Riwayat.
CREATE TABLE audit_bugfix (
  id              BIGINT UNSIGNED NOT NULL,
  repo_id         BIGINT UNSIGNED NOT NULL,
  hash_awal       VARCHAR(64)  NULL,
  hash_akhir      VARCHAR(64)  NULL,
  tanggal_awal    DATETIME     NULL,
  tanggal_akhir   DATETIME     NULL,
  ringkasan       TEXT         NULL,
  sesi_prompt_id  BIGINT UNSIGNED NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_repo (repo_id, created_at),
  CONSTRAINT fk_audit_repo FOREIGN KEY (repo_id)        REFERENCES repo (id),
  CONSTRAINT fk_audit_sesi FOREIGN KEY (sesi_prompt_id) REFERENCES sesi_prompt (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE audit_bugfix_dampak (
  id               BIGINT UNSIGNED NOT NULL,
  audit_bugfix_id  BIGINT UNSIGNED NOT NULL,
  modul_id         BIGINT UNSIGNED NOT NULL,
  menu_id          BIGINT UNSIGNED NULL,
  halaman_id       BIGINT UNSIGNED NULL,
  menu_kunci       BIGINT UNSIGNED AS (IFNULL(menu_id, 0)) VIRTUAL,
  halaman_kunci    BIGINT UNSIGNED AS (IFNULL(halaman_id, 0)) VIRTUAL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_audit_dampak (audit_bugfix_id, modul_id, menu_kunci, halaman_kunci),
  KEY idx_adampak_modul (modul_id),
  KEY idx_adampak_menu (menu_id),
  KEY idx_adampak_halaman (halaman_id),
  CONSTRAINT fk_adampak_audit   FOREIGN KEY (audit_bugfix_id) REFERENCES audit_bugfix (id) ON DELETE CASCADE,
  CONSTRAINT fk_adampak_modul   FOREIGN KEY (modul_id)        REFERENCES modul (id)        ON DELETE CASCADE,
  CONSTRAINT fk_adampak_menu    FOREIGN KEY (menu_id)         REFERENCES menu (id)         ON DELETE CASCADE,
  CONSTRAINT fk_adampak_halaman FOREIGN KEY (halaman_id)      REFERENCES halaman (id)      ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 5. BLUEPRINT (blueprint -> kelompok per modul -> prompt)
-- ---------------------------------------------------------------------

CREATE TABLE blueprint (
  id          BIGINT UNSIGNED NOT NULL,
  repo_id     BIGINT UNSIGNED NOT NULL,
  judul       VARCHAR(200) NOT NULL,
  isi_mentah  MEDIUMTEXT   NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_blueprint_repo (repo_id),
  CONSTRAINT fk_blueprint_repo FOREIGN KEY (repo_id) REFERENCES repo (id)
) ENGINE=InnoDB;

-- Satu kelompok = satu prompt = satu modul (maks 3-4 poin). urutan = urutan eksekusi.
CREATE TABLE blueprint_kelompok (
  id              BIGINT UNSIGNED NOT NULL,
  blueprint_id    BIGINT UNSIGNED NOT NULL,
  modul_id        BIGINT UNSIGNED NOT NULL,
  urutan          SMALLINT UNSIGNED NOT NULL,
  alasan_urutan   VARCHAR(500) NULL,
  sesi_prompt_id  BIGINT UNSIGNED NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_kelompok_urutan (blueprint_id, urutan),
  CONSTRAINT fk_kelompok_blueprint FOREIGN KEY (blueprint_id)   REFERENCES blueprint (id) ON DELETE CASCADE,
  CONSTRAINT fk_kelompok_modul     FOREIGN KEY (modul_id)       REFERENCES modul (id),
  CONSTRAINT fk_kelompok_sesi      FOREIGN KEY (sesi_prompt_id) REFERENCES sesi_prompt (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE blueprint_poin (
  id            BIGINT UNSIGNED NOT NULL,
  blueprint_id  BIGINT UNSIGNED NOT NULL,
  nomor         SMALLINT UNSIGNED NOT NULL,
  isi           TEXT         NOT NULL,
  kelompok_id   BIGINT UNSIGNED NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_bpoin_nomor (blueprint_id, nomor),
  CONSTRAINT fk_bpoin_blueprint FOREIGN KEY (blueprint_id) REFERENCES blueprint (id) ON DELETE CASCADE,
  CONSTRAINT fk_bpoin_kelompok  FOREIGN KEY (kelompok_id)  REFERENCES blueprint_kelompok (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Modul/menu/halaman yang disentuh sebuah poin blueprint. 'pemilik' = yang
-- mengerjakan poin itu, 'terkait' = hanya konteks (tidak dikerjakan dua kali).
CREATE TABLE blueprint_poin_target (
  id                 BIGINT UNSIGNED NOT NULL,
  blueprint_poin_id  BIGINT UNSIGNED NOT NULL,
  modul_id           BIGINT UNSIGNED NOT NULL,
  menu_id            BIGINT UNSIGNED NULL,
  halaman_id         BIGINT UNSIGNED NULL,
  peran              ENUM('pemilik','terkait') NOT NULL DEFAULT 'pemilik',
  menu_kunci         BIGINT UNSIGNED AS (IFNULL(menu_id, 0)) VIRTUAL,
  halaman_kunci      BIGINT UNSIGNED AS (IFNULL(halaman_id, 0)) VIRTUAL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_bpt (blueprint_poin_id, modul_id, menu_kunci, halaman_kunci),
  KEY idx_bpt_modul (modul_id),
  CONSTRAINT fk_bpt_poin    FOREIGN KEY (blueprint_poin_id) REFERENCES blueprint_poin (id) ON DELETE CASCADE,
  CONSTRAINT fk_bpt_modul   FOREIGN KEY (modul_id)          REFERENCES modul (id)    ON DELETE CASCADE,
  CONSTRAINT fk_bpt_menu    FOREIGN KEY (menu_id)           REFERENCES menu (id)     ON DELETE CASCADE,
  CONSTRAINT fk_bpt_halaman FOREIGN KEY (halaman_id)        REFERENCES halaman (id)  ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 6. PENGATURAN
-- ---------------------------------------------------------------------

CREATE TABLE pengaturan (
  kunci       VARCHAR(100) NOT NULL,
  nilai       TEXT         NOT NULL,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (kunci)
) ENGINE=InnoDB;

INSERT IGNORE INTO pengaturan (kunci, nilai) VALUES
  ('batas_karakter_poin',        '150'),    -- peringatan jika lebih panjang
  ('batas_kalimat_poin',         '2'),      -- peringatan jika lebih banyak kalimat
  ('ukuran_kelompok_blueprint',  '4'),      -- maksimal poin per prompt blueprint
  ('mode_analisis_blueprint',    'aturan'), -- aturan | ai
  ('mode_rapikan_bahasa',        'aturan'); -- aturan | ai
