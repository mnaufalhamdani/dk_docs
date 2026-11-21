import Link from 'next/link';
import { ambilDep } from '@/di/container';
import { muat } from '@/utils/muat';
import HeaderHalaman from '@/modules/shared/HeaderHalaman';
import TombolAksi from '@/modules/shared/TombolAksi';
import { BadgeBeta, LabelStub, PolaBadge } from '@/modules/shared/Badge';
import { kartu, tombolSekunder, tombolUtama } from '@/modules/shared/ui';
import { jadikanSemuaLive } from '@/modules/dokumentasi/dokumentasi.actions';
import BelumAdaDokumentasi from '@/modules/shared/BelumAdaDokumentasi';
import TimelineRiwayat from '@/modules/perubahan/TimelineRiwayat';
import { buatSesiSinkron } from '@/modules/prompt/prompt.actions';
import { hapusModul } from './modul.actions';
import { t } from '@/utils/i18n';

/** Deretan chip alias (database / kata kunci). */
function ChipAlias({ judul, daftar }) {
  // tanpa alias: bagian ini tidak ditampilkan
  if (daftar.length === 0) return null;
  return (
    <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
      <span>{judul}:</span>
      {daftar.map((a) => (
        <span key={a} className="rounded bg-accent-soft px-1.5 py-0.5 font-mono text-accent">
          {a}
        </span>
      ))}
    </p>
  );
}

/** Detail modul: ringkasan, alias, dan daftar menu. */
export default async function ModulDetail({ id, tab = null }) {
  const riwayat = tab === 'riwayat';
  const modul = await muat(() => ambilDep().modulController.detail(id));
  return (
    <div>
      <HeaderHalaman
        breadcrumb={[{ nama: modul.repo.nama, href: `/repo/${modul.repo.id}` }]}
        judul={modul.nama}
        badge={
          <>
            {modul.ada_beta && <BadgeBeta />}
            {modul.is_stub ? <LabelStub /> : null}
          </>
        }
        sub={
          <div className="space-y-1">
            {modul.ringkasan && <p className="text-sm">{modul.ringkasan}</p>}
            {modul.path_kode && <p className="font-mono text-xs text-muted">{modul.path_kode}</p>}
            <ChipAlias judul={t('form.aliasDatabase')} daftar={modul.alias.database} />
            <ChipAlias judul={t('form.kataKunci')} daftar={modul.alias.kata_kunci} />
          </div>
        }
        aksi={
          <>
            <Link href={`/modul/${modul.id}/menu/baru`} className={tombolUtama}>
              {t('menu.tambah')}
            </Link>
            <TombolAksi action={buatSesiSinkron} argumen={modul.id} label={t('prompt.sinkron')} />
            {modul.ada_beta && <TombolAksi action={jadikanSemuaLive} argumen={{ lingkup: 'modul', id: modul.id }} label={t('dokumentasi.jadikanLiveModul')} konfirmasi={t('dokumentasi.konfirmasiLive')} />}
            <Link href={`/modul/${modul.id}/ubah`} className={tombolSekunder}>
              {t('umum.ubah')}
            </Link>
            <TombolAksi action={hapusModul} argumen={modul.id} label={t('umum.hapus')} bahaya konfirmasi={t('modul.konfirmasiHapus', { nama: modul.nama })} />
          </>
        }
      />
      {modul.is_stub ? <BelumAdaDokumentasi modulId={modul.id} /> : null}

      <div role="tablist" className="mb-5 flex items-center border-b border-line">
        {[
          { href: `/modul/${modul.id}`, aktif: !riwayat, label: t('menu.judul') },
          { href: `/modul/${modul.id}?tab=riwayat`, aktif: riwayat, label: t('riwayat.judul') },
        ].map((x) => (
          <Link key={x.href} href={x.href} aria-current={x.aktif ? 'page' : undefined} className={`-mb-px border-b-2 px-3 py-2 text-sm ${x.aktif ? 'border-accent font-medium text-accent' : 'border-transparent text-muted hover:text-fg'}`}>
            {x.label}
          </Link>
        ))}
      </div>

      {riwayat ? (
        <TimelineRiwayat tingkat="modul" id={modul.id} />
      ) : modul.menu.length === 0 ? (
        <p className="rounded-md border border-dashed border-line p-6 text-sm text-muted">{t('menu.kosong')}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {modul.menu.map((m) => (
            <li key={m.id}>
              <Link href={`/menu/${m.id}`} className={`${kartu} block p-3 hover:border-accent ${m.is_stub ? 'border-dashed opacity-70' : ''}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{m.nama}</p>
                  <PolaBadge pola={m.pola} />
                  {m.ada_beta && <BadgeBeta />}
                  {m.is_stub ? <LabelStub /> : null}
                </div>
                {m.route && <p className="mt-1 font-mono text-xs text-muted">{m.route}</p>}
                {m.ringkasan && <p className="mt-1 text-sm text-muted">{m.ringkasan}</p>}
                <p className="mt-2 text-xs text-muted">{t('menu.jumlahHalaman', { n: m.jumlah_halaman })}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
