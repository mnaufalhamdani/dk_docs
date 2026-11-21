'use client';

import { buatItem, gabungDenganBerikutnya, pecahPerBaris, pindah } from './pengujian.poin';
import PilihTargetUji from './PilihTargetUji';
import { inputDasar, tombolSekunder } from '@/modules/shared/ui';
import { t } from '@/utils/i18n';

/** Tombol kecil aksi poin (naik, turun, gabung, pecah, hapus). */
function TombolKecil({ onClick, disabled, children, label }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className={`${tombolSekunder} px-2 py-0.5 text-xs`}>
      {children}
    </button>
  );
}

/** Satu poin: nomor, isi yang bisa diedit, aksi urut/gabung/pecah/hapus, dan pemilih target. */
function BarisPoin({ poin, idx, total, opsi, onUbahDaftar, daftar }) {
  /** Mengubah satu bagian poin ini tanpa menyentuh poin lain. */
  const ubah = (bagian) => onUbahDaftar(daftar.map((p, i) => (i === idx ? { ...p, ...bagian } : p)));
  return (
    <li className="space-y-2 rounded-lg border border-line bg-panel p-3">
      <div className="flex items-start gap-2">
        <span className="mt-1 w-6 shrink-0 text-right font-mono text-xs text-muted">{idx + 1}</span>
        <textarea value={poin.isi} onChange={(e) => ubah({ isi: e.target.value })} rows={Math.min(6, Math.max(2, poin.isi.split('\n').length))} className={`${inputDasar} text-xs`} aria-label={`${t('pengujian.poin')} ${idx + 1}`} />
        <div className="flex shrink-0 flex-col gap-1">
          <TombolKecil label={t('pengujian.naikkan')} disabled={idx === 0} onClick={() => onUbahDaftar(pindah(daftar, idx, -1))}>↑</TombolKecil>
          <TombolKecil label={t('pengujian.turunkan')} disabled={idx === total - 1} onClick={() => onUbahDaftar(pindah(daftar, idx, 1))}>↓</TombolKecil>
        </div>
      </div>
      <div className="ml-8 space-y-2">
        <PilihTargetUji opsi={opsi} target={poin.target} onUbah={(target) => ubah({ target })} />
        <div className="flex flex-wrap gap-2">
          <TombolKecil label={t('pengujian.gabung')} disabled={idx === total - 1} onClick={() => onUbahDaftar(gabungDenganBerikutnya(daftar, idx))}>{t('pengujian.gabung')}</TombolKecil>
          <TombolKecil label={t('pengujian.pecahBaris')} disabled={poin.isi.split('\n').filter((b) => b.trim()).length < 2} onClick={() => onUbahDaftar(pecahPerBaris(daftar, idx))}>{t('pengujian.pecahBaris')}</TombolKecil>
          <TombolKecil label={t('pengujian.hapusPoin')} onClick={() => onUbahDaftar(daftar.filter((_, i) => i !== idx))}>{t('umum.hapus')}</TombolKecil>
        </div>
      </div>
    </li>
  );
}

/** Daftar poin yang bisa diedit, digabung, dipecah, diurutkan, dihapus, dan ditambah manual. */
export default function EditorPoinUji({ poin, opsi, onUbah }) {
  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {poin.map((p, i) => (
          <BarisPoin key={p.kunci} poin={p} idx={i} total={poin.length} opsi={opsi} daftar={poin} onUbahDaftar={onUbah} />
        ))}
      </ul>
      <button type="button" onClick={() => onUbah([...poin, buatItem('')])} className={tombolSekunder}>
        + {t('pengujian.tambahPoin')}
      </button>
    </div>
  );
}
