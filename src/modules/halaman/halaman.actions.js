'use server';

import { revalidatePath } from 'next/cache';
import { ambilDep } from '@/di/container';
import { jalankanAction } from '@/utils/responseHandler';
import { segarkanDashboard } from '@/modules/dashboard/dashboard.cache';

/** Membuat halaman baru di sebuah menu. */
export async function buatHalaman(input) {
  return jalankanAction(async () => {
    const { id, menu_id } = await ambilDep().halamanController.buat(input);
    revalidatePath('/', 'layout');
    segarkanDashboard();
    return { id, href: `/menu/${menu_id}?h=${id}` };
  });
}

/** Mengubah halaman. */
export async function ubahHalaman(input) {
  return jalankanAction(async () => {
    const { id, menu_id } = await ambilDep().halamanController.ubah(input);
    revalidatePath('/', 'layout');
    segarkanDashboard();
    return { id, href: `/menu/${menu_id}?h=${id}` };
  });
}

/** Menghapus halaman lalu kembali ke menu induknya. */
export async function hapusHalaman(id) {
  return jalankanAction(async () => {
    const { menu_id } = await ambilDep().halamanController.hapus(id);
    revalidatePath('/', 'layout');
    segarkanDashboard();
    return { href: `/menu/${menu_id}` };
  });
}
