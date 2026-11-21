import Link from 'next/link';
import { ambilDep } from '@/di/container';
import { muat } from '@/utils/muat';
import HeaderHalaman from '@/modules/shared/HeaderHalaman';
import TabPrompt from '@/modules/prompt/TabPrompt';
import { tombolSekunder, tombolUtama } from '@/modules/shared/ui';
import BadgeStatusUji from './BadgeStatusUji';
import MatriksUji from './MatriksUji';
import PanelPdf from './PanelPdf';
import { KartuSkenario } from './PanelSelUji';
import { t } from '@/utils/i18n';

/** Urutan tampil hitungan status poin. */
const URUTAN_STATUS = ['PASS', 'FAIL', 'BLOCKED', 'BELUM'];

/** Pengingat tools umum per repo yang terlibat; agent yang memastikan ketersediaannya saat eksekusi. */
function PengingatTools({ tools }) {
  // belum ada repo pada putaran ini: tidak ada yang diingatkan
  if (tools.length === 0) return null;
  return (
    <section className="space-y-2 rounded-lg border border-line bg-panel p-3">
      <h2 className="text-sm font-medium">{t('pengujian.toolsJudul')}</h2>
      <p className="text-xs text-muted">{t('pengujian.toolsHint')}</p>
      <ul className="space-y-2 text-xs">
        {tools.map((r) => (
          <li key={r.repo_nama}>
            <span className="font-medium">{r.repo_nama}</span>
            <ul className="ml-4 list-disc">
              {r.tools.map((x) => (
                <li key={x.kunci}>
                  <span className="font-medium">{x.nama}:</span> {x.tools}. <span className="text-muted">{x.executor}.</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Bagian "di luar blueprint": skenario tanpa poin dan analisis perubahan berkategori outside/risky. */
function LuarBlueprint({ luar }) {
  // tidak ada skenario maupun analisis di luar blueprint: bagian disembunyikan
  if (luar.skenario.length === 0 && luar.analisis.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium">{t('pengujian.luarJudul')}</h2>
      {luar.analisis.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-line bg-panel p-3 text-xs">
          {luar.analisis.map((a) => (
            <li key={a.id}>
              <span className="mr-1 rounded bg-accent-soft px-1.5 py-0.5 font-medium">{t(`pengujian.kategori.${a.kategori}`)}</span>
              <span className="mr-1 text-muted">
                P{a.putaran_nomor} · {a.repo_nama}:
              </span>
              {a.ringkasan}
              {a.file.length > 0 && <span className="ml-1 font-mono text-muted">({a.file.join(', ')})</span>}
            </li>
          ))}
        </ul>
      )}
      {luar.skenario.length > 0 && (
        <ul className="space-y-2">
          {luar.skenario.map((s) => (
            <KartuSkenario key={s.id} s={s} label={s.repo_nama} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** Riwayat putaran: nomor, tanggal, repo yang sudah diimpor beserta hash HEAD, dan pernyataan tools. */
function RiwayatPutaran({ riwayat }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium">{t('pengujian.riwayatJudul')}</h2>
      <ul className="space-y-2">
        {riwayat.map((u) => (
          <li key={u.id} className="space-y-1 rounded-lg border border-line bg-panel p-3 text-xs">
            <p>
              <span className="font-medium">{t('pengujian.putaranKe', { n: u.nomor })}</span>
              <span className="ml-2 font-mono text-muted">{u.unique_id}</span>
              <span className="ml-2 text-muted">{u.created_at}</span>
            </p>
            <ul className="space-y-1">
              {u.repo.map((r) => (
                <li key={r.repo_nama}>
                  <span className="font-medium">{r.repo_nama}</span>
                  <span className="ml-2 text-muted">{r.diimpor_pada ? t('pengujian.diimporPada', { waktu: r.diimpor_pada }) : t('pengujian.belumDiimpor')}</span>
                  {r.hash_head && <span className="ml-2 font-mono text-muted">{r.hash_head}</span>}
                  {r.tools_belum_tersedia.length > 0 && (
                    <p className="ml-4 text-amber-700 dark:text-amber-300">
                      {t('pengujian.toolsBelumJudul')}: {r.tools_belum_tersedia.map((x) => x.nama).join(', ')}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Halaman detail Uji CR: matriks poin x repo, di luar blueprint, riwayat putaran, dan prompt putaran terakhir. */
export default async function HalamanPengujian({ id }) {
  const d = await muat(() => ambilDep().pengujianController.detail(id));
  return (
    <div className="space-y-5">
      <HeaderHalaman
        breadcrumb={[{ nama: t('pengujian.judul'), href: '/pengujian' }]}
        judul={d.cr_id}
        sub={
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span>{t('pengujian.jumlahPoin', { n: d.poin.length })}</span>
            {d.putaran_terakhir && <span>{t('pengujian.putaranKe', { n: d.putaran_terakhir.nomor })}</span>}
            {URUTAN_STATUS.filter((s) => d.hitungan[s] > 0).map((s) => (
              <span key={s} className="flex items-center gap-1">
                <BadgeStatusUji status={s} />
                <span className="font-mono">{d.hitungan[s]}</span>
              </span>
            ))}
          </p>
        }
        aksi={
          <>
            <Link href={`/pengujian/${d.id}/ulang`} className={tombolSekunder}>
              {t('pengujian.ujiUlang')}
            </Link>
            <Link href={`/pengujian/${d.id}/impor`} className={tombolUtama}>
              {t('pengujian.imporJudul')}
            </Link>
          </>
        }
      />
      <section className="space-y-2">
        <h2 className="text-sm font-medium">{t('pengujian.matriksJudul')}</h2>
        <p className="text-xs text-muted">{t('pengujian.matriksHint')}</p>
        <MatriksUji pengujianId={d.id} repos={d.repos} poin={d.poin} panel={d.panel} />
      </section>
      <LuarBlueprint luar={d.luar} />
      <RiwayatPutaran riwayat={d.riwayat} />
      <PanelPdf pengujianId={d.id} pdf={d.pdf} />
      <section className="space-y-3">
        <h2 className="text-sm font-medium">{t('pengujian.promptJudul', { n: d.putaran_terakhir?.nomor ?? '-' })}</h2>
        <PengingatTools tools={d.tools} />
        {d.sesi.length === 0 ? <p className="text-sm text-muted">{t('pengujian.belumAdaPrompt')}</p> : <TabPrompt sesi={d.sesi} />}
      </section>
    </div>
  );
}
