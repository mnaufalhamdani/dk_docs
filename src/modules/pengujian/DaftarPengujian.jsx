import Link from 'next/link';
import { ambilDep } from '@/di/container';
import HeaderHalaman from '@/modules/shared/HeaderHalaman';
import { tombolUtama } from '@/modules/shared/ui';
import BadgeStatusUji from './BadgeStatusUji';
import { t } from '@/utils/i18n';

/** Urutan tampil hitungan status poin. */
const URUTAN_STATUS = ['PASS', 'FAIL', 'BLOCKED', 'BELUM'];

/** Hitungan jumlah poin per status (hanya hitungan, tanpa kesimpulan lulus/gagal). */
function HitunganStatus({ hitungan }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {URUTAN_STATUS.filter((s) => hitungan[s] > 0).map((s) => (
        <span key={s} className="flex items-center gap-1">
          <BadgeStatusUji status={s} />
          <span className="font-mono text-xs">{hitungan[s]}</span>
        </span>
      ))}
    </span>
  );
}

/** Daftar Uji CR: CR ID, jumlah poin, hitungan status, putaran terakhir, dan tombol Uji CR baru. */
export default async function DaftarPengujian() {
  const daftar = await ambilDep().pengujianController.daftar();
  return (
    <div>
      <HeaderHalaman
        judul={t('pengujian.judul')}
        sub={<p className="text-sm text-muted">{t('pengujian.deskripsi')}</p>}
        aksi={
          <Link href="/pengujian/baru" className={tombolUtama}>
            {t('pengujian.baru')}
          </Link>
        }
      />
      {daftar.length === 0 ? (
        <p className="rounded-md border border-dashed border-line p-6 text-sm text-muted">{t('pengujian.kosong')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-panel">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">{t('pengujian.kolomCr')}</th>
                <th className="px-3 py-2 font-medium">{t('pengujian.kolomPoin')}</th>
                <th className="px-3 py-2 font-medium">{t('pengujian.kolomStatus')}</th>
                <th className="px-3 py-2 font-medium">{t('pengujian.kolomPutaran')}</th>
                <th className="px-3 py-2 font-medium">{t('prompt.kolomDibuat')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {daftar.map((p) => (
                <tr key={p.id} className="hover:bg-accent-soft">
                  <td className="px-3 py-2">
                    <Link href={`/pengujian/${p.id}`} className="font-mono text-accent hover:underline">
                      {p.cr_id}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-xs">{p.jumlah_poin}</td>
                  <td className="px-3 py-2">
                    <HitunganStatus hitungan={p.hitungan} />
                  </td>
                  <td className="px-3 py-2 text-xs">{p.putaran_terakhir ?? '-'}</td>
                  <td className="px-3 py-2 text-xs text-muted">{p.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
