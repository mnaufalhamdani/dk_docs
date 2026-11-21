import 'server-only';

/** Model pencarian: query LIKE untuk registry dan FULLTEXT untuk isi poin. */
export function buatPencarianModel({ db }) {
  return {
    /** Modul yang cocok pada nama, kode, atau alias (database/kata kunci). */
    modul(like, batas) {
      return db.rows(
        `SELECT DISTINCT m.id, m.nama, m.kode, m.is_stub, r.nama AS repo_nama
         FROM modul m
         JOIN repo r ON r.id = m.repo_id
         LEFT JOIN modul_alias a ON a.modul_id = m.id
         WHERE m.nama LIKE ? OR m.kode LIKE ? OR a.alias LIKE ?
         ORDER BY m.nama LIMIT ?`,
        [like, like, like, batas],
      );
    },
    /** Menu yang cocok pada nama, kode, route, atau alias. */
    menu(like, batas) {
      return db.rows(
        `SELECT DISTINCT mn.id, mn.nama, mn.route, mn.is_stub, m.nama AS modul_nama
         FROM menu mn
         JOIN modul m ON m.id = mn.modul_id
         LEFT JOIN menu_alias a ON a.menu_id = mn.id
         WHERE mn.nama LIKE ? OR mn.kode LIKE ? OR mn.route LIKE ? OR a.alias LIKE ?
         ORDER BY mn.nama LIMIT ?`,
        [like, like, like, like, batas],
      );
    },
    /** Halaman yang cocok pada nama, kode, route, atau kata kunci. */
    halaman(like, batas) {
      return db.rows(
        `SELECT DISTINCT h.id, h.nama, h.route, h.is_stub, h.menu_id, mn.nama AS menu_nama
         FROM halaman h
         JOIN menu mn ON mn.id = h.menu_id
         LEFT JOIN halaman_kata_kunci k ON k.halaman_id = h.id
         WHERE h.nama LIKE ? OR h.kode LIKE ? OR h.route LIKE ? OR k.kata_kunci LIKE ?
         ORDER BY h.nama LIMIT ?`,
        [like, like, like, like, batas],
      );
    },
    /** Perubahan CR/B yang cocok pada nomor atau isi pesan (FULLTEXT bila ada ekspresi, jika tidak LIKE). */
    perubahan(like, ekspresi, batas) {
      const cocokPesan = ekspresi ? 'MATCH(x.pesan) AGAINST (? IN BOOLEAN MODE)' : 'x.pesan LIKE ?';
      return db.rows(
        `SELECT p.id, p.tipe, p.nomor,
           (SELECT x.pesan FROM perubahan_pesan x WHERE x.perubahan_id = p.id ORDER BY x.tanggal DESC, x.id DESC LIMIT 1) AS ringkasan
         FROM perubahan p
         WHERE p.nomor LIKE ? OR EXISTS (SELECT 1 FROM perubahan_pesan x WHERE x.perubahan_id = p.id AND ${cocokPesan})
         ORDER BY p.id DESC LIMIT ?`,
        [like, ekspresi ?? like, batas],
      );
    },
    /** Isi poin lewat FULLTEXT (mode boolean, ekspresi sudah disanitasi usecase). */
    isiFulltext(ekspresi, batas) {
      return db.rows(
        `SELECT p.id, p.isi, p.bagian, p.status, h.id AS halaman_id, h.nama AS halaman_nama,
                h.menu_id, mn.nama AS menu_nama,
                EXISTS (SELECT 1 FROM poin_perubahan pp WHERE pp.poin_id = p.id AND pp.status = 'pending') AS pending
         FROM poin_dokumentasi p
         JOIN halaman h ON h.id = p.halaman_id
         JOIN menu mn ON mn.id = h.menu_id
         WHERE MATCH(p.isi) AGAINST (? IN BOOLEAN MODE)
         LIMIT ?`,
        [ekspresi, batas],
      );
    },
    /** Isi poin lewat LIKE (cadangan untuk kata pendek / stopword yang tidak masuk indeks FULLTEXT). */
    isiLike(like, batas) {
      return db.rows(
        `SELECT p.id, p.isi, p.bagian, p.status, h.id AS halaman_id, h.nama AS halaman_nama,
                h.menu_id, mn.nama AS menu_nama,
                EXISTS (SELECT 1 FROM poin_perubahan pp WHERE pp.poin_id = p.id AND pp.status = 'pending') AS pending
         FROM poin_dokumentasi p
         JOIN halaman h ON h.id = p.halaman_id
         JOIN menu mn ON mn.id = h.menu_id
         WHERE p.isi LIKE ?
         ORDER BY p.id DESC LIMIT ?`,
        [like, batas],
      );
    },
  };
}
