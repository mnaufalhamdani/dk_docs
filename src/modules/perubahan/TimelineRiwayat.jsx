import Link from 'next/link';
import { ambilDep } from '@/di/container';
import { TipeBadge } from '@/modules/shared/Badge';
import { t } from '@/utils/i18n';

/** Timeline riwayat satu modul/menu/halaman (server component): CR/B dan entri audit, ID bisa diklik. */
export default async function TimelineRiwayat({ tingkat, id }) {
  const items = await ambilDep().perubahanController.riwayat({ tingkat, id });

  // belum ada perubahan yang tercatat pada level ini
  if (items.length === 0) {
    return <p className="rounded-md border border-dashed border-line p-4 text-sm text-muted">{t('riwayat.perubahanKosong')}</p>;
  }
  return (
    <ul className="divide-y divide-line rounded-md border border-line bg-panel">
      {items.map((r) => (
        <li key={r.jenis === 'audit' ? `a${r.audit_id}` : `p${r.perubahan_id}`} className="flex flex-wrap items-start gap-3 px-3 py-2 text-sm">
          {r.jenis === 'perubahan' ? (
            <>
              <TipeBadge tipe={r.tipe} />
              <Link href={`/perubahan/${r.perubahan_id}`} className="font-mono text-accent hover:underline">
                {r.nomor}
              </Link>
              {r.asal === 'peta' && <span className="text-xs text-muted" title={t('riwayat.asalPetaHint')}>{t('riwayat.asalPeta')}</span>}
            </>
          ) : (
            <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[11px] font-medium text-accent">{t('riwayat.audit')}</span>
          )}
          <span className="min-w-0 flex-1 text-muted">{r.ringkasan}</span>
          <span className="shrink-0 text-xs text-muted">{r.tanggal}</span>
        </li>
      ))}
    </ul>
  );
}
