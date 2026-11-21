'use server';

import { revalidatePath } from 'next/cache';
import { ambilDep } from '@/di/container';
import { jalankanAction } from '@/utils/responseHandler';
import { segarkanDashboard } from '@/modules/dashboard/dashboard.cache';

/** Membuat repo baru; hasil berisi href tujuan setelah sukses. */
export async function buatRepo(input) {
  return jalankanAction(async () => {
    const { id } = await ambilDep().repoController.buat(input);
    revalidatePath('/', 'layout'); // sidebar perlu memuat ulang pohon
    segarkanDashboard();
    return { id, href: `/repo/${id}` };
  });
}

/** Mengubah repo. */
export async function ubahRepo(input) {
  return jalankanAction(async () => {
    const { id } = await ambilDep().repoController.ubah(input);
    revalidatePath('/', 'layout');
    segarkanDashboard();
    return { id, href: `/repo/${id}` };
  });
}

/** Menghapus repo lalu kembali ke beranda. */
export async function hapusRepo(id) {
  return jalankanAction(async () => {
    await ambilDep().repoController.hapus(id);
    revalidatePath('/', 'layout');
    segarkanDashboard();
    return { href: '/' };
  });
}

/** Menambah atau menimpa satu teknologi repo (grup Info repo). */
export async function simpanTeknologiRepo(input) {
  return jalankanAction(async () => {
    const { repo_id } = await ambilDep().repoController.simpanTeknologi(input);
    revalidatePath(`/repo/${repo_id}`);
    return { repo_id };
  });
}

/** Mengoreksi satu teknologi repo. */
export async function ubahTeknologiRepo(input) {
  return jalankanAction(async () => {
    const { repo_id } = await ambilDep().repoController.ubahTeknologi(input);
    revalidatePath(`/repo/${repo_id}`);
    return { repo_id };
  });
}

/** Menghapus satu teknologi repo. */
export async function hapusTeknologiRepo(id) {
  return jalankanAction(async () => {
    const { repo_id } = await ambilDep().repoController.hapusTeknologi(id);
    revalidatePath(`/repo/${repo_id}`);
    return { repo_id };
  });
}
