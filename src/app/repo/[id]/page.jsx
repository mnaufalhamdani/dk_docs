import RepoDetail from '@/modules/repo/RepoDetail';

export const dynamic = 'force-dynamic';

/** Detail repo. */
export default async function Page({ params }) {
  const { id } = await params;
  return <RepoDetail id={id} />;
}
