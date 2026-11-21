'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { buatUjiUlang } from './pengujian.actions';
import { poinLengkap } from './pengujian.poin';
import EditorPoinUji from './EditorPoinUji';
import BadgeStatusUji from './BadgeStatusUji';
import { tombolSekunder, tombolUtama } from '@/modules/shared/ui';
import { t } from '@/utils/i18n';

/** Kunci pilihan sel. */
const kunci = (poinId, repoId) => `${poinId}:${repoId}`;

/** Semua sel yang terlibat; bila `hanyaBelumPass`, hanya yang statusnya bukan PASS. */
function kumpulkanSel(poin, hanyaBelumPass) {
  return poin.flatMap((p) =>
    Object.entries(p.sel)
      .filter(([, status]) => !hanyaBelumPass || status !== 'PASS')
      .map(([repoId]) => kunci(p.id, repoId)),
  );
}

/** Satu sel pada tabel pemilih: kotak centang beserta status saat ini, atau "-" bila repo tak terlibat. */
function SelPilih({ status, dipilih, onUbah }) {
  // repo tidak terlibat pada poin ini: tidak ada yang bisa dipilih
  if (!status) return <span className="text-muted">-</span>;
  return (
    <label className="flex cursor-pointer items-center justify-center gap-1.5">
      <input type="checkbox" checked={dipilih} onChange={onUbah} />
      <BadgeStatusUji status={status} />
    </label>
  );
}

/** Tabel pemilih sel uji ulang (poin x repo). */
function TabelPilih({ poin, repos, dipilih, onUbah }) {
  return (
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
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {poin.map((p) => (
            <tr key={p.id}>
              <td className="px-3 py-2 text-sm">
                <span className="mr-2 font-mono text-xs text-muted">{p.nomor}.</span>
                <span className="whitespace-pre-line">{p.isi}</span>
              </td>
              {repos.map((r) => (
                <td key={r.id} className="px-3 py-2 text-center">
                  <SelPilih status={p.sel[r.id]} dipilih={dipilih.has(kunci(p.id, r.id))} onUbah={() => onUbah(kunci(p.id, r.id))} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Form uji ulang: pilih sel (poin x repo) yang diuji ulang (yang belum PASS tercentang bawaan, sel PASS boleh
 * dicentang untuk regresi) dan/atau tambah poin baru, lalu buat putaran berikutnya beserta prompt per repo.
 */
export default function FormUjiUlang({ pengujianId, poin, repos, opsi }) {
  const router = useRouter();
  const [pending, mulai] = useTransition();
  const [error, setError] = useState('');
  const [dipilih, setDipilih] = useState(() => new Set(kumpulkanSel(poin, true)));
  const [poinBaru, setPoinBaru] = useState([]);

  /** Mencentang atau membatalkan satu sel. */
  function ubahSel(k) {
    const salinan = new Set(dipilih);
    // sel sudah terpilih: batalkan; selain itu tambahkan
    if (salinan.has(k)) salinan.delete(k);
    else salinan.add(k);
    setDipilih(salinan);
  }

  /** Membuat putaran baru; gagal -> pesan, pilihan dan poin baru dipertahankan. */
  function kirim() {
    setError('');
    const sel = [...dipilih].map((k) => {
      const [poin_id, repo_id] = k.split(':');
      return { poin_id, repo_id };
    });
    mulai(async () => {
      const hasil = await buatUjiUlang({ pengujian_id: pengujianId, sel, poin_baru: poinBaru.map((p) => ({ isi: p.isi, target: p.target })) });
      if (!hasil.ok) return setError(hasil.error);
      router.push(hasil.data.href);
    });
  }

  const adaYangDiuji = dipilih.size > 0 || poinBaru.length > 0;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={tombolSekunder} onClick={() => setDipilih(new Set(kumpulkanSel(poin, true)))}>
          {t('pengujian.hanyaBelumPass')}
        </button>
        <button type="button" className={tombolSekunder} onClick={() => setDipilih(new Set(kumpulkanSel(poin, false)))}>
          {t('pengujian.pilihSemua')}
        </button>
        <button type="button" className={tombolSekunder} onClick={() => setDipilih(new Set())}>
          {t('pengujian.kosongkan')}
        </button>
        <span className="self-center text-xs text-muted">{t('pengujian.selDipilih', { n: dipilih.size })}</span>
      </div>
      <TabelPilih poin={poin} repos={repos} dipilih={dipilih} onUbah={ubahSel} />
      <section className="space-y-2">
        <h2 className="text-sm font-medium">{t('pengujian.poinBaruJudul')}</h2>
        <p className="text-xs text-muted">{t('pengujian.poinBaruHint')}</p>
        <EditorPoinUji poin={poinBaru} opsi={opsi} onUbah={setPoinBaru} />
      </section>
      {error && (
        <p role="alert" className="whitespace-pre-wrap rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      <button type="button" onClick={kirim} disabled={pending || !adaYangDiuji || !poinLengkap(poinBaru)} className={tombolUtama}>
        {pending ? t('umum.memproses') : t('pengujian.buatPutaran')}
      </button>
    </div>
  );
}
