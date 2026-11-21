import { bukaKoneksi } from './_koneksi.mjs';
import { buatId } from './_idGen.mjs';

// Data contoh: DK Apps -> Transport -> tiga menu CRUD -> halaman Daftar, Form, Detail.
// Transport Daily terdokumentasi lengkap (campuran beta/live), Monthly sebagian, Khusus masih stub.

const POIN = {
  'transport-daily/daftar': [
    ['tujuan', 'Menampilkan data transport harian beserta filter dan paginasi.', 'live'],
    ['komponen_ui', 'Filter tanggal dan driver, tabel 20 baris per halaman.', 'live'],
    ['komponen_ui', 'Tombol Tambah membuka halaman Form.', 'live'],
    ['alur', 'Aksi hapus meminta konfirmasi lalu memuat ulang daftar.', 'beta'],
    ['api', 'Data diambil dari tabel transport_daily, diurutkan tanggal terbaru.', 'live'],
  ],
  'transport-daily/form': [
    ['tujuan', 'Tambah dan ubah data transport harian dalam satu form.', 'live'],
    ['validasi', 'Driver dan tanggal wajib diisi.', 'live'],
    ['validasi', 'Satu driver hanya boleh punya satu data per tanggal.', 'beta'],
    ['alur', 'Simpan sukses diarahkan kembali ke Daftar.', 'live'],
  ],
  'transport-daily/detail': [
    ['tujuan', 'Menampilkan satu data transport harian secara lengkap.', 'live'],
    ['catatan', 'Data hanya dibaca, perubahan dilakukan lewat Form.', 'beta'],
  ],
  'transport-monthly/daftar': [
    ['tujuan', 'Menampilkan rekap transport per bulan.', 'beta'],
    ['komponen_ui', 'Filter bulan dan tahun.', 'beta'],
  ],
};

/** Poin yang dibuat saat seed (isi -> { id, halamanId }), dipakai untuk tautan contoh ke CR/B. */
const POIN_DIBUAT = new Map();

/** CR/B contoh beserta tautan ke poin (satu aktif, satu pending). */
const PERUBAHAN_CONTOH = [
  { tipe: 'CR', nomor: '202507220021', tautan: [['Satu driver hanya boleh punya satu data per tanggal.', 'aktif']] },
  { tipe: 'B', nomor: 'B202507220001', tautan: [['Aksi hapus meminta konfirmasi lalu memuat ulang daftar.', 'pending']] },
];

const MENU = [
  { kode: 'transport-daily', nama: 'Transport Daily', route: '/transport/daily', alias: ['Transport Daily'], kunci: ['harian'], ringkasan: 'Kelola data transport harian.' },
  { kode: 'transport-monthly', nama: 'Transport Monthly', route: '/transport/monthly', alias: ['Transport Monthly'], kunci: ['bulanan'], ringkasan: 'Kelola data transport bulanan.' },
  { kode: 'transport-khusus', nama: 'Transport Khusus', route: '/transport/khusus', alias: ['Transport Khusus'], kunci: ['khusus'], ringkasan: 'Kelola data transport khusus.' },
];

const HALAMAN = [
  { kode: 'daftar', nama: 'Daftar', jenis: 'daftar', suffix: '' },
  { kode: 'form', nama: 'Form', jenis: 'form', suffix: '/form' },
  { kode: 'detail', nama: 'Detail', jenis: 'detail', suffix: '/detail' },
];

/** Menyisipkan data contoh di dalam satu transaksi agar tidak setengah jadi. */
async function seed(conn) {
  const [ada] = await conn.query('SELECT id FROM repo WHERE kode = ?', ['dk-apps']);
  // repo contoh sudah ada: seed sudah pernah dijalankan, jangan menggandakan data
  if (ada.length > 0) {
    console.log('Repo "dk-apps" sudah ada, db:seed dilewati.');
    return;
  }

  // semua primary key dibuat oleh IdGenerator (tanpa AUTO_INCREMENT)
  const repoId = buatId();
  const modulId = buatId();
  await conn.query("INSERT INTO repo (id, kode, nama, platform, branch_utama) VALUES (?, 'dk-apps', 'DK Apps', 'js', 'development')", [repoId]);
  await conn.query(
    "INSERT INTO modul (id, repo_id, kode, nama, path_kode, ringkasan, is_stub) VALUES (?, ?, 'transport', 'Transport', 'src/modules/transport', 'Pengelolaan data transport harian, bulanan, dan khusus.', 0)",
    [modulId, repoId],
  );
  await conn.query("INSERT INTO modul_alias (id, modul_id, alias, jenis) VALUES (?, ?, 'Transport', 'database'), (?, ?, 'angkutan', 'kata_kunci')", [buatId(), modulId, buatId(), modulId]);

  let urutanMenu = 0;
  for (const m of MENU) {
    urutanMenu += 1;
    await seedMenu(conn, modulId, m, urutanMenu);
  }
  await seedPerubahan(conn);
  console.log('Data contoh DK Apps -> Transport berhasil ditambahkan.');
}

/** Menyisipkan CR/B contoh dan tautannya ke poin dokumentasi (tabel poin_perubahan). */
async function seedPerubahan(conn) {
  for (const p of PERUBAHAN_CONTOH) {
    const perubahanId = buatId();
    await conn.query('INSERT INTO perubahan (id, tipe, nomor) VALUES (?, ?, ?)', [perubahanId, p.tipe, p.nomor]);
    for (const [isi, status] of p.tautan) {
      const poin = POIN_DIBUAT.get(isi);
      // poin contoh tidak ditemukan (data seed diubah): lewati tautan ini
      if (!poin) continue;
      await conn.query(
        'INSERT INTO poin_perubahan (id, poin_id, perubahan_id, halaman_id, teks_poin, status) VALUES (?, ?, ?, ?, ?, ?)',
        [buatId(), poin.id, perubahanId, poin.halamanId, isi, status],
      );
    }
  }
}

/** Menyisipkan satu menu CRUD beserta alias, halaman standar, dan poin contoh bila ada. */
async function seedMenu(conn, modulId, m, urutan) {
  const menuId = buatId();
  await conn.query(
    "INSERT INTO menu (id, modul_id, kode, nama, route, path_kode, ringkasan, pola, urutan, is_stub) VALUES (?, ?, ?, ?, ?, ?, ?, 'crud', ?, 1)",
    [menuId, modulId, m.kode, m.nama, m.route, `src/modules/${m.kode}`, m.ringkasan, urutan],
  );
  await conn.query('INSERT INTO menu_alias (id, menu_id, alias, jenis) VALUES ?', [[
    ...m.alias.map((a) => [buatId(), menuId, a, 'database']),
    ...m.kunci.map((a) => [buatId(), menuId, a, 'kata_kunci']),
  ]]);

  let urutanHal = 0;
  for (const h of HALAMAN) {
    urutanHal += 1;
    const route = `${m.route}${h.suffix}`;
    const halamanId = buatId();
    await conn.query(
      "INSERT INTO halaman (id, menu_id, kode, nama, jenis, route, file_utama, urutan, is_stub) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)",
      [halamanId, menuId, h.kode, h.nama, h.jenis, route, JSON.stringify([`src/modules/${m.kode}/${h.kode}.jsx`]), urutanHal],
    );
    await seedPoin(conn, { modulId, menuId, halamanId }, POIN[`${m.kode}/${h.kode}`] ?? []);
  }
}

/** Menyisipkan poin contoh sebuah halaman, menulis versi, dan melepas status stub. */
async function seedPoin(conn, ids, daftar) {
  // halaman tanpa poin contoh dibiarkan sebagai stub
  if (daftar.length === 0) return;

  const urutanPerBagian = {};
  const snapshot = [];
  for (const [bagian, isi, status] of daftar) {
    urutanPerBagian[bagian] = (urutanPerBagian[bagian] ?? -1) + 1;
    const urutan = urutanPerBagian[bagian];
    const poinId = buatId();
    await conn.query(
      "INSERT INTO poin_dokumentasi (id, halaman_id, bagian, isi, status, urutan, asal) VALUES (?, ?, ?, ?, ?, ?, 'manual')",
      [poinId, ids.halamanId, bagian, isi, status, urutan],
    );
    snapshot.push({ id: poinId, bagian, isi, status, urutan });
    POIN_DIBUAT.set(isi, { id: poinId, halamanId: ids.halamanId });
  }
  await conn.query('INSERT INTO halaman_versi (id, halaman_id, snapshot, alasan) VALUES (?, ?, ?, ?)', [buatId(), ids.halamanId, JSON.stringify({ poin: snapshot }), 'Data contoh (seed)']);
  await conn.query('UPDATE halaman SET is_stub = 0 WHERE id = ?', [ids.halamanId]);
  await conn.query('UPDATE menu SET is_stub = 0 WHERE id = ?', [ids.menuId]);
}

/** Titik masuk: buka koneksi, jalankan seed dalam transaksi. */
async function main() {
  const conn = await bukaKoneksi();
  try {
    await conn.beginTransaction();
    await seed(conn);
    await conn.commit();
  } catch (error) {
    // gagal di tengah: batalkan semuanya agar database tidak berisi data contoh setengah jadi
    await conn.rollback();
    throw error;
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error('db:seed gagal:', error.message);
  process.exit(1);
});
