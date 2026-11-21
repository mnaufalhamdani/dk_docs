import { z } from 'zod';

// Kontrak DocPolisher: memeriksa panjang sebuah poin dokumentasi dan mengusulkan versi yang lebih
// singkat/rapi. Usulan hanya saran; user yang memutuskan memakainya atau tidak.

/** Daftar metode kontrak beserta skema masukan dan keluarannya. */
export const kontrakDocPolisher = {
  /** Memeriksa satu poin terhadap batas lunak dan (bila perlu) mengusulkan versi ringkas. */
  rapikanPoin: {
    masukan: z.object({
      isi: z.string().min(1),
      batas: z.object({ karakter: z.number().int().positive(), kalimat: z.number().int().positive() }),
    }),
    keluaran: z.object({
      asli: z.string(),
      usulan: z.string().nullable(),
      berubah: z.boolean(),
      panjang: z.number().int().nonnegative(),
      jumlah_kalimat: z.number().int().nonnegative(),
      peringatan: z.boolean(),
      alasan: z.array(z.string()),
    }),
  },
};

/** Metode kontrak (untuk dokumentasi dan pengecekan kelengkapan). */
export const METODE_DOC_POLISHER = Object.keys(kontrakDocPolisher);
