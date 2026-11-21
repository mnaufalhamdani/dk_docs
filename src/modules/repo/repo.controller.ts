import { validasi } from '@/utils/validasi';
import { idSchema } from '@/utils/schemaDasar';
import { buatRepoSchema, ubahRepoSchema, simpanTeknologiSchema, ubahTeknologiSchema } from './repo.schema';

/** Controller repo: validasi input lalu teruskan ke usecase. */
export function buatRepoController({ repoUsecase }) {
  return {
    /** Daftar semua repo. */
    daftar: () => repoUsecase.daftar(),
    /** Detail repo + modul. */
    detail: (id) => repoUsecase.detail(validasi(idSchema, id)),
    /** Membuat repo. */
    buat: (input) => repoUsecase.buat(validasi(buatRepoSchema, input)),
    /** Mengubah repo. */
    ubah(input) {
      const { id, ...data } = validasi(ubahRepoSchema, input);
      return repoUsecase.ubah(id, data);
    },
    /** Menghapus repo. */
    hapus: (id) => repoUsecase.hapus(validasi(idSchema, id)),
    /** Menambah/menimpa teknologi repo. */
    simpanTeknologi: (input) => repoUsecase.simpanTeknologi(validasi(simpanTeknologiSchema, input)),
    /** Mengoreksi satu teknologi repo. */
    ubahTeknologi: (input) => repoUsecase.ubahTeknologi(validasi(ubahTeknologiSchema, input)),
    /** Menghapus satu teknologi repo. */
    hapusTeknologi: (id) => repoUsecase.hapusTeknologi(validasi(idSchema, id)),
  };
}
