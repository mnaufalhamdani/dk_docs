import { validasi } from '@/utils/validasi';
import { idSchema } from '@/utils/schemaDasar';
import { filterPerubahanSchema, riwayatSchema } from './perubahan.schema';

/** Controller perubahan: validasi input lalu teruskan ke usecase. */
export function buatPerubahanController({ perubahanUsecase }) {
  return {
    /** Daftar perubahan terfilter. */
    daftar: (input) => perubahanUsecase.daftar(validasi(filterPerubahanSchema, input ?? {})),
    /** Detail perubahan. */
    detail: (id) => perubahanUsecase.detail(validasi(idSchema, id)),
    /** Riwayat perubahan satu modul/menu/halaman. */
    riwayat: (input) => perubahanUsecase.riwayat(validasi(riwayatSchema, input)),
  };
}
