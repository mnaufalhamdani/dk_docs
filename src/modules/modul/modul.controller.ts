import { validasi } from '@/utils/validasi';
import { idSchema } from '@/utils/schemaDasar';
import { buatModulSchema, ubahModulSchema } from './modul.schema';

/** Controller modul: validasi input lalu teruskan ke usecase. */
export function buatModulController({ modulUsecase }) {
  return {
    /** Detail modul untuk tampilan baca. */
    detail: (id) => modulUsecase.detail(validasi(idSchema, id)),
    /** Data modul untuk form ubah. */
    untukForm: (id) => modulUsecase.untukForm(validasi(idSchema, id)),
    /** Membuat modul. */
    buat: (input) => modulUsecase.buat(validasi(buatModulSchema, input)),
    /** Mengubah modul. */
    ubah(input) {
      const { id, ...data } = validasi(ubahModulSchema, input);
      return modulUsecase.ubah(id, data);
    },
    /** Menghapus modul. */
    hapus: (id) => modulUsecase.hapus(validasi(idSchema, id)),
  };
}
