'use client';

import { DAFTAR_BAGIAN } from '@/enums';
import { periksaPoin } from '@/modules/shared/poin.util';
import { inputDasar } from '@/modules/shared/ui';
import { BarisDependensi, BarisPoin, TombolBatal } from './BarisRencana';
import { t } from '@/utils/i18n';

/** Warna badge aksi entitas. */
const WARNA_AKSI = {
  baru: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  ubah: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  hapus: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
};

/** Aksi efektif yang ditampilkan: ditentukan dari kondisi registry (ada/tidak), kecuali hapus. */
function aksiTampil(node) {
  if (node.aksi === 'hapus') return 'hapus';
  return node.ada ? 'ubah' : 'baru';
}

/** Kepala kartu: nama, kode, badge aksi, dan tombol batal. */
function KepalaKartu({ judul, node, mati, onUbah, ekstra }) {
  const aksi = aksiTampil(node);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${WARNA_AKSI[aksi]}`}>{t(`impor.aksi.${aksi}`)}</span>
      <span className="font-medium">{node.nama}</span>
      <span className="font-mono text-xs text-muted">{node.kode}</span>
      {ekstra}
      <span className="ml-auto">{!mati && <TombolBatal batal={node.batal} onClick={() => onUbah(node.kunci, { batal: !node.batal })} />}</span>
      <span className="sr-only">{judul}</span>
    </div>
  );
}

/** Daftar dependensi satu entitas (disembunyikan bila kosong). */
function DaftarDependensi({ deps, opsi, mati, onUbah }) {
  // tidak ada bergantung_pada: tidak perlu menampilkan apa pun
  if (deps.length === 0) return null;
  return (
    <div className="mt-2 space-y-1">
      <p className="text-[11px] uppercase tracking-wide text-muted">{t('impor.dependensi')}</p>
      <ul className="space-y-1">
        {deps.map((d) => (
          <BarisDependensi key={d.kunci} dep={d} opsi={opsi} mati={mati} onUbah={(patch) => onUbah(d.kunci, patch)} />
        ))}
      </ul>
    </div>
  );
}

/** Poin halaman: yang melewati batas ditampilkan lebih dulu, lalu sisanya sesuai urutan. */
function urutkanPoin(poin, batas) {
  const berat = (p) => (p.op !== 'hapus' && periksaPoin(p.isi, batas).peringatan ? 0 : 1);
  return [...poin].sort((a, b) => berat(a) - berat(b));
}

/** Kartu satu halaman beserta operasi poin dan tombol tambah poin. */
function KartuHalaman({ halaman, batas, opsi, mati, onUbah, onTambahPoin }) {
  const redup = mati || halaman.batal;
  return (
    <div className={`rounded-md border border-line bg-bg p-3 ${redup ? 'opacity-60' : ''}`}>
      <KepalaKartu judul={t('impor.halaman')} node={halaman} mati={mati} onUbah={onUbah} ekstra={<span className="text-xs text-muted">{t(`jenis.${halaman.jenis}`)}</span>} />
      {halaman.aksi === 'hapus' && <p className="mt-1 text-xs text-red-700 dark:text-red-300">{t('impor.peringatanHapusHalaman')}</p>}
      {halaman.aksi !== 'hapus' && (
        <>
          <ul className="mt-2 space-y-2">
            {urutkanPoin(halaman.poin, batas).map((p) => (
              <BarisPoin key={p.kunci} poin={p} batas={batas} mati={redup} onUbah={(patch) => onUbah(p.kunci, patch)} />
            ))}
          </ul>
          {!redup && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <select aria-label={t('impor.bagianPoinBaru')} defaultValue="" onChange={(e) => { if (e.target.value) { onTambahPoin(halaman.kunci, e.target.value); e.target.value = ''; } }} className={`${inputDasar} w-auto text-xs`}>
                <option value="">+ {t('editor.tambahPoin')}...</option>
                {DAFTAR_BAGIAN.map((b) => (
                  <option key={b} value={b}>
                    {t(`bagian.${b}`)}
                  </option>
                ))}
              </select>
            </div>
          )}
          <DaftarDependensi deps={halaman.dependensi} opsi={opsi} mati={redup} onUbah={onUbah} />
        </>
      )}
    </div>
  );
}

/** Kartu satu menu beserta halaman-halamannya. */
function KartuMenu({ menu, batas, opsi, mati, onUbah, onTambahPoin }) {
  const redup = mati || menu.batal;
  return (
    <div className={`rounded-lg border border-line bg-panel p-3 ${redup ? 'opacity-60' : ''}`}>
      <KepalaKartu judul={t('impor.menu')} node={menu} mati={mati} onUbah={onUbah} ekstra={menu.route ? <span className="font-mono text-xs text-muted">{menu.route}</span> : null} />
      {menu.ringkasan && <p className="mt-1 text-xs text-muted">{menu.ringkasan}</p>}
      {menu.aksi === 'hapus' && <p className="mt-1 text-xs text-red-700 dark:text-red-300">{t('impor.peringatanHapusMenu')}</p>}
      {menu.aksi !== 'hapus' && (
        <>
          <DaftarDependensi deps={menu.dependensi} opsi={opsi} mati={redup} onUbah={onUbah} />
          <div className="mt-3 space-y-3">
            {menu.halaman.map((h) => (
              <KartuHalaman key={h.kunci} halaman={h} batas={batas} opsi={opsi} mati={redup} onUbah={onUbah} onTambahPoin={onTambahPoin} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Kartu satu modul beserta menu-menunya. */
export default function KartuModul({ modul, batas, opsi, onUbah, onTambahPoin }) {
  return (
    <section className={`space-y-3 rounded-lg border border-line bg-panel p-4 ${modul.batal ? 'opacity-60' : ''}`}>
      <KepalaKartu judul={t('impor.modul')} node={modul} mati={false} onUbah={onUbah} />
      {modul.ringkasan && <p className="text-sm text-muted">{modul.ringkasan}</p>}
      <DaftarDependensi deps={modul.dependensi} opsi={opsi} mati={modul.batal} onUbah={onUbah} />
      <div className="space-y-3">
        {modul.menu.map((mn) => (
          <KartuMenu key={mn.kunci} menu={mn} batas={batas} opsi={opsi} mati={modul.batal} onUbah={onUbah} onTambahPoin={onTambahPoin} />
        ))}
      </div>
    </section>
  );
}
