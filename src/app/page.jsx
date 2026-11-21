import Dashboard from '@/modules/dashboard/Dashboard';

export const dynamic = 'force-dynamic';

/** Beranda: dashboard dengan filter (repo, rentang tanggal) dari query string dan enam widget. */
export default async function Page({ searchParams }) {
  const query = await searchParams;
  return <Dashboard query={query} />;
}
