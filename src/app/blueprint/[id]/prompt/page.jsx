import HalamanPromptBlueprint from '@/modules/blueprint/HalamanPromptBlueprint';

export const dynamic = 'force-dynamic';

/** Prompt per kelompok sebuah blueprint. */
export default async function Page({ params }) {
  const { id } = await params;
  return <HalamanPromptBlueprint id={id} />;
}
