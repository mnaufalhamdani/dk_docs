import 'server-only';
import { AppError } from '@/utils/appError';
import { bentukLike, bentukEkspresiFulltext } from '@/utils/fulltext';
import { bentukUrlDokumen } from '@/utils/urlWebfuzo';

/** Jumlah baris per halaman pada daftar perubahan. */
const UKURAN_HALAMAN = 25;

/** Memotong teks panjang untuk ringkasan di timeline. */
function potong(teks, maks = 140) {
  if (!teks) return '';
  return teks.length > maks ? `${teks.slice(0, maks - 3)}...` : teks;
}

/** Mengelompokkan pesan tanpa pemetaan menurut pasangan nama mentah (modul, menu). */
function kelompokBelumDipetakan(pesan) {
  const peta = new Map();
  for (const p of pesan) {
    const kunci = `${p.modul_sumber ?? ''}\u0000${p.menu_sumber ?? ''}`;
    const ada = peta.get(kunci) ?? { modul_sumber: p.modul_sumber, menu_sumber: p.menu_sumber, jumlah: 0 };
    ada.jumlah += 1;
    peta.set(kunci, ada);
  }
  return [...peta.values()];
}

/** Mengambil/membuat entri anak pada Map berurutan (menjaga urutan kemunculan dari query). */
function ambilAtauBuat(peta, kunci, buat) {
  if (!peta.has(kunci)) peta.set(kunci, buat());
  return peta.get(kunci);
}

/**
 * Mengelompokkan tautan poin menjadi modul -> menu -> halaman -> item.
 * Teks yang ditampilkan: teks sekarang bila poin masih ada dan tautan belum "sudah_berubah";
 * selain itu salinan teks_poin (tautan sudah_berubah menyimpan teks lama).
 */
function kelompokkanPoinTerkait(tautan) {
  const modulPeta = new Map<string, any>();
  for (const x of tautan) {
    const modul = ambilAtauBuat(modulPeta, x.modul_id, () => ({ modul_id: x.modul_id, modul_nama: x.modul_nama, repo_nama: x.repo_nama, menu: new Map<string, any>() }));
    const menu = ambilAtauBuat(modul.menu, x.menu_id, () => ({ menu_id: x.menu_id, menu_nama: x.menu_nama, halaman: new Map<string, any>() }));
    const halaman = ambilAtauBuat(menu.halaman, x.halaman_id, () => ({ halaman_id: x.halaman_id, halaman_nama: x.halaman_nama, item: [] }));
    const poinAda = Boolean(x.poin_id);
    // tautan sudah_berubah memegang teks lama; selainnya tampilkan teks poin sekarang bila masih ada
    const pakaiSekarang = poinAda && x.status !== 'sudah_berubah' && x.isi_sekarang;
    halaman.item.push({ id: x.id, status: x.status, teks: pakaiSekarang ? x.isi_sekarang : x.teks_poin, poin_ada: poinAda, bagian: x.bagian });
  }
  return [...modulPeta.values()].map((m) => ({
    ...m,
    menu: [...m.menu.values()].map((mn) => ({ ...mn, halaman: [...mn.halaman.values()] })),
  }));
}

/** Usecase perubahan: daftar/pencarian, detail, dan riwayat per modul/menu/halaman. */
export function buatPerubahanUsecase({ perubahanModel, tautanModel, webfuzoConfig }) {
  return {
    /** Daftar perubahan terfilter dengan paginasi. */
    async daftar(filter) {
      const q = filter.q;
      const f = { ...filter, like: q ? bentukLike(q) : null, ekspresiFt: q ? bentukEkspresiFulltext(q) : null };
      const offset = (filter.halaman - 1) * UKURAN_HALAMAN;
      const [items, total, developer] = await Promise.all([
        perubahanModel.cari(f, UKURAN_HALAMAN, offset),
        perubahanModel.hitung(f),
        perubahanModel.daftarDeveloper(),
      ]);
      return {
        items: items.map((i) => ({ ...i, belum_dipetakan: Number(i.belum_dipetakan), sudah_didokumentasi: Number(i.sudah_didokumentasi) === 1 })),
        total,
        halaman: filter.halaman,
        ukuran: UKURAN_HALAMAN,
        jumlah_halaman: Math.max(1, Math.ceil(total / UKURAN_HALAMAN)),
        developer,
      };
    },
    /** Detail perubahan: pesan (dengan pemetaan), modul terdampak, nama mentah belum dipetakan, dan dampak. */
    async detail(id) {
      const perubahan = await perubahanModel.byId(id);
      // id tidak dikenal: 404
      if (!perubahan) throw new AppError('Perubahan tidak ditemukan.', 404);
      const [pesan, peta, dampak, tautan] = await Promise.all([
        perubahanModel.pesanByPerubahan(id),
        perubahanModel.petaByPerubahan(id),
        perubahanModel.dampakByPerubahan(id),
        tautanModel.byPerubahan(id),
      ]);

      const petaPerPesan = new Map();
      for (const p of peta) petaPerPesan.set(p.pesan_id, [...(petaPerPesan.get(p.pesan_id) ?? []), p]);
      const pesanLengkap = pesan.map((p) => ({ ...p, peta: petaPerPesan.get(p.id) ?? [] }));

      const modulUnik = new Map();
      for (const p of peta) modulUnik.set(p.modul_id, { id: p.modul_id, nama: p.modul_nama, repo_id: p.repo_id, repo_nama: p.repo_nama });
      return {
        ...perubahan,
        // nomor yang tersimpan adalah nomor sumber apa adanya (lihat sync.usecase: nomorSumber)
        url_dokumen: bentukUrlDokumen(webfuzoConfig, perubahan.tipe, perubahan.nomor),
        pesan: pesanLengkap,
        developer: [...new Set(pesan.map((p) => p.user_name).filter(Boolean))],
        modul_terdampak: [...modulUnik.values()],
        belum_dipetakan: kelompokBelumDipetakan(pesanLengkap.filter((p) => p.peta.length === 0)),
        dampak,
        poin_terkait: kelompokkanPoinTerkait(tautan),
      };
    },
    /** Timeline riwayat satu modul/menu/halaman: perubahan CR/B dan entri audit, terbaru dulu. */
    async riwayat({ tingkat, id }) {
      const [dampak, tautan, peta, audit] = await Promise.all([
        perubahanModel.riwayatDampak(tingkat, id),
        perubahanModel.riwayatTautan(tingkat, id),
        perubahanModel.riwayatPeta(tingkat, id),
        perubahanModel.riwayatAudit(tingkat, id),
      ]);
      // perubahan yang sudah tercatat sebagai dampak tidak diulang dari tautan poin
      const sudahDampak = new Set(dampak.map((r) => String(r.perubahan_id)));
      const dariTautan = tautan.filter((r) => !sudahDampak.has(String(r.perubahan_id)));
      const perubahan = [...dampak, ...dariTautan, ...peta].map((r) => ({
        jenis: 'perubahan',
        perubahan_id: r.perubahan_id,
        tipe: r.tipe,
        nomor: r.nomor,
        asal: r.asal,
        tanggal: r.tanggal,
        ringkasan: potong(r.ringkasan),
      }));
      const entriAudit = audit.map((a) => ({ jenis: 'audit', audit_id: a.audit_id, tanggal: a.tanggal, ringkasan: potong(a.ringkasan) }));
      return [...perubahan, ...entriAudit].sort((a, b) => String(b.tanggal).localeCompare(String(a.tanggal)));
    },
  };
}
