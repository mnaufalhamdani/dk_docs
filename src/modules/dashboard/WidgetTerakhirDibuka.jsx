'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Widget, KosongWidget } from './KerangkaWidget';
import { bacaTerakhirDibuka, bersihkanTerakhirDibuka } from './terakhirDibuka.util';
import { t } from '@/utils/i18n';

/** Widget 6: maks. 8 repo/modul/halaman yang terakhir dibuka di browser ini (localStorage, tanpa query database). */
export default function WidgetTerakhirDibuka() {
  // undefined = belum dibaca (render server), null = penyimpanan tidak bisa diakses, array = hasil baca
  const [daftar, setDaftar] = useState(undefined);

  // localStorage hanya ada di browser, jadi dibaca setelah mount
  useEffect(() => {
    setDaftar(bacaTerakhirDibuka());
  }, []);

  /** Menghapus riwayat lalu mengosongkan tampilan. */
  function bersihkan() {
    bersihkanTerakhirDibuka();
    setDaftar([]);
  }

  return (
    <Widget
      id="widget-terakhir-dibuka"
      judul={t('dashboard.terakhirDibuka.judul')}
      kondisiSaatIni
      aksi={
        Array.isArray(daftar) && daftar.length > 0 ? (
          <button type="button" onClick={bersihkan} className="text-xs text-muted hover:text-accent hover:underline">
            {t('dashboard.terakhirDibuka.hapus')}
          </button>
        ) : null
      }
    >
      {daftar === undefined ? (
        <p className="text-sm text-muted">{t('dashboard.memuat')}</p>
      ) : daftar === null ? (
        <KosongWidget>{t('dashboard.terakhirDibuka.tidakTersedia')}</KosongWidget>
      ) : daftar.length === 0 ? (
        <KosongWidget>{t('dashboard.terakhirDibuka.kosong')}</KosongWidget>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {daftar.map((x) => (
            <li key={x.href}>
              <Link href={x.href} className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm hover:border-accent">
                <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[10px] uppercase text-accent">{t(`dashboard.terakhirDibuka.tipe.${x.tipe}`)}</span>
                <span className="min-w-0 truncate">{x.nama}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Widget>
  );
}
