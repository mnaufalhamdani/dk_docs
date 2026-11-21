import Link from 'next/link';
import { ambilDep } from '@/di/container';
import { TipeBadge } from '@/modules/shared/Badge';
import { t } from '@/utils/i18n';

/** Jumlah nomor CR/B yang ditampilkan langsung; sisanya dilihat di Riwayat. */
const BATAS_TAMPIL = 10;

/**
 * Daftar ringkas CR/B yang pernah mengubah halaman ini (server component).
 * Hanya perubahan bernomor; entri audit tetap di Riwayat. Tidak tampil bila belum ada.
 */
export default async function PerubahanTerkait({ halamanId }) {
  const semua = await ambilDep().perubahanController.riwayat({ tingkat: 'halaman', id: halamanId });
  const daftar = semua.filter((r) => r.jenis === 'perubahan');
  // belum ada CR/B yang tercatat pada halaman ini: bagian ini disembunyikan
  if (daftar.length === 0) return null;

  const tampil = daftar.slice(0, BATAS_TAMPIL);
  const sisa = daftar.length - tampil.length;
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{t('riwayat.terkaitJudul')}</h3>
      <ul className="flex flex-wrap items-center gap-2">
        {tampil.map((r) => (
          <li key={r.perubahan_id}>
            <Link href={`/perubahan/${r.perubahan_id}`} className="flex items-center gap-1.5 rounded-md border border-line bg-panel px-2 py-1 text-xs hover:border-accent" title={r.ringkasan ?? ''}>
              <TipeBadge tipe={r.tipe} />
              <span className="font-mono text-accent">{r.nomor}</span>
            </Link>
          </li>
        ))}
        {sisa > 0 && <li className="text-xs text-muted">{t('riwayat.terkaitLainnya', { n: sisa })}</li>}
      </ul>
    </section>
  );
}
