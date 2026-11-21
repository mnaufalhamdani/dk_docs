import FormRepo from '@/modules/repo/FormRepo';

export const dynamic = 'force-dynamic';

/** Form ubah repo. */
export default async function Page({ params }) {
  const { id } = await params;
  return <FormRepo id={id} />;
}
