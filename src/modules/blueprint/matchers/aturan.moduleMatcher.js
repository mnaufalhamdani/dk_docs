import { cocokkanPoin, susunTarget } from '../blueprint.pencocokan';

/** Implementasi ModuleMatcher berbasis aturan: kecocokan kata utuh pada nama, alias, route, dan kata kunci. */
export function buatAturanModuleMatcher() {
  return {
    /** Mencocokkan setiap poin; modul dengan skor tertinggi menjadi pemilik, lainnya terkait. */
    cocokkan({ poin, indeks }) {
      return {
        cocok: poin.map((p) => {
          const kandidat = cocokkanPoin(p.isi, indeks);
          return {
            nomor: p.nomor,
            // Infinity (posisi) tidak ikut keluar: kontrak hanya memuat data JSON polos
            kandidat: kandidat.map(({ modul_id: modulId, skor, menu_ids: menuIds, halaman_ids: halamanIds }) => ({ modul_id: modulId, skor, menu_ids: menuIds, halaman_ids: halamanIds })),
            target: susunTarget(kandidat, indeks),
          };
        }),
      };
    },
  };
}
