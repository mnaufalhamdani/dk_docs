'use client';

import BadgeStatusUji from './BadgeStatusUji';
import CatatanSel from './CatatanSel';
import { t } from '@/utils/i18n';

/** Bukti sebuah skenario: gambar sebagai pratinjau yang bisa dibuka, berkas lain sebagai tautan. */
function DaftarBukti({ bukti }) {
  // skenario tanpa bukti: tidak ada yang ditampilkan
  if (bukti.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {bukti.map((b) =>
        b.gambar ? (
          <a key={b.nama} href={b.href} target="_blank" rel="noreferrer" title={b.nama}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.href} alt={b.nama} loading="lazy" className="h-20 w-auto rounded border border-line object-cover" />
          </a>
        ) : (
          <a key={b.nama} href={b.href} target="_blank" rel="noreferrer" className="rounded border border-line px-2 py-1 font-mono text-xs text-accent hover:underline">
            {b.nama}
          </a>
        ),
      )}
    </div>
  );
}

/** Satu bagian teks berjudul kecil; tidak dirender bila isinya kosong. */
function Bagian({ judul, isi }) {
  if (!isi) return null;
  return (
    <div>
      <p className="text-xs font-medium text-muted">{judul}</p>
      <p className="whitespace-pre-wrap text-xs">{isi}</p>
    </div>
  );
}

/** Kartu satu skenario: langkah, hasil diharapkan vs aktual, status, catatan, dan bukti. */
export function KartuSkenario({ s, label = null }) {
  return (
    <li className="space-y-2 rounded-md border border-line p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm">
          <span className="mr-2 font-mono text-xs text-muted">{s.kode}</span>
          {s.nama}
        </p>
        <BadgeStatusUji status={s.status} />
      </div>
      <p className="text-xs text-muted">
        {s.tipe} · {s.jenis} · {t('pengujian.putaranKe', { n: s.putaran_nomor })}
        {label && ` · ${label}`}
      </p>
      {s.langkah.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted">{t('pengujian.langkah')}</p>
          <ol className="list-decimal pl-5 text-xs">
            {s.langkah.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ol>
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <Bagian judul={t('pengujian.diharapkan')} isi={s.hasil_diharapkan} />
        <Bagian judul={t('pengujian.aktual')} isi={s.hasil_aktual} />
      </div>
      <Bagian judul={t('pengujian.catatanSkenario')} isi={s.catatan} />
      <DaftarBukti bukti={s.bukti} />
    </li>
  );
}

/** Panel satu sel (poin x repo): riwayat status per putaran dan skenario putaran terbaru. */
export default function PanelSelUji({ judul, panel, pengujianId, poinId, repoId, onTutup }) {
  return (
    <section className="space-y-3 rounded-lg border border-line bg-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-medium">{judul}</h3>
        <button type="button" onClick={onTutup} className="text-xs text-muted hover:text-fg">
          {t('pengujian.tutup')}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted">{t('pengujian.riwayatSel')}:</span>
        {panel.riwayat.map((r) => (
          <span key={r.putaran_nomor} className="flex items-center gap-1">
            <span className="font-mono">P{r.putaran_nomor}</span>
            <BadgeStatusUji status={r.status} />
          </span>
        ))}
      </div>
      {panel.skenario.length === 0 ? (
        <p className="text-xs text-muted">{t('pengujian.belumAdaSkenario')}</p>
      ) : (
        <ul className="space-y-2">
          {panel.skenario.map((s) => (
            <KartuSkenario key={s.id} s={s} />
          ))}
        </ul>
      )}
      <CatatanSel pengujianId={pengujianId} poinId={poinId} repoId={repoId} awal={panel.catatan} />
    </section>
  );
}
