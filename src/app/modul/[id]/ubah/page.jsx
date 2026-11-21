import FormModul from '@/modules/modul/FormModul';

export const dynamic = 'force-dynamic';

/** Form ubah modul. */
export default async function Page({ params }) {
  const { id } = await params;
  return <FormModul id={id} />;
}
