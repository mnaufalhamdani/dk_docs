import 'server-only';
import { updateTag } from 'next/cache';

/** Tag cache yang menaungi semua hasil agregat beranda dashboard. */
export const TAG_DASHBOARD = 'dashboard';

/** Lama (detik) hasil agregat dashboard dianggap segar sebelum dihitung ulang. */
export const MASA_CACHE_DASHBOARD = 120;

/**
 * Mengosongkan cache dashboard. Dipanggil dari Server Action setelah data yang memengaruhi
 * angka dashboard berubah (impor, Sync, repo, modul, menu, halaman, poin, flag, tautan).
 */
export function segarkanDashboard() {
  updateTag(TAG_DASHBOARD);
}
