import './globals.css';
import { ambilDep } from '@/di/container';
import AppShell from '@/modules/layout/AppShell';
import { t } from '@/utils/i18n';

// halaman membaca database setiap request, jangan di-prerender saat build
export const dynamic = 'force-dynamic';

export const metadata = { title: t('app.nama'), description: t('app.deskripsi') };

/** Skrip awal agar mode gelap terpasang sebelum render pertama (mencegah kedipan). */
const SKRIP_TEMA = `try{var s=localStorage.getItem('theme');if(s==='dark'||(!s&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

/** Layout akar: memuat pohon sidebar lalu membungkus semua halaman dengan AppShell. */
export default async function RootLayout({ children }) {
  const pohon = await ambilDep().layoutController.pohon();
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SKRIP_TEMA }} />
      </head>
      <body>
        <AppShell pohon={pohon}>{children}</AppShell>
      </body>
    </html>
  );
}
