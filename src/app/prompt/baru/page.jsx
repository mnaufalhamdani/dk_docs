import HalamanDokumentasiBaru from '@/modules/prompt/HalamanDokumentasiBaru';

export const dynamic = 'force-dynamic';

/** Buat dokumentasi modul; query modul=ID untuk memilih modul awal. */
export default async function Page({ searchParams }) {
  const { modul } = await searchParams;
  // id berupa teks angka; selain itu abaikan
  const id = /^[1-9]\d{0,18}$/.test(modul ?? '') ? modul : null;
  return <HalamanDokumentasiBaru modulId={id} />;
}
