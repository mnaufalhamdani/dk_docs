import { z } from 'zod';

// Kontrak BlueprintAnalyzer: memecah blueprint, mengelompokkan poin, mendeteksi dependensi antar modul,
// dan menentukan urutan eksekusi beserta alasan. Semua masukan/keluaran berupa JSON polos
// (tanpa Map/Set) agar implementasi aturan dan AI bisa saling menggantikan.

const nomor = z.number().int().positive();
// id modul berupa teks angka (BIGINT dari IdGenerator), bukan number
const idModul = z.string().regex(/^[1-9]\d{0,18}$/);

/** Daftar metode kontrak beserta skema masukan dan keluarannya. */
export const kontrakBlueprintAnalyzer = {
  /** Memecah teks blueprint menjadi poin bersih. */
  pecahPoin: {
    masukan: z.object({ teks: z.string() }),
    keluaran: z.object({ poin: z.array(z.string().min(1)) }),
  },
  /** Mengelompokkan poin menurut modul pemilik; satu kelompok maksimal `ukuran` poin. */
  kelompokkan: {
    masukan: z.object({
      poin: z.array(z.object({ nomor, modul_id: idModul.nullable() })),
      ukuran: z.number().int().positive(),
    }),
    keluaran: z.object({
      kelompok: z.array(z.object({ modul_id: idModul, poin: z.array(nomor).min(1) })),
      tanpa_modul: z.array(nomor),
    }),
  },
  /** Menyimpulkan ketergantungan antar modul dari peran pemilik/terkait pada tiap poin. */
  deteksiDependensi: {
    masukan: z.object({
      poin: z.array(z.object({ nomor, pemilik: idModul.nullable(), terkait: z.array(idModul) })),
    }),
    keluaran: z.object({
      dependensi: z.array(z.object({ modul_id: idModul, ke_modul_id: idModul, alasan: z.string() })),
    }),
  },
  /** Mengurutkan kelompok dan menulis alasan urutan. */
  urutkan: {
    masukan: z.object({
      kelompok: z.array(z.object({ modul_id: idModul, poin: z.array(nomor).min(1) })),
      teks_poin: z.record(z.string(), z.string()),
      dependensi: z.array(z.object({ modul_id: idModul, ke_modul_id: idModul })),
      nama_modul: z.record(z.string(), z.string()),
    }),
    keluaran: z.object({
      kelompok: z.array(z.object({ modul_id: idModul, poin: z.array(nomor).min(1), alasan: z.string() })),
    }),
  },
};

/** Metode kontrak (untuk dokumentasi dan pengecekan kelengkapan). */
export const METODE_BLUEPRINT_ANALYZER = Object.keys(kontrakBlueprintAnalyzer);
