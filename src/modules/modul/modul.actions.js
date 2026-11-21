'use server';

import { revalidatePath } from 'next/cache';
import { ambilDep } from '@/di/container';
import { jalankanAction } from '@/utils/responseHandler';
import { segarkanDashboard } from '@/modules/dashboard/dashboard.cache';

/** Membuat modul baru; hasil berisi href tujuan setelah sukses. */
export async function buatModul(input) {
  return jalankanAction(async () => {
    const { id } = await ambilDep().modulController.buat(input);
    revalidatePath('/', 'layout'); // sidebar perlu memuat ulang pohon
    segarkanDashboard();
    return { id, href: `/modul/${id}` };
  });
}

/** Mengubah modul. */
export async function ubahModul(input) {
  return jalankanAction(async () => {
    const { id } = await ambilDep().modulController.ubah(input);
    revalidatePath('/', 'layout');
    segarkanDashboard();
    return { id, href: `/modul/${id}` };
  });
}

/** Menghapus modul lalu kembali ke repo induknya. */
export async function hapusModul(id) {
  return jalankanAction(async () => {
    const { repo_id } = await ambilDep().modulController.hapus(id);
    revalidatePath('/', 'layout');
    segarkanDashboard();
    return { href: `/repo/${repo_id}` };
  });
}
