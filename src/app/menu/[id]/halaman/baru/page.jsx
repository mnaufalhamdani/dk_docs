import FormHalaman from '@/modules/halaman/FormHalaman';

export const dynamic = 'force-dynamic';

/** Form tambah halaman pada sebuah menu. */
export default async function Page({ params }) {
  const { id } = await params;
  return <FormHalaman menuId={id} />;
}
