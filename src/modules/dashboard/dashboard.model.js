import 'server-only';
import { SUDAH_DOKUMENTASI } from '@/modules/perubahan/perubahan.model';

/** Jumlah baris bawaan tiap daftar widget, dan batas bila user memilih "lihat semua". */
const BATAS_ANTREAN = 10;
const BATAS_AKTIVITAS = 15;
const BATAS_BETA = 10;
const BATAS_SEMUA = 100;

/**
 * Perubahan (alias p) punya modul di repo terpilih: lewat pemetaan pesan ke modul ATAU lewat
 * perubahan_dampak. Dipakai bila filter repo tidak kosong; parameternya dua daftar repo (urutan sama).
 */
const REPO_PERUBAHAN = `(
  EXISTS (SELECT 1 FROM perubahan_pesan x JOIN perubahan_pesan_peta pp ON pp.perubahan_pesan_id = x.id
          JOIN modul mo ON mo.id = pp.modul_id WHERE x.perubahan_id = p.id AND mo.repo_id IN (?))
  OR EXISTS (SELECT 1 FROM perubahan_dampak d JOIN modul mo ON mo.id = d.modul_id
             WHERE d.perubahan_id = p.id AND mo.repo_id IN (?))
)`;

/** Perubahan (alias p) belum punya modul sama sekali: tidak terpetakan dan belum ada dampak. */
const BELUM_DIPETAKAN = `(
  NOT EXISTS (SELECT 1 FROM perubahan_pesan x JOIN perubahan_pesan_peta pp ON pp.perubahan_pesan_id = x.id WHERE x.perubahan_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM perubahan_dampak d WHERE d.perubahan_id = p.id)
)`;

/** Id halaman milik repo terpilih (parameter: daftar repo). */
const HALAMAN_DI_REPO = `SELECT h.id FROM halaman h JOIN menu mn ON mn.id = h.menu_id JOIN modul mo ON mo.id = mn.modul_id WHERE mo.repo_id IN (?)`;

/** Awal dan akhir rentang sebagai DATETIME inklusif (tanggal sudah dibulatkan ke hari). */
const awal = (f) => `${f.dari} 00:00:00`;
const akhir = (f) => `${f.sampai} 23:59:59`;

/** Batas baris sebuah daftar: diperluas bila kelompoknya sedang dipilih lewat "lihat semua". */
const batas = (f, kelompok, biasa) => (f.lihat === kelompok ? BATAS_SEMUA : biasa);

/** Potongan SQL untuk menghitung satu tabel, dengan atau tanpa batasan repo; mengembalikan [sql, params]. */
function hitungModul(f, tambahan = '') {
  return f.repo.length
    ? [`SELECT COUNT(*) FROM modul WHERE repo_id IN (?) ${tambahan}`, [f.repo]]
    : [`SELECT COUNT(*) FROM modul WHERE 1=1 ${tambahan}`, []];
}

/** Daftar scalar subquery kartu (tanpa bagian CR/B): bentuk ringan tanpa join bila semua repo. */
function skalarKartu(f) {
  const repo = f.repo.length > 0;
  const p = f.repo;
  return [
    [`(${repo ? 'SELECT COUNT(*) FROM repo WHERE id IN (?)' : 'SELECT COUNT(*) FROM repo'}) AS jumlah_repo`, repo ? [p] : []],
    [`(${hitungModul(f)[0]}) AS jumlah_modul`, hitungModul(f)[1]],
    [
      `(${repo ? `SELECT COUNT(*) FROM halaman WHERE id IN (${HALAMAN_DI_REPO})` : 'SELECT COUNT(*) FROM halaman'}) AS jumlah_halaman`,
      repo ? [p] : [],
    ],
    [
      `(SELECT COUNT(*) FROM poin_dokumentasi WHERE status = 'beta'${repo ? ` AND halaman_id IN (${HALAMAN_DI_REPO})` : ''}) AS poin_beta`,
      repo ? [p] : [],
    ],
    [
      `(SELECT COUNT(DISTINCT poin_id) FROM poin_perubahan WHERE status = 'pending' AND poin_id IS NOT NULL${repo ? ` AND halaman_id IN (${HALAMAN_DI_REPO})` : ''}) AS poin_pending`,
      repo ? [p] : [],
    ],
    [`(${hitungModul(f, 'AND is_stub = 1')[0]}) AS modul_stub`, hitungModul(f, 'AND is_stub = 1')[1]],
  ];
}

/**
 * Model dashboard: SATU query agregat per widget (COUNT, GROUP BY, MAX, UNION ALL, fungsi window)
 * tanpa pola N+1. Semua parameter lewat placeholder `?`. Filter sudah dinormalisasi controller:
 * { repo: [id], dari, sampai, lihat }. Bila filter repo kosong dipakai bentuk query tanpa join agar ringan.
 */
export function buatDashboardModel({ db }) {
  return {
    /** Daftar repo (id, nama) untuk pilihan filter. */
    repoOpsi() {
      return db.rows('SELECT id, nama FROM repo ORDER BY nama');
    },

    /**
     * Widget 1: semua angka kartu ringkasan dalam satu query. CR/B dihitung sekali dalam derived table
     * yang berangkat dari rentang tanggal (bukan dari seluruh tabel perubahan).
     */
    async kartu(f) {
      const skalar = skalarKartu(f);
      const repoCrb = f.repo.length ? `WHERE ${REPO_PERUBAHAN}` : '';
      const paramCrb = f.repo.length ? [f.repo, f.repo] : [];
      return db.first(
        `SELECT ${skalar.map(([sql]) => sql).join(', ')}, c.jumlah_crb, c.crb_belum_dokumentasi
         FROM (SELECT COUNT(*) AS jumlah_crb, COALESCE(SUM(NOT (${SUDAH_DOKUMENTASI})), 0) AS crb_belum_dokumentasi
               FROM (SELECT DISTINCT m.perubahan_id FROM perubahan_pesan m WHERE m.tanggal >= ? AND m.tanggal <= ?) t
               JOIN perubahan p ON p.id = t.perubahan_id ${repoCrb}) c`,
        [...skalar.flatMap(([, params]) => params), awal(f), akhir(f), ...paramCrb],
      );
    },

    /**
     * Widget 2: antrean "Perlu tindakan" dalam satu UNION ALL. Tiap bagian membawa `total`
     * (COUNT(*) OVER ()) sehingga jumlah seluruhnya diketahui walau barisnya dibatasi.
     */
    antrean(f) {
      const bagian = [];
      const params = [];

      // CR/B dalam rentang yang belum masuk dokumentasi; kolom mahal (belum dipetakan) hanya dihitung untuk baris yang tampil
      const repoCrb = f.repo.length ? `AND ${REPO_PERUBAHAN}` : '';
      bagian.push(
        `(SELECT 'crb' AS kelompok, p.id AS ref_id, p.tipe AS label_a, p.nomor AS label_b, z.waktu AS waktu, 0 AS jumlah,
                 z.total AS total, ${BELUM_DIPETAKAN} AS belum_dipetakan
          FROM (SELECT t.perubahan_id, t.waktu, COUNT(*) OVER () AS total
                FROM (SELECT m.perubahan_id, MAX(m.tanggal) AS waktu FROM perubahan_pesan m
                      WHERE m.tanggal >= ? AND m.tanggal <= ? GROUP BY m.perubahan_id) t
                JOIN perubahan p ON p.id = t.perubahan_id
                WHERE NOT (${SUDAH_DOKUMENTASI}) ${repoCrb}
                ORDER BY t.waktu DESC, t.perubahan_id DESC LIMIT ${batas(f, 'crb', BATAS_ANTREAN)}) z
          JOIN perubahan p ON p.id = z.perubahan_id)`,
      );
      params.push(awal(f), akhir(f));
      if (f.repo.length) params.push(f.repo, f.repo);

      // nama modul/menu mentah dari Sync yang belum dipetakan: hanya bermakna untuk "Semua repo"
      if (f.repo.length === 0) {
        bagian.push(
          `(SELECT 'peta' AS kelompok, MAX(m.perubahan_id) AS ref_id, m.modul_sumber AS label_a, m.menu_sumber AS label_b,
                   MAX(m.tanggal) AS waktu, COUNT(*) AS jumlah, COUNT(*) OVER () AS total, 0 AS belum_dipetakan
            FROM perubahan_pesan m
            WHERE NOT EXISTS (SELECT 1 FROM perubahan_pesan_peta pp WHERE pp.perubahan_pesan_id = m.id)
            GROUP BY m.modul_sumber, m.menu_sumber
            ORDER BY COUNT(*) DESC, MAX(m.tanggal) DESC LIMIT ${batas(f, 'peta', BATAS_ANTREAN)})`,
        );
      }

      // modul stub (belum didokumentasikan)
      const kStub = f.repo.length ? 'AND mo.repo_id IN (?)' : '';
      bagian.push(
        `(SELECT 'stub' AS kelompok, mo.id AS ref_id, r.nama AS label_a, mo.nama AS label_b, mo.updated_at AS waktu, 0 AS jumlah,
                 COUNT(*) OVER () AS total, 0 AS belum_dipetakan
          FROM modul mo JOIN repo r ON r.id = mo.repo_id
          WHERE mo.is_stub = 1 ${kStub}
          ORDER BY r.nama, mo.nama LIMIT ${batas(f, 'stub', BATAS_ANTREAN)})`,
      );
      if (f.repo.length) params.push(f.repo);

      // waktu Sync terakhir (kapan pesan terakhir disimpan dari sumber)
      bagian.push(
        `(SELECT 'sync' AS kelompok, 0 AS ref_id, '' AS label_a, '' AS label_b, MAX(created_at) AS waktu, 0 AS jumlah, 0 AS total, 0 AS belum_dipetakan
          FROM perubahan_pesan)`,
      );
      return db.rows(bagian.join(' UNION ALL '), params);
    },

    /**
     * Widget 3: kelengkapan per modul (jumlah halaman, halaman berpoin, poin terakhir diubah) dalam satu query.
     * Poin terakhir per halaman dibaca lewat indeks (halaman_id, updated_at), tanpa mengagregasi seluruh tabel poin.
     */
    petaModul(f) {
      const kRepo = f.repo.length ? 'r.id IN (?)' : '1=1';
      return db.rows(
        `SELECT r.id AS repo_id, r.nama AS repo_nama, mo.id AS modul_id, mo.nama AS modul_nama, mo.is_stub,
                COUNT(h.id) AS jumlah_halaman,
                COUNT((SELECT MAX(po.updated_at) FROM poin_dokumentasi po WHERE po.halaman_id = h.id)) AS halaman_berpoin,
                MAX((SELECT MAX(po.updated_at) FROM poin_dokumentasi po WHERE po.halaman_id = h.id)) AS diperbarui
         FROM repo r
         LEFT JOIN modul mo ON mo.repo_id = r.id
         LEFT JOIN menu mn ON mn.modul_id = mo.id
         LEFT JOIN halaman h ON h.menu_id = mn.id
         WHERE ${kRepo}
         GROUP BY r.id, r.nama, mo.id, mo.nama, mo.is_stub
         ORDER BY r.nama, mo.nama`,
        f.repo.length ? [f.repo] : [],
      );
    },

    /** Widget 4: CR/B terbaru dan dokumentasi yang baru diubah, digabung dalam satu UNION ALL. */
    aktivitas(f) {
      const repoCrb = f.repo.length ? `AND ${REPO_PERUBAHAN}` : '';
      const kVersi = f.repo.length ? 'AND mo.repo_id IN (?)' : '';
      const params = [awal(f), akhir(f)];
      if (f.repo.length) params.push(f.repo, f.repo);
      params.push(awal(f), akhir(f));
      if (f.repo.length) params.push(f.repo);
      return db.rows(
        `(SELECT 'perubahan' AS jenis, x.perubahan_id AS ref_id, p.tipe AS tipe, p.nomor AS nama, x.waktu AS waktu, x.jumlah AS jumlah,
                 0 AS halaman_id, 0 AS menu_id, '' AS konteks, ${BELUM_DIPETAKAN} AS belum_dipetakan
          FROM (SELECT m.perubahan_id, MAX(m.tanggal) AS waktu, COUNT(*) AS jumlah
                FROM perubahan_pesan m JOIN perubahan p ON p.id = m.perubahan_id
                WHERE m.tanggal >= ? AND m.tanggal <= ? ${repoCrb}
                GROUP BY m.perubahan_id ORDER BY waktu DESC LIMIT ${BATAS_AKTIVITAS}) x
          JOIN perubahan p ON p.id = x.perubahan_id)
         UNION ALL
         (SELECT 'dokumentasi' AS jenis, v.id AS ref_id, '' AS tipe, h.nama AS nama, v.created_at AS waktu, 0 AS jumlah,
                 h.id AS halaman_id, mn.id AS menu_id, CONCAT(r.nama, ' / ', mo.nama, ' / ', mn.nama) AS konteks, 0 AS belum_dipetakan
          FROM halaman_versi v JOIN halaman h ON h.id = v.halaman_id JOIN menu mn ON mn.id = h.menu_id
          JOIN modul mo ON mo.id = mn.modul_id JOIN repo r ON r.id = mo.repo_id
          WHERE v.created_at >= ? AND v.created_at <= ? ${kVersi}
          ORDER BY v.id DESC LIMIT ${BATAS_AKTIVITAS})
         ORDER BY waktu DESC LIMIT ${BATAS_AKTIVITAS}`,
        params,
      );
    },

    /**
     * Widget 5: poin beta terbaru (dengan penanda pending) beserta total seluruhnya. Pemilihan 10 baris dan
     * hitungan total memakai indeks (status, updated_at); join dan penanda pending hanya untuk baris yang tampil.
     */
    poinBeta(f) {
      const repo = f.repo.length > 0;
      const saring = repo ? `AND po.halaman_id IN (${HALAMAN_DI_REPO})` : '';
      const saringTotal = repo ? `AND halaman_id IN (${HALAMAN_DI_REPO})` : '';
      const params = repo ? [f.repo, f.repo] : [];
      return db.rows(
        `SELECT po.id, po.isi, po.bagian, h.id AS halaman_id, h.nama AS halaman_nama, mn.id AS menu_id,
                mo.id AS modul_id, mo.nama AS modul_nama, r.nama AS repo_nama,
                EXISTS (SELECT 1 FROM poin_perubahan pp WHERE pp.poin_id = po.id AND pp.status = 'pending') AS pending,
                (SELECT COUNT(*) FROM poin_dokumentasi WHERE status = 'beta' ${saringTotal}) AS total
         FROM (SELECT po.id, po.updated_at FROM poin_dokumentasi po WHERE po.status = 'beta' ${saring}
               ORDER BY po.updated_at DESC, po.id DESC LIMIT ${batas(f, 'beta', BATAS_BETA)}) z
         JOIN poin_dokumentasi po ON po.id = z.id
         JOIN halaman h ON h.id = po.halaman_id JOIN menu mn ON mn.id = h.menu_id
         JOIN modul mo ON mo.id = mn.modul_id JOIN repo r ON r.id = mo.repo_id
         ORDER BY z.updated_at DESC, z.id DESC`,
        // urutan placeholder: total (select list) lebih dulu, baru derived table pada FROM; keduanya memakai daftar repo yang sama
        params,
      );
    },
  };
}
