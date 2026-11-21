import { validasi } from '@/utils/validasi';
import { idSchema } from '@/utils/schemaDasar';
import { buatMenuSchema, ubahMenuSchema } from './menu.schema';

/** Controller menu: validasi input lalu teruskan ke usecase. */
export function buatMenuController({ menuUsecase }) {
  return {
    /** Detail menu untuk tampilan baca. */
    detail: (id) => menuUsecase.detail(validasi(idSchema, id)),
    /** Data menu untuk form ubah. */
    untukForm: (id) => menuUsecase.untukForm(validasi(idSchema, id)),
    /** Membuat menu. */
    buat: (input) => menuUsecase.buat(validasi(buatMenuSchema, input)),
    /** Membuat halaman standar CRUD untuk menu yang ada. */
    buatHalamanStandar: (id) => menuUsecase.buatHalamanStandar(validasi(idSchema, id)),
    /** Mengubah menu. */
    ubah(input) {
      const { id, ...data } = validasi(ubahMenuSchema, input);
      return menuUsecase.ubah(id, data);
    },
    /** Menghapus menu. */
    hapus: (id) => menuUsecase.hapus(validasi(idSchema, id)),
  };
}
