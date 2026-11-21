import { z } from 'zod';
import { DAFTAR_PLATFORM } from '@/enums';
import { idSchema, kodeSchema, teksOpsional } from '@/utils/schemaDasar';
import { urlOpsionalSchema } from '@/utils/validasiUrl';

/** Schema membuat repo. */
export const buatRepoSchema = z.object({
  kode: kodeSchema,
  nama: z.string().trim().min(1, 'Nama wajib diisi.').max(150, 'Maksimal 150 karakter.'),
  platform: z.enum(DAFTAR_PLATFORM).default('js'),
  branch_utama: z.string().trim().min(1, 'Branch wajib diisi.').max(100).default('development'),
  // info repo (opsional, manual): tautan git, beta, dan live
  url_git: urlOpsionalSchema,
  url_beta: urlOpsionalSchema,
  url_live: urlOpsionalSchema,
});

/** Schema mengubah repo (id ikut dalam input). */
export const ubahRepoSchema = buatRepoSchema.extend({ id: idSchema });

/** Nama teknologi wajib berisi; versi dan sumber file opsional. */
const teknologiDasar = {
  nama: z.string().trim().min(1, 'Nama teknologi wajib diisi.').max(100, 'Maksimal 100 karakter.'),
  versi: teksOpsional(50),
  sumber_file: teksOpsional(255),
};

/** Schema menambah atau menimpa (upsert) satu teknologi repo secara manual. */
export const simpanTeknologiSchema = z.object({ repo_id: idSchema, ...teknologiDasar });

/** Schema mengubah satu entri teknologi berdasarkan id-nya. */
export const ubahTeknologiSchema = z.object({ id: idSchema, ...teknologiDasar });

/** Satu entri teknologi pada JSON hasil agent (dipakai juga oleh schema impor). */
export const teknologiAgenSchema = z.object(teknologiDasar);
