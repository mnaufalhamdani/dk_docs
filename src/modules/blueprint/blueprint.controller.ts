import { validasi } from '@/utils/validasi';
import { buatBlueprintSchema, simpanPoinSchema, simpanPencocokanSchema, simpanKelompokSchema, blueprintIdSchema } from './blueprint.schema';

/** Controller blueprint: validasi input lalu teruskan ke usecase. */
export function buatBlueprintController({ blueprintUsecase }) {
  return {
    /** Daftar blueprint. */
    daftar: () => blueprintUsecase.daftar(),
    /** Membuat blueprint dari teks mentah. */
    buat: (input) => blueprintUsecase.buat(validasi(buatBlueprintSchema, input)),
    /** Data halaman editor. */
    detail: (id) => blueprintUsecase.detail(validasi(blueprintIdSchema, id)),
    /** Menyimpan poin hasil perapihan. */
    simpanPoin: (input) => blueprintUsecase.simpanPoin(validasi(simpanPoinSchema, input)),
    /** Menyimpan pencocokan poin. */
    simpanPencocokan: (input) => blueprintUsecase.simpanPencocokan(validasi(simpanPencocokanSchema, input)),
    /** Menyusun kelompok dan urutan otomatis. */
    susunKelompok: (id) => blueprintUsecase.susunKelompok({ id: validasi(blueprintIdSchema, id) }),
    /** Menyimpan susunan kelompok hasil edit. */
    simpanKelompok: (input) => blueprintUsecase.simpanKelompok(validasi(simpanKelompokSchema, input)),
    /** Membuat prompt per kelompok. */
    buatPrompt: (id) => blueprintUsecase.buatPrompt({ id: validasi(blueprintIdSchema, id) }),
    /** Prompt yang sudah dibuat. */
    ambilPrompt: (id) => blueprintUsecase.ambilPrompt(validasi(blueprintIdSchema, id)),
    /** Menghapus blueprint. */
    hapus: (id) => blueprintUsecase.hapus(validasi(blueprintIdSchema, id)),
  };
}
