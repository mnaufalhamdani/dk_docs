import HalamanUsulan from '@/modules/prompt/HalamanUsulan';

export const dynamic = 'force-dynamic';

/** Usulkan perubahan dokumentasi untuk satu CR/B. */
export default async function Page({ params }) {
  const { id } = await params;
  return <HalamanUsulan id={id} />;
}
