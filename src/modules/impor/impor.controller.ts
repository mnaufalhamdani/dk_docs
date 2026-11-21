import { validasi } from '@/utils/validasi';
import { buatImporSchema, simpanImporSchema, imporIdSchema } from './impor.schema';

/** Controller impor: validasi input lalu teruskan ke usecase. */
export function buatImporController({ imporUsecase }) {
  return {
    /** Membuat impor dari JSON mentah (tempel / unggah). */
    buat: (input) => imporUsecase.buat(validasi(buatImporSchema, input)),
    /** Data halaman review. */
    detail: (id) => imporUsecase.detail(validasi(imporIdSchema, id)),
    /** Daftar impor terbaru (opsional per unique_id). */
    daftar: (uniqueId) => imporUsecase.daftar(typeof uniqueId === 'string' && /^[a-z0-9]{8}$/.test(uniqueId) ? uniqueId : null),
    /** Membatalkan impor yang menunggu review. */
    batalkan: (id) => imporUsecase.batalkan(validasi(imporIdSchema, id)),
    /** Menyimpan hasil review. */
    simpan: (input) => imporUsecase.simpan(validasi(simpanImporSchema, input)),
  };
}
