import FormModul from '@/modules/modul/FormModul';

export const dynamic = 'force-dynamic';

/** Form tambah modul pada sebuah repo. */
export default async function Page({ params }) {
  const { id } = await params;
  return <FormModul repoId={id} />;
}
