import Link from 'next/link';
import { ambilDep } from '@/di/container';
import { muat } from '@/utils/muat';
import HeaderHalaman from '@/modules/shared/HeaderHalaman';
import { TipeBadge } from '@/modules/shared/Badge';
import { kartu, tombolSekunder, tombolUtama } from '@/modules/shared/ui';
import PetakanForm from './PetakanForm';
import { t } from '@/utils/i18n';

/** Satu judul bagian kecil. */
function Judul({ children }) {
  return <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{children}</h2>;
}

/** Chip tautan modul/menu. */
function Chip({ href, children }) {
  return (
    <Link href={href} className="rounded bg-accent-soft px-1.5 py-0.5 text-xs text-accent hover:underline">
      {children}
    </Link>
  );
}

/** Warna dan label badge status tautan poin. */
const BADGE_TAUTAN = {
  aktif: { kunci: 'tautan.statusAktif', kelas: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200' },
  pending: { kunci: 'tautan.statusPending', kelas: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200' },
  sudah_berubah: { kunci: 'tautan.sudahBerubah', kelas: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
};

/** Satu item poin terkait: teks, badge status, dan developer yang menulis pesan CR/B. */
function ItemPoinTerkait({ item, developer }) {
  const badge = BADGE_TAUTAN[item.status];
  return (
    <li className="space-y-0.5">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${badge.kelas}`}>{t(badge.kunci)}</span>
        <span className={item.status === 'pending' ? 'text-muted line-through' : ''}>{item.teks}</span>
        {/* poin sudah dihapus/diganti: yang tampil adalah salinan teks saat tautan dibuat */}
        {!item.poin_ada && <span className="text-xs text-muted">({t('tautan.poinSudahTidakAda')})</span>}
      </div>
      {developer.length > 0 && (
        <p className="text-xs text-muted">
          {t('perubahan.developer')}: {developer.join(', ')}
        </p>
      )}
    </li>
  );
}

/** Bagian "Poin dokumentasi terkait": dikelompokkan modul > menu > halaman. Disembunyikan bila belum ada tautan. */
function PoinTerkait({ kelompok, developer }) {
  // belum ada poin yang tertaut ke CR/B ini
  if (kelompok.length === 0) return null;
  return (
    <section>
      <Judul>{t('tautan.terkaitJudul')}</Judul>
      <div className="space-y-4">
        {kelompok.map((m) => (
          <div key={m.modul_id} className={`${kartu} space-y-3 p-3`}>
            <p className="text-sm font-medium">
              <Chip href={`/modul/${m.modul_id}`}>
                {m.repo_nama} / {m.modul_nama}
              </Chip>
            </p>
            {m.menu.map((mn) => (
              <div key={mn.menu_id} className="space-y-2 pl-3">
                <p className="text-xs font-semibold text-muted">{mn.menu_nama}</p>
                {mn.halaman.map((h) => (
                  <div key={h.halaman_id} className="space-y-1 pl-3">
                    <Link href={`/menu/${mn.menu_id}?h=${h.halaman_id}`} className="text-xs text-accent hover:underline">
                      {h.halaman_nama}
                    </Link>
                    <ul className="space-y-2 text-sm">
                      {h.item.map((i) => (
                        <ItemPoinTerkait key={i.id} item={i} developer={developer} />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

/** Detail perubahan: semua pesan, modul terdampak, pemetaan yang belum ada, dan dampak dokumentasi. */
export default async function DetailPerubahan({ id }) {
  const { perubahanController, layoutController } = ambilDep();
  const p = await muat(() => perubahanController.detail(id));
  // pohon hanya dibutuhkan bila ada nama mentah yang perlu dipetakan
  const pohon = p.belum_dipetakan.length > 0 ? await layoutController.pohon() : [];

  return (
    <div className="space-y-6">
      <HeaderHalaman
        breadcrumb={[{ nama: t('perubahan.judul'), href: '/perubahan' }]}
        judul={p.nomor}
        badge={<TipeBadge tipe={p.tipe} />}
        sub={<p className="text-xs text-muted">{p.developer.join(', ')}</p>}
        aksi={
          <>
            <Link href={`/perubahan/${p.id}/usulan`} className={tombolUtama}>
              {t('prompt.usulanJudul')}
            </Link>
            {/* template .env tipe ini kosong: tombol disembunyikan */}
            {p.url_dokumen && (
              <a href={p.url_dokumen} target="_blank" rel="noopener noreferrer" className={tombolSekunder}>
                {t('perubahan.lihatDokumen')}
              </a>
            )}
            <Link href={`/sync?tipe=${p.tipe}&nomor=${encodeURIComponent(p.nomor)}`} className={tombolSekunder}>
              {t('perubahan.syncUlang')}
            </Link>
          </>
        }
      />

      <section>
        <Judul>{t('perubahan.modulTerdampak')}</Judul>
        {p.modul_terdampak.length === 0 ? (
          <p className="text-sm text-muted">{t('perubahan.belumAdaPeta')}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {p.modul_terdampak.map((m) => (
              <Chip key={m.id} href={`/modul/${m.id}`}>
                {m.repo_nama} / {m.nama}
              </Chip>
            ))}
          </div>
        )}
      </section>

      {p.belum_dipetakan.length > 0 && (
        <section>
          <Judul>{t('perubahan.belumDipetakanJudul')}</Judul>
          <p className="mb-2 text-xs text-muted">{t('perubahan.belumDipetakanHint')}</p>
          <div className="space-y-3">
            {p.belum_dipetakan.map((k) => (
              <PetakanForm key={`${k.modul_sumber}|${k.menu_sumber}`} kelompok={k} pohon={pohon} />
            ))}
          </div>
        </section>
      )}

      <section>
        <Judul>{t('perubahan.dampakJudul')}</Judul>
        {p.dampak.length === 0 ? (
          <p className="text-sm text-muted">{t('perubahan.dampakKosong')}</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {p.dampak.map((d, i) => (
              <li key={i} className="flex flex-wrap items-center gap-1.5">
                <Chip href={`/modul/${d.modul_id}`}>{d.modul_nama}</Chip>
                {d.menu_id && <Chip href={`/menu/${d.menu_id}`}>{d.menu_nama}</Chip>}
                {d.halaman_id && <Chip href={`/menu/${d.menu_id}?h=${d.halaman_id}`}>{d.halaman_nama}</Chip>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <PoinTerkait kelompok={p.poin_terkait} developer={p.developer} />
      <section>
        <Judul>{t('perubahan.pesanJudul', { n: p.pesan.length })}</Judul>
        <ul className="space-y-2">
          {p.pesan.map((m) => (
            <li key={m.id} className={`${kartu} p-3`}>
              <p className="whitespace-pre-wrap text-sm">{m.pesan}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                <span>{m.user_name ?? '-'}</span>
                <span>{m.tanggal ?? '-'}</span>
                <span className="font-mono">{[m.modul_sumber, m.menu_sumber].filter(Boolean).join(' / ') || t('perubahan.tanpaNama')}</span>
                {m.peta.map((x) => (
                  <Chip key={`${x.modul_id}-${x.menu_id}`} href={x.menu_id ? `/menu/${x.menu_id}` : `/modul/${x.modul_id}`}>
                    {x.modul_nama}
                    {x.menu_nama ? ` / ${x.menu_nama}` : ''}
                  </Chip>
                ))}
                {m.peta.length === 0 && <span className="text-amber-700 dark:text-amber-300">{t('perubahan.belumDipetakanLabel')}</span>}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
