import 'server-only';

/** Model pengaturan: baca/ubah tabel `pengaturan` (kunci-nilai). */
export function buatPengaturanModel({ db }) {
  return {
    /** Semua pengaturan sebagai array { kunci, nilai }. */
    semua() {
      return db.rows('SELECT kunci, nilai FROM pengaturan ORDER BY kunci');
    },
    /** Menyimpan (insert atau update) satu pengaturan. */
    simpan(kunci, nilai, conn) {
      return db.exec(
        'INSERT INTO pengaturan (kunci, nilai) VALUES (?, ?) ON DUPLICATE KEY UPDATE nilai = VALUES(nilai)',
        [kunci, String(nilai)],
        conn,
      );
    },
  };
}
