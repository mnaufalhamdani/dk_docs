import ModulDetail from '@/modules/modul/ModulDetail';

export const dynamic = 'force-dynamic';

/** Detail modul; query: tab=riwayat. */
export default async function Page({ params, searchParams }) {
  const { id } = await params;
  const { tab } = await searchParams;
  return <ModulDetail id={id} tab={tab ?? null} />;
}
