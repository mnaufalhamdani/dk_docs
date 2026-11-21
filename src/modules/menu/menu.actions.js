'use server';

import { revalidatePath } from 'next/cache';
import { ambilDep } from '@/di/container';
import { jalankanAction } from '@/utils/responseHandler';
import { segarkanDashboard } from '@/modules/dashboard/dashboard.cache';

/** Membuat menu baru (opsional dengan halaman standar CRUD). */
export async function buatMenu(input) {
  return jalankanAction(async () => {
    const { id } = await ambilDep().menuController.buat(input);
    revalidatePath('/', 'layout'); // sidebar perlu memuat ulang pohon
    segarkanDashboard();
    return { id, href: `/menu/${id}` };
  });
}

/** Mengubah menu. */
export async function ubahMenu(input) {
  return jalankanAction(async () => {
    const { id } = await ambilDep().menuController.ubah(input);
    revalidatePath('/', 'layout');
    segarkanDashboard();
    return { id, href: `/menu/${id}` };
  });
}

/** Menghapus menu lalu kembali ke modul induknya. */
export async function hapusMenu(id) {
  return jalankanAction(async () => {
    const { modul_id } = await ambilDep().menuController.hapus(id);
    revalidatePath('/', 'layout');
    segarkanDashboard();
    return { href: `/modul/${modul_id}` };
  });
}

/** Membuat halaman standar Daftar/Form/Detail yang belum ada pada menu CRUD. */
export async function buatHalamanStandarMenu(id) {
  return jalankanAction(async () => {
    const hasil = await ambilDep().menuController.buatHalamanStandar(id);
    revalidatePath('/', 'layout');
    segarkanDashboard();
    return { ...hasil, href: `/menu/${id}` };
  });
}
