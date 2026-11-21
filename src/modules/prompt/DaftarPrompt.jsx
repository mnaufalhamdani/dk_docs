import Link from 'next/link';
import { ambilDep } from '@/di/container';
import HeaderHalaman from '@/modules/shared/HeaderHalaman';
import { TipeBadge } from '@/modules/shared/Badge';
import { tombolSekunder } from '@/modules/shared/ui';
import { t } from '@/utils/i18n';

/** Daftar sesi prompt terbaru dengan tautan ke prompt dan ke halaman impor. */
export default async function DaftarPrompt() {
  const daftar = await ambilDep().promptController.daftar();
  return (
    <div>
      <HeaderHalaman
        judul={t('prompt.judul')}
        sub={<p className="text-sm text-muted">{t('prompt.deskripsi')}</p>}
        aksi={
          <Link href="/prompt/baru" className={tombolSekunder}>
            {t('prompt.baruJudul')}
          </Link>
        }
      />
      {daftar.length === 0 ? (
        <p className="rounded-md border border-dashed border-line p-6 text-sm text-muted">{t('prompt.kosong')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-panel">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">unique_id</th>
                <th className="px-3 py-2 font-medium">{t('prompt.kolomJenis')}</th>
                <th className="px-3 py-2 font-medium">{t('perubahan.repo')}</th>
                <th className="px-3 py-2 font-medium">{t('prompt.kolomStatus')}</th>
                <th className="px-3 py-2 font-medium">{t('prompt.kolomDibuat')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {daftar.map((s) => (
                <tr key={`${s.unique_id}-${s.jenis}`} className="hover:bg-accent-soft">
                  <td className="px-3 py-2">
                    <Link href={`/prompt/${s.unique_id}`} className="font-mono text-accent hover:underline">
                      {s.unique_id}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {t(`prompt.jenis.${s.jenis}`)}
                    {s.perubahan_nomor && (
                      <span className="ml-2 inline-flex items-center gap-1">
                        <TipeBadge tipe={s.perubahan_tipe} />
                        <span className="font-mono">{s.perubahan_nomor}</span>
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">{s.repo_nama}</td>
                  <td className="px-3 py-2 text-xs">{s.status}</td>
                  <td className="px-3 py-2 text-xs text-muted">{s.dibuat}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
