import { validasi } from '@/utils/validasi';
import { filterDashboardSchema } from './dashboard.schema';
import { hariIniLokal, lengkapiFilter } from './dashboard.filter';

/**
 * Controller dashboard: memvalidasi dan menormalkan filter dari query string (nilai rusak jatuh ke
 * bawaan), lalu meneruskan ke usecase. Aman dipanggil ulang dengan filter yang sudah dinormalisasi.
 */
export function buatDashboardController({ dashboardUsecase }) {
  /** Validasi + normalisasi filter (repo unik terurut, tanggal sebagai hari, bawaan 30 hari). */
  const normal = (input) => lengkapiFilter(validasi(filterDashboardSchema, input ?? {}), hariIniLokal());

  return {
    /** Filter ternormalisasi dari query string halaman. */
    filter: (query) => normal(query),
    /** Pilihan repo untuk komponen filter. */
    repoOpsi: () => dashboardUsecase.repoOpsi(),
    /** Widget kartu ringkasan. */
    kartu: (filter) => dashboardUsecase.kartu(normal(filter)),
    /** Widget antrean "Perlu tindakan". */
    antrean: (filter) => dashboardUsecase.antrean(normal(filter)),
    /** Widget peta modul. */
    petaModul: (filter) => dashboardUsecase.petaModul(normal(filter)),
    /** Widget aktivitas terbaru. */
    aktivitas: (filter) => dashboardUsecase.aktivitas(normal(filter)),
    /** Widget poin beta. */
    poinBeta: (filter) => dashboardUsecase.poinBeta(normal(filter)),
  };
}
