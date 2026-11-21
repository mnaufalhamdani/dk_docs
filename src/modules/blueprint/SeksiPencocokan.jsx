'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { simpanPencocokanBlueprint } from './blueprint.actions';
import { inputDasar, tombolSekunder, tombolUtama } from '@/modules/shared/ui';
import { t } from '@/utils/i18n';

/** Nama tampil sebuah target (modul / menu / halaman) dari daftar opsi registry. */
function labelTarget(opsi, tg) {
  const modul = opsi.find((m) => m.id === tg.modul_id);
  const menu = modul?.menu.find((m) => m.id === tg.menu_id);
  const halaman = menu?.halaman.find((h) => h.id === tg.halaman_id);
  return [modul?.nama, menu?.nama, halaman?.nama].filter(Boolean).join(' / ');
}

/** Baris untuk menambah target baru: pilih modul, lalu menu dan halaman (opsional). */
function TambahTarget({ opsi, onTambah }) {
  const [modulId, setModulId] = useState('');
  const [menuId, setMenuId] = useState('');
  const [halamanId, setHalamanId] = useState('');
  const modul = opsi.find((m) => String(m.id) === modulId);
  const menu = modul?.menu.find((m) => String(m.id) === menuId);

  /** Menambahkan target terpilih lalu mengosongkan pilihan. */
  function tambah() {
    onTambah({ modul_id: modulId, menu_id: menuId || null, halaman_id: halamanId || null });
    setModulId('');
    setMenuId('');
    setHalamanId('');
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <select aria-label={t('perubahan.modul')} value={modulId} onChange={(e) => { setModulId(e.target.value); setMenuId(''); setHalamanId(''); }} className={`${inputDasar} w-auto text-xs`}>
        <option value="">{t('blueprint.cocokPilihModul')}</option>
        {opsi.map((m) => (
          <option key={m.id} value={m.id}>
            {m.nama}
          </option>
        ))}
      </select>
      <select aria-label={t('menu.judul')} value={menuId} disabled={!modul} onChange={(e) => { setMenuId(e.target.value); setHalamanId(''); }} className={`${inputDasar} w-auto text-xs`}>
        <option value="">{t('blueprint.cocokPilihMenu')}</option>
        {(modul?.menu ?? []).map((m) => (
          <option key={m.id} value={m.id}>
            {m.nama}
          </option>
        ))}
      </select>
      <select aria-label={t('impor.halaman')} value={halamanId} disabled={!menu} onChange={(e) => setHalamanId(e.target.value)} className={`${inputDasar} w-auto text-xs`}>
        <option value="">{t('blueprint.cocokPilihHalaman')}</option>
        {(menu?.halaman ?? []).map((h) => (
          <option key={h.id} value={h.id}>
            {h.nama}
          </option>
        ))}
      </select>
      <button type="button" disabled={!modulId} onClick={tambah} className={tombolSekunder}>
        + {t('blueprint.cocokTambah')}
      </button>
    </div>
  );
}

/** Langkah 2: chip saran modul/menu/halaman per poin; bisa dihapus, diganti pemilik, atau ditambah. */
export default function SeksiPencocokan({ blueprintId, poin, opsi }) {
  const router = useRouter();
  const [pending, mulai] = useTransition();
  const [error, setError] = useState('');
  const awal = Object.fromEntries(poin.map((p) => [p.nomor, p.target.map((x) => ({ modul_id: x.modul_id, menu_id: x.menu_id, halaman_id: x.halaman_id, peran: x.peran }))]));
  const [target, setTarget] = useState(awal);
  const kotor = JSON.stringify(target) !== JSON.stringify(awal);

  /** Menjadikan satu modul sebagai pemilik poin; modul lain otomatis terkait. */
  function jadikanPemilik(nomor, modulId) {
    setTarget((s) => ({ ...s, [nomor]: s[nomor].map((x) => ({ ...x, peran: x.modul_id === modulId ? 'pemilik' : 'terkait' })) }));
  }

  /** Menambah target; bila poin belum punya target, otomatis menjadi pemilik. */
  function tambah(nomor, baru) {
    setTarget((s) => {
      const ada = s[nomor] ?? [];
      const peran = ada.length === 0 ? 'pemilik' : (ada.find((x) => x.modul_id === baru.modul_id)?.peran ?? 'terkait');
      return { ...s, [nomor]: [...ada, { ...baru, peran }] };
    });
  }

  /** Menghapus satu target; bila pemiliknya hilang, modul pertama yang tersisa menjadi pemilik. */
  function hapus(nomor, idx) {
    setTarget((s) => {
      const sisa = s[nomor].filter((_, i) => i !== idx);
      const adaPemilik = sisa.some((x) => x.peran === 'pemilik');
      // pemilik terhapus: angkat modul pertama yang tersisa
      const hasil = adaPemilik || sisa.length === 0 ? sisa : sisa.map((x) => ({ ...x, peran: x.modul_id === sisa[0].modul_id ? 'pemilik' : 'terkait' }));
      return { ...s, [nomor]: hasil };
    });
  }

  /** Mengirim seluruh pencocokan; kelompok akan disusun ulang. */
  function simpan() {
    setError('');
    const kirim = poin.flatMap((p) => (target[p.nomor] ?? []).map((x) => ({ nomor: p.nomor, ...x })));
    mulai(async () => {
      const hasil = await simpanPencocokanBlueprint({ id: blueprintId, target: kirim });
      if (!hasil.ok) return setError(hasil.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">{t('blueprint.cocokHint')}</p>
      <ul className="space-y-2">
        {poin.map((p) => (
          <li key={p.id} className="rounded-md border border-line bg-panel p-3">
            <p className="text-sm">
              <span className="mr-1 text-muted">{p.nomor}.</span>
              {p.isi.length > 200 ? `${p.isi.slice(0, 197)}...` : p.isi}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {(target[p.nomor] ?? []).length === 0 && <span className="text-xs text-amber-700 dark:text-amber-300">{t('blueprint.cocokTanpa')}</span>}
              {(target[p.nomor] ?? []).map((x, idx) => (
                <span key={`${x.modul_id}-${x.menu_id}-${x.halaman_id}`} className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs ${x.peran === 'pemilik' ? 'bg-accent-soft text-accent' : 'border border-line text-muted'}`}>
                  {labelTarget(opsi, x)}
                  <button type="button" title={t('blueprint.cocokToggle')} onClick={() => jadikanPemilik(p.nomor, x.modul_id)} className="rounded px-1 text-[10px] uppercase hover:bg-accent-soft">
                    {t(`blueprint.cocok${x.peran === 'pemilik' ? 'Pemilik' : 'Terkait'}`)}
                  </button>
                  <button type="button" aria-label={t('blueprint.cocokHapus')} onClick={() => hapus(p.nomor, idx)} className="px-0.5 hover:text-red-600">
                    ×
                  </button>
                </span>
              ))}
            </div>
            <TambahTarget opsi={opsi} onTambah={(baru) => tambah(p.nomor, baru)} />
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <button type="button" onClick={simpan} disabled={pending || !kotor} className={tombolUtama}>
          {pending ? t('umum.memproses') : t('blueprint.cocokSimpan')}
        </button>
        {kotor && <span className="text-xs text-muted">{t('editor.belumDisimpan')}</span>}
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
