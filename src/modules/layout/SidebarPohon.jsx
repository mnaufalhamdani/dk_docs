'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { t } from '@/utils/i18n';

const KUNCI_SIMPAN = 'dkdocs.pohon';

/** Titik penanda beta di samping nama (ada poin beta di dalamnya). */
function TitikBeta() {
  return <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-500" title={t('badge.adaBetaHint')} />;
}

/** Satu baris item pohon: tombol lipat (bila punya anak) + tautan. */
function Baris({ href, nama, stub, beta, aktif, punyaAnak, terbuka, onToggle, tingkat }) {
  return (
    <div className={`flex items-center rounded-md ${aktif ? 'bg-accent-soft text-accent' : 'hover:bg-accent-soft'}`} style={{ paddingLeft: tingkat * 12 }}>
      {punyaAnak ? (
        <button type="button" onClick={onToggle} aria-expanded={terbuka} aria-label={nama} className="w-5 shrink-0 text-xs text-muted">
          {terbuka ? '▾' : '▸'}
        </button>
      ) : (
        <span className="w-5 shrink-0" />
      )}
      <Link href={href} className={`min-w-0 flex-1 truncate py-1 pr-2 ${stub ? 'text-muted opacity-70' : ''}`} title={stub ? t('badge.belumDidokumentasikan') : nama}>
        {nama}
        {beta && <TitikBeta />}
      </Link>
    </div>
  );
}

/** Mencari id repo/modul/menu yang harus dibuka agar item aktif terlihat. */
function leluhurAktif(pohon, pathname) {
  const cocok = pathname.match(/^\/(repo|modul|menu)\/(\d+)/);
  // bukan halaman repo/modul/menu: tidak ada yang perlu dibuka otomatis
  if (!cocok) return [];
  const [, jenis, idTeks] = cocok;
  // id tetap teks: nilai BIGINT 18 digit tidak aman dikonversi ke number
  const id = idTeks;
  const hasil = [];
  for (const r of pohon) {
    if (jenis === 'repo' && r.id === id) hasil.push(`repo-${r.id}`);
    for (const m of r.modul) {
      if (jenis === 'modul' && m.id === id) hasil.push(`repo-${r.id}`);
      if (jenis === 'menu' && m.menu.some((mn) => mn.id === id)) hasil.push(`repo-${r.id}`, `modul-${m.id}`);
    }
  }
  return hasil;
}

/** Sidebar pohon Repo -> Modul -> Menu (halaman tidak masuk sidebar). */
export default function SidebarPohon({ pohon }) {
  const pathname = usePathname();
  const [buka, setBuka] = useState({});

  // pulihkan posisi buka dari localStorage
  useEffect(() => {
    try {
      setBuka(JSON.parse(localStorage.getItem(KUNCI_SIMPAN) ?? '{}'));
    } catch {
      // isi simpanan rusak: mulai dari kondisi tertutup
      setBuka({});
    }
  }, []);

  // buka otomatis leluhur dari halaman yang sedang aktif
  useEffect(() => {
    const perlu = leluhurAktif(pohon, pathname);
    setBuka((s) => (perlu.every((k) => s[k]) ? s : { ...s, ...Object.fromEntries(perlu.map((k) => [k, true])) }));
  }, [pathname, pohon]);

  /** Membalik status buka sebuah node dan menyimpannya. */
  function toggle(kunci) {
    setBuka((s) => {
      const baru = { ...s, [kunci]: !s[kunci] };
      try {
        localStorage.setItem(KUNCI_SIMPAN, JSON.stringify(baru));
      } catch {
        // penyimpanan diblokir: posisi tidak diingat, tidak fatal
      }
      return baru;
    });
  }

  // belum ada repo: tampilkan petunjuk singkat
  if (pohon.length === 0) return <p className="px-3 py-2 text-xs text-muted">{t('sidebar.kosong')}</p>;

  return (
    <nav aria-label={t('sidebar.judul')} className="space-y-0.5 px-2 text-sm">
      {pohon.map((r) => (
        <div key={r.id}>
          <Baris href={`/repo/${r.id}`} nama={r.nama} aktif={pathname === `/repo/${r.id}`} punyaAnak={r.modul.length > 0} terbuka={!!buka[`repo-${r.id}`]} onToggle={() => toggle(`repo-${r.id}`)} tingkat={0} />
          {buka[`repo-${r.id}`] &&
            r.modul.map((m) => (
              <div key={m.id}>
                <Baris href={`/modul/${m.id}`} nama={m.nama} stub={m.stub} beta={m.beta} aktif={pathname === `/modul/${m.id}`} punyaAnak={m.menu.length > 0} terbuka={!!buka[`modul-${m.id}`]} onToggle={() => toggle(`modul-${m.id}`)} tingkat={1} />
                {buka[`modul-${m.id}`] &&
                  m.menu.map((mn) => <Baris key={mn.id} href={`/menu/${mn.id}`} nama={mn.nama} stub={mn.stub} beta={mn.beta} aktif={pathname === `/menu/${mn.id}`} punyaAnak={false} tingkat={2} />)}
              </div>
            ))}
        </div>
      ))}
    </nav>
  );
}
