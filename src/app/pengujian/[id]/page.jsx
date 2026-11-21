import HalamanPengujian from '@/modules/pengujian/HalamanPengujian';

export const dynamic = 'force-dynamic';

/** Halaman detail satu Uji CR. */
export default async function Page({ params }) {
  const { id } = await params;
  return <HalamanPengujian id={id} />;
}
