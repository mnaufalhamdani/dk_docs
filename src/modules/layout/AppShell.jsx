'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SidebarPohon from './SidebarPohon';
import PaletPencarian from './PaletPencarian';
import ThemeToggle from './ThemeToggle';
import PelacakTerakhirDibuka from '@/modules/dashboard/PelacakTerakhirDibuka';
import { t } from '@/utils/i18n';

/** Aksi utama di topbar yang baru tersedia di fase berikutnya (ditampilkan nonaktif). */
const AKSI_NANTI = [
];

/** Kerangka aplikasi: topbar, sidebar (drawer di layar sempit), palet pencarian, dan konten. */
export default function AppShell({ pohon, children }) {
  const pathname = usePathname();
  const [cariTerbuka, setCariTerbuka] = useState(false);
  const [drawer, setDrawer] = useState(false);

  // pintasan Ctrl/Cmd+K membuka palet pencarian
  useEffect(() => {
    /** Menangkap kombinasi tombol global. */
    function tombol(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCariTerbuka((v) => !v);
      }
    }
    window.addEventListener('keydown', tombol);
    return () => window.removeEventListener('keydown', tombol);
  }, []);

  // tutup drawer setelah berpindah halaman
  useEffect(() => {
    setDrawer(false);
  }, [pathname]);

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-3 border-b border-line bg-panel px-4 py-2">
        <button type="button" className="rounded-md border border-line px-2 py-1 text-xs md:hidden" onClick={() => setDrawer((v) => !v)} aria-expanded={drawer} aria-label={t('sidebar.judul')}>
          ☰
        </button>
        <Link href="/" className="font-semibold tracking-tight">
          {t('app.nama')}
        </Link>
        <button type="button" onClick={() => setCariTerbuka(true)} className="ml-2 flex w-full max-w-sm items-center justify-between rounded-md border border-line bg-bg px-3 py-1.5 text-left text-sm text-muted">
          <span>{t('cari.placeholder')}</span>
          <kbd className="rounded border border-line px-1 font-mono text-[10px]">Ctrl K</kbd>
        </button>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/repo" className="hidden rounded-md border border-line px-2 py-1 text-xs hover:bg-accent-soft sm:block">
            {t('topbar.repo')}
          </Link>
          <Link href="/perubahan" className="hidden rounded-md border border-line px-2 py-1 text-xs hover:bg-accent-soft sm:block">
            {t('topbar.perubahan')}
          </Link>
          <Link href="/prompt" className="hidden rounded-md border border-line px-2 py-1 text-xs hover:bg-accent-soft sm:block">
            {t('topbar.prompt')}
          </Link>
          <Link href="/pengujian" className="hidden rounded-md border border-line px-2 py-1 text-xs hover:bg-accent-soft sm:block">
            {t('topbar.pengujian')}
          </Link>
          <Link href="/sync" className="hidden rounded-md bg-accent px-2 py-1 text-xs font-medium text-white hover:opacity-90 sm:block">
            {t('topbar.sync')}
          </Link>
          <Link href="/impor" className="hidden rounded-md bg-accent px-2 py-1 text-xs font-medium text-white hover:opacity-90 sm:block">
            {t('topbar.impor')}
          </Link>
          <Link href="/blueprint" className="hidden rounded-md bg-accent px-2 py-1 text-xs font-medium text-white hover:opacity-90 sm:block">
            {t('topbar.blueprint')}
          </Link>
          {AKSI_NANTI.map((a) => (
            <button key={a.kunci} type="button" disabled title={t('topbar.tersediaDiFase', { fase: a.fase })} className="hidden rounded-md border border-line px-2 py-1 text-xs text-muted opacity-60 sm:block">
              {t(`topbar.${a.kunci}`)}
            </button>
          ))}
          <Link href="/pengaturan" className="rounded-md border border-line px-2 py-1 text-xs hover:bg-accent-soft">
            {t('topbar.pengaturan')}
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <div className="relative flex min-h-0 flex-1">
        <aside className={`${drawer ? 'block' : 'hidden'} absolute inset-y-0 left-0 z-30 w-64 overflow-y-auto border-r border-line bg-panel py-3 md:static md:block md:shrink-0`}>
          <SidebarPohon pohon={pohon} />
        </aside>
        <main className="min-w-0 flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-4xl">{children}</div>
        </main>
      </div>
      <PaletPencarian terbuka={cariTerbuka} onTutup={() => setCariTerbuka(false)} />
      {/* pencatat riwayat "Terakhir dibuka" untuk widget beranda; Suspense karena membaca query string */}
      <Suspense fallback={null}>
        <PelacakTerakhirDibuka />
      </Suspense>
    </div>
  );
}
