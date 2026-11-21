import 'server-only';

/** Model tautan: tabel poin_perubahan (poin dokumentasi <-> CR/B beserta statusnya). */
export function buatTautanModel({ db, idGen }) {
  return {
    /** Tautan berstatus aktif/pending untuk daftar poin (dasar chip nomor CR/B di samping poin). */
    byPoinIds(poinIds, conn) {
      // tidak ada poin: tidak ada tautan (IN () kosong akan error)
      if (!Array.isArray(poinIds) || poinIds.length === 0) return Promise.resolve([]);
      return db.rows(
        `SELECT pp.id, pp.poin_id, pp.perubahan_id, pp.status, p.tipe, p.nomor
         FROM poin_perubahan pp JOIN perubahan p ON p.id = pp.perubahan_id
         WHERE pp.poin_id IN (?) AND pp.status IN ('aktif','pending')
         ORDER BY pp.id`,
        [poinIds],
        conn,
      );
    },
    /** Satu tautan berdasarkan id (beserta tipe dan nomor perubahan), atau null. */
    byId(id, conn) {
      return db.first(
        `SELECT pp.*, p.tipe, p.nomor FROM poin_perubahan pp JOIN perubahan p ON p.id = pp.perubahan_id WHERE pp.id = ?`,
        [id],
        conn,
      );
    },
    /**
     * Membuat tautan poin <-> CR/B, atau memperbarui yang sudah aktif/pending untuk pasangan yang sama
     * (mencegah duplikat tautan aktif). Mengembalikan id tautan.
     */
    async pastikan(data, conn) {
      const ada = await db.first(
        "SELECT id FROM poin_perubahan WHERE poin_id = ? AND perubahan_id = ? AND status IN ('aktif','pending') LIMIT 1",
        [data.poin_id, data.perubahan_id],
        conn,
      );
      // sudah ada tautan berjalan: cukup segarkan teks dan statusnya
      if (ada) {
        await db.exec('UPDATE poin_perubahan SET teks_poin = ?, status = ?, halaman_id = ? WHERE id = ?', [data.teks_poin, data.status, data.halaman_id, ada.id], conn);
        return ada.id;
      }
      const id = idGen.generate();
      await db.exec(
        'INSERT INTO poin_perubahan (id, poin_id, perubahan_id, halaman_id, teks_poin, status) VALUES (?, ?, ?, ?, ?, ?)',
        [id, data.poin_id, data.perubahan_id, data.halaman_id, data.teks_poin, data.status],
        conn,
      );
      return id;
    },
    /** Mengubah status satu tautan. */
    ubahStatus(id, status, conn) {
      return db.exec('UPDATE poin_perubahan SET status = ? WHERE id = ?', [status, id], conn);
    },
    /** Menandai tautan AKTIF sebuah poin sebagai sudah_berubah (teks_poin tidak ditimpa). Pending dibiarkan. */
    tandaiSudahBerubah(poinId, conn) {
      return db.exec("UPDATE poin_perubahan SET status = 'sudah_berubah' WHERE poin_id = ? AND status = 'aktif'", [poinId], conn);
    },
    /** Semua tautan sebuah CR/B beserta teks poin sekarang (bila poin masih ada) dan letaknya (modul > menu > halaman). */
    byPerubahan(perubahanId) {
      return db.rows(
        `SELECT pp.id, pp.poin_id, pp.status, pp.teks_poin, po.isi AS isi_sekarang, po.bagian,
                h.id AS halaman_id, h.nama AS halaman_nama,
                mn.id AS menu_id, mn.nama AS menu_nama,
                mo.id AS modul_id, mo.nama AS modul_nama, r.nama AS repo_nama
         FROM poin_perubahan pp
         JOIN halaman h ON h.id = pp.halaman_id
         JOIN menu mn ON mn.id = h.menu_id
         JOIN modul mo ON mo.id = mn.modul_id
         JOIN repo r ON r.id = mo.repo_id
         LEFT JOIN poin_dokumentasi po ON po.id = pp.poin_id
         WHERE pp.perubahan_id = ?
         ORDER BY r.nama, mo.nama, mn.urutan, mn.nama, h.urutan, h.id, pp.id`,
        [perubahanId],
      );
    },
  };
}
