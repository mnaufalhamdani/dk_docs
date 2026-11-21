import BadgeStatusUji from './BadgeStatusUji';
import { t } from '@/utils/i18n';

/** Urutan tampil hitungan status skenario. */
const URUTAN_SKENARIO = ['PASS', 'FAIL', 'BLOCKED', 'NOT_EXECUTED'];

/** Hitungan skenario per status. */
function HitunganSkenario({ hitungan }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      {URUTAN_SKENARIO.map((s) => (
        <span key={s} className="flex items-center gap-1">
          <BadgeStatusUji status={s} />
          <span className="font-mono">{hitungan[s]}</span>
        </span>
      ))}
    </div>
  );
}

/** Daftar skenario hasil uji (ringkas). */
function TabelSkenario({ skenario }) {
  return (
    <div className="overflow-x-auto rounded-md border border-line">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-line text-muted">
          <tr>
            <th className="px-2 py-1.5 font-medium">{t('pengujian.kolomKode')}</th>
            <th className="px-2 py-1.5 font-medium">{t('pengujian.poin')}</th>
            <th className="px-2 py-1.5 font-medium">{t('pengujian.kolomNama')}</th>
            <th className="px-2 py-1.5 font-medium">{t('pengujian.kolomTipeJenis')}</th>
            <th className="px-2 py-1.5 font-medium">{t('pengujian.kolomStatusSkenario')}</th>
            <th className="px-2 py-1.5 font-medium">{t('pengujian.kolomBukti')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {skenario.map((s) => (
            <tr key={s.kode}>
              <td className="px-2 py-1.5 font-mono">{s.kode}</td>
              <td className="px-2 py-1.5">{s.poin ?? '-'}</td>
              <td className="px-2 py-1.5">{s.nama}</td>
              <td className="px-2 py-1.5">{s.tipe} / {s.jenis}</td>
              <td className="px-2 py-1.5">
                <BadgeStatusUji status={s.status} />
              </td>
              <td className="px-2 py-1.5">{s.jumlah_bukti}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Ringkasan analisis perubahan per kategori beserta butirnya. */
function RingkasAnalisis({ analisis }) {
  // JSON tanpa analisis perubahan: bagian tidak ditampilkan
  if (analisis.length === 0) return null;
  return (
    <section className="space-y-1">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{t('pengujian.analisisJudul')}</h3>
      <ul className="space-y-1 text-xs">
        {analisis.map((a, i) => (
          <li key={i}>
            <span className="mr-1 rounded bg-accent-soft px-1.5 py-0.5 font-medium">{t(`pengujian.kategori.${a.kategori}`)}</span>
            {a.poin !== null && <span className="mr-1 text-muted">{t('pengujian.poin')} {a.poin}:</span>}
            {a.ringkasan}
            {a.file.length > 0 && <span className="ml-1 font-mono text-muted">({a.file.join(', ')})</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Pernyataan tools yang belum tersedia menurut agen. */
function RingkasTools({ tools }) {
  // agen menyatakan semua tools tersedia
  if (tools.length === 0) return <p className="text-xs text-muted">{t('pengujian.semuaToolsAda')}</p>;
  return (
    <ul className="list-disc space-y-0.5 pl-5 text-xs">
      {tools.map((x) => (
        <li key={x.nama}>
          <span className="font-medium">{x.nama}</span>
          {x.dibutuhkan_untuk && <span> · {x.dibutuhkan_untuk}</span>}
          {x.saran_pemasangan && <span className="text-muted"> · {x.saran_pemasangan}</span>}
        </li>
      ))}
    </ul>
  );
}

/** Pratinjau hasil uji sebelum disimpan: hitungan, skenario, analisis, tools, dan peringatan. */
export default function PratinjauHasilUji({ data }) {
  return (
    <div className="space-y-4 rounded-lg border border-line bg-panel p-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">
          {data.cr_id} · {t('pengujian.putaranKe', { n: data.putaran })} · {data.repo.nama}
        </p>
        <p className="font-mono text-xs text-muted">
          {data.branch ?? '-'} · {data.hash_head ?? '-'}
        </p>
      </div>
      {data.peringatan.length > 0 && (
        <ul className="list-disc space-y-0.5 rounded-md border border-amber-300 bg-amber-50 py-2 pl-7 pr-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          {data.peringatan.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      <HitunganSkenario hitungan={data.hitungan} />
      <TabelSkenario skenario={data.skenario} />
      <RingkasAnalisis analisis={data.analisis} />
      <section className="space-y-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{t('pengujian.toolsBelumJudul')}</h3>
        <RingkasTools tools={data.tools_belum_tersedia} />
      </section>
    </div>
  );
}
