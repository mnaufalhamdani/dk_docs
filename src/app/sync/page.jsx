import SyncHalaman from '@/modules/sync/SyncHalaman';

export const dynamic = 'force-dynamic';

/** Halaman Sync; query tipe & nomor opsional untuk mengisi form (dari tombol "Sync ulang"). */
export default async function Page({ searchParams }) {
  const { tipe, nomor } = await searchParams;
  return <SyncHalaman awal={{ tipe: tipe === 'B' ? 'B' : 'CR', nomor: typeof nomor === 'string' ? nomor : '' }} />;
}
