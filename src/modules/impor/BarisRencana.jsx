'use client';

import { inputDasar } from '@/modules/shared/ui';
import { periksaPoin } from '@/modules/shared/poin.util';
import { t } from '@/utils/i18n';

/** Warna badge operasi poin. */
const WARNA_OP = {
  tambah: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  ubah: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  hapus: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
};

/** Tombol kecil batalkan / pulihkan sebuah item rencana. */
export function TombolBatal({ batal, onClick }) {
  return (
    <button type="button" onClick={onClick} className="rounded px-1.5 py-0.5 text-xs text-muted hover:bg-accent-soft hover:text-fg">
      {batal ? t('impor.pulihkan') : t('impor.batalkan')}
    </button>
  );
}

/** Pemilih sasaran poin lama untuk operasi ubah/hapus (dan opsi menjadikannya poin baru untuk ubah). */
function PilihSasaran({ poin, onUbah }) {
  /** Menerapkan pilihan: id poin lama, atau "baru" untuk mengubahnya menjadi poin tambahan. */
  function pilih(nilai) {
    if (nilai === 'baru') return onUbah({ op: 'tambah', poin_id: null, perlu_pilih: false, tautan: [] });
    const kand = poin.kandidat.find((k) => String(k.id) === nilai);
    onUbah({ poin_id: kand ? kand.id : null, teks_lama: kand ? kand.isi : null, perlu_pilih: !kand, tautan: kand?.tautan ?? [] });
  }
  return (
    <select aria-label={t('impor.sasaran')} value={poin.poin_id ?? ''} onChange={(e) => pilih(e.target.value)} className={`${inputDasar} text-xs`}>
      <option value="">{t('impor.pilihPoinLama')}</option>
      {poin.kandidat.map((k) => (
        <option key={k.id} value={k.id}>
          {k.isi.length > 90 ? `${k.isi.slice(0, 87)}...` : k.isi}
        </option>
      ))}
      {poin.op === 'ubah' && <option value="baru">{t('impor.jadikanPoinBaru')}</option>}
    </select>
  );
}

/**
 * Keterangan tautan CR/B pada satu operasi poin:
 * - sinkron_modul: badge "Sudah berubah dari kode terbaru" + nomor CR/B bila poin lama bertautan (aktif);
 *   poin pending dilewati.
 * - usulan_perubahan: tombol Pending / Aktifkan kembali untuk poin yang ditambah/diubah (berlaku saat Simpan).
 */
function KeteranganTautan({ poin, redup, onUbah }) {
  const aktif = (poin.tautan ?? []).filter((x) => x.status === 'aktif');
  const sinkron = poin.jenis_impor === 'sinkron_modul' && poin.op !== 'tambah';
  const usulan = poin.jenis_impor === 'usulan_perubahan' && poin.op !== 'hapus';
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {/* poin pending tidak ikut dibandingkan dengan kode saat sinkron */}
      {sinkron && poin.dilewati_pending && <span className="text-muted">{t('impor.pendingDilewati')}</span>}
      {sinkron && aktif.length > 0 && (
        <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
          {t('tautan.sudahBerubah')}: {aktif.map((x) => x.nomor).join(', ')}
        </span>
      )}
      {usulan && !redup && (
        <button type="button" aria-pressed={poin.pending} onClick={() => onUbah({ pending: !poin.pending })} className="rounded border border-line px-1.5 py-0.5 text-muted hover:bg-accent-soft hover:text-fg">
          {poin.pending ? t('tautan.aktifkanKembali') : t('tautan.pending')}
        </button>
      )}
      {usulan && poin.pending && <span className="text-muted">{t('impor.pendingAkanDisimpan')}</span>}
    </div>
  );
}

/** Satu operasi poin pada halaman: diff berwarna, bisa diedit atau dibatalkan. */
export function BarisPoin({ poin, batas, mati, onUbah }) {
  const cek = poin.op === 'hapus' ? null : periksaPoin(poin.isi, batas);
  const redup = mati || poin.batal;
  return (
    <li className={`rounded-md border border-line bg-panel p-2 ${redup ? 'opacity-50' : ''}`}>
      <div className="flex items-start gap-2">
        <span className={`mt-1 rounded px-1.5 py-0.5 text-[11px] font-medium ${WARNA_OP[poin.op]}`}>{t(`impor.op.${poin.op}`)}</span>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[11px] uppercase tracking-wide text-muted">{t(`bagian.${poin.bagian}`)}</p>
          {poin.op !== 'tambah' && (
            <p className="text-sm text-red-700 line-through dark:text-red-300">{poin.teks_lama ?? poin.teks_dari}</p>
          )}
          {poin.op !== 'hapus' && (
            <textarea
              aria-label={t('editor.isiPoin')}
              value={poin.isi}
              disabled={redup}
              rows={Math.max(1, Math.ceil(poin.isi.length / 80))}
              onChange={(e) => onUbah({ isi: e.target.value })}
              className={`${inputDasar} resize-none`}
            />
          )}
          {poin.op !== 'tambah' && !poin.batal && !mati && <PilihSasaran poin={poin} onUbah={onUbah} />}
          <KeteranganTautan poin={poin} redup={redup} onUbah={onUbah} />
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {poin.duplikat && <span className="text-muted">{t('impor.duplikat')}</span>}
            {poin.duplikat_pending && <span className="text-muted">{t('impor.duplikatPending')}</span>}
            {poin.mirip && poin.poin_id && <span className="text-muted">{t('impor.cocokMirip')}</span>}
            {cek?.peringatan && !redup && (
              <span role="status" className="text-amber-700 dark:text-amber-300">
                {cek.terlaluPanjang ? t('editor.terlaluPanjang') : t('editor.terlaluBanyakKalimat', { n: batas.kalimat })} ({cek.panjang}/{batas.karakter})
              </span>
            )}
          </div>
        </div>
        <button type="button" onClick={() => onUbah({ batal: !poin.batal })} className="rounded px-1.5 py-0.5 text-xs text-muted hover:bg-accent-soft hover:text-fg">
          {poin.batal ? t('impor.pulihkan') : t('impor.buang')}
        </button>
      </div>
    </li>
  );
}

/** Satu dependensi (bergantung_pada): pilih tautkan / daftarkan stub / abaikan. */
export function BarisDependensi({ dep, opsi, mati, onUbah }) {
  const semua = [...dep.kandidat, ...opsi[dep.tingkat].filter((o) => !dep.kandidat.some((k) => k.id === o.id))];
  return (
    <li className={`rounded-md border border-line bg-bg p-2 text-sm ${mati ? 'opacity-50' : ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{dep.nama}</span>
        {dep.route && <span className="font-mono text-xs text-muted">{dep.route}</span>}
        {dep.otomatis && <span className="text-xs text-muted">{t('impor.dikenali')}</span>}
        <select aria-label={t('impor.dependensi')} value={dep.pilihan} disabled={mati} onChange={(e) => onUbah({ pilihan: e.target.value })} className={`${inputDasar} ml-auto w-auto text-xs`}>
          <option value="tautkan">{t('impor.tautkan')}</option>
          <option value="stub">{t('impor.stub')}</option>
          <option value="abaikan">{t('impor.abaikan')}</option>
        </select>
        {dep.pilihan === 'tautkan' && (
          <select aria-label={t('impor.target')} value={dep.target_id ?? ''} disabled={mati} onChange={(e) => onUbah({ target_id: e.target.value || null })} className={`${inputDasar} w-auto max-w-xs text-xs`}>
            <option value="">{t('impor.pilihTarget')}</option>
            {semua.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        )}
      </div>
      {dep.keterangan && <p className="mt-1 text-xs text-muted">{dep.keterangan}</p>}
    </li>
  );
}
