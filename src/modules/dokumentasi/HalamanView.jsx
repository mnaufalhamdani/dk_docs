import Link from 'next/link';
import { DAFTAR_BAGIAN, BAGIAN } from '@/enums';
import { LabelStub } from '@/modules/shared/Badge';
import CopyButton from '@/modules/shared/CopyButton';
import TombolAksi from '@/modules/shared/TombolAksi';
import { tombolSekunder, tombolUtama } from '@/modules/shared/ui';
import { jadikanSemuaLive } from './dokumentasi.actions';
import { hapusHalaman } from '@/modules/halaman/halaman.actions';
import GaleriGambar from './GaleriGambar';
import SorotPoin from './SorotPoin';
import PoinBaca from '@/modules/tautan/PoinBaca';
import TimelineRiwayat from '@/modules/perubahan/TimelineRiwayat';
import PerubahanTerkait from '@/modules/perubahan/PerubahanTerkait';
import { t } from '@/utils/i18n';

/** Bagian yang dilipat secara bawaan karena jarang dibutuhkan. */
const BAGIAN_DILIPAT = new Set([BAGIAN.API, BAGIAN.CATATAN]);

/** Titik kecil penanda status poin (amber = beta, hijau = live). */
function TitikStatus({ status }) {
  const warna = status === 'live' ? 'bg-green-500' : 'bg-amber-500';
  return <span className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${warna}`} title={t(`status.${status}`)} />;
}

/** Daftar poin satu bagian. */
function DaftarPoin({ poin }) {
  return (
    <ul className="space-y-1.5">
      {poin.map((p) => (
        <li key={p.id} id={`poin-${p.id}`} className="-mx-1 flex gap-2 px-1">
          <TitikStatus status={p.status} />
          <PoinBaca isi={p.isi} tautan={p.tautan} />
        </li>
      ))}
    </ul>
  );
}

/** Blok satu bagian; bagian jarang dipakai dilipat dengan <details>. */
function BlokBagian({ bagian, poin, poinId }) {
  const judul = <span className="text-xs font-semibold uppercase tracking-wide text-muted">{t(`bagian.${bagian}`)}</span>;
  if (BAGIAN_DILIPAT.has(bagian)) {
    return (
      <details className="group" open={poin.some((p) => p.id === poinId)}>
        <summary className="cursor-pointer select-none">{judul}</summary>
        <div className="mt-2">
          <DaftarPoin poin={poin} />
        </div>
      </details>
    );
  }
  return (
    <section className="space-y-2">
      <h3>{judul}</h3>
      <DaftarPoin poin={poin} />
    </section>
  );
}

/** Tampilan baca dokumentasi satu halaman (server component). */
export default function HalamanView({ data, menuId, poinId = null }) {
  const { halaman, poin, gambar } = data;
  const tujuan = poin.filter((p) => p.bagian === BAGIAN.TUJUAN);
  const lainnya = DAFTAR_BAGIAN.filter((b) => b !== BAGIAN.TUJUAN).map((b) => ({ bagian: b, poin: poin.filter((p) => p.bagian === b) })).filter((g) => g.poin.length > 0);
  const adaBeta = poin.some((p) => p.status === 'beta');
  const hrefEdit = `/menu/${menuId}?h=${halaman.id}&edit=1`;

  return (
    <article className="space-y-5">
      <SorotPoin poinId={poinId} />
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">{halaman.nama}</h2>
            <span className="text-xs text-muted">{t(`jenis.${halaman.jenis}`)}</span>
            {halaman.is_stub ? <LabelStub /> : null}
          </div>
          {halaman.route && <p className="font-mono text-xs text-muted">{halaman.route}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={hrefEdit} className={tombolUtama}>
            {poin.length === 0 ? t('dokumentasi.tulis') : t('dokumentasi.edit')}
          </Link>
          {adaBeta && <TombolAksi action={jadikanSemuaLive} argumen={{ lingkup: 'halaman', id: halaman.id }} label={t('dokumentasi.jadikanLiveHalaman')} konfirmasi={t('dokumentasi.konfirmasiLive')} />}
          <Link href={`/halaman/${halaman.id}/ubah`} className={tombolSekunder}>
            {t('umum.ubah')}
          </Link>
          <TombolAksi action={hapusHalaman} argumen={halaman.id} label={t('umum.hapus')} bahaya konfirmasi={t('halaman.konfirmasiHapus', { nama: halaman.nama })} />
        </div>
      </header>

      {poin.length === 0 ? (
        <p className="rounded-md border border-dashed border-line p-4 text-sm text-muted">{t('dokumentasi.kosong')}</p>
      ) : (
        <>
          {tujuan.length > 0 && (
            <div className="space-y-1 text-base">
              {tujuan.map((p) => (
                <p key={p.id} id={`poin-${p.id}`} className="-mx-1 flex gap-2 px-1">
                  <TitikStatus status={p.status} />
                  <PoinBaca isi={p.isi} tautan={p.tautan} />
                </p>
              ))}
            </div>
          )}
          {lainnya.map((g) => (
            <BlokBagian key={g.bagian} bagian={g.bagian} poin={g.poin} poinId={poinId} />
          ))}
        </>
      )}

      <PerubahanTerkait halamanId={halaman.id} />

      {halaman.file_utama.length > 0 && (
        <section className="space-y-1">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{t('dokumentasi.fileUtama')}</h3>
          <ul className="space-y-1">
            {halaman.file_utama.map((f) => (
              <li key={f} className="flex items-center gap-2 font-mono text-xs">
                {f}
                <CopyButton teks={f} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <GaleriGambar halamanId={halaman.id} gambar={gambar} bolehEdit={false} />

      <details className="border-t border-line pt-3">
        <summary className="cursor-pointer select-none text-xs font-semibold uppercase tracking-wide text-muted">{t('riwayat.halamanJudul')}</summary>
        <div className="mt-2">
          <TimelineRiwayat tingkat="halaman" id={halaman.id} />
        </div>
      </details>
    </article>
  );
}
