import HalamanPrompt from '@/modules/prompt/HalamanPrompt';

export const dynamic = 'force-dynamic';

/** Satu sesi prompt (tab per repo). */
export default async function Page({ params }) {
  const { uid } = await params;
  return <HalamanPrompt uniqueId={uid} />;
}
