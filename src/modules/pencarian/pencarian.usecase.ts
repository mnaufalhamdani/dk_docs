import 'server-only';
import { bentukLike, bentukEkspresiFulltext } from '@/utils/fulltext';

/** Jumlah hasil maksimal per grup di palet pencarian. */
const BATAS_PER_GRUP = 8;

/** Potongan isi poin untuk ditampilkan di hasil (maks 120 karakter). */
function potong(teks) {
  return teks.length > 120 ? `${teks.slice(0, 117)}...` : teks;
}

/** Usecase pencarian: mengumpulkan hasil dari registry dan isi poin, dikelompokkan. */
export function buatPencarianUsecase({ pencarianModel }) {
  /** Mencari isi poin: FULLTEXT dulu, lalu LIKE bila kosong atau kata terlalu pendek. */
  async function cariIsi(q) {
    const ekspresi = bentukEkspresiFulltext(q);
    if (ekspresi) {
      const hasil = await pencarianModel.isiFulltext(ekspresi, BATAS_PER_GRUP);
      // FULLTEXT menemukan sesuatu: pakai hasil itu (berperingkat relevansi)
      if (hasil.length > 0) return hasil;
    }
    // kata pendek / stopword / FULLTEXT kosong: cadangan LIKE agar user tetap dapat hasil
    return pencarianModel.isiLike(bentukLike(q), BATAS_PER_GRUP);
  }

  return {
    /** Pencarian global; mengembalikan { modul, menu, halaman, isi } berisi item { id, judul, sub, href, stub }. */
    async cari(q) {
      const teks = q.trim();
      const kosong = { modul: [], menu: [], halaman: [], isi: [], perubahan: [] };
      // input terlalu pendek: hasilnya terlalu luas dan tidak berguna
      if (teks.length < 2) return kosong;

      const like = bentukLike(teks);
      const [modul, menu, halaman, isi, perubahan] = await Promise.all([
        pencarianModel.modul(like, BATAS_PER_GRUP),
        pencarianModel.menu(like, BATAS_PER_GRUP),
        pencarianModel.halaman(like, BATAS_PER_GRUP),
        cariIsi(teks),
        pencarianModel.perubahan(like, bentukEkspresiFulltext(teks), BATAS_PER_GRUP),
      ]);

      return {
        modul: modul.map((m) => ({ id: m.id, judul: m.nama, sub: m.repo_nama, href: `/modul/${m.id}`, stub: !!m.is_stub })),
        menu: menu.map((m) => ({ id: m.id, judul: m.nama, sub: [m.modul_nama, m.route].filter(Boolean).join(' · '), href: `/menu/${m.id}`, stub: !!m.is_stub })),
        halaman: halaman.map((h) => ({ id: h.id, judul: h.nama, sub: [h.menu_nama, h.route].filter(Boolean).join(' · '), href: `/menu/${h.menu_id}?h=${h.id}`, stub: !!h.is_stub })),
        isi: isi.map((p) => ({ id: p.id, judul: potong(p.isi), sub: `${p.menu_nama} › ${p.halaman_nama} · ${p.bagian}`, href: `/menu/${p.menu_id}?h=${p.halaman_id}&p=${p.id}`, stub: false, pending: Number(p.pending) === 1 })),
        perubahan: perubahan.map((p) => ({ id: p.id, judul: `${p.tipe} ${p.nomor}`, sub: potong(p.ringkasan ?? ''), href: `/perubahan/${p.id}`, stub: false })),
      };
    },
  };
}
