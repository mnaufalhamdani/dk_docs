import 'server-only';
import { AppError } from '@/utils/appError';

/** Usecase tautan: mengubah status pending/aktif sebuah tautan poin <-> CR/B. */
export function buatTautanUsecase({ tautanModel }) {
  return {
    /** Mengubah status tautan ke aktif atau pending. Mengembalikan data ringkas tautan. */
    async ubahStatus({ id, status }) {
      const tautan = await tautanModel.byId(id);
      // id tidak dikenal: 404
      if (!tautan) throw new AppError('Tautan CR/B tidak ditemukan.', 404);
      // poin sudah diganti/dihapus oleh sinkron_modul: statusnya tidak lagi bisa diubah manual
      if (tautan.status === 'sudah_berubah') throw new AppError('Tautan ini sudah berubah dari kode terbaru dan tidak bisa diubah statusnya.', 409);
      // poin sudah dihapus: tidak ada lagi yang bisa di-pending-kan
      if (!tautan.poin_id) throw new AppError('Poin untuk tautan ini sudah tidak ada.', 409);
      await tautanModel.ubahStatus(id, status);
      return { id, status, perubahan_id: tautan.perubahan_id, halaman_id: tautan.halaman_id };
    },
  };
}
