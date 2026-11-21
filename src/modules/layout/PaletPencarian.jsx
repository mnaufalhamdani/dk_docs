'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { inputDasar } from '@/modules/shared/ui';
import { t } from '@/utils/i18n';

/** Urutan dan kunci grup hasil di palet. */
const GRUP = ['menu', 'halaman', 'modul', 'isi', 'perubahan'];

/** Palet pencarian global (Ctrl/Cmd+K): hasil dikelompokkan, navigasi dengan keyboard. */
export default function PaletPencarian({ terbuka, onTutup }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const [q, setQ] = useState('');
  const [hasil, setHasil] = useState({ menu: [], halaman: [], modul: [], isi: [], perubahan: [] });
  const [aktif, setAktif] = useState(0);
  const [error, setError] = useState('');

  // daftar datar untuk navigasi panah, urut sesuai grup
  const datar = useMemo(() => GRUP.flatMap((g) => hasil[g].map((item) => ({ ...item, grup: g }))), [hasil]);

  // fokus ke input saat palet dibuka; bersihkan saat ditutup
  useEffect(() => {
    if (terbuka) setTimeout(() => inputRef.current?.focus(), 0);
    else {
      setQ('');
      setHasil({ menu: [], halaman: [], modul: [], isi: [], perubahan: [] });
    }
  }, [terbuka]);

  // cari dengan jeda 200ms agar tidak menembak server di setiap ketukan
  useEffect(() => {
    // palet tertutup / input terlalu pendek: tidak perlu memanggil server
    if (!terbuka || q.trim().length < 2) return undefined;
    const pengendali = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/pencarian?q=${encodeURIComponent(q.trim())}`, { signal: pengendali.signal });
        const json = await res.json();
        // server menolak: tampilkan pesan, kosongkan hasil lama
        if (!json.success) return setError(json.message);
        setError('');
        setHasil(json.data);
        setAktif(0);
      } catch (e) {
        // permintaan dibatalkan karena user mengetik lagi: normal, abaikan
        if (e.name !== 'AbortError') setError(t('cari.gagal'));
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      pengendali.abort();
    };
  }, [q, terbuka]);

  /** Membuka item hasil lalu menutup palet. */
  function buka(item) {
    router.push(item.href);
    onTutup();
  }

  /** Navigasi keyboard: panah, Enter, Escape. */
  function tombol(e) {
    if (e.key === 'Escape') return onTutup();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      return setAktif((a) => Math.min(a + 1, datar.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      return setAktif((a) => Math.max(a - 1, 0));
    }
    // Enter membuka item yang sedang disorot
    if (e.key === 'Enter' && datar[aktif]) buka(datar[aktif]);
  }

  // palet tertutup: tidak merender apa pun
  if (!terbuka) return null;

  let nomor = -1; // penunjuk posisi global item untuk penanda aktif
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[12vh]" onMouseDown={onTutup}>
      <div role="dialog" aria-modal="true" aria-label={t('cari.judul')} className="w-full max-w-xl rounded-lg border border-line bg-panel shadow-xl" onMouseDown={(e) => e.stopPropagation()} onKeyDown={tombol}>
        <div className="border-b border-line p-3">
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('cari.placeholder')} className={inputDasar} aria-label={t('cari.judul')} />
        </div>
        <div className="max-h-[55vh] overflow-y-auto p-2">
          {error && <p className="px-2 py-1 text-xs text-red-600">{error}</p>}
          {!error && q.trim().length >= 2 && datar.length === 0 && <p className="px-2 py-3 text-sm text-muted">{t('cari.tidakAda')}</p>}
          {GRUP.map((g) =>
            hasil[g].length === 0 ? null : (
              <div key={g} className="mb-2">
                <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted">{t(`cari.grup.${g}`)}</p>
                {hasil[g].map((item) => {
                  nomor += 1;
                  const sorot = nomor === aktif;
                  return (
                    <button key={`${g}-${item.id}`} type="button" onClick={() => buka(item)} onMouseEnter={() => setAktif(datar.findIndex((d) => d.grup === g && d.id === item.id))} className={`block w-full rounded-md px-2 py-1.5 text-left ${sorot ? 'bg-accent-soft' : ''}`}>
                      <span className={`block truncate ${item.stub ? 'text-muted' : ''} ${item.pending ? 'text-muted line-through opacity-60' : ''}`}>
                        {item.judul}
                        {item.pending && <span className="ml-2 text-[10px] uppercase no-underline">{t('tautan.labelPending')}</span>}
                      </span>
                      <span className="block truncate font-mono text-xs text-muted">{item.sub}</span>
                    </button>
                  );
                })}
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
