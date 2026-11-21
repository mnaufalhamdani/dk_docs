import DaftarPerubahan from '@/modules/perubahan/DaftarPerubahan';

export const dynamic = 'force-dynamic';

/** Daftar dan pencarian perubahan; semua filter dari query string (parameter berulang diambil yang pertama). */
export default async function Page({ searchParams }) {
  const mentah = await searchParams;
  const query = Object.fromEntries(Object.entries(mentah).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  return <DaftarPerubahan query={query} />;
}
