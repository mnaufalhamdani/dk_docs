import FormMenu from '@/modules/menu/FormMenu';

export const dynamic = 'force-dynamic';

/** Form tambah menu pada sebuah modul. */
export default async function Page({ params }) {
  const { id } = await params;
  return <FormMenu modulId={id} />;
}
