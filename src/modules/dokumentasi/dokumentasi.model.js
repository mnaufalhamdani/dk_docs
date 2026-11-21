import 'server-only';

/** Model dokumentasi: poin, versi halaman, gambar, dan penanda beta. */
export function buatDokumentasiModel({ db, idGen }) {
  return {
    /** Id halaman/menu/modul yang masih memiliki poin beta (untuk badge). */
    async idBeta() {
      const baris = await db.rows(
        `SELECT DISTINCT h.id AS halaman_id, h.menu_id, mn.modul_id
         FROM poin_dokumentasi p
         JOIN halaman h ON h.id = p.halaman_id
         JOIN menu mn ON mn.id = h.menu_id
         WHERE p.status = 'beta'`,
      );
      return {
        halaman: baris.map((b) => b.halaman_id),
        menu: [...new Set(baris.map((b) => b.menu_id))],
        modul: [...new Set(baris.map((b) => b.modul_id))],
      };
    },
    /** Semua poin satu halaman, terurut per bagian lalu urutan. */
    poinByHalaman(halamanId, conn) {
      return db.rows(
        'SELECT id, halaman_id, bagian, isi, status, urutan, asal FROM poin_dokumentasi WHERE halaman_id = ? ORDER BY urutan, id',
        [halamanId],
        conn,
      );
    },
    /** Menambah satu poin; mengembalikan id baru. */
    async tambahPoin(halamanId, poin, conn) {
      // id dibuat oleh generator (tanpa AUTO_INCREMENT)
      const id = idGen.generate();
      await db.exec(
        'INSERT INTO poin_dokumentasi (id, halaman_id, bagian, isi, status, urutan, asal) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, halamanId, poin.bagian, poin.isi, poin.status, poin.urutan, poin.asal ?? 'manual'],
        conn,
      );
      return id;
    },
    /** Mengubah satu poin. */
    ubahPoin(id, poin, conn) {
      return db.exec(
        'UPDATE poin_dokumentasi SET bagian = ?, isi = ?, status = ?, urutan = ?, asal = COALESCE(?, asal) WHERE id = ?',
        [poin.bagian, poin.isi, poin.status, poin.urutan, poin.asal ?? null, id],
        conn,
      );
    },
    /** Menghapus beberapa poin sekaligus. */
    hapusPoin(ids, conn) {
      // daftar kosong: tidak ada yang perlu dihapus (IN () kosong akan error)
      if (ids.length === 0) return Promise.resolve(null);
      return db.exec('DELETE FROM poin_dokumentasi WHERE id IN (?)', [ids], conn);
    },
    /** Menyimpan snapshot versi halaman. */
    async tambahVersi(halamanId, snapshot, alasan, conn, sesiPromptId = null) {
      const id = idGen.generate();
      await db.exec(
        'INSERT INTO halaman_versi (id, halaman_id, snapshot, alasan, sesi_prompt_id) VALUES (?, ?, ?, ?, ?)',
        [id, halamanId, JSON.stringify(snapshot), alasan ?? null, sesiPromptId],
        conn,
      );
      return id;
    },
    /** Versi tersimpan sebuah halaman, terbaru dulu. */
    versiByHalaman(halamanId, batas = 30) {
      return db.rows(
        'SELECT id, snapshot, alasan, created_at FROM halaman_versi WHERE halaman_id = ? ORDER BY id DESC LIMIT ?',
        [halamanId, batas],
      );
    },
    /** Id halaman dalam lingkup halaman/menu/modul. */
    async halamanIdByLingkup(lingkup, id) {
      const sql = {
        halaman: 'SELECT id FROM halaman WHERE id = ?',
        menu: 'SELECT id FROM halaman WHERE menu_id = ?',
        modul: 'SELECT h.id FROM halaman h JOIN menu mn ON mn.id = h.menu_id WHERE mn.modul_id = ?',
      }[lingkup];
      const baris = await db.rows(sql, [id]);
      return baris.map((b) => b.id);
    },
    /** Dari daftar id halaman, kembalikan yang masih punya poin beta. */
    async halamanIdYangBeta(ids, conn) {
      // tidak ada halaman: tidak ada yang bisa diubah
      if (ids.length === 0) return [];
      const baris = await db.rows(
        "SELECT DISTINCT halaman_id FROM poin_dokumentasi WHERE halaman_id IN (?) AND status = 'beta'",
        [ids],
        conn,
      );
      return baris.map((b) => b.halaman_id);
    },
    /** Mengubah semua poin beta pada halaman-halaman tertentu menjadi live. */
    jadikanLive(ids, conn) {
      return db.exec(
        "UPDATE poin_dokumentasi SET status = 'live' WHERE halaman_id IN (?) AND status = 'beta'",
        [ids],
        conn,
      );
    },
    /** Menandai halaman beserta menu dan modul induknya bukan stub lagi. */
    tandaiBukanStub(halamanId, conn) {
      return db.exec(
        `UPDATE halaman h
         JOIN menu mn ON mn.id = h.menu_id
         JOIN modul m ON m.id = mn.modul_id
         SET h.is_stub = 0, mn.is_stub = 0, m.is_stub = 0
         WHERE h.id = ?`,
        [halamanId],
        conn,
      );
    },
    /** Gambar milik halaman, terurut. */
    gambarByHalaman(halamanId) {
      return db.rows('SELECT * FROM gambar_halaman WHERE halaman_id = ? ORDER BY urutan, id', [halamanId]);
    },
    /** Satu gambar berdasarkan id, atau null. */
    gambarById(id) {
      return db.first('SELECT * FROM gambar_halaman WHERE id = ?', [id]);
    },
    /** Menambah baris gambar; urutan otomatis di akhir. Mengembalikan id baru. */
    async tambahGambar(data) {
      const akhir = await db.first(
        'SELECT COALESCE(MAX(urutan), 0) AS maks FROM gambar_halaman WHERE halaman_id = ?',
        [data.halaman_id],
      );
      const id = idGen.generate();
      await db.exec(
        'INSERT INTO gambar_halaman (id, halaman_id, nama_file, path_file, keterangan, urutan) VALUES (?, ?, ?, ?, ?, ?)',
        [id, data.halaman_id, data.nama_file, data.path_file, data.keterangan, Number(akhir.maks) + 1],
      );
      return id;
    },
    /** Menghapus baris gambar. */
    hapusGambar(id) {
      return db.exec('DELETE FROM gambar_halaman WHERE id = ?', [id]);
    },
  };
}
