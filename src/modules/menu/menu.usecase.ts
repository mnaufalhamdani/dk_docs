import 'server-only';
import { AppError } from '@/utils/appError';
import { buatKode } from '@/utils/slug';
import { JENIS_ALIAS, JENIS_HALAMAN, POLA_MENU } from '@/enums';

/** Halaman standar untuk menu berpola CRUD. */
const HALAMAN_STANDAR = [
  { kode: 'daftar', nama: 'Daftar', jenis: JENIS_HALAMAN.DAFTAR },
  { kode: 'form', nama: 'Form', jenis: JENIS_HALAMAN.FORM },
  { kode: 'detail', nama: 'Detail', jenis: JENIS_HALAMAN.DETAIL },
];

/** Usecase menu: aturan bisnis CRUD menu, alias, dan pembuatan halaman standar CRUD. */
export function buatMenuUsecase({ menuModel, modulModel, repoModel, halamanModel, dokumentasiModel, db }) {
  /** Mengambil menu atau melempar 404. */
  async function wajibAda(id) {
    const menu = await menuModel.byId(id);
    // id tidak dikenal: hentikan lebih awal
    if (!menu) throw new AppError('Menu tidak ditemukan.', 404);
    return menu;
  }

  /** Memastikan kode belum dipakai menu lain di modul yang sama. */
  async function pastikanKodeBebas(modulId, kode, idSendiri = null) {
    const ada = await menuModel.byKode(modulId, kode);
    // kode bentrok dengan menu lain pada modul yang sama
    if (ada && ada.id !== idSendiri) throw new AppError(`Kode "${kode}" sudah dipakai menu lain di modul ini.`, 409);
  }

  /** Menulis kedua jenis alias menu dalam transaksi yang sama. */
  async function tulisAlias(menuId, data, conn) {
    await menuModel.gantiAlias(menuId, JENIS_ALIAS.DATABASE, data.alias_database, conn);
    await menuModel.gantiAlias(menuId, JENIS_ALIAS.KATA_KUNCI, data.kata_kunci, conn);
  }

  /** Mengelompokkan baris alias menjadi { database: [], kata_kunci: [] }. */
  function kelompokkanAlias(baris) {
    const hasil = { database: [], kata_kunci: [] };
    for (const b of baris) hasil[b.jenis].push(b.alias);
    return hasil;
  }

  /** Membuat halaman standar yang belum ada pada menu; mengembalikan jumlah yang dibuat. */
  async function buatStandarDalamTransaksi(menu, conn) {
    let dibuat = 0;
    for (const std of HALAMAN_STANDAR) {
      // halaman dengan kode sama sudah ada: lewati agar tidak dobel
      if (await halamanModel.byKode(menu.id, std.kode, conn)) continue;
      // route halaman Daftar mengikuti route menu; Form/Detail dibiarkan kosong (tidak ditebak)
      const route = std.jenis === JENIS_HALAMAN.DAFTAR ? menu.route : null;
      await halamanModel.buat({ menu_id: menu.id, kode: std.kode, nama: std.nama, jenis: std.jenis, route, file_utama: [] }, conn);
      dibuat += 1;
    }
    return dibuat;
  }

  return {
    /** Detail menu: data, modul + repo induk, alias, dan halaman (dengan penanda beta). */
    async detail(id) {
      const menu = await wajibAda(id);
      const modul = await modulModel.byId(menu.modul_id);
      const [repo, alias, halaman, beta] = await Promise.all([
        repoModel.byId(modul.repo_id),
        menuModel.aliasByMenu(id),
        halamanModel.byMenu(id),
        dokumentasiModel.idBeta(),
      ]);
      const halamanBeta = new Set(beta.halaman);
      return {
        ...menu,
        modul,
        repo,
        alias: kelompokkanAlias(alias),
        ada_beta: beta.menu.includes(id),
        halaman: halaman.map((h) => ({ ...h, ada_beta: halamanBeta.has(h.id) })),
      };
    },
    /** Data untuk form ubah: menu + alias. */
    async untukForm(id) {
      const menu = await wajibAda(id);
      const alias = kelompokkanAlias(await menuModel.aliasByMenu(id));
      return { ...menu, alias_database: alias.database, kata_kunci: alias.kata_kunci };
    },
    /** Membuat menu (stub) beserta alias; menawarkan halaman standar bila pola CRUD. */
    async buat(data) {
      if (!(await modulModel.byId(data.modul_id))) throw new AppError('Modul tidak ditemukan.', 404);
      const kode = data.kode ?? buatKode(data.nama);
      await pastikanKodeBebas(data.modul_id, kode);
      const id = await db.transaction(async (conn) => {
        const menuId = await menuModel.buat({ ...data, kode }, conn);
        await tulisAlias(menuId, data, conn);
        // halaman standar hanya dibuat bila user memintanya dan pola memang CRUD
        if (data.buat_halaman_standar && data.pola === POLA_MENU.CRUD) {
          await buatStandarDalamTransaksi({ id: menuId, route: data.route }, conn);
        }
        return menuId;
      });
      return { id };
    },
    /** Membuat halaman standar Daftar/Form/Detail yang belum ada pada menu CRUD. */
    async buatHalamanStandar(id) {
      const menu = await wajibAda(id);
      // halaman standar hanya bermakna untuk menu berpola CRUD
      if (menu.pola !== POLA_MENU.CRUD) throw new AppError('Halaman standar hanya untuk menu berpola CRUD.', 400);
      const dibuat = await db.transaction((conn) => buatStandarDalamTransaksi(menu, conn));
      return { id, dibuat };
    },
    /** Mengubah menu beserta alias. */
    async ubah(id, data) {
      const menu = await wajibAda(id);
      const kode = data.kode ?? buatKode(data.nama);
      await pastikanKodeBebas(menu.modul_id, kode, id);
      await db.transaction(async (conn) => {
        await menuModel.ubah(id, { ...data, kode }, conn);
        await tulisAlias(id, data, conn);
      });
      return { id };
    },
    /** Menghapus menu; ditolak bila masih punya halaman. */
    async hapus(id) {
      const menu = await wajibAda(id);
      // masih ada halaman: minta user menghapus halaman dulu agar dokumentasi tidak hilang diam-diam
      if ((await menuModel.hitungHalaman(id)) > 0) {
        throw new AppError('Menu masih memiliki halaman. Hapus halamannya terlebih dahulu.', 409);
      }
      await menuModel.hapus(id);
      return { id, modul_id: menu.modul_id };
    },
  };
}
