import { validasi } from '@/utils/validasi';
import { ubahStatusTautanSchema } from './tautan.schema';

/** Controller tautan: validasi input lalu teruskan ke usecase. */
export function buatTautanController({ tautanUsecase }) {
  return {
    /** Mengubah status tautan CR/B (aktif <-> pending). */
    ubahStatus: (input) => tautanUsecase.ubahStatus(validasi(ubahStatusTautanSchema, input)),
  };
}
