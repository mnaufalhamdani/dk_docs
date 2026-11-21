import { z } from 'zod';

// Kontrak ModuleMatcher: mencocokkan teks poin blueprint dengan modul/menu/halaman pada registry.
// `indeks` adalah JSON hasil bangunIndeks() (daftar modul/menu/halaman beserta istilah pencariannya).

// id berupa teks angka (BIGINT dari IdGenerator), bukan number
const id = z.string().regex(/^[1-9]\d{0,18}$/);

/** Daftar metode kontrak beserta skema masukan dan keluarannya. */
export const kontrakModuleMatcher = {
  /** Mencocokkan banyak poin sekaligus; mengembalikan kandidat dan target saran per poin. */
  cocokkan: {
    masukan: z.object({
      poin: z.array(z.object({ nomor: z.number().int().positive(), isi: z.string() })),
      indeks: z.object({
        modul: z.array(z.any()),
        menu: z.array(z.any()),
        halaman: z.array(z.any()),
      }),
    }),
    keluaran: z.object({
      cocok: z.array(
        z.object({
          nomor: z.number().int().positive(),
          kandidat: z.array(z.object({ modul_id: id, skor: z.number(), menu_ids: z.array(id), halaman_ids: z.array(id) })),
          target: z.array(
            z.object({
              modul_id: id,
              menu_id: id.nullable(),
              halaman_id: id.nullable(),
              peran: z.enum(['pemilik', 'terkait']),
            }),
          ),
        }),
      ),
    }),
  },
};

/** Metode kontrak (untuk dokumentasi dan pengecekan kelengkapan). */
export const METODE_MODULE_MATCHER = Object.keys(kontrakModuleMatcher);
