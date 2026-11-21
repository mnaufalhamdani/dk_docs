'use server';

import { revalidatePath } from 'next/cache';
import { ambilDep } from '@/di/container';
import { jalankanAction } from '@/utils/responseHandler';

/** Menyimpan pengaturan dari form. */
export async function simpanPengaturan(input) {
  return jalankanAction(async () => {
    await ambilDep().pengaturanController.ubah(input);
    revalidatePath('/pengaturan');
    return { href: '/pengaturan' };
  });
}
