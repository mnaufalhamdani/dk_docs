import { validasi } from '@/utils/validasi';
import { cariSchema } from './pencarian.schema';

/** Controller pencarian: validasi query lalu teruskan ke usecase. */
export function buatPencarianController({ pencarianUsecase }) {
  return {
    /** Pencarian global. */
    cari(input) {
      const { q } = validasi(cariSchema, input);
      return pencarianUsecase.cari(q);
    },
  };
}
