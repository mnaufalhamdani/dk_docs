'use server';

import { revalidatePath } from 'next/cache';
import { ambilDep } from '@/di/container';
import { jalankanAction } from '@/utils/responseHandler';
import { segarkanDashboard } from '@/modules/dashboard/dashboard.cache';

/** Mengubah status tautan poin <-> CR/B (aktif atau pending). Input divalidasi di controller. */
export async function ubahStatusTautan(input) {
  return jalankanAction(async () => {
    const hasil = await ambilDep().tautanController.ubahStatus(input);
    revalidatePath('/', 'layout'); // tampilan poin, riwayat CR/B, dan pencarian ikut berubah
    segarkanDashboard();
    return hasil;
  });
}
