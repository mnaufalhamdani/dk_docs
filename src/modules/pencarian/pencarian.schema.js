import { z } from 'zod';

/** Schema query pencarian: teks bebas, dibatasi panjangnya. */
export const cariSchema = z.object({
  q: z.string().trim().max(100, 'Kata kunci maksimal 100 karakter.').default(''),
});
