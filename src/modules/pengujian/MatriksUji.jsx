'use client';

import { useState } from 'react';
import BadgeStatusUji from './BadgeStatusUji';
import PanelSelUji from './PanelSelUji';
import { t } from '@/utils/i18n';

/** Nama tampil target: "Modul" atau "Modul / Menu" (repo sudah ada di kolom matriks). */
const labelTarget = (tg) => [tg.modul_nama, tg.menu_nama].filter(Boolean).join(' / ');

/** Sel matriks: tombol status bila repo terlibat pada poin ini, atau "-" bila tidak. */
function SelMatriks({ status, aktif, adaCatatan, onKlik }) {
  // repo tidak terlibat pada poin ini: tidak dihitung dan tidak bisa dibuka
  if (!status) return <span className="text-muted">-</span>;
  return (
    <button type="button" onClick={onKlik} aria-pressed={aktif} className={`rounded p-0.5 ${aktif ? 'ring-2 ring-accent' : 'hover:ring-1 hover:ring-line'}`}>
      <BadgeStatusUji status={status} />
      {adaCatatan && (
        <span title={t('pengujian.adaCatatan')} aria-label={t('pengujian.adaCatatan')} className="ml-1 text-xs text-accent">✎</span>
      )}
    </button>
  );
}

/** Baris matriks: poin (teks dan target), status tiap repo, dan status poin. */
function BarisMatriks({ p, repos, panel, terpilih, onPilih }) {
  return (
    <tr className="align-top">
      <td className="px-3 py-2">
        <p className="whitespace-pre-line text-sm">
          <span className="mr-2 font-mono text-xs text-muted">{p.nomor}.</span>
          {p.isi}
        </p>
        {p.ditambah_putaran > 1 && <p className="text-xs text-muted">{t('pengujian.ditambahPutaran', { n: p.ditambah_putaran })}</p>}
        <ul className="mt-1 flex flex-wrap gap-1">
          {p.target.map((tg) => (
            <li key={`${tg.modul_id}:${tg.menu_id ?? 0}:${tg.repo_id}`} className="rounded-full border border-line bg-accent-soft px-2 py-0.5 text-xs">
              {labelTarget(tg)}
            </li>
          ))}
        </ul>
      </td>
      {repos.map((r) => (
        <td key={r.id} className="px-3 py-2 text-center">
          <SelMatriks status={p.sel[r.id]} aktif={terpilih === `${p.id}:${r.id}`} adaCatatan={Boolean(panel[`${p.id}:${r.id}`]?.catatan)} onKlik={() => onPilih(`${p.id}:${r.id}`)} />
        </td>
      ))}
      <td className="px-3 py-2 text-center">
        <BadgeStatusUji status={p.status} />
      </td>
    </tr>
  );
}

/** Matriks poin x repo; klik sel membuka panel skenario dan riwayat putaran sel itu. */
export default function MatriksUji({ pengujianId, repos, poin, panel }) {
  const [terpilih, setTerpilih] = useState(null);
  const baris = terpilih ? poin.find((p) => terpilih.startsWith(`${p.id}:`)) : null;
  const repo = terpilih ? repos.find((r) => terpilih.endsWith(`:${r.id}`)) : null;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-line bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">{t('pengujian.poin')}</th>
              {repos.map((r) => (
                <th key={r.id} className="px-3 py-2 text-center font-medium">
                  {r.nama}
                </th>
              ))}
              <th className="px-3 py-2 text-center font-medium">{t('pengujian.statusPoin')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {poin.map((p) => (
              <BarisMatriks key={p.id} p={p} repos={repos} panel={panel} terpilih={terpilih} onPilih={(k) => setTerpilih(terpilih === k ? null : k)} />
            ))}
          </tbody>
        </table>
      </div>
      {terpilih && panel[terpilih] && (
        <PanelSelUji key={terpilih} pengujianId={pengujianId} poinId={baris?.id} repoId={repo?.id} judul={`${t('pengujian.poin')} ${baris?.nomor} · ${repo?.nama}`} panel={panel[terpilih]} onTutup={() => setTerpilih(null)} />
      )}
    </div>
  );
}
