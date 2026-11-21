import 'server-only';
import { AppError } from '@/utils/appError';
import { buatUniqueId } from '@/utils/uniqueId';
import { renderTemplate } from '@/utils/templatePrompt';
import { JENIS_SESI, KUNCI_PENGATURAN } from '@/enums';
import { bangunIndeks } from './blueprint.pencocokan';
import { formatBlueprintLengkap, formatPoinDitugaskan, formatPoinTerkait, formatJalurLaporan, formatDokumentasiRelevan } from './blueprint.dokumen';

/** Batas jumlah poin hasil perapihan (sama dengan batas pada schema). */
const MAKS_POIN = 100;

/** Usecase blueprint: perapihan poin, pencocokan, pengelompokan, urutan, dan pembuatan prompt per kelompok. */
export function buatBlueprintUsecase({ blueprintModel, promptModel, repoModel, pengaturanUsecase, blueprintAnalyzer, moduleMatcher, db }) {
  /** Mengambil blueprint atau melempar 404. */
  async function wajibAda(id, conn = null) {
    const bp = await blueprintModel.byId(id, conn);
    // id tidak dikenal: hentikan lebih awal
    if (!bp) throw new AppError('Blueprint tidak ditemukan.', 404);
    return bp;
  }

  /** Memuat registry (modul, menu, halaman) satu repo. */
  async function muatRegistri(repoId) {
    const [modul, menu, halaman] = await Promise.all([promptModel.modulRepo(repoId), promptModel.menuRepo(repoId), promptModel.halamanRepo(repoId)]);
    return { modul, menu, halaman };
  }

  /** Membangun indeks pencocokan dari registry + alias + kata kunci. */
  async function indeksRepo(repoId) {
    const [reg, aliasModul, aliasMenu, kataKunciHalaman] = await Promise.all([
      muatRegistri(repoId),
      blueprintModel.aliasModulRepo(repoId),
      blueprintModel.aliasMenuRepo(repoId),
      blueprintModel.kataKunciHalamanRepo(repoId),
    ]);
    return bangunIndeks({ ...reg, aliasModul, aliasMenu, kataKunciHalaman });
  }

  /** Apakah target saran valid terhadap registry (menjaga dari keluaran AI yang menyebut id fiktif). */
  function targetValid(t, indeks) {
    const menu = t.menu_id ? indeks.menu.find((m) => m.id === t.menu_id) : null;
    const halaman = t.halaman_id ? indeks.halaman.find((h) => h.id === t.halaman_id) : null;
    if (!indeks.modul.some((m) => m.id === t.modul_id)) return false;
    // menu/halaman yang disebut harus ada dan sesuai induknya
    if (t.menu_id && menu?.modul_id !== t.modul_id) return false;
    if (t.halaman_id && (!t.menu_id || halaman?.menu_id !== t.menu_id)) return false;
    return true;
  }

  /**
   * Meminta ModuleMatcher menyarankan target untuk daftar teks poin (nomor = urutan + 1).
   * Dipanggil di luar transaksi agar tidak menahan koneksi database bila nanti memakai AI.
   * Mengembalikan { target: [{ nomor, modul_id, menu_id, halaman_id, peran }], asal, catatan }.
   */
  async function sarankanTarget(repoId, daftarIsi) {
    const indeks = await indeksRepo(repoId);
    const poin = daftarIsi.map((isi, i) => ({ nomor: i + 1, isi }));
    const { asal, catatan, hasil } = await moduleMatcher.cocokkan({ poin, indeks });
    const nomorAda = new Set(poin.map((p) => p.nomor));
    const target = hasil.cocok
      .filter((c) => nomorAda.has(c.nomor))
      .flatMap((c) => c.target.filter((t) => targetValid(t, indeks)).map((t) => ({ ...t, nomor: c.nomor })));
    return { target, asal, catatan };
  }

  /** Menyimpan target saran untuk poin yang baru tersimpan (dicocokkan lewat nomor). */
  async function simpanTarget(blueprintId, tersimpan, target, conn) {
    const idPerNomor = new Map(tersimpan.map((p) => [p.nomor, p.id]));
    await blueprintModel.gantiTarget(blueprintId, target.map((t) => ({ ...t, poin_id: idPerNomor.get(t.nomor) })), conn);
    return target.length;
  }

  /** Memastikan kelompok hasil analisis konsisten: nomor poin dikenal, tidak ganda, dan modul ada di repo. */
  function periksaKelompok(kelompok, nomorAda, modulAda) {
    const terpakai = new Set();
    for (const k of kelompok) {
      if (!modulAda.has(k.modul_id)) throw new AppError('Hasil analisis menyebut modul yang tidak ada di repo ini.', 500);
      for (const n of k.poin) {
        // nomor tidak dikenal atau muncul dua kali: hasil analisis tidak bisa dipercaya
        if (!nomorAda.has(n) || terpakai.has(n)) throw new AppError('Hasil analisis kelompok tidak konsisten.', 500);
        terpakai.add(n);
      }
    }
    return terpakai;
  }

  /** Modul pemilik tiap poin (Map nomor -> modul_id) dan modul terkaitnya (Map nomor -> [modul_id]). */
  function petaPeran(poin, target) {
    const pemilik = new Map();
    const terkait = new Map();
    const nomorDariId = new Map(poin.map((p) => [p.id, p.nomor]));
    for (const t of target) {
      const nomor = nomorDariId.get(t.blueprint_poin_id);
      if (t.peran === 'pemilik' && !pemilik.has(nomor)) pemilik.set(nomor, t.modul_id);
      if (t.peran === 'terkait') terkait.set(nomor, [...new Set([...(terkait.get(nomor) ?? []), t.modul_id])]);
    }
    return { pemilik, terkait };
  }

  /** Memeriksa target kiriman user terhadap registry repo dan nomor poin yang ada. */
  function periksaTarget(daftar, reg, nomorAda) {
    const modul = new Map<string, { id: string }>(reg.modul.map((m) => [m.id, m]));
    const menu = new Map<string, { modul_id: string }>(reg.menu.map((m) => [m.id, m]));
    const halaman = new Map<string, { menu_id: string }>(reg.halaman.map((h) => [h.id, h]));
    for (const t of daftar) {
      if (!nomorAda.has(t.nomor)) throw new AppError(`Poin ${t.nomor} tidak ada.`, 400);
      if (!modul.has(t.modul_id)) throw new AppError('Modul target tidak ada di repo ini.', 400);
      // menu harus milik modul yang sama agar chip konsisten
      if (t.menu_id && menu.get(t.menu_id)?.modul_id !== t.modul_id) throw new AppError('Menu target tidak sesuai dengan modulnya.', 400);
      if (t.halaman_id && (!t.menu_id || halaman.get(t.halaman_id)?.menu_id !== t.menu_id)) throw new AppError('Halaman target tidak sesuai dengan menunya.', 400);
    }
  }

  /** Menjamin satu poin hanya punya SATU modul pemilik; modul lain menjadi terkait. */
  function normalkanPeran(daftar) {
    const perNomor = new Map();
    for (const t of daftar) perNomor.set(t.nomor, [...(perNomor.get(t.nomor) ?? []), t]);
    const hasil = [];
    for (const [, baris] of perNomor) {
      // pemilik = modul pertama yang ditandai pemilik; bila tidak ada, modul pertama
      const pemilikModul = (baris.find((t) => t.peran === 'pemilik') ?? baris[0]).modul_id;
      for (const t of baris) hasil.push({ ...t, peran: t.modul_id === pemilikModul ? 'pemilik' : 'terkait' });
    }
    return hasil;
  }

  /** unique_id unik untuk setiap kelompok (berbeda satu sama lain dan dari sesi yang ada). */
  async function buatSemuaUniqueId(jumlah) {
    const dipakai = new Set();
    while (dipakai.size < jumlah) {
      const kandidat = buatUniqueId();
      if (dipakai.has(kandidat) || (await promptModel.uniqueIdAda(kandidat))) continue;
      dipakai.add(kandidat);
    }
    return [...dipakai];
  }

  return {
    /** Daftar blueprint terbaru. */
    daftar: () => blueprintModel.daftar(50),
    /** Membuat blueprint dari teks mentah: pecah poin lalu sarankan pencocokan. */
    async buat({ repo_id, judul, teks }) {
      // repo harus ada
      if (!(await repoModel.byId(repo_id))) throw new AppError('Repo tidak ditemukan.', 404);
      const pecah = await blueprintAnalyzer.pecahPoin({ teks });
      const poin = pecah.hasil.poin;
      if (poin.length === 0) throw new AppError('Tidak ada poin yang terdeteksi dari teks.', 400);
      if (poin.length > MAKS_POIN) throw new AppError(`Terlalu banyak poin (${poin.length}); maksimal ${MAKS_POIN}.`, 400);
      const saran = await sarankanTarget(repo_id, poin);
      const id = await db.transaction(async (conn) => {
        const bpId = await blueprintModel.buat({ repo_id, judul, isi_mentah: teks }, conn);
        const tersimpan = await blueprintModel.gantiPoin(bpId, poin, conn);
        await simpanTarget(bpId, tersimpan, saran.target, conn);
        return bpId;
      });
      return { id, asal: saran.asal, catatan: saran.catatan ?? pecah.catatan };
    },
    /** Data lengkap halaman editor: poin + target, kelompok, pilihan registry, dan pengaturan. */
    async detail(id) {
      const bp = await wajibAda(id);
      const [poin, target, kelompok, reg, pengaturan] = await Promise.all([
        blueprintModel.poinByBlueprint(id),
        blueprintModel.targetByBlueprint(id),
        blueprintModel.kelompokByBlueprint(id),
        muatRegistri(bp.repo_id),
        pengaturanUsecase.semua(),
      ]);
      const nomorPerKelompok = new Map();
      for (const p of poin) if (p.kelompok_id) nomorPerKelompok.set(p.kelompok_id, [...(nomorPerKelompok.get(p.kelompok_id) ?? []), p.nomor]);
      return {
        blueprint: { id: bp.id, judul: bp.judul, isi_mentah: bp.isi_mentah, created_at: bp.created_at, repo: { id: bp.repo_id, kode: bp.repo_kode, nama: bp.repo_nama } },
        poin: poin.map((p) => ({ id: p.id, nomor: p.nomor, isi: p.isi, kelompok_id: p.kelompok_id, target: target.filter((t) => t.blueprint_poin_id === p.id) })),
        kelompok: kelompok.map((k) => ({ id: k.id, urutan: k.urutan, modul_id: k.modul_id, modul_nama: k.modul_nama, alasan: k.alasan_urutan ?? '', poin: nomorPerKelompok.get(k.id) ?? [], unique_id: k.unique_id })),
        tanpa_kelompok: poin.filter((p) => !p.kelompok_id).map((p) => p.nomor),
        opsi: reg.modul.map((m) => ({
          id: m.id,
          nama: m.nama,
          menu: reg.menu.filter((mn) => mn.modul_id === m.id).map((mn) => ({ id: mn.id, nama: mn.nama, halaman: reg.halaman.filter((h) => h.menu_id === mn.id).map((h) => ({ id: h.id, nama: h.nama })) })),
        })),
        ukuran: Number(pengaturan[KUNCI_PENGATURAN.UKURAN_KELOMPOK_BLUEPRINT]),
      };
    },
    /** Menyimpan poin hasil perapihan; pencocokan disarankan ulang dan kelompok dihapus. */
    async simpanPoin({ id, poin }) {
      const bp = await wajibAda(id);
      const saran = await sarankanTarget(bp.repo_id, poin);
      await db.transaction(async (conn) => {
        const tersimpan = await blueprintModel.gantiPoin(id, poin, conn);
        await simpanTarget(id, tersimpan, saran.target, conn);
      });
      return { id, jumlah: poin.length, asal: saran.asal, catatan: saran.catatan };
    },
    /** Menyimpan pencocokan hasil edit user (satu pemilik per poin); kelompok dihapus agar disusun ulang. */
    async simpanPencocokan({ id, target }) {
      const bp = await wajibAda(id);
      const poin = await blueprintModel.poinByBlueprint(id);
      const idPerNomor = new Map(poin.map((p) => [p.nomor, p.id]));
      periksaTarget(target, await muatRegistri(bp.repo_id), idPerNomor);
      const baris = normalkanPeran(target).map((t) => ({ ...t, poin_id: idPerNomor.get(t.nomor) }));
      await db.transaction(async (conn) => {
        await blueprintModel.gantiTarget(id, baris, conn);
        await blueprintModel.hapusKelompok(id, conn);
      });
      return { id, jumlah: baris.length };
    },
    /** Menyusun kelompok per modul pemilik, memecahnya menurut ukuran, lalu mengurutkan beserta alasannya. */
    async susunKelompok({ id }) {
      const bp = await wajibAda(id);
      const [poin, target, reg, dependensiModul, pengaturan] = await Promise.all([
        blueprintModel.poinByBlueprint(id),
        blueprintModel.targetByBlueprint(id),
        muatRegistri(bp.repo_id),
        blueprintModel.dependensiModulRepo(bp.repo_id),
        pengaturanUsecase.semua(),
      ]);
      const { pemilik, terkait } = petaPeran(poin, target);
      const nomorAda = new Set(poin.map((p) => p.nomor));
      const modulAda = new Set<string>(reg.modul.map((m) => m.id));

      const kel = await blueprintAnalyzer.kelompokkan({
        poin: poin.map((p) => ({ nomor: p.nomor, modul_id: pemilik.get(p.nomor) ?? null })),
        ukuran: Number(pengaturan[KUNCI_PENGATURAN.UKURAN_KELOMPOK_BLUEPRINT]),
      });
      // tidak ada poin yang punya modul: tidak ada yang bisa dikelompokkan
      if (kel.hasil.kelompok.length === 0) throw new AppError('Belum ada poin yang punya modul pemilik. Lengkapi pencocokan dulu.', 400);
      periksaKelompok(kel.hasil.kelompok, nomorAda, modulAda);

      // ketergantungan = dependensi modul terdaftar + hasil deteksi dari peran pemilik/terkait pada poin
      const deteksi = await blueprintAnalyzer.deteksiDependensi({
        poin: poin.map((p) => ({ nomor: p.nomor, pemilik: pemilik.get(p.nomor) ?? null, terkait: terkait.get(p.nomor) ?? [] })),
      });
      const pasangan = new Map<string, { modul_id: string; ke_modul_id: string }>();
      for (const d of [...dependensiModul, ...deteksi.hasil.dependensi]) pasangan.set(`${d.modul_id}>${d.ke_modul_id}`, { modul_id: d.modul_id, ke_modul_id: d.ke_modul_id });

      const urut = await blueprintAnalyzer.urutkan({
        kelompok: kel.hasil.kelompok,
        teks_poin: Object.fromEntries(poin.map((p) => [p.nomor, p.isi])),
        dependensi: [...pasangan.values()],
        nama_modul: Object.fromEntries(reg.modul.map((m) => [m.id, m.nama])),
      });
      const terurut = urut.hasil.kelompok;
      // urutan harus memuat tepat poin yang sama dengan kelompok sebelum diurutkan
      const jumlahPoin = (daftar) => daftar.reduce((n, k) => n + k.poin.length, 0);
      if (terurut.length !== kel.hasil.kelompok.length || jumlahPoin(terurut) !== jumlahPoin(kel.hasil.kelompok)) throw new AppError('Hasil pengurutan tidak konsisten.', 500);
      periksaKelompok(terurut, nomorAda, modulAda);

      await db.transaction(async (conn) => {
        await blueprintModel.hapusKelompok(id, conn);
        for (const [i, k] of terurut.entries()) {
          const kelompokId = await blueprintModel.buatKelompok({ blueprint_id: id, modul_id: k.modul_id, urutan: i + 1, alasan: k.alasan }, conn);
          await blueprintModel.setKelompokPoin(id, kelompokId, k.poin, conn);
        }
      });
      const catatan = [kel.catatan, deteksi.catatan, urut.catatan].filter(Boolean)[0] ?? null;
      return { id, jumlah_kelompok: terurut.length, tanpa_modul: kel.hasil.tanpa_modul, asal: urut.asal, catatan };
    },
    /** Menyimpan susunan kelompok hasil edit user (pindah poin, ubah urutan, tulis ulang alasan). */
    async simpanKelompok({ id, kelompok }) {
      const bp = await wajibAda(id);
      const [poin, reg] = await Promise.all([blueprintModel.poinByBlueprint(id), muatRegistri(bp.repo_id)]);
      const nomorAda = new Set(poin.map((p) => p.nomor));
      const modulAda = new Set(reg.modul.map((m) => m.id));
      const terpakai = new Set();
      const bersih = kelompok.filter((k) => k.poin.length > 0); // kelompok kosong dibuang
      for (const k of bersih) {
        if (!modulAda.has(k.modul_id)) throw new AppError('Modul kelompok tidak ada di repo ini.', 400);
        for (const n of k.poin) {
          // nomor tidak dikenal atau muncul di dua kelompok: susunan tidak valid
          if (!nomorAda.has(n) || terpakai.has(n)) throw new AppError(`Poin ${n} tidak valid atau muncul lebih dari satu kali.`, 400);
          terpakai.add(n);
        }
      }
      await db.transaction(async (conn) => {
        await blueprintModel.hapusKelompok(id, conn);
        for (const [i, k] of bersih.entries()) {
          const kelompokId = await blueprintModel.buatKelompok({ blueprint_id: id, modul_id: k.modul_id, urutan: i + 1, alasan: k.alasan }, conn);
          await blueprintModel.setKelompokPoin(id, kelompokId, k.poin, conn);
        }
      });
      return { id, jumlah_kelompok: bersih.length };
    },
    /** Membuat satu prompt per kelompok (template D), masing-masing dengan unique_id sendiri. */
    async buatPrompt({ id }) {
      const bp = await wajibAda(id);
      const [poin, target, kelompok] = await Promise.all([blueprintModel.poinByBlueprint(id), blueprintModel.targetByBlueprint(id), blueprintModel.kelompokByBlueprint(id)]);
      // belum ada kelompok: user perlu menyusunnya dulu
      if (kelompok.length === 0) throw new AppError('Belum ada kelompok. Susun kelompok terlebih dahulu.', 400);
      const tanpa = poin.filter((p) => !p.kelompok_id).map((p) => p.nomor);
      // poin yang tidak punya kelompok akan hilang dari prompt: hentikan dan sebutkan nomornya
      if (tanpa.length) throw new AppError(`Poin ${tanpa.join(', ')} belum masuk kelompok mana pun (pilih modul untuk poin itu).`, 400);

      const reg = await muatRegistri(bp.repo_id);
      const modulIds = [...new Set([...kelompok.map((k) => k.modul_id), ...target.map((t) => t.modul_id)])];
      const data = { ...reg, poin: await promptModel.poinByModulIds(modulIds) };
      const uniqueIds = await buatSemuaUniqueId(kelompok.length);
      const daftar = [];
      for (const [i, k] of kelompok.entries()) {
        daftar.push({ k, isi: await renderKelompok({ bp, k, i, kelompok, uniqueIds, poin, target, data }) });
      }
      await db.transaction(async (conn) => {
        for (const [i, item] of daftar.entries()) {
          const sesiId = await promptModel.buatSesi({ unique_id: uniqueIds[i], repo_id: bp.repo_id, jenis: JENIS_SESI.BLUEPRINT, perubahan_id: null, isi_prompt: item.isi }, conn);
          await promptModel.tambahModulSesi(sesiId, item.k.modul_id, conn);
          await blueprintModel.setSesiKelompok(item.k.id, sesiId, conn);
        }
      });
      return { id, jumlah_prompt: daftar.length };
    },
    /** Prompt yang sudah dibuat, terurut sesuai urutan eksekusi. */
    async ambilPrompt(id) {
      const bp = await wajibAda(id);
      const baris = await blueprintModel.promptByBlueprint(id);
      return {
        blueprint: { id: bp.id, judul: bp.judul, repo: { kode: bp.repo_kode, nama: bp.repo_nama } },
        prompt: baris.map((b) => ({
          id: b.sesi_id,
          unique_id: b.unique_id,
          jenis: 'blueprint',
          status: b.status,
          repo: { kode: b.repo_kode, nama: b.repo_nama },
          isi_prompt: b.isi_prompt,
          nama_file: `prompt_${b.repo_kode}_${b.unique_id}.md`,
          label: `${b.urutan}. ${b.modul_nama}`,
          alasan: b.alasan_urutan,
          urutan: b.urutan,
        })),
      };
    },
    /** Menghapus blueprint. */
    async hapus(id) {
      await wajibAda(id);
      await blueprintModel.hapus(id);
      return { id };
    },
  };

  /** Merender prompt (template D) untuk satu kelompok. */
  async function renderKelompok({ bp, k, i, kelompok, uniqueIds, poin, target, data }) {
    const nomorK = new Set(poin.filter((p) => p.kelompok_id === k.id).map((p) => p.nomor));
    const poinK = poin.filter((p) => nomorK.has(p.nomor));
    const idKeNomor = new Map(poin.map((p) => [p.id, p.nomor]));
    const namaModul = new Map(data.modul.map((m) => [m.id, m.nama]));
    const targetK = target.filter((t) => nomorK.has(idKeNomor.get(t.blueprint_poin_id)));
    const urutanKelompok = new Map<string, { urutan: number; modul_nama: string }>(kelompok.map((x) => [x.id, x]));

    const ditugaskan = poinK.map((p) => ({
      nomor: p.nomor,
      isi: p.isi,
      terkait: [...new Set(targetK.filter((t) => t.blueprint_poin_id === p.id && t.modul_id !== k.modul_id).map((t) => namaModul.get(t.modul_id)))],
    }));
    // poin kelompok lain yang menyebut modul ini sebagai konteks
    const terkaitLain = poin
      .filter((p) => p.kelompok_id !== k.id && target.some((t) => t.blueprint_poin_id === p.id && t.peran === 'terkait' && t.modul_id === k.modul_id))
      .map((p) => {
        const kel = urutanKelompok.get(p.kelompok_id);
        return { nomor: p.nomor, isi: p.isi, urutan: kel.urutan, modul: kel.modul_nama };
      });
    const doc = formatDokumentasiRelevan(data, {
      pemilikId: k.modul_id,
      terkaitIds: [...new Set(targetK.filter((t) => t.modul_id !== k.modul_id).map((t) => t.modul_id))],
      menuIds: targetK.filter((t) => t.modul_id === k.modul_id && t.menu_id).map((t) => t.menu_id),
      halamanIds: targetK.filter((t) => t.modul_id === k.modul_id && t.halaman_id).map((t) => t.halaman_id),
    });
    const sebelumnya = kelompok.slice(0, i).map((x, j) => ({ urutan: x.urutan, nama_modul: x.modul_nama, unique_id: uniqueIds[j] }));

    return renderTemplate('blueprint_kelompok', {
      judul_blueprint: bp.judul,
      unique_id: uniqueIds[i],
      kode_repo: bp.repo_kode,
      branch: bp.branch_utama,
      nama_modul: k.modul_nama,
      urutan: k.urutan,
      total: kelompok.length,
      alasan_urutan: k.alasan_urutan ?? '-',
      blueprint_lengkap: formatBlueprintLengkap(poin),
      poin_ditugaskan: formatPoinDitugaskan(ditugaskan),
      poin_terkait: formatPoinTerkait(terkaitLain),
      jalur_laporan_sebelumnya: formatJalurLaporan(sebelumnya, bp.repo_kode),
      dokumentasi_relevan: doc.relevan,
      judul_menu_dan_halaman_lain: doc.lain,
    });
  }
}
