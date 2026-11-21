import { bukaKoneksi } from './_koneksi.mjs';

/** SQL tabel poin_perubahan (sama dengan yang ada di schema.sql); IF NOT EXISTS agar aman diulang. */
const SQL_TABEL = `
CREATE TABLE IF NOT EXISTS poin_perubahan (
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
  CONSTRAINT fk_pp_poin      FOREIGN KEY (poin_id)      REFERENCES poin_dokumentasi (id) ON DELETE SET NULL,
  CONSTRAINT fk_pp_perubahan FOREIGN KEY (perubahan_id) REFERENCES perubahan (id)        ON DELETE CASCADE,
  CONSTRAINT fk_pp_halaman   FOREIGN KEY (halaman_id)   REFERENCES halaman (id)          ON DELETE CASCADE
) ENGINE=InnoDB`;

/** Menambah tabel poin_perubahan pada database yang sudah terpasang (tanpa mengubah data lain). */
async function main() {
  const conn = await bukaKoneksi();
  try {
    await conn.query(SQL_TABEL);
    console.log('Tabel poin_perubahan siap (dibuat bila belum ada).');
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error('db:migrasi-poin-perubahan gagal:', error.message);
  process.exit(1);
});
