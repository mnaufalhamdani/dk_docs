import HalamanImpor from '@/modules/impor/HalamanImpor';

export const dynamic = 'force-dynamic';

/** Halaman Impor; query unique_id opsional (dari halaman prompt). */
export default async function Page({ searchParams }) {
  const { unique_id: uniqueId } = await searchParams;
  return <HalamanImpor uniqueId={typeof uniqueId === 'string' ? uniqueId : null} />;
}
