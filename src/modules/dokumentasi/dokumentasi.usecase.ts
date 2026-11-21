import 'server-only';
import path from 'node:path';
import { AppError } from '@/utils/appError';
import { hasilBerkas } from '@/utils/responseHandler';
import { MIME_GAMBAR, STATUS_POIN } from '@/enums';

/** Ukuran maksimal gambar yang diunggah (5 MB). */
const MAKS_UKURAN_GAMBAR = 5 * 1024 * 1024;

/** Kebalikan MIME_GAMBAR: ekstensi -> tipe MIME, dipakai saat menampilkan gambar. */
const MIME_DARI_EKSTENSI = Object.fromEntries(Object.entries(MIME_GAMBAR).map(([mime, ext]) => [ext, mime]));

/** Mendeteksi tipe gambar dari byte awal berkas (tidak percaya MIME kiriman client). */
function deteksiTipeGambar(buf) {
  if (buf.length >= 8 && buf.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) return 'image/png';
  if (buf.length >= 3 && buf.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'image/jpeg';
  if (buf.length >= 6 && buf.subarray(0, 4).toString('latin1') === 'GIF8') return 'image/gif';
  // WebP: "RIFF" + 4 byte ukuran + "WEBP"
  if (buf.length >= 12 && buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') {
    return 'image/webp';
  }
  return null;
}

/** Snapshot sederhana sebuah poin untuk disimpan di halaman_versi. */
function untukSnapshot(p) {
  return { id: p.id, bagian: p.bagian, isi: p.isi, status: p.status, urutan: p.urutan };
}

/** Asal poin yang diterima dari editor: 'impor' tidak boleh diklaim dari editor, dianggap manual. */
function asalDariEditor(asal) {
  return asal === 'impor' ? 'manual' : asal;
}

/** Apakah poin lama berbeda dengan data baru dari editor. */
function berbeda(lama, baru) {
  return lama.bagian !== baru.bagian || lama.isi !== baru.isi || lama.status !== baru.status || lama.urutan !== baru.urutan;
}

/**
 * Membandingkan poin yang ada dengan kiriman editor, menghasilkan rencana
 * { tambah, ubah, hapusIds }. Urutan dihitung ulang per bagian dari posisi array.
 */
function susunRencana(ada, masuk) {
  const petaAda = new Map<string, { isi: string; asal: string }>(ada.map((p) => [p.id, p]));
  const dipakai = new Set();
  const hitungUrutan = {};
  const tambah = [];
  const ubah = [];

  for (const p of masuk) {
    hitungUrutan[p.bagian] = (hitungUrutan[p.bagian] ?? -1) + 1;
    const data = { ...p, urutan: hitungUrutan[p.bagian] };
    // tanpa id: poin baru dari editor (user tidak bisa mengaku asal 'impor')
    if (!p.id) {
      tambah.push({ ...data, asal: asalDariEditor(p.asal) });
      continue;
    }
    const lama = petaAda.get(p.id);
    // id tidak ada lagi di database: ada yang mengubah halaman ini setelah editor dibuka
    if (!lama) throw new AppError('Dokumentasi halaman ini sudah berubah. Muat ulang halaman lalu coba lagi.', 409);
    dipakai.add(p.id);
    // asal baru hanya berlaku bila teksnya berubah; kalau tidak, asal lama dipertahankan
    const baru = { ...data, asal: lama.isi !== data.isi ? asalDariEditor(p.asal) : lama.asal };
    if (berbeda(lama, baru)) ubah.push(baru);
  }
  // poin lama yang tidak dikirim lagi berarti dihapus user
  const hapusIds = ada.filter((p) => !dipakai.has(p.id)).map((p) => p.id);
  return { tambah, ubah, hapusIds };
}

/** Usecase dokumentasi: poin per halaman, flag beta/live, versi, dan gambar. */
export function buatDokumentasiUsecase({ dokumentasiModel, tautanModel, halamanModel, penyimpananFile, docPolisher, pengaturanUsecase, db }) {
  /** Mengambil halaman atau melempar 404. */
  async function halamanWajibAda(id) {
    const halaman = await halamanModel.byId(id);
    // id tidak dikenal: hentikan lebih awal
    if (!halaman) throw new AppError('Halaman tidak ditemukan.', 404);
    return halaman;
  }

  /** Menerapkan rencana ke database (ubah, tambah, hapus). */
  async function terapkan(halamanId, rencana, conn) {
    for (const p of rencana.ubah) await dokumentasiModel.ubahPoin(p.id, p, conn);
    for (const p of rencana.tambah) await dokumentasiModel.tambahPoin(halamanId, p, conn);
    await dokumentasiModel.hapusPoin(rencana.hapusIds, conn);
  }

  /** Menulis snapshot versi dari kondisi poin terkini halaman. */
  async function catatVersi(halamanId, alasan, conn) {
    const sekarang = await dokumentasiModel.poinByHalaman(halamanId, conn);
    await dokumentasiModel.tambahVersi(halamanId, { poin: sekarang.map(untukSnapshot) }, alasan, conn);
    return sekarang.length;
  }

  /** Membaca snapshot versi (teks di MariaDB, objek di MySQL) menjadi array poin. */
  function bacaSnapshot(nilai) {
    try {
      const obj = typeof nilai === 'string' ? JSON.parse(nilai) : nilai;
      return Array.isArray(obj?.poin) ? obj.poin : [];
    } catch {
      // snapshot rusak: tampilkan sebagai kosong, jangan merusak tampilan riwayat
      return [];
    }
  }

  return {
    /** Dokumentasi lengkap satu halaman: halaman, kata kunci, poin (datar), dan gambar. */
    async ambilHalaman(id) {
      const halaman = await halamanWajibAda(id);
      const [kataKunci, poin, gambar] = await Promise.all([
        halamanModel.kataKunciByHalaman(id),
        dokumentasiModel.poinByHalaman(id),
        dokumentasiModel.gambarByHalaman(id),
      ]);
      // tautan CR/B (aktif/pending) ditempelkan ke tiap poin untuk chip dan penanda pending
      const tautan = await tautanModel.byPoinIds(poin.map((p) => p.id));
      const poinDenganTautan = poin.map((p) => ({
        ...p,
        tautan: tautan
          .filter((x) => String(x.poin_id) === String(p.id))
          .map((x) => ({ id: x.id, perubahan_id: x.perubahan_id, tipe: x.tipe, nomor: x.nomor, status: x.status })),
      }));
      return { halaman, kata_kunci: kataKunci, poin: poinDenganTautan, gambar };
    },
    /**
     * Meminta DocPolisher memeriksa satu poin terhadap batas lunak dan mengusulkan versi ringkas.
     * Mengembalikan { asal: 'aturan' | 'ai', catatan, usulan, berubah, peringatan, alasan, ... }.
     */
    async usulkanRingkas({ isi }) {
      const batas = await pengaturanUsecase.batasPoin();
      const { asal, catatan, hasil } = await docPolisher.rapikanPoin({ isi, batas });
      return { asal, catatan, ...hasil };
    },
    /** Menyimpan seluruh poin halaman dalam satu transaksi, mencatat versi, dan melepas status stub. */
    async simpanHalaman({ halaman_id, poin, alasan }) {
      await halamanWajibAda(halaman_id);
      return db.transaction(async (conn) => {
        const ada = await dokumentasiModel.poinByHalaman(halaman_id, conn);
        const rencana = susunRencana(ada, poin);
        const adaPerubahan = rencana.tambah.length + rencana.ubah.length + rencana.hapusIds.length > 0;
        // tidak ada yang berubah: jangan membuat versi kosong
        if (!adaPerubahan) return { halaman_id, berubah: false };

        await terapkan(halaman_id, rencana, conn);
        const jumlah = await catatVersi(halaman_id, alasan ?? null, conn);
        // sudah ada dokumentasi: halaman, menu, dan modulnya bukan stub lagi
        if (jumlah > 0) await dokumentasiModel.tandaiBukanStub(halaman_id, conn);
        return { halaman_id, berubah: true, jumlah_poin: jumlah };
      });
    },
    /** Menjadikan semua poin beta live pada lingkup halaman/menu/modul; mencatat versi tiap halaman yang berubah. */
    async jadikanSemuaLive({ lingkup, id }) {
      const semuaId = await dokumentasiModel.halamanIdByLingkup(lingkup, id);
      return db.transaction(async (conn) => {
        const yangBeta = await dokumentasiModel.halamanIdYangBeta(semuaId, conn);
        // tidak ada poin beta: tidak ada yang perlu diubah
        if (yangBeta.length === 0) return { halaman_diubah: 0 };

        await dokumentasiModel.jadikanLive(yangBeta, conn);
        for (const halamanId of yangBeta) await catatVersi(halamanId, 'Jadikan semua live', conn);
        return { halaman_diubah: yangBeta.length, status: STATUS_POIN.LIVE };
      });
    },
    /** Riwayat versi tersimpan sebuah halaman (ringkas, tanpa isi poin). */
    async riwayatVersi(halamanId) {
      await halamanWajibAda(halamanId);
      const versi = await dokumentasiModel.versiByHalaman(halamanId);
      return versi.map((v) => {
        const poin = bacaSnapshot(v.snapshot);
        return {
          id: v.id,
          alasan: v.alasan,
          created_at: v.created_at,
          jumlah_poin: poin.length,
          jumlah_beta: poin.filter((p) => p.status === STATUS_POIN.BETA).length,
        };
      });
    },
    /** Menyimpan gambar unggahan: cek ukuran, deteksi tipe dari isi berkas, simpan ke disk dan database. */
    async unggahGambar({ halaman_id, keterangan, file }) {
      await halamanWajibAda(halaman_id);
      // berkas terlalu besar: tolak sebelum dibaca ke memori
      if (file.size > MAKS_UKURAN_GAMBAR) throw new AppError('Ukuran gambar maksimal 5 MB.', 400);
      const buffer = Buffer.from(await file.arrayBuffer());
      const tipe = deteksiTipeGambar(buffer);
      // isi berkas bukan gambar yang didukung (abaikan nama/MIME dari client)
      if (!tipe) throw new AppError('Format gambar tidak didukung. Gunakan PNG, JPG, GIF, atau WebP.', 400);

      const { pathRelatif } = await penyimpananFile.simpan(buffer, MIME_GAMBAR[tipe]);
      try {
        const namaTampil = path.basename(file.name || 'gambar').slice(0, 200);
        const id = await dokumentasiModel.tambahGambar({ halaman_id, nama_file: namaTampil, path_file: pathRelatif, keterangan });
        return { id };
      } catch (error) {
        // gagal menulis ke database: hapus berkas agar tidak jadi yatim di disk
        await penyimpananFile.hapus(pathRelatif);
        throw error;
      }
    },
    /** Membaca isi gambar untuk ditampilkan. */
    async ambilGambar({ id }) {
      const gambar = await dokumentasiModel.gambarById(id);
      // id tidak dikenal: 404
      if (!gambar) throw new AppError('Gambar tidak ditemukan.', 404);
      const tipe = MIME_DARI_EKSTENSI[path.extname(gambar.path_file).slice(1)] ?? 'application/octet-stream';
      return hasilBerkas(await penyimpananFile.baca(gambar.path_file), tipe);
    },
    /** Menghapus gambar dari database lalu dari disk. */
    async hapusGambar({ id }) {
      const gambar = await dokumentasiModel.gambarById(id);
      // id tidak dikenal: 404
      if (!gambar) throw new AppError('Gambar tidak ditemukan.', 404);
      await dokumentasiModel.hapusGambar(id);
      await penyimpananFile.hapus(gambar.path_file);
      return { id, halaman_id: gambar.halaman_id };
    },
  };
}
