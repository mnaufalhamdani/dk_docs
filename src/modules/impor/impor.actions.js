'use server';

import { revalidatePath } from 'next/cache';
import { ambilDep } from '@/di/container';
import { jalankanAction } from '@/utils/responseHandler';
import { segarkanDashboard } from '@/modules/dashboard/dashboard.cache';

/** Memvalidasi dan menyimpan JSON mentah; href mengarah ke halaman review. */
export async function buatImpor(input) {
  return jalankanAction(async () => {
    const { impor_id } = await ambilDep().imporController.buat(input);
    revalidatePath('/impor');
    return { impor_id, href: `/impor/${impor_id}` };
  });
}

/** Menyimpan hasil review ke registry dokumentasi. */
export async function simpanImpor(input) {
  return jalankanAction(async () => {
    const hasil = await ambilDep().imporController.simpan(input);
    revalidatePath('/', 'layout'); // badge beta, stub, dan riwayat ikut berubah
    segarkanDashboard();
    return { ...hasil, href: `/impor/${input.impor_id}` };
  });
}

/** Membatalkan impor yang menunggu review. */
export async function batalkanImpor(id) {
  return jalankanAction(async () => {
    await ambilDep().imporController.batalkan(id);
    revalidatePath('/impor');
    return { href: '/impor' };
  });
}
