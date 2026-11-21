import Link from 'next/link';
import { ambilDep } from '@/di/container';
import { muat } from '@/utils/muat';
import HeaderHalaman from '@/modules/shared/HeaderHalaman';
import { TipeBadge } from '@/modules/shared/Badge';
import TombolAksi from '@/modules/shared/TombolAksi';
import { tombolSekunder } from '@/modules/shared/ui';
import ReviewImpor from './ReviewImpor';
import { batalkanImpor } from './impor.actions';
import { t } from '@/utils/i18n';

/** Halaman review satu impor: info sesi, catatan selisih, lalu editor rencana (bila masih menunggu review). */
export default async function HalamanReview({ id }) {
  const { imporController, pengaturanController } = ambilDep();
  const data = await muat(() => imporController.detail(id));
  const { impor } = data;
  const menunggu = impor.status === 'menunggu_review';
  const batas = menunggu ? await pengaturanController.batasPoin() : null;

  return (
    <div className="space-y-5">
      <HeaderHalaman
        breadcrumb={[{ nama: t('impor.judul'), href: '/impor' }]}
        judul={`${t('impor.review')} #${impor.id}`}
        badge={impor.perubahan ? <TipeBadge tipe={impor.perubahan.tipe} /> : null}
        sub={
          <p className="text-xs text-muted">
            <span className="font-mono">{impor.unique_id}</span> · {t(`prompt.jenis.${impor.jenis}`)} · {impor.repo.nama}
            {impor.perubahan && <span className="ml-2 font-mono">{impor.perubahan.nomor}</span>} · {t(`impor.status.${impor.status}`)}
          </p>
        }
        aksi={
          menunggu ? <TombolAksi action={batalkanImpor} argumen={impor.id} label={t('impor.batalkanImpor')} bahaya konfirmasi={t('impor.konfirmasiBatal')} /> : null
        }
      />

      {impor.jenis === 'audit_bugfix' && impor.hash_terakhir_diaudit && (
        <p className="text-xs text-muted">
          {t('impor.hashAudit')}: <span className="font-mono">{impor.hash_terakhir_diaudit}</span>
        </p>
      )}
      {impor.selisih_dokumentasi.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <p className="mb-1 font-medium">{t('impor.selisihJudul')}</p>
          <ul className="list-disc space-y-0.5 pl-5">
            {impor.selisih_dokumentasi.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {menunggu ? (
        <ReviewImpor imporId={impor.id} jenisImpor={impor.jenis} rencanaAwal={data.rencana} opsiTautan={data.opsi_tautan} batas={batas} perubahan={impor.perubahan} infoRepo={data.info_repo} />
      ) : (
        <div className="space-y-3 rounded-md border border-dashed border-line p-4 text-sm text-muted">
          <p>{t(`impor.selesai.${impor.status}`)}</p>
          <div className="flex gap-2">
            {impor.perubahan && (
              <Link href={`/perubahan/${impor.perubahan.id}`} className={tombolSekunder}>
                {impor.perubahan.nomor}
              </Link>
            )}
            <Link href="/impor" className={tombolSekunder}>
              {t('impor.kembaliDaftar')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
