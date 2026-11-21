import 'server-only';
import { AppError } from '@/utils/appError';
import { buatKode } from '@/utils/slug';

/** Usecase halaman: aturan bisnis CRUD halaman beserta kata kunci. */
export function buatHalamanUsecase({ halamanModel, menuModel, dokumentasiModel, penyimpananFile, db }) {
  /** Mengambil halaman atau melempar 404. */
  async function wajibAda(id) {
    const halaman = await halamanModel.byId(id);
    // id tidak dikenal: hentikan lebih awal
    if (!halaman) throw new AppError('Halaman tidak ditemukan.', 404);
    return halaman;
  }

  /** Memastikan kode belum dipakai halaman lain di menu yang sama. */
  async function pastikanKodeBebas(menuId, kode, idSendiri = null) {
    const ada = await halamanModel.byKode(menuId, kode);
    // kode bentrok dengan halaman lain pada menu yang sama
    if (ada && ada.id !== idSendiri) throw new AppError(`Kode "${kode}" sudah dipakai halaman lain di menu ini.`, 409);
  }

  return {
    /** Data untuk form ubah: halaman + kata kunci. */
    async untukForm(id) {
      const halaman = await wajibAda(id);
      const kataKunci = await halamanModel.kataKunciByHalaman(id);
      return { ...halaman, kata_kunci: kataKunci };
    },
    /** Membuat halaman (stub) beserta kata kunci. */
    async buat(data) {
      if (!(await menuModel.byId(data.menu_id))) throw new AppError('Menu tidak ditemukan.', 404);
      const kode = data.kode ?? buatKode(data.nama);
      await pastikanKodeBebas(data.menu_id, kode);
      const id = await db.transaction(async (conn) => {
        const halamanId = await halamanModel.buat({ ...data, kode }, conn);
        await halamanModel.gantiKataKunci(halamanId, data.kata_kunci, conn);
        return halamanId;
      });
      return { id, menu_id: data.menu_id };
    },
    /** Mengubah halaman beserta kata kunci. */
    async ubah(id, data) {
      const halaman = await wajibAda(id);
      const kode = data.kode ?? buatKode(data.nama);
      await pastikanKodeBebas(halaman.menu_id, kode, id);
      await db.transaction(async (conn) => {
        await halamanModel.ubah(id, { ...data, kode }, conn);
        await halamanModel.gantiKataKunci(id, data.kata_kunci, conn);
      });
      return { id, menu_id: halaman.menu_id };
    },
    /** Menghapus halaman beserta berkas gambarnya di disk. */
    async hapus(id) {
      const halaman = await wajibAda(id);
      const gambar = await dokumentasiModel.gambarByHalaman(id);
      await halamanModel.hapus(id);
      // baris gambar sudah terhapus (cascade); bersihkan berkasnya agar tidak jadi sampah di disk
      for (const g of gambar) await penyimpananFile.hapus(g.path_file);
      return { id, menu_id: halaman.menu_id };
    },
  };
}
