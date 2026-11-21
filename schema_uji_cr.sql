-- =====================================================================
-- DK Docs: tambahan skema untuk fitur "Uji CR" (Fase 6)
-- Dijalankan SETELAH schema.sql. Hanya menambah; tidak mengubah tabel lama
-- kecuali memperluas ENUM sesi_prompt.jenis dengan nilai 'pengujian'.
-- Konvensi sama: snake_case, nama tabel singular, MySQL 8+.
-- ID: semua PK/FK BIGINT UNSIGNED tanpa AUTO_INCREMENT; diisi idGen.generate() dan
-- diperlakukan sebagai string di JS. Kolom menu_kunci (generated) JANGAN diisi saat INSERT.
-- Tidak ada USE: jalankan terhadap database yang sedang dipakai (DB_NAME).
-- Status skenario adalah satu-satunya status yang disimpan; status sel
-- (poin x repo), status poin, dan hitungan CR DIHITUNG saat ditampilkan.
-- =====================================================================


-- Perluas jenis sesi prompt (aman dijalankan berulang).
ALTER TABLE sesi_prompt
  MODIFY jenis ENUM('usulan_perubahan','dokumentasi_baru','audit_bugfix','blueprint','sinkron_modul','pengujian') NOT NULL;

-- Satu baris per CR yang diuji. cr_id disimpan sebagai teks (tidak bergantung
-- pada tabel perubahan hasil sync). blueprint_mentah = teks yang ditempel tim testing.
CREATE TABLE IF NOT EXISTS pengujian (
  id                BIGINT UNSIGNED NOT NULL,
  cr_id             VARCHAR(60)  NOT NULL,
  blueprint_mentah  MEDIUMTEXT   NOT NULL,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pengujian_cr (cr_id)
) ENGINE=InnoDB;

-- Poin blueprint untuk pengujian. ditambah_putaran = putaran saat poin dibuat
-- (1 = dari blueprint awal; >1 = poin yang terlewat dan ditambahkan saat uji ulang).
CREATE TABLE IF NOT EXISTS pengujian_poin (
  id                 BIGINT UNSIGNED NOT NULL,
  pengujian_id       BIGINT UNSIGNED NOT NULL,
  nomor              SMALLINT UNSIGNED NOT NULL,
  isi                TEXT         NOT NULL,
  ditambah_putaran   SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ppoin_nomor (pengujian_id, nomor),
  CONSTRAINT fk_ppoin_pengujian FOREIGN KEY (pengujian_id) REFERENCES pengujian (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Target sebuah poin: modul saja, atau modul + menu. Repo diturunkan dari modul.repo_id,
-- jadi satu poin bisa menyentuh lebih dari satu repo (aplikasi + API).
-- menu_kunci (generated) agar UNIQUE bekerja pada menu_id yang NULL.
CREATE TABLE IF NOT EXISTS pengujian_poin_target (
  id                  BIGINT UNSIGNED NOT NULL,
  pengujian_poin_id   BIGINT UNSIGNED NOT NULL,
  modul_id            BIGINT UNSIGNED NOT NULL,
  menu_id             BIGINT UNSIGNED NULL,
  menu_kunci          BIGINT UNSIGNED AS (IFNULL(menu_id, 0)) VIRTUAL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ppt (pengujian_poin_id, modul_id, menu_kunci),
  KEY idx_ppt_modul (modul_id),
  CONSTRAINT fk_ppt_poin  FOREIGN KEY (pengujian_poin_id) REFERENCES pengujian_poin (id) ON DELETE CASCADE,
  CONSTRAINT fk_ppt_modul FOREIGN KEY (modul_id)          REFERENCES modul (id),
  CONSTRAINT fk_ppt_menu  FOREIGN KEY (menu_id)           REFERENCES menu (id)
) ENGINE=InnoDB;

-- Putaran uji (1 = uji pertama, 2+ = uji ulang). unique_id dipakai bersama
-- oleh semua prompt satu putaran (satu prompt per repo).
CREATE TABLE IF NOT EXISTS pengujian_putaran (
  id            BIGINT UNSIGNED NOT NULL,
  pengujian_id  BIGINT UNSIGNED NOT NULL,
  nomor         SMALLINT UNSIGNED NOT NULL,
  unique_id     VARCHAR(40)  NOT NULL,
  keterangan    VARCHAR(300) NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_putaran_nomor (pengujian_id, nomor),
  UNIQUE KEY uq_putaran_unique (unique_id),
  CONSTRAINT fk_putaran_pengujian FOREIGN KEY (pengujian_id) REFERENCES pengujian (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Data per putaran per repo: prompt (sesi_prompt), hash HEAD saat diuji (dasar
-- "commit sejak putaran lalu"), pernyataan tools yang belum tersedia, waktu impor.
CREATE TABLE IF NOT EXISTS pengujian_putaran_repo (
  id                    BIGINT UNSIGNED NOT NULL,
  pengujian_putaran_id  BIGINT UNSIGNED NOT NULL,
  repo_id               BIGINT UNSIGNED NOT NULL,
  sesi_prompt_id        BIGINT UNSIGNED NULL,
  branch                VARCHAR(100) NULL,
  hash_head             VARCHAR(64)  NULL,
  tools_belum_tersedia  JSON         NULL,
  diimpor_pada          DATETIME     NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ppr (pengujian_putaran_id, repo_id),
  CONSTRAINT fk_ppr_putaran FOREIGN KEY (pengujian_putaran_id) REFERENCES pengujian_putaran (id) ON DELETE CASCADE,
  CONSTRAINT fk_ppr_repo    FOREIGN KEY (repo_id)               REFERENCES repo (id),
  CONSTRAINT fk_ppr_sesi    FOREIGN KEY (sesi_prompt_id)        REFERENCES sesi_prompt (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Sel (poin x repo) yang diuji pada sebuah putaran. Putaran 1 = semua sel;
-- uji ulang = hanya sel yang dipilih.
CREATE TABLE IF NOT EXISTS pengujian_putaran_sel (
  id                    BIGINT UNSIGNED NOT NULL,
  pengujian_putaran_id  BIGINT UNSIGNED NOT NULL,
  pengujian_poin_id     BIGINT UNSIGNED NOT NULL,
  repo_id               BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pps (pengujian_putaran_id, pengujian_poin_id, repo_id),
  CONSTRAINT fk_pps_putaran FOREIGN KEY (pengujian_putaran_id) REFERENCES pengujian_putaran (id) ON DELETE CASCADE,
  CONSTRAINT fk_pps_poin    FOREIGN KEY (pengujian_poin_id)    REFERENCES pengujian_poin (id)    ON DELETE CASCADE,
  CONSTRAINT fk_pps_repo    FOREIGN KEY (repo_id)              REFERENCES repo (id)
) ENGINE=InnoDB;

-- Skenario hasil uji. pengujian_poin_id NULL = skenario di luar blueprint (unplanned).
-- bukti: JSON array nama berkas bukti yang diunggah saat impor.
CREATE TABLE IF NOT EXISTS pengujian_skenario (
  id                    BIGINT UNSIGNED NOT NULL,
  pengujian_putaran_id  BIGINT UNSIGNED NOT NULL,
  repo_id               BIGINT UNSIGNED NOT NULL,
  pengujian_poin_id     BIGINT UNSIGNED NULL,
  kode                  VARCHAR(30)  NOT NULL,
  nama                  VARCHAR(300) NOT NULL,
  tipe                  ENUM('planned','unplanned') NOT NULL,
  jenis                 ENUM('positive','negative','regression','impact') NOT NULL,
  langkah               TEXT         NULL,
  hasil_diharapkan      TEXT         NULL,
  hasil_aktual          TEXT         NULL,
  status                ENUM('PASS','FAIL','BLOCKED','NOT_EXECUTED') NOT NULL,
  catatan               TEXT         NULL,
  bukti                 JSON         NULL,
  created_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_skenario_kode (pengujian_putaran_id, repo_id, kode),
  KEY idx_skenario_sel (pengujian_poin_id, repo_id, pengujian_putaran_id),
  KEY idx_skenario_status (status),
  CONSTRAINT fk_skenario_putaran FOREIGN KEY (pengujian_putaran_id) REFERENCES pengujian_putaran (id) ON DELETE CASCADE,
  CONSTRAINT fk_skenario_repo    FOREIGN KEY (repo_id)              REFERENCES repo (id),
  CONSTRAINT fk_skenario_poin    FOREIGN KEY (pengujian_poin_id)    REFERENCES pengujian_poin (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Hasil analisis perubahan (Matches / Supporting / Outside / Risky) per putaran per repo.
CREATE TABLE IF NOT EXISTS pengujian_perubahan (
  id                    BIGINT UNSIGNED NOT NULL,
  pengujian_putaran_id  BIGINT UNSIGNED NOT NULL,
  repo_id               BIGINT UNSIGNED NOT NULL,
  pengujian_poin_id     BIGINT UNSIGNED NULL,
  kategori              ENUM('matches','supporting','outside','risky') NOT NULL,
  ringkasan             TEXT         NOT NULL,
  file                  JSON         NULL,
  PRIMARY KEY (id),
  KEY idx_pperubahan_putaran (pengujian_putaran_id, repo_id),
  CONSTRAINT fk_pperubahan_putaran FOREIGN KEY (pengujian_putaran_id) REFERENCES pengujian_putaran (id) ON DELETE CASCADE,
  CONSTRAINT fk_pperubahan_repo    FOREIGN KEY (repo_id)              REFERENCES repo (id),
  CONSTRAINT fk_pperubahan_poin    FOREIGN KEY (pengujian_poin_id)    REFERENCES pengujian_poin (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Catatan keputusan OPSIONAL per sel (poin x repo): hasil FAIL/BLOCKED yang
-- dibiarkan atau diabaikan. Tidak mengubah status. Kosong = baris dihapus.
CREATE TABLE IF NOT EXISTS pengujian_catatan (
  id                 BIGINT UNSIGNED NOT NULL,
  pengujian_poin_id  BIGINT UNSIGNED NOT NULL,
  repo_id            BIGINT UNSIGNED NOT NULL,
  catatan            TEXT         NOT NULL,
  updated_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pcatatan (pengujian_poin_id, repo_id),
  CONSTRAINT fk_pcatatan_poin FOREIGN KEY (pengujian_poin_id) REFERENCES pengujian_poin (id) ON DELETE CASCADE,
  CONSTRAINT fk_pcatatan_repo FOREIGN KEY (repo_id)           REFERENCES repo (id)
) ENGINE=InnoDB;

-- Versi PDF. Setiap "Buat versi baru" menambah baris; versi lama tidak ditimpa.
-- Tidak ada konsep PDF final.
CREATE TABLE IF NOT EXISTS pengujian_pdf (
  id                 BIGINT UNSIGNED NOT NULL,
  pengujian_id       BIGINT UNSIGNED NOT NULL,
  versi              SMALLINT UNSIGNED NOT NULL,
  putaran_tercakup   SMALLINT UNSIGNED NOT NULL,
  path_file          VARCHAR(500) NOT NULL,
  ringkasan_status   JSON         NULL,
  created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ppdf_versi (pengujian_id, versi),
  CONSTRAINT fk_ppdf_pengujian FOREIGN KEY (pengujian_id) REFERENCES pengujian (id) ON DELETE CASCADE
) ENGINE=InnoDB;
