import FormMenu from '@/modules/menu/FormMenu';

export const dynamic = 'force-dynamic';

/** Form ubah menu. */
export default async function Page({ params }) {
  const { id } = await params;
  return <FormMenu id={id} />;
}
