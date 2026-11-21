import { validasi } from '@/utils/validasi';
import { idSchema } from '@/utils/schemaDasar';
import { simpanHalamanSchema, jadikanLiveSchema, unggahGambarSchema, gambarIdSchema, usulkanRingkasSchema } from './dokumentasi.schema';

/** Controller dokumentasi: validasi input lalu teruskan ke usecase. */
export function buatDokumentasiController({ dokumentasiUsecase }) {
  return {
    /** Dokumentasi lengkap satu halaman. */
    ambilHalaman: (id) => dokumentasiUsecase.ambilHalaman(validasi(idSchema, id)),
    /** Menyimpan poin satu halaman. */
    simpanHalaman: (input) => dokumentasiUsecase.simpanHalaman(validasi(simpanHalamanSchema, input)),
    /** Usulan versi ringkas untuk satu poin (DocPolisher). */
    usulkanRingkas: (input) => dokumentasiUsecase.usulkanRingkas(validasi(usulkanRingkasSchema, input)),
    /** Menjadikan semua poin beta live pada satu lingkup. */
    jadikanSemuaLive: (input) => dokumentasiUsecase.jadikanSemuaLive(validasi(jadikanLiveSchema, input)),
    /** Riwayat versi sebuah halaman. */
    riwayatVersi: (id) => dokumentasiUsecase.riwayatVersi(validasi(idSchema, id)),
    /** Unggah gambar halaman. */
    unggahGambar: (input) => dokumentasiUsecase.unggahGambar(validasi(unggahGambarSchema, input)),
    /** Membaca gambar halaman. */
    ambilGambar: (input) => dokumentasiUsecase.ambilGambar(validasi(gambarIdSchema, input)),
    /** Menghapus gambar halaman. */
    hapusGambar: (input) => dokumentasiUsecase.hapusGambar(validasi(gambarIdSchema, input)),
  };
}
