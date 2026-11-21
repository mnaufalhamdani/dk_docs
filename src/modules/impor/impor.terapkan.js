import 'server-only';
import { AppError } from '@/utils/appError';
import { kunciTeknologi, susunInfoRepo } from './impor.teknologi';

/** Membandingkan beberapa field dua objek; true bila ada yang berbeda. */
function adaBeda(lama, baru, fields) {
  return fields.some((f) => (lama[f] ?? null) !== (baru[f] ?? null));
}

/**
 * Penerap rencana review: menulis seluruh perubahan dalam SATU transaksi
 * (poin, halaman_versi, status stub, dependensi, dampak / audit, status sesi).
 */
export function buatPenerapRencana({ imporModel, repoModel, modulModel, menuModel, halamanModel, dokumentasiModel, tautanModel, penerapDependensi, penyimpananFile, db }) {
  // ---------- poin ----------

  /** Kunci pembanding poin: bagian + isi tanpa beda spasi/huruf besar-kecil. */
  function kunciPoin(bagian, isi) {
    return `${bagian}\u0000${String(isi).replace(/\s+/g, ' ').trim().toLowerCase()}`;
  }

  /** Membuat/menyegarkan tautan poin <-> CR/B pada impor usulan_perubahan (status mengikuti pilihan Pending di review). */
  async function catatTautan(ctx, halamanId, poinId, op) {
    // hanya usulan CR/B yang punya nomor perubahan yang membuat tautan
    if (ctx.impor.jenis !== 'usulan_perubahan' || !ctx.impor.perubahan_id) return;
    await tautanModel.pastikan(
      { poin_id: poinId, perubahan_id: ctx.impor.perubahan_id, halaman_id: halamanId, teks_poin: op.isi, status: op.pending ? 'pending' : 'aktif' },
      ctx.conn,
    );
  }

  /** Apakah poin ini punya tautan CR/B berstatus pending (tidak boleh diubah/dihapus oleh sinkron_modul). */
  async function punyaPending(ctx, poinId) {
    const tautan = await tautanModel.byPoinIds([poinId], ctx.conn);
    return tautan.some((x) => x.status === 'pending');
  }

  /**
   * Menerapkan satu operasi ubah/hapus pada poin lama. Mengembalikan 'hapus' | 'ubah' bila ada perubahan nyata,
   * atau null bila dilewati (poin pending pada sinkron_modul, atau isi sama).
   */
  async function terapkanUbahHapus(ctx, halamanId, op, lama) {
    const sinkron = ctx.impor.jenis === 'sinkron_modul';
    // sinkron_modul tidak boleh menyentuh poin pending (bukan bahan perbandingan dengan kode)
    if (sinkron && (await punyaPending(ctx, lama.id))) return null;
    if (op.op === 'hapus') {
      // poin bertautan CR/B yang dihapus sinkron_modul: tautan ditandai (tidak dihapus; poin_id jadi NULL oleh FK)
      if (sinkron) await tautanModel.tandaiSudahBerubah(lama.id, ctx.conn);
      await dokumentasiModel.hapusPoin([lama.id], ctx.conn);
      return 'hapus';
    }
    if (!op.isi) throw new AppError('Isi poin yang diubah tidak boleh kosong.', 400);
    // isi sama dengan yang ada: tidak perlu menulis ulang
    if (op.isi === lama.isi) return null;
    // poin yang diubah lewat impor kembali ke beta (hasil pengerjaan baru, belum rilis)
    await dokumentasiModel.ubahPoin(lama.id, { bagian: lama.bagian, isi: op.isi, status: 'beta', urutan: lama.urutan, asal: 'impor' }, ctx.conn);
    // sinkron_modul mengganti teks dengan versi kode terbaru: tautan CR/B lama tidak lagi mewakili teks ini
    if (sinkron) await tautanModel.tandaiSudahBerubah(lama.id, ctx.conn);
    await catatTautan(ctx, halamanId, lama.id, op);
    return 'ubah';
  }

  /** Menerapkan operasi poin satu halaman; mengembalikan jumlah per jenis operasi. */
  async function terapkanPoin(ctx, halamanId, daftar) {
    const ada = await dokumentasiModel.poinByHalaman(halamanId, ctx.conn);
    const petaAda = new Map(ada.map((p) => [p.id, p]));
    const urutanBerikut = {};
    for (const p of ada) urutanBerikut[p.bagian] = Math.max(urutanBerikut[p.bagian] ?? -1, p.urutan);
    const dipakai = new Set();
    const hitung = { tambah: 0, ubah: 0, hapus: 0 };
    // kunci (bagian + isi) poin yang sudah ada, agar poin identik tidak digandakan
    const kunciAda = new Set(ada.map((p) => kunciPoin(p.bagian, p.isi)));

    for (const op of daftar) {
      // operasi dibatalkan user di halaman review
      if (op.batal) continue;
      if (op.op === 'tambah') {
        if (!op.isi) continue; // poin baru kosong diabaikan
        // isi persis sama sudah ada di bagian ini (atau sudah ditambah operasi lain): lewati agar tidak dobel
        if (kunciAda.has(kunciPoin(op.bagian, op.isi))) continue;
        kunciAda.add(kunciPoin(op.bagian, op.isi));
        urutanBerikut[op.bagian] = (urutanBerikut[op.bagian] ?? -1) + 1;
        const poinId = await dokumentasiModel.tambahPoin(halamanId, { bagian: op.bagian, isi: op.isi, status: 'beta', urutan: urutanBerikut[op.bagian], asal: 'impor' }, ctx.conn);
        await catatTautan(ctx, halamanId, poinId, op);
        hitung.tambah += 1;
        continue;
      }
      const lama = petaAda.get(op.poin_id);
      // poin sasaran tidak ada / sudah dipakai operasi lain: review perlu diperbaiki, jangan menebak
      if (!lama || dipakai.has(lama.id)) throw new AppError('Ada poin yang belum dipilih sasarannya atau sudah berubah. Periksa kembali review.', 400);
      dipakai.add(lama.id);
      const hasil = await terapkanUbahHapus(ctx, halamanId, op, lama);
      // dilewati (pending / isi sama): tidak dihitung
      if (hasil) hitung[hasil] += 1;
    }
    return hitung;
  }

  /** Menulis versi halaman dari kondisi poin terkini, mengaitkannya dengan sesi prompt. */
  async function catatVersi(ctx, halamanId) {
    const sekarang = await dokumentasiModel.poinByHalaman(halamanId, ctx.conn);
    const snapshot = { poin: sekarang.map((p) => ({ id: p.id, bagian: p.bagian, isi: p.isi, status: p.status, urutan: p.urutan })) };
    await dokumentasiModel.tambahVersi(halamanId, snapshot, ctx.alasan, ctx.conn, ctx.impor.sesi_id);
    return sekarang.length;
  }

  // ---------- halaman ----------

  /** Menghapus halaman (dan mencatat berkas gambarnya untuk dibersihkan setelah commit). */
  async function hapusHalaman(ctx, halamanId) {
    const gambar = await dokumentasiModel.gambarByHalaman(halamanId);
    await halamanModel.hapus(halamanId, ctx.conn);
    ctx.hapusBerkas.push(...gambar.map((g) => g.path_file));
  }

  /** Membuat halaman baru atau memperbarui metadata halaman yang ada; mengembalikan { id, berubah }. */
  async function pastikanHalaman(ctx, menuId, h) {
    const ada = await halamanModel.byKode(menuId, h.kode, ctx.conn);
    if (!ada) {
      const id = await halamanModel.buat({ menu_id: menuId, kode: h.kode, nama: h.nama, jenis: h.jenis, route: h.route, file_utama: h.file_utama }, ctx.conn);
      return { id, berubah: true, baru: true };
    }
    const data = { kode: h.kode, nama: h.nama, jenis: h.jenis, route: h.route ?? ada.route, file_utama: h.file_utama.length ? h.file_utama : ada.file_utama };
    const berubah = adaBeda(ada, data, ['nama', 'jenis', 'route']) || JSON.stringify(ada.file_utama) !== JSON.stringify(data.file_utama);
    if (berubah) await halamanModel.ubah(ada.id, data, ctx.conn);
    return { id: ada.id, berubah, baru: false };
  }

  /** Menerapkan satu halaman: metadata, poin, versi, status stub, dependensi, dan dampak. */
  async function terapkanHalaman(ctx, modulId, menuId, h) {
    // dibatalkan user
    if (h.batal) return;
    if (h.aksi === 'hapus') {
      const ada = await halamanModel.byKode(menuId, h.kode, ctx.conn);
      if (ada) {
        await hapusHalaman(ctx, ada.id);
        ctx.dampak.push({ modul_id: modulId, menu_id: menuId, halaman_id: null }); // halaman sudah hilang, catat di level menu
        ctx.hitung.halaman += 1;
      }
      return;
    }
    const { id, berubah, baru } = await pastikanHalaman(ctx, menuId, h);
    const poin = await terapkanPoin(ctx, id, h.poin);
    const jumlahPoin = poin.tambah + poin.ubah + poin.hapus;
    if (jumlahPoin > 0) {
      const total = await catatVersi(ctx, id);
      // sudah ada dokumentasi: halaman, menu, dan modul bukan stub lagi
      if (total > 0) await dokumentasiModel.tandaiBukanStub(id, ctx.conn);
    }
    ctx.hitung.dependensi += await penerapDependensi.terapkan(h.dependensi, 'halaman', id, { repoId: ctx.repoId, modulId, menuId }, ctx.conn);
    ctx.hitung.poin_tambah += poin.tambah;
    ctx.hitung.poin_ubah += poin.ubah;
    ctx.hitung.poin_hapus += poin.hapus;
    // halaman dianggap berubah bila baru, metadata berubah, atau ada poin yang berubah
    const terdampak = baru || berubah || jumlahPoin > 0;
    // usulan CR/B: halaman yang disebut agen (aksi "ubah") tetap dicatat sebagai dampak walau teksnya sudah sesuai,
    // supaya CR/B tertaut ke halaman itu di Riwayat
    const disebutPerubahan = h.aksi === 'ubah' && ctx.impor.jenis === 'usulan_perubahan';
    if (terdampak || disebutPerubahan) ctx.dampak.push({ modul_id: modulId, menu_id: menuId, halaman_id: id });
    // hitungan "halaman diperbarui" hanya untuk perubahan nyata
    if (terdampak) ctx.hitung.halaman += 1;
  }

  // ---------- menu ----------

  /** Membuat menu baru atau memperbarui metadata menu yang ada. */
  async function pastikanMenu(ctx, modulId, mn) {
    const ada = await menuModel.byKode(modulId, mn.kode, ctx.conn);
    if (!ada) {
      const id = await menuModel.buat({ modul_id: modulId, kode: mn.kode, nama: mn.nama, route: mn.route, path_kode: mn.path_kode, ringkasan: mn.ringkasan, pola: mn.pola }, ctx.conn);
      return { id, berubah: true };
    }
    const data = { kode: mn.kode, nama: mn.nama, pola: mn.pola, route: mn.route ?? ada.route, path_kode: mn.path_kode ?? ada.path_kode, ringkasan: mn.ringkasan ?? ada.ringkasan };
    const berubah = adaBeda(ada, data, ['nama', 'pola', 'route', 'path_kode', 'ringkasan']);
    if (berubah) await menuModel.ubah(ada.id, data, ctx.conn);
    return { id: ada.id, berubah };
  }

  /** Menghapus menu beserta semua halamannya. */
  async function hapusMenu(ctx, modulId, mn) {
    const ada = await menuModel.byKode(modulId, mn.kode, ctx.conn);
    // menu memang tidak ada: tidak ada yang dihapus
    if (!ada) return;
    for (const h of await halamanModel.byMenu(ada.id)) await hapusHalaman(ctx, h.id);
    await menuModel.hapus(ada.id, ctx.conn);
    ctx.dampak.push({ modul_id: modulId, menu_id: null, halaman_id: null }); // menu sudah hilang, catat di level modul
    ctx.hitung.menu += 1;
  }

  /** Menerapkan satu menu beserta halaman-halamannya. */
  async function terapkanMenu(ctx, modulId, mn) {
    if (mn.batal) return;
    if (mn.aksi === 'hapus') return hapusMenu(ctx, modulId, mn);
    const { id, berubah } = await pastikanMenu(ctx, modulId, mn);
    ctx.hitung.dependensi += await penerapDependensi.terapkan(mn.dependensi, 'menu', id, { repoId: ctx.repoId, modulId, menuId: id }, ctx.conn);
    for (const h of mn.halaman) await terapkanHalaman(ctx, modulId, id, h);
    // metadata menu berubah tanpa perubahan halaman: tetap dicatat sebagai dampak level menu
    if (berubah) {
      ctx.dampak.push({ modul_id: modulId, menu_id: id, halaman_id: null });
      ctx.hitung.menu += 1;
    }
    return undefined;
  }

  // ---------- modul ----------

  /** Membuat modul baru atau memperbarui metadata modul yang ada. */
  async function pastikanModul(ctx, m) {
    const ada = await modulModel.byKode(ctx.repoId, m.kode, ctx.conn);
    if (!ada) {
      const id = await modulModel.buat({ repo_id: ctx.repoId, kode: m.kode, nama: m.nama, path_kode: m.path_kode, ringkasan: m.ringkasan }, ctx.conn);
      return { id, berubah: true };
    }
    const data = { kode: m.kode, nama: m.nama, path_kode: m.path_kode ?? ada.path_kode, ringkasan: m.ringkasan ?? ada.ringkasan };
    const berubah = adaBeda(ada, data, ['nama', 'path_kode', 'ringkasan']);
    if (berubah) await modulModel.ubah(ada.id, data, ctx.conn);
    return { id: ada.id, berubah };
  }

  /** Menerapkan satu modul beserta menu-menunya. */
  async function terapkanModul(ctx, m) {
    if (m.batal) return;
    const { id, berubah } = await pastikanModul(ctx, m);
    ctx.hitung.dependensi += await penerapDependensi.terapkan(m.dependensi, 'modul', id, { repoId: ctx.repoId, modulId: id, menuId: null }, ctx.conn);
    for (const mn of m.menu) await terapkanMenu(ctx, id, mn);
    if (berubah) {
      ctx.dampak.push({ modul_id: id, menu_id: null, halaman_id: null });
      ctx.hitung.modul += 1;
    }
  }

  // ---------- info repo ----------

  /**
   * Menerapkan teknologi yang dicentang di blok "Info repo" (upsert pada repo_id + nama).
   * Nilainya diambil ulang dari JSON tersimpan, bukan dari kiriman browser; hanya yang baru/berubah diterapkan.
   */
  async function terapkanTeknologi(ctx, dok, terpilih) {
    // tidak ada yang dicentang atau agent tidak mengisi teknologi
    if (terpilih.length === 0 || dok.teknologi.length === 0) return 0;
    const dipilih = new Set(terpilih.map(kunciTeknologi));
    const tercatat = await repoModel.teknologiByRepo(ctx.repoId, ctx.conn);
    const daftar = susunInfoRepo(dok.teknologi, tercatat).filter((x) => dipilih.has(x.kunci));
    for (const x of daftar) await repoModel.simpanTeknologi(ctx.repoId, x, ctx.conn);
    return daftar.length;
  }

  // ---------- penutup ----------

  /** Mencatat dampak (usulan perubahan) atau audit bugfix, lalu menandai impor dan sesi sebagai disimpan. */
  async function selesaikan(ctx, dok) {
    const { impor, conn } = ctx;
    if (impor.jenis === 'usulan_perubahan') {
      for (const d of ctx.dampak) await imporModel.tambahDampak({ perubahan_id: impor.perubahan_id, impor_hasil_id: impor.id, ...d }, conn);
    }
    if (impor.jenis === 'audit_bugfix') {
      const ringkasan = [`${ctx.hitung.halaman} halaman diperbarui`, ...dok.selisih_dokumentasi].join('\n');
      const auditId = await imporModel.buatAudit(
        { repo_id: impor.repo_id, hash_awal: impor.hash_audit_terakhir, hash_akhir: dok.hash_terakhir_diaudit, tanggal_awal: impor.tanggal_audit_terakhir, ringkasan, sesi_prompt_id: impor.sesi_id },
        conn,
      );
      for (const d of ctx.dampak) await imporModel.tambahDampakAudit({ audit_bugfix_id: auditId, ...d }, conn);
      // acuan audit hanya diperbarui setelah Simpan (di dalam transaksi yang sama)
      await imporModel.perbaruiAuditRepo(impor.repo_id, dok.hash_terakhir_diaudit, conn);
    }
    await imporModel.ubahStatus(impor.id, 'disimpan', conn);
    await imporModel.ubahStatusSesi(impor.sesi_id, 'disimpan', conn);
  }

  return {
    /** Menerapkan seluruh rencana hasil review. Mengembalikan ringkasan jumlah yang berubah. */
    async terapkan({ impor, dok, modul, teknologiTerpilih = [] }) {
      const ctx = {
        impor,
        repoId: impor.repo_id,
        conn: null,
        dampak: [],
        hapusBerkas: [],
        hitung: { modul: 0, menu: 0, halaman: 0, poin_tambah: 0, poin_ubah: 0, poin_hapus: 0, dependensi: 0, teknologi: 0 },
        alasan: `Impor ${impor.jenis}${impor.perubahan_nomor ? ` ${impor.perubahan_nomor}` : ''} (${impor.unique_id})`,
      };
      await db.transaction(async (conn) => {
        ctx.conn = conn;
        for (const m of modul) await terapkanModul(ctx, m);
        // info repo ikut transaksi yang sama agar gagal/berhasil bersama poin dokumentasi
        ctx.hitung.teknologi = await terapkanTeknologi(ctx, dok, teknologiTerpilih);
        await selesaikan(ctx, dok);
      });
      // transaksi sudah commit: aman membersihkan berkas gambar halaman yang dihapus
      for (const path of ctx.hapusBerkas) await penyimpananFile.hapus(path);
      return ctx.hitung;
    },
  };
}
