import { z } from 'zod';
import { idSchema } from '@/utils/schemaDasar';

/** Daftar id (menerima array atau satu nilai) tanpa duplikat. */
const daftarId = z
  .union([idSchema, z.array(idSchema)])
  .transform((v) => [...new Set(Array.isArray(v) ? v : [v])]);

/** Schema sesi usulan perubahan: satu perubahan CR/B dan satu atau lebih repo. */
export const sesiUsulanSchema = z.object({
  perubahan_id: idSchema,
  repo_ids: daftarId.refine((v) => v.length > 0, 'Pilih minimal satu repo.'),
});

/** Schema sesi dokumentasi baru: 1-5 modul dari satu repo. */
export const sesiDokumentasiBaruSchema = z.object({
  repo_id: idSchema,
  modul_ids: daftarId.refine((v) => v.length >= 1 && v.length <= 5, 'Pilih 1 sampai 5 modul.'),
});

/** Schema sesi sinkron modul: satu modul. */
export const sesiSinkronSchema = z.object({ modul_id: idSchema });

/** Schema sesi audit bugfix: satu repo. */
export const sesiAuditSchema = z.object({ repo_id: idSchema });

/** Schema unduh prompt: unique_id dan kode repo. */
export const unduhSchema = z.object({
  unique_id: z.string().regex(/^[a-z0-9]{8}$/, 'unique_id tidak valid.'),
  repo: z.string().regex(/^[a-z0-9_-]+$/, 'Kode repo tidak valid.'),
});

/** Schema membaca sesi berdasarkan unique_id. */
export const uniqueIdSchema = z.string().regex(/^[a-z0-9]{8}$/, 'unique_id tidak valid.');
