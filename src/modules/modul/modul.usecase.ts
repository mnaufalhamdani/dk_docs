import 'server-only';
import { AppError } from '@/utils/appError';
import { buatKode } from '@/utils/slug';
import { JENIS_ALIAS } from '@/enums';

/** Usecase modul: aturan bisnis CRUD modul beserta alias. */
export function buatModulUsecase({ modulModel, repoModel, menuModel, dokumentasiModel, db }) {
  /** Mengambil modul atau melempar 404. */
  async function wajibAda(id) {
    const modul = await modulModel.byId(id);
    // id tidak dikenal: hentikan lebih awal
    if (!modul) throw new AppError('Modul tidak ditemukan.', 404);
    return modul;
  }

  /** Memastikan kode belum dipakai modul lain di repo yang sama. */
  async function pastikanKodeBebas(repoId, kode, idSendiri = null) {
    const ada = await modulModel.byKode(repoId, kode);
    // kode bentrok dengan modul lain pada repo yang sama
    if (ada && ada.id !== idSendiri) throw new AppError(`Kode "${kode}" sudah dipakai modul lain di repo ini.`, 409);
  }

  /** Menulis kedua jenis alias modul dalam transaksi yang sama. */
  async function tulisAlias(modulId, data, conn) {
    await modulModel.gantiAlias(modulId, JENIS_ALIAS.DATABASE, data.alias_database, conn);
    await modulModel.gantiAlias(modulId, JENIS_ALIAS.KATA_KUNCI, data.kata_kunci, conn);
  }

  /** Mengelompokkan baris alias menjadi { database: [], kata_kunci: [] }. */
  function kelompokkanAlias(baris) {
    const hasil = { database: [], kata_kunci: [] };
    for (const b of baris) hasil[b.jenis].push(b.alias);
    return hasil;
  }

  return {
    /** Detail modul: data, repo induk, alias, menu (dengan penanda beta). */
    async detail(id) {
      const modul = await wajibAda(id);
      const [repo, alias, menu, beta] = await Promise.all([
        repoModel.byId(modul.repo_id),
        modulModel.aliasByModul(id),
        menuModel.byModul(id),
        dokumentasiModel.idBeta(),
      ]);
      const menuBeta = new Set(beta.menu);
      return {
        ...modul,
        repo,
        alias: kelompokkanAlias(alias),
        ada_beta: beta.modul.includes(id),
        menu: menu.map((m) => ({ ...m, ada_beta: menuBeta.has(m.id) })),
      };
    },
    /** Data untuk form ubah: modul + alias. */
    async untukForm(id) {
      const modul = await wajibAda(id);
      const alias = kelompokkanAlias(await modulModel.aliasByModul(id));
      return { ...modul, alias_database: alias.database, kata_kunci: alias.kata_kunci };
    },
    /** Membuat modul (stub) beserta alias; mengembalikan { id }. */
    async buat(data) {
      // repo induk harus ada sebelum modul dibuat
      if (!(await repoModel.byId(data.repo_id))) throw new AppError('Repo tidak ditemukan.', 404);
      const kode = data.kode ?? buatKode(data.nama);
      await pastikanKodeBebas(data.repo_id, kode);
      const id = await db.transaction(async (conn) => {
        const modulId = await modulModel.buat({ ...data, kode }, conn);
        await tulisAlias(modulId, data, conn);
        return modulId;
      });
      return { id };
    },
    /** Mengubah modul beserta alias. */
    async ubah(id, data) {
      const modul = await wajibAda(id);
      const kode = data.kode ?? buatKode(data.nama);
      await pastikanKodeBebas(modul.repo_id, kode, id);
      await db.transaction(async (conn) => {
        await modulModel.ubah(id, { ...data, kode }, conn);
        await tulisAlias(id, data, conn);
      });
      return { id, repo_id: modul.repo_id };
    },
    /** Menghapus modul; ditolak bila masih punya menu. */
    async hapus(id) {
      const modul = await wajibAda(id);
      // masih ada menu: minta user membereskan menu dulu agar dokumentasi tidak hilang diam-diam
      if ((await modulModel.hitungMenu(id)) > 0) {
        throw new AppError('Modul masih memiliki menu. Hapus menunya terlebih dahulu.', 409);
      }
      await modulModel.hapus(id);
      return { id, repo_id: modul.repo_id };
    },
  };
}
