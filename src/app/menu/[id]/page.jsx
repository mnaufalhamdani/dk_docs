import MenuDetail from '@/modules/menu/MenuDetail';

export const dynamic = 'force-dynamic';

/** Detail menu; query: h (id halaman), p (id poin yang disorot), edit=1 (mode editor), tab=riwayat. */
export default async function Page({ params, searchParams }) {
  const { id } = await params;
  const { h, p, edit, tab } = await searchParams;
  const idValid = (v) => (/^[1-9]\d{0,18}$/.test(v ?? '') ? v : null);
  return <MenuDetail id={id} halamanId={idValid(h)} poinId={idValid(p)} edit={edit === '1'} tab={tab ?? null} />;
}
