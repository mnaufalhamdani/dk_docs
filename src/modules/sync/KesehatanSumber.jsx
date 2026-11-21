'use client';

import { useCallback, useEffect, useState } from 'react';
import { tombolSekunder } from '@/modules/shared/ui';
import { t } from '@/utils/i18n';

/** Alamat endpoint health yang sudah ada (tidak diubah). */
const URL_HEALTH = '/api/v1/health';
/** Batas tunggu jawaban endpoint sebelum dianggap offline. */
const BATAS_TUNGGU_MS = 4000;
/** Lama hasil pengecekan dipakai ulang agar tidak memanggil berulang di setiap render/pindah halaman. */
const MASA_CACHE_MS = 10000;

/** Cache tingkat modul: bertahan selama tab terbuka, termasuk saat berpindah halaman di dalam aplikasi. */
let cache = null;
/** Pengecekan yang sedang berjalan, dipakai bersama agar pemanggil bersamaan tidak membuat request ganda. */
let sedangJalan = null;

/** Hasil untuk endpoint yang tidak menjawab: offline, tombol ambil data dinonaktifkan. */
function hasilOffline(alasan) {
  return { status: 'offline', alasan: [alasan], bolehAmbil: false, dicek: Date.now() };
}

/** Menerjemahkan galat pemanggilan (jaringan atau waktu habis) menjadi alasan dari sisi pemanggil. */
function alasanGalat(error) {
  // AbortController memutus request yang melewati batas waktu
  if (error?.name === 'AbortError') return t('kesehatan.alasanWaktuHabis');
  return t('kesehatan.alasanDitolak');
}

/** Daftar alasan dari komponen yang berstatus error, diberi nama komponennya. */
function alasanKomponen(komponen) {
  return Object.entries(komponen ?? {})
    .filter(([, nilai]) => nilai?.status === 'error')
    .map(([nama, nilai]) => `${t(`kesehatan.komponen.${nama}`)}: ${nilai.alasan ?? t('kesehatan.alasanTidakDikenal')}`);
}

/** Menerjemahkan jawaban JSON endpoint health menjadi Online / Bermasalah. */
function terjemahkan(json) {
  const data = json?.data;
  // semua komponen sehat: berjalan normal
  if (data?.status === 'ok') return { status: 'online', alasan: [], bolehAmbil: true, dicek: Date.now() };
  // sebagian komponen gagal: tampilkan alasan; ambil data hanya dilarang bila database sumber yang error
  if (data?.status === 'degraded') {
    const alasan = alasanKomponen(data.komponen);
    return {
      status: 'bermasalah',
      alasan: alasan.length ? alasan : [t('kesehatan.alasanTidakDikenal')],
      bolehAmbil: data.komponen?.database_sumber?.status !== 'error',
      dicek: Date.now(),
    };
  }
  // jawaban tidak sesuai kontrak health: perlakukan seperti tidak menjawab dengan benar
  return hasilOffline(t('kesehatan.alasanResponsTidakDikenal'));
}

/** Memanggil endpoint health dengan batas waktu, lalu menerjemahkan hasilnya. */
async function periksaKesehatan() {
  const pengendali = new AbortController();
  const timer = setTimeout(() => pengendali.abort(), BATAS_TUNGGU_MS);
  try {
    const respons = await fetch(URL_HEALTH, { cache: 'no-store', signal: pengendali.signal });
    // server menjawab tetapi bukan 2xx: tidak ada data status yang bisa dipercaya
    if (!respons.ok) return hasilOffline(t('kesehatan.alasanHttp', { kode: respons.status }));
    return terjemahkan(await respons.json());
  } catch (error) {
    return hasilOffline(alasanGalat(error));
  } finally {
    // timer selalu dibersihkan agar tidak memutus request lain
    clearTimeout(timer);
  }
}

/**
 * Hook status sumber untuk halaman Sync. `cek(paksa)` memakai cache kecuali `paksa` true
 * (dipakai tombol "Cek ulang" dan tombol ambil data); mengembalikan hasil terbaru.
 */
export function useKesehatanSumber() {
  const [hasil, setHasil] = useState(null);
  const [memeriksa, setMemeriksa] = useState(true);

  const cek = useCallback(async (paksa = false) => {
    // hasil masih segar: pakai ulang tanpa memanggil endpoint
    if (!paksa && cache && Date.now() - cache.dicek < MASA_CACHE_MS) {
      setHasil(cache);
      setMemeriksa(false);
      return cache;
    }
    setMemeriksa(true);
    // sudah ada pengecekan berjalan dan tidak dipaksa: ikut menunggunya
    if (!paksa && sedangJalan) {
      const hasilBersama = await sedangJalan;
      setHasil(hasilBersama);
      setMemeriksa(false);
      return hasilBersama;
    }
    sedangJalan = periksaKesehatan();
    try {
      cache = await sedangJalan;
    } finally {
      sedangJalan = null;
    }
    setHasil(cache);
    setMemeriksa(false);
    return cache;
  }, []);

  // cek saat halaman dibuka
  useEffect(() => {
    cek(false);
  }, [cek]);

  return { hasil, memeriksa, cek };
}

/** Warna badge per status. */
const WARNA = {
  online: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  bermasalah: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  offline: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
};

/** Panel status sumber: badge, alasan, waktu cek terakhir, dan tombol Cek ulang. */
export default function PanelStatusSumber({ hasil, memeriksa, onCekUlang }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-line bg-panel px-3 py-2 text-sm">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">{t('kesehatan.judul')}</span>
          {hasil ? (
            <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${WARNA[hasil.status]}`}>{t(`kesehatan.status.${hasil.status}`)}</span>
          ) : (
            <span className="text-xs text-muted">{t('kesehatan.memeriksa')}</span>
          )}
          {hasil && memeriksa && <span className="text-xs text-muted">{t('kesehatan.memeriksa')}</span>}
        </div>
        {hasil?.alasan.length > 0 && (
          <ul className="list-disc pl-5 text-xs text-muted">
            {hasil.alasan.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        )}
        {hasil && !hasil.bolehAmbil && <p className="text-xs text-red-700 dark:text-red-300">{t('kesehatan.ambilDinonaktifkan')}</p>}
        {hasil && <p className="text-xs text-muted">{t('kesehatan.terakhirDicek', { waktu: new Date(hasil.dicek).toLocaleTimeString('id-ID') })}</p>}
      </div>
      <button type="button" onClick={onCekUlang} disabled={memeriksa} className={tombolSekunder}>
        {t('kesehatan.cekUlang')}
      </button>
    </div>
  );
}
