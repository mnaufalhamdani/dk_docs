'use server';

import { revalidatePath } from 'next/cache';
import { ambilDep } from '@/di/container';
import { jalankanAction } from '@/utils/responseHandler';
import { segarkanDashboard } from '@/modules/dashboard/dashboard.cache';

/** Pratinjau pesan dari sumber untuk satu nomor. */
export async function pratinjauSync(input) {
  return jalankanAction(() => ambilDep().syncController.pratinjau(input));
}

/** Menyimpan hasil sync; href mengarah ke detail perubahan. */
export async function simpanSync(input) {
  return jalankanAction(async () => {
    const hasil = await ambilDep().syncController.simpan(input);
    revalidatePath('/', 'layout'); // riwayat & daftar perubahan ikut berubah
    segarkanDashboard();
    return { ...hasil, href: `/perubahan/${hasil.perubahan_id}` };
  });
}

/** Pemetaan manual nama mentah ke modul/menu. */
export async function petakanManual(input) {
  return jalankanAction(async () => {
    const hasil = await ambilDep().syncController.petakanManual(input);
    revalidatePath('/', 'layout');
    segarkanDashboard();
    return hasil;
  });
}

/** Tambah modul baru dari nama mentah lalu petakan. */
export async function tambahModulDanPetakan(input) {
  return jalankanAction(async () => {
    const hasil = await ambilDep().syncController.tambahModulDanPetakan(input);
    revalidatePath('/', 'layout');
    segarkanDashboard();
    return hasil;
  });
}
