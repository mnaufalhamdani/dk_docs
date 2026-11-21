'use server';

import { revalidatePath } from 'next/cache';
import { ambilDep } from '@/di/container';
import { jalankanAction } from '@/utils/responseHandler';

/** Membuat sesi usulan perubahan; href mengarah ke halaman prompt. */
export async function buatSesiUsulan(input) {
  return jalankanAction(async () => {
    const { unique_id } = await ambilDep().promptController.buatSesiUsulan(input);
    revalidatePath('/prompt');
    return { unique_id, href: `/prompt/${unique_id}` };
  });
}

/** Membuat sesi dokumentasi baru untuk 1-5 modul. */
export async function buatSesiDokumentasiBaru(input) {
  return jalankanAction(async () => {
    const { unique_id } = await ambilDep().promptController.buatSesiDokumentasiBaru(input);
    revalidatePath('/prompt');
    return { unique_id, href: `/prompt/${unique_id}` };
  });
}

/** Membuat sesi sinkron dokumentasi dengan kode untuk satu modul (argumen: id modul). */
export async function buatSesiSinkron(modulId) {
  return jalankanAction(async () => {
    const { unique_id } = await ambilDep().promptController.buatSesiSinkron({ modul_id: modulId });
    revalidatePath('/prompt');
    return { unique_id, href: `/prompt/${unique_id}` };
  });
}

/** Membuat sesi audit bugfix untuk satu repo (argumen: id repo). */
export async function buatSesiAudit(repoId) {
  return jalankanAction(async () => {
    const { unique_id } = await ambilDep().promptController.buatSesiAudit({ repo_id: repoId });
    revalidatePath('/prompt');
    return { unique_id, href: `/prompt/${unique_id}` };
  });
}
