import DetailPerubahan from '@/modules/perubahan/DetailPerubahan';

export const dynamic = 'force-dynamic';

/** Detail perubahan CR/B. */
export default async function Page({ params }) {
  const { id } = await params;
  return <DetailPerubahan id={id} />;
}
