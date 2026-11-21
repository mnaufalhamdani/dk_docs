'use client';

import { useState } from 'react';
import { inputDasar, tombolSekunder } from '@/modules/shared/ui';
import { t } from '@/utils/i18n';

/** Nama tampil sebuah target: "Repo · Modul" atau "Repo · Modul / Menu". */
function labelTarget(opsi, tg) {
  const modul = opsi.find((m) => m.id === tg.modul_id);
  const menu = modul?.menu.find((m) => m.id === tg.menu_id);
  const nama = [modul?.nama, menu?.nama].filter(Boolean).join(' / ');
  return modul ? `${modul.repo_nama} · ${nama}` : nama;
}

/** Baris untuk menambah target: pilih modul, lalu menu (opsional; kosong = seluruh modul). */
function TambahTarget({ opsi, onTambah }) {
  const [modulId, setModulId] = useState('');
  const [menuId, setMenuId] = useState('');
  const modul = opsi.find((m) => m.id === modulId);

  /** Menambahkan pilihan lalu mengosongkan kembali kedua pilihan. */
  function tambah() {
    onTambah({ modul_id: modulId, menu_id: menuId || null });
    setModulId('');
    setMenuId('');
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <select aria-label={t('perubahan.modul')} value={modulId} onChange={(e) => { setModulId(e.target.value); setMenuId(''); }} className={`${inputDasar} w-auto text-xs`}>
        <option value="">{t('pengujian.targetPilihModul')}</option>
        {opsi.map((m) => (
          <option key={m.id} value={m.id}>
            {m.repo_nama} · {m.nama}
          </option>
        ))}
      </select>
      <select aria-label={t('menu.judul')} value={menuId} disabled={!modul} onChange={(e) => setMenuId(e.target.value)} className={`${inputDasar} w-auto text-xs`}>
        <option value="">{t('pengujian.targetSeluruhModul')}</option>
        {(modul?.menu ?? []).map((m) => (
          <option key={m.id} value={m.id}>
            {m.nama}
          </option>
        ))}
      </select>
      <button type="button" disabled={!modulId} onClick={tambah} className={tombolSekunder}>
        + {t('pengujian.targetTambah')}
      </button>
    </div>
  );
}

/** Pemilih target satu poin: chip target terpilih (bisa dihapus) dan baris penambah. */
export default function PilihTargetUji({ opsi, target, onUbah }) {
  /** Menambah target bila belum ada yang sama persis. */
  function tambah(baru) {
    // target kembar tidak berguna dan ditolak unique key di database
    if (target.some((x) => x.modul_id === baru.modul_id && x.menu_id === baru.menu_id)) return;
    onUbah([...target, baru]);
  }

  return (
    <div>
      {target.length === 0 ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">{t('pengujian.belumAdaTarget')}</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {target.map((tg, i) => (
            <li key={`${tg.modul_id}:${tg.menu_id ?? 0}`} className="flex items-center gap-1 rounded-full border border-line bg-accent-soft px-2 py-0.5 text-xs">
              {labelTarget(opsi, tg)}
              <button type="button" aria-label={t('umum.hapus')} onClick={() => onUbah(target.filter((_, j) => j !== i))} className="text-muted hover:text-red-600">
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <TambahTarget opsi={opsi} onTambah={tambah} />
    </div>
  );
}
