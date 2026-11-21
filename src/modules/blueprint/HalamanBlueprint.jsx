import Link from 'next/link';
import { ambilDep } from '@/di/container';
import { muat } from '@/utils/muat';
import HeaderHalaman from '@/modules/shared/HeaderHalaman';
import TombolAksi from '@/modules/shared/TombolAksi';
import { tombolSekunder } from '@/modules/shared/ui';
import SeksiPoin from './SeksiPoin';
import SeksiPencocokan from './SeksiPencocokan';
import SeksiKelompok from './SeksiKelompok';
import { hapusBlueprint } from './blueprint.actions';
import { t } from '@/utils/i18n';

/** Kepala langkah bernomor. */
function Langkah({ nomor, judul, children }) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[11px] text-white">{nomor}</span>
        {judul}
      </h2>
      {children}
    </section>
  );
}

/** Editor blueprint: poin -> pencocokan -> kelompok & urutan -> prompt. */
export default async function HalamanBlueprint({ id }) {
  const data = await muat(() => ambilDep().blueprintController.detail(id));
  const { blueprint, poin, kelompok, tanpa_kelompok: tanpaKelompok, opsi, ukuran } = data;
  const isiPoin = Object.fromEntries(poin.map((p) => [p.nomor, p.isi]));
  // key berubah saat data server berubah, sehingga state editor klien ikut disetel ulang setelah simpan
  const kunciPoin = JSON.stringify(poin.map((p) => [p.id, p.isi]));
  const kunciCocok = JSON.stringify(poin.map((p) => [p.id, p.target.map((x) => [x.modul_id, x.menu_id, x.halaman_id, x.peran])]));
  const kunciKelompok = JSON.stringify([kelompok.map((k) => [k.id, k.alasan, k.poin, k.unique_id]), tanpaKelompok]);

  return (
    <div className="space-y-8">
      <HeaderHalaman
        breadcrumb={[{ nama: t('blueprint.judul'), href: '/blueprint' }]}
        judul={blueprint.judul}
        sub={<p className="text-xs text-muted">{t('blueprint.ringkasList', { poin: poin.length, kelompok: kelompok.length, prompt: kelompok.filter((k) => k.unique_id).length })} · {blueprint.repo.nama}</p>}
        aksi={
          <>
            <Link href={`/blueprint/${blueprint.id}/prompt`} className={tombolSekunder}>
              {t('blueprint.lihatPrompt')}
            </Link>
            <TombolAksi action={hapusBlueprint} argumen={blueprint.id} label={t('umum.hapus')} bahaya konfirmasi={t('blueprint.konfirmasiHapus', { judul: blueprint.judul })} />
          </>
        }
      />
      <Langkah nomor={1} judul={t('blueprint.langkahPoin')}>
        <SeksiPoin key={kunciPoin} blueprintId={blueprint.id} poin={poin} />
      </Langkah>
      <Langkah nomor={2} judul={t('blueprint.langkahCocok')}>
        <SeksiPencocokan key={kunciCocok} blueprintId={blueprint.id} poin={poin} opsi={opsi} />
      </Langkah>
      <Langkah nomor={3} judul={t('blueprint.langkahKelompok')}>
        <SeksiKelompok
          key={kunciKelompok}
          blueprintId={blueprint.id}
          kelompok={kelompok}
          tanpaKelompok={tanpaKelompok}
          isiPoin={isiPoin}
          modul={opsi.map((m) => ({ id: m.id, nama: m.nama }))}
          ukuran={ukuran}
        />
      </Langkah>
    </div>
  );
}
