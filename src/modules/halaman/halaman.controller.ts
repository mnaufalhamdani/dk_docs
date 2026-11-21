import { validasi } from '@/utils/validasi';
import { idSchema } from '@/utils/schemaDasar';
import { buatHalamanSchema, ubahHalamanSchema } from './halaman.schema';

/** Controller halaman: validasi input lalu teruskan ke usecase. */
export function buatHalamanController({ halamanUsecase }) {
  return {
    /** Data halaman untuk form ubah. */
    untukForm: (id) => halamanUsecase.untukForm(validasi(idSchema, id)),
    /** Membuat halaman. */
    buat: (input) => halamanUsecase.buat(validasi(buatHalamanSchema, input)),
    /** Mengubah halaman. */
    ubah(input) {
      const { id, ...data } = validasi(ubahHalamanSchema, input);
      return halamanUsecase.ubah(id, data);
    },
    /** Menghapus halaman. */
    hapus: (id) => halamanUsecase.hapus(validasi(idSchema, id)),
  };
}
