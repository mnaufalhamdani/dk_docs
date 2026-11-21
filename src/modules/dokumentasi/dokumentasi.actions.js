'use server';

import { revalidatePath } from 'next/cache';
import { ambilDep } from '@/di/container';
import { jalankanAction } from '@/utils/responseHandler';
import { segarkanDashboard } from '@/modules/dashboard/dashboard.cache';

/** Menyimpan seluruh poin satu halaman dari editor. */
export async function simpanPoinHalaman(input) {
  return jalankanAction(async () => {
    const hasil = await ambilDep().dokumentasiController.simpanHalaman(input);
    revalidatePath('/', 'layout'); // badge beta & stub di sidebar bisa berubah
    segarkanDashboard();
    return hasil;
  });
}

/** Menjadikan semua poin beta live pada lingkup halaman/menu/modul. */
export async function jadikanSemuaLive(input) {
  return jalankanAction(async () => {
    const hasil = await ambilDep().dokumentasiController.jadikanSemuaLive(input);
    revalidatePath('/', 'layout');
    segarkanDashboard();
    return hasil;
  });
}

/** Meminta usulan versi ringkas sebuah poin (tanpa mengubah data apa pun). */
export async function usulkanRingkasPoin(input) {
  return jalankanAction(() => ambilDep().dokumentasiController.usulkanRingkas(input));
}
