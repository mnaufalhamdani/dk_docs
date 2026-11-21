import DaftarRepo from '@/modules/repo/DaftarRepo';

export const dynamic = 'force-dynamic';

/** Daftar repo (konten beranda lama, dipindah ke sini setelah beranda menjadi dashboard). */
export default function Page() {
  return <DaftarRepo />;
}
