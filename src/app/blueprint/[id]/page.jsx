import HalamanBlueprint from '@/modules/blueprint/HalamanBlueprint';

export const dynamic = 'force-dynamic';

/** Editor satu blueprint. */
export default async function Page({ params }) {
  const { id } = await params;
  return <HalamanBlueprint id={id} />;
}
