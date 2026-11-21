import HalamanImporHasilUji from '@/modules/pengujian/HalamanImporHasilUji';

export const dynamic = 'force-dynamic';

/** Halaman impor hasil uji untuk satu Uji CR. */
export default async function Page({ params }) {
  const { id } = await params;
  return <HalamanImporHasilUji id={id} />;
}
