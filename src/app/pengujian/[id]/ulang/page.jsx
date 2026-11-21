import HalamanUjiUlang from '@/modules/pengujian/HalamanUjiUlang';

export const dynamic = 'force-dynamic';

/** Halaman uji ulang untuk satu Uji CR. */
export default async function Page({ params }) {
  const { id } = await params;
  return <HalamanUjiUlang id={id} />;
}
