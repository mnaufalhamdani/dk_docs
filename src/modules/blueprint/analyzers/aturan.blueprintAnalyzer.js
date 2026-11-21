import { pecahPoin } from '@/utils/pemecahPoin';
import { susunKelompok } from '../blueprint.kelompok';
import { urutkanKelompok } from '../blueprint.urutan';

/** Implementasi BlueprintAnalyzer berbasis aturan (tanpa AI): membungkus fungsi murni yang sudah ada. */
export function buatAturanBlueprintAnalyzer() {
  return {
    /** Memecah teks menjadi poin dari penomoran, penanda, atau paragraf. */
    pecahPoin({ teks }) {
      return { poin: pecahPoin(teks) };
    },
    /** Mengelompokkan per modul pemilik dan memecah kelompok yang melebihi ukuran. */
    kelompokkan({ poin, ukuran }) {
      const { kelompok, tanpaModul } = susunKelompok(poin, ukuran);
      return { kelompok, tanpa_modul: tanpaModul };
    },
    /** Pemilik poin bergantung pada modul yang disebut terkait pada poin yang sama. */
    deteksiDependensi({ poin }) {
      const peta = new Map();
      for (const p of poin) {
        // poin tanpa pemilik tidak menghasilkan ketergantungan
        if (!p.pemilik) continue;
        for (const ke of p.terkait) {
          if (ke === p.pemilik) continue; // modul tidak bergantung pada dirinya sendiri
          const kunci = `${p.pemilik}>${ke}`;
          const ada = peta.get(kunci) ?? { modul_id: p.pemilik, ke_modul_id: ke, nomor: [] };
          ada.nomor.push(p.nomor);
          peta.set(kunci, ada);
        }
      }
      return {
        dependensi: [...peta.values()].map((d) => ({
          modul_id: d.modul_id,
          ke_modul_id: d.ke_modul_id,
          alasan: `Poin ${d.nomor.join(', ')} mengerjakan modul ini dengan modul tujuan sebagai konteks.`,
        })),
      };
    },
    /** Topological sort: dependensi wajib, lalu poin skema (tabel/kolom/migrasi), lalu urutan poin. */
    urutkan({ kelompok, teks_poin: teksPoin, dependensi, nama_modul: namaModul }) {
      const terurut = urutkanKelompok({
        kelompok,
        teksPoin: new Map(Object.entries(teksPoin).map(([k, v]) => [Number(k), v])),
        rujukan: new Map(), // rujukan sudah dilebur ke `dependensi` oleh pemanggil
        dependensiModul: dependensi,
        // kunci modul tetap teks: id BIGINT melebihi presisi number JavaScript
        namaModul: new Map(Object.entries(namaModul)),
      });
      return { kelompok: terurut.map(({ modul_id: modulId, poin, alasan }) => ({ modul_id: modulId, poin, alasan })) };
    },
  };
}
