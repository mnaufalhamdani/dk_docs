import HalamanReview from '@/modules/impor/HalamanReview';

export const dynamic = 'force-dynamic';

/** Review hasil impor. */
export default async function Page({ params }) {
  const { id } = await params;
  return <HalamanReview id={id} />;
}
