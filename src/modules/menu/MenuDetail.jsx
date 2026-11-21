import Link from 'next/link';
import { ambilDep } from '@/di/container';
import { muat } from '@/utils/muat';
import HeaderHalaman from '@/modules/shared/HeaderHalaman';
import TombolAksi from '@/modules/shared/TombolAksi';
import { BadgeBeta, LabelStub, PolaBadge } from '@/modules/shared/Badge';
import { tombolSekunder, tombolUtama } from '@/modules/shared/ui';
import HalamanView from '@/modules/dokumentasi/HalamanView';
import PoinEditor from '@/modules/dokumentasi/PoinEditor';
import GaleriGambar from '@/modules/dokumentasi/GaleriGambar';
import { jadikanSemuaLive, simpanPoinHalaman, usulkanRingkasPoin } from '@/modules/dokumentasi/dokumentasi.actions';
import BelumAdaDokumentasi from '@/modules/shared/BelumAdaDokumentasi';
import TimelineRiwayat from '@/modules/perubahan/TimelineRiwayat';
import { hapusMenu, buatHalamanStandarMenu } from './menu.actions';
import { t } from '@/utils/i18n';

/** Satu tab (tautan) dengan penanda aktif, stub, dan beta. */
function Tab({ href, aktif, children }) {
  return (
    <Link href={href} aria-current={aktif ? 'page' : undefined} className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm ${aktif ? 'border-accent font-medium text-accent' : 'border-transparent text-muted hover:text-fg'}`}>
      {children}
    </Link>
  );
}

/** Tab Riwayat Fase 1: versi tersimpan dari semua halaman menu (timeline CR/B menyusul di Fase 2). */
async function TabRiwayat({ halaman, menuId }) {
  const { dokumentasiController } = ambilDep();
  const semua = await Promise.all(
    halaman.map(async (h) => (await dokumentasiController.riwayatVersi(h.id)).map((v) => ({ ...v, halaman: h.nama }))),
  );
  const versi = semua.flat().sort((a, b) => b.created_at.localeCompare(a.created_at));
  return (
    <div className="space-y-8">
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{t('riwayat.perubahanJudul')}</h3>
      <TimelineRiwayat tingkat="menu" id={menuId} />
    </section>
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{t('riwayat.versiJudul')}</h3>
      <p className="text-xs text-muted">{t('riwayat.catatanFase')}</p>
      {versi.length === 0 ? (
        <p className="rounded-md border border-dashed border-line p-4 text-sm text-muted">{t('riwayat.kosong')}</p>
      ) : (
        <ul className="divide-y divide-line rounded-md border border-line bg-panel">
          {versi.map((v) => (
            <li key={`${v.halaman}-${v.id}`} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
              <span>
                <span className="font-medium">{v.halaman}</span>
                {v.alasan && <span className="text-muted"> · {v.alasan}</span>}
              </span>
              <span className="text-xs text-muted">
                {t('riwayat.ringkasPoin', { n: v.jumlah_poin, beta: v.jumlah_beta })} · {v.created_at}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
    </div>
  );
}

/** Isi tab halaman: editor bila mode edit, selain itu tampilan baca. */
async function IsiHalaman({ menu, halamanId, edit, poinId }) {
  const { dokumentasiController, pengaturanController } = ambilDep();
  const data = await muat(() => dokumentasiController.ambilHalaman(halamanId));
  // mode baca: tampilkan dokumentasi apa adanya
  if (!edit) return <HalamanView data={data} menuId={menu.id} poinId={poinId} />;

  const batas = await pengaturanController.batasPoin();
  const kembali = `/menu/${menu.id}?h=${halamanId}`;
  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold">
        {t('editor.judul', { nama: data.halaman.nama })}
      </h2>
      <PoinEditor halamanId={halamanId} poinAwal={data.poin} batas={batas} simpanAction={simpanPoinHalaman} ringkasAction={usulkanRingkasPoin} kembaliHref={kembali} />
      <GaleriGambar halamanId={halamanId} gambar={data.gambar} bolehEdit />
    </div>
  );
}

/** Detail menu: judul, ringkasan, tab halaman, dan tab Riwayat. */
export default async function MenuDetail({ id, halamanId = null, poinId = null, edit = false, tab = null }) {
  const menu = await muat(() => ambilDep().menuController.detail(id));
  const riwayat = tab === 'riwayat';
  // halaman terpilih: sesuai parameter, jika tidak valid pakai halaman pertama
  const terpilih = menu.halaman.find((h) => h.id === halamanId) ?? menu.halaman[0] ?? null;
  const bisaBuatStandar = menu.pola === 'crud' && menu.halaman.length < 3;

  return (
    <div>
      <HeaderHalaman
        breadcrumb={[
          { nama: menu.repo.nama, href: `/repo/${menu.repo.id}` },
          { nama: menu.modul.nama, href: `/modul/${menu.modul.id}` },
        ]}
        judul={menu.nama}
        badge={
          <>
            <PolaBadge pola={menu.pola} />
            {menu.ada_beta && <BadgeBeta />}
            {menu.is_stub ? <LabelStub /> : null}
          </>
        }
        sub={
          <div className="space-y-1">
            {menu.route && <p className="font-mono text-xs text-muted">{menu.route}</p>}
            {menu.ringkasan && <p className="text-sm">{menu.ringkasan}</p>}
          </div>
        }
        aksi={
          <>
            <Link href={`/menu/${menu.id}/halaman/baru`} className={tombolUtama}>
              {t('halaman.tambah')}
            </Link>
            {menu.ada_beta && <TombolAksi action={jadikanSemuaLive} argumen={{ lingkup: 'menu', id: menu.id }} label={t('dokumentasi.jadikanLiveMenu')} konfirmasi={t('dokumentasi.konfirmasiLive')} />}
            <Link href={`/menu/${menu.id}/ubah`} className={tombolSekunder}>
              {t('umum.ubah')}
            </Link>
            <TombolAksi action={hapusMenu} argumen={menu.id} label={t('umum.hapus')} bahaya konfirmasi={t('menu.konfirmasiHapus', { nama: menu.nama })} />
          </>
        }
      />

      {menu.is_stub ? <BelumAdaDokumentasi modulId={menu.modul.id} /> : null}

      <div role="tablist" className="mb-5 flex flex-wrap items-center border-b border-line">
        {menu.halaman.map((h) => (
          <Tab key={h.id} href={`/menu/${menu.id}?h=${h.id}`} aktif={!riwayat && terpilih?.id === h.id}>
            <span className={h.is_stub ? 'opacity-60' : ''}>{h.nama}</span>
            {h.ada_beta && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title={t('badge.adaBetaHint')} />}
          </Tab>
        ))}
        <Tab href={`/menu/${menu.id}?tab=riwayat`} aktif={riwayat}>
          {t('riwayat.judul')}
        </Tab>
      </div>

      {riwayat ? (
        <TabRiwayat halaman={menu.halaman} menuId={menu.id} />
      ) : terpilih ? (
        <IsiHalaman menu={menu} halamanId={terpilih.id} edit={edit} poinId={poinId} />
      ) : (
        <div className="space-y-3 rounded-md border border-dashed border-line p-6 text-sm text-muted">
          <p>{t('halaman.kosong')}</p>
          {bisaBuatStandar && <TombolAksi action={buatHalamanStandarMenu} argumen={menu.id} label={t('halaman.buatStandar')} />}
        </div>
      )}

      {/* menu CRUD yang halamannya belum lengkap: tawarkan melengkapi halaman standar */}
      {terpilih && bisaBuatStandar && !riwayat && (
        <div className="mt-8 border-t border-line pt-4">
          <TombolAksi action={buatHalamanStandarMenu} argumen={menu.id} label={t('halaman.lengkapiStandar')} />
        </div>
      )}
    </div>
  );
}
