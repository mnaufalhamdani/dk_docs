import FormHalaman from '@/modules/halaman/FormHalaman';

export const dynamic = 'force-dynamic';

/** Form ubah halaman. */
export default async function Page({ params }) {
  const { id } = await params;
  return <FormHalaman id={id} />;
}
