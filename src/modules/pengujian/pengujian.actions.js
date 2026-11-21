'use server';

import { revalidatePath } from 'next/cache';
import { ambilDep } from '@/di/container';
import { jalankanAction } from '@/utils/responseHandler';

/** Memecah teks blueprint menjadi poin untuk diedit di form (belum menyimpan apa pun). */
export async function pecahBlueprintUji(input) {
  return jalankanAction(() => ambilDep().pengujianController.pratinjauPoin(input));
}

/** Membuat putaran uji ulang; href mengarah ke halaman detail dengan prompt putaran baru. */
export async function buatUjiUlang(input) {
  return jalankanAction(async () => {
    const hasil = await ambilDep().pengujianController.ujiUlang(input);
    // sesi_prompt ikut bertambah, jadi daftar prompt perlu disegarkan juga
    revalidatePath('/pengujian');
    revalidatePath('/prompt');
    return { ...hasil, href: `/pengujian/${input.pengujian_id}` };
  });
}

/** Membuat versi PDF baru (kumulatif); versi lama tetap ada. */
export async function buatVersiPdf(pengujianId) {
  return jalankanAction(async () => {
    const hasil = await ambilDep().pengujianController.buatPdf({ pengujian_id: pengujianId });
    revalidatePath(`/pengujian/${pengujianId}`);
    return hasil;
  });
}

/** Menyimpan catatan keputusan sebuah sel (kosong = hapus); status tidak berubah. */
export async function simpanCatatanSel(input) {
  return jalankanAction(async () => {
    const hasil = await ambilDep().pengujianController.simpanCatatan(input);
    revalidatePath(`/pengujian/${input.pengujian_id}`);
    return hasil;
  });
}

/** Membuat Uji CR baru; href mengarah ke halaman detail yang menampilkan prompt per repo. */
export async function buatPengujian(input) {
  return jalankanAction(async () => {
    const { id } = await ambilDep().pengujianController.buat(input);
    // sesi_prompt ikut bertambah, jadi daftar prompt perlu disegarkan juga
    revalidatePath('/pengujian');
    revalidatePath('/prompt');
    return { id, href: `/pengujian/${id}` };
  });
}
