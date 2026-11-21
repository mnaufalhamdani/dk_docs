import { validasi } from '@/utils/validasi';
import { ubahPengaturanSchema } from './pengaturan.schema';

/** Controller pengaturan: validasi input lalu teruskan ke usecase. */
export function buatPengaturanController({ pengaturanUsecase }) {
  return {
    /** Mengambil semua pengaturan. */
    ambil: () => pengaturanUsecase.semua(),
    /** Mengubah pengaturan setelah input divalidasi. */
    ubah: (input) => pengaturanUsecase.ubah(validasi(ubahPengaturanSchema, input)),
    /** Batas peringatan panjang poin untuk editor. */
    batasPoin: () => pengaturanUsecase.batasPoin(),
  };
}
