import { z } from 'zod';
import { idSchema } from '@/utils/schemaDasar';

/** Schema mengubah status tautan CR/B: hanya antara aktif dan pending (sudah_berubah hanya dari sinkron_modul). */
export const ubahStatusTautanSchema = z.object({
  id: idSchema,
  status: z.enum(['aktif', 'pending'], { message: 'Status harus aktif atau pending.' }),
});
