'use server';

import { revalidatePath } from 'next/cache';
import { ambilDep } from '@/di/container';
import { jalankanAction } from '@/utils/responseHandler';

/** Membuat blueprint baru; href mengarah ke editor. */
export async function buatBlueprint(input) {
  return jalankanAction(async () => {
    const { id } = await ambilDep().blueprintController.buat(input);
    revalidatePath('/blueprint', 'layout');
    return { id, href: `/blueprint/${id}` };
  });
}

/** Menyimpan poin hasil perapihan. */
export async function simpanPoinBlueprint(input) {
  return jalankanAction(async () => {
    const hasil = await ambilDep().blueprintController.simpanPoin(input);
    revalidatePath('/blueprint', 'layout');
    return hasil;
  });
}

/** Menyimpan pencocokan poin -> modul/menu/halaman. */
export async function simpanPencocokanBlueprint(input) {
  return jalankanAction(async () => {
    const hasil = await ambilDep().blueprintController.simpanPencocokan(input);
    revalidatePath('/blueprint', 'layout');
    return hasil;
  });
}

/** Menyusun kelompok dan urutan otomatis (argumen: id blueprint). */
export async function susunKelompokBlueprint(id) {
  return jalankanAction(async () => {
    const hasil = await ambilDep().blueprintController.susunKelompok(id);
    revalidatePath('/blueprint', 'layout');
    return hasil;
  });
}

/** Menyimpan susunan kelompok hasil edit. */
export async function simpanKelompokBlueprint(input) {
  return jalankanAction(async () => {
    const hasil = await ambilDep().blueprintController.simpanKelompok(input);
    revalidatePath('/blueprint', 'layout');
    return hasil;
  });
}

/** Membuat prompt per kelompok (argumen: id blueprint); href mengarah ke halaman prompt. */
export async function buatPromptBlueprint(id) {
  return jalankanAction(async () => {
    const hasil = await ambilDep().blueprintController.buatPrompt(id);
    revalidatePath('/blueprint', 'layout');
    revalidatePath('/prompt');
    return { ...hasil, href: `/blueprint/${id}/prompt` };
  });
}

/** Menghapus blueprint (argumen: id). */
export async function hapusBlueprint(id) {
  return jalankanAction(async () => {
    await ambilDep().blueprintController.hapus(id);
    revalidatePath('/blueprint', 'layout');
    return { href: '/blueprint' };
  });
}
