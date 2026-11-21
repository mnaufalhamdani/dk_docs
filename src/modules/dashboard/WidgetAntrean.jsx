import Link from 'next/link';
import { ambilDep } from '@/di/container';
import { TipeBadge } from '@/modules/shared/Badge';
import { tombolSekunder } from '@/modules/shared/ui';
import { Widget, GalatWidget, KosongWidget, LabelKondisi } from './KerangkaWidget';
import { muatAman } from './dashboard.aman';
import { hariIniLokal, paramDaftarPerubahan, urlDashboard } from './dashboard.filter';
import { t } from '@/utils/i18n';

/** Tombol aksi kecil di ujung satu item. */
const aksiKecil = `${tombolSekunder} px-2! py-0.5! text-xs!`;

/** Satu item antrean: isi di kiri, tombol aksi di kanan. */
function Item({ children, aksi }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line px-3 py-2 text-sm">
      <div className="flex min-w-0 flex-wrap items-center gap-2">{children}</div>
      {aksi}
    </li>
  );
}

/** Kepala satu kelompok: judul, jumlah, label kondisi, dan tautan perluas/ringkas. */
function KepalaKelompok({ judul, total, tampil, kondisiSaatIni, kelompok, filter, tambahan = null }) {
  const hariIni = hariIniLokal();
  const terbuka = filter.lihat === kelompok;
  // bila daftar sedang diperluas, tautan kembali ke ringkasan; bila terpotong, tautan melihat semua
  const href = `${urlDashboard({ ...filter, lihat: terbuka ? '' : kelompok }, hariIni)}#widget-antrean`;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{judul}</h3>
        <span className="text-xs text-muted">{t('dashboard.antrean.jumlah', { n: total })}</span>
        {kondisiSaatIni && <LabelKondisi />}
      </div>
      <div className="flex items-center gap-3 text-xs">
        {tambahan}
        {(total > tampil || terbuka) && (
          <Link href={href} className="text-accent hover:underline">
            {terbuka ? t('dashboard.ringkas') : t('dashboard.lihatSemua')}
          </Link>
        )}
      </div>
    </div>
  );
}

/** Kelompok CR/B yang belum masuk dokumentasi. */
function KelompokCrb({ data, filter }) {
  return (
    <div className="space-y-2">
      <KepalaKelompok
        judul={t('dashboard.antrean.crb')}
        total={data.total}
        tampil={data.item.length}
        kelompok="crb"
        filter={filter}
        tambahan={
          <Link href={paramDaftarPerubahan(filter, { dokumentasi: 'belum' })} className="text-accent hover:underline">
            {t('dashboard.antrean.crbBukaDaftar')}
          </Link>
        }
      />
      {data.item.length === 0 ? (
        <KosongWidget>{t('dashboard.antrean.crbKosong')}</KosongWidget>
      ) : (
        <ul className="space-y-1.5">
          {data.item.map((i) => (
            <Item
              key={i.id}
              aksi={
                <Link href={`/perubahan/${i.id}/usulan`} className={aksiKecil}>
                  {t('dashboard.antrean.crbAksi')}
                </Link>
              }
            >
              <TipeBadge tipe={i.tipe} />
              <Link href={`/perubahan/${i.id}`} className="font-mono text-accent hover:underline">
                {i.nomor}
              </Link>
              <span className="text-xs text-muted">{String(i.tanggal ?? '').slice(0, 10)}</span>
              {i.belum_dipetakan && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">{t('dashboard.belumDipetakan')}</span>}
            </Item>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Kelompok nama modul/menu dari Sync yang belum dipetakan (hanya untuk "Semua repo"). */
function KelompokPeta({ data, filter }) {
  // repo difilter: CR/B tanpa modul tidak bisa dikaitkan dengan repo, jadi kelompok ini disembunyikan
  if (!data.tersedia) {
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{t('dashboard.antrean.peta')}</h3>
        <KosongWidget>{t('dashboard.antrean.petaHanyaSemuaRepo')}</KosongWidget>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <KepalaKelompok judul={t('dashboard.antrean.peta')} total={data.total} tampil={data.item.length} kondisiSaatIni kelompok="peta" filter={filter} />
      {data.item.length === 0 ? (
        <KosongWidget>{t('dashboard.antrean.petaKosong')}</KosongWidget>
      ) : (
        <ul className="space-y-1.5">
          {data.item.map((i) => (
            <Item
              key={`${i.modul_sumber}|${i.menu_sumber}`}
              aksi={
                <Link href={`/perubahan/${i.perubahan_id}`} className={aksiKecil}>
                  {t('dashboard.antrean.petaAksi')}
                </Link>
              }
            >
              <span className="font-mono text-xs">{[i.modul_sumber, i.menu_sumber].filter(Boolean).join(' / ') || t('dashboard.antrean.tanpaNama')}</span>
              <span className="text-xs text-muted">{t('dashboard.antrean.petaPesan', { n: i.jumlah_pesan })}</span>
            </Item>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Kelompok modul stub. */
function KelompokStub({ data, filter }) {
  return (
    <div className="space-y-2">
      <KepalaKelompok judul={t('dashboard.antrean.stub')} total={data.total} tampil={data.item.length} kondisiSaatIni kelompok="stub" filter={filter} />
      {data.item.length === 0 ? (
        <KosongWidget>{t('dashboard.antrean.stubKosong')}</KosongWidget>
      ) : (
        <ul className="space-y-1.5">
          {data.item.map((i) => (
            <Item
              key={i.id}
              aksi={
                <Link href={`/prompt/baru?modul=${i.id}`} className={aksiKecil}>
                  {t('dashboard.antrean.stubAksi')}
                </Link>
              }
            >
              <Link href={`/modul/${i.id}`} className="text-accent hover:underline">
                {i.nama}
              </Link>
              <span className="text-xs text-muted">{i.repo_nama}</span>
            </Item>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Widget 2: antrean "Perlu tindakan" dengan tiga kelompok dan keterangan Sync terakhir. */
export default async function WidgetAntrean({ filter }) {
  const hasil = await muatAman('antrean', () => ambilDep().dashboardController.antrean(filter));
  // query gagal: tampilkan galat hanya di widget ini
  if (!hasil.ok) return <GalatWidget judul={t('dashboard.antrean.judul')} />;
  const d = hasil.data;
  return (
    <Widget
      id="widget-antrean"
      judul={t('dashboard.antrean.judul')}
      aksi={<span className="text-xs text-muted">{d.sync_terakhir ? t('dashboard.antrean.terakhirSync', { waktu: d.sync_terakhir }) : t('dashboard.antrean.belumPernahSync')}</span>}
    >
      <div className="space-y-5">
        <KelompokCrb data={d.crb} filter={filter} />
        <KelompokPeta data={d.peta} filter={filter} />
        <KelompokStub data={d.stub} filter={filter} />
      </div>
    </Widget>
  );
}
