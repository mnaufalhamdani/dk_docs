import 'server-only';
import { AppError } from '@/utils/appError';

/** Usecase repo: aturan bisnis CRUD repo. */
export function buatRepoUsecase({ repoModel, modulModel, dokumentasiModel }) {
  /** Mengambil repo atau melempar 404 bila tidak ada. */
  async function wajibAda(id) {
    const repo = await repoModel.byId(id);
    // id tidak dikenal: hentikan lebih awal dengan pesan jelas
    if (!repo) throw new AppError('Repo tidak ditemukan.', 404);
    return repo;
  }

  /** Memastikan kode belum dipakai repo lain (kecuali repo yang sedang diubah). */
  async function pastikanKodeBebas(kode, idSendiri = null) {
    const ada = await repoModel.byKode(kode);
    // kode sudah dipakai repo lain: tolak karena kode menjadi bagian nama file impor
    if (ada && ada.id !== idSendiri) throw new AppError(`Kode "${kode}" sudah dipakai repo lain.`, 409);
  }

  return {
    /** Daftar repo. */
    daftar: () => repoModel.semua(),
    /** Detail repo beserta daftar modulnya (dengan penanda masih ada poin beta). */
    async detail(id) {
      const repo = await wajibAda(id);
      const [modul, beta] = await Promise.all([modulModel.byRepo(id), dokumentasiModel.idBeta()]);
      const modulBeta = new Set(beta.modul);
      const teknologi = await repoModel.teknologiByRepo(id);
      return { ...repo, teknologi, modul: modul.map((m) => ({ ...m, ada_beta: modulBeta.has(m.id) })) };
    },
    /** Menambah teknologi repo, atau memperbarui bila namanya sudah tercatat (upsert). */
    async simpanTeknologi({ repo_id, ...data }) {
      await wajibAda(repo_id);
      await repoModel.simpanTeknologi(repo_id, data);
      return { repo_id };
    },
    /** Mengoreksi satu entri teknologi; nama tidak boleh bentrok dengan entri lain di repo yang sama. */
    async ubahTeknologi({ id, ...data }) {
      const ada = await repoModel.teknologiById(id);
      // entri tidak dikenal: hentikan
      if (!ada) throw new AppError('Teknologi tidak ditemukan.', 404);
      const lain = (await repoModel.teknologiByRepo(ada.repo_id)).find((x) => x.id !== id && x.nama.toLowerCase() === data.nama.toLowerCase());
      // nama sudah dipakai entri lain: UNIQUE (repo_id, nama) akan menolak, beri pesan jelas
      if (lain) throw new AppError(`Teknologi "${data.nama}" sudah tercatat di repo ini.`, 409);
      await repoModel.ubahTeknologi(id, data);
      return { repo_id: ada.repo_id };
    },
    /** Menghapus satu entri teknologi. */
    async hapusTeknologi(id) {
      const ada = await repoModel.teknologiById(id);
      // entri tidak dikenal: hentikan
      if (!ada) throw new AppError('Teknologi tidak ditemukan.', 404);
      await repoModel.hapusTeknologi(id);
      return { repo_id: ada.repo_id };
    },
    /** Membuat repo baru; mengembalikan { id }. */
    async buat(data) {
      await pastikanKodeBebas(data.kode);
      return { id: await repoModel.buat(data) };
    },
    /** Mengubah repo. */
    async ubah(id, data) {
      await wajibAda(id);
      await pastikanKodeBebas(data.kode, id);
      await repoModel.ubah(id, data);
      return { id };
    },
    /** Menghapus repo; ditolak bila masih punya modul agar dokumentasi tidak hilang diam-diam. */
    async hapus(id) {
      await wajibAda(id);
      // masih ada modul: minta user menghapus/memindahkan modul dulu
      if ((await repoModel.hitungModul(id)) > 0) {
        throw new AppError('Repo masih memiliki modul. Hapus modulnya terlebih dahulu.', 409);
      }
      await repoModel.hapus(id);
      return { id };
    },
  };
}
