'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { simpanImpor } from './impor.actions';
import KartuModul from './KartuRencana';
import BlokInfoRepo from './BlokInfoRepo';
import { hitungRingkasan, perbaruiPohon, periksaSebelumSimpan } from './rencana.util';
import { tombolSekunder, tombolUtama } from '@/modules/shared/ui';
import { t } from '@/utils/i18n';

/** Kotak ringkasan angka di atas daftar kartu. */
function Ringkasan({ r }) {
  const item = [
    [t('impor.ringModul'), r.modul],
    [t('impor.ringMenu'), r.menu],
    [t('impor.ringHalaman'), r.halaman],
    [t('impor.op.tambah'), r.tambah],
    [t('impor.op.ubah'), r.ubah],
    [t('impor.op.hapus'), r.hapus],
  ];
  return (
    <dl className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {item.map(([label, nilai]) => (
        <div key={label} className="rounded-md border border-line bg-panel px-3 py-2">
          <dt className="text-[11px] uppercase tracking-wide text-muted">{label}</dt>
          <dd className="text-lg font-semibold">{nilai}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Panel hasil setelah Simpan berhasil. */
function PanelTersimpan({ hasil, perubahan }) {
  return (
    <div role="status" className="space-y-2 rounded-md border border-green-300 bg-green-50 p-4 text-sm text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
      <p className="font-medium">{t('impor.tersimpan')}</p>
      <p>
        {t('impor.hasilRingkas', { modul: hasil.modul, menu: hasil.menu, halaman: hasil.halaman, tambah: hasil.poin_tambah, ubah: hasil.poin_ubah, hapus: hasil.poin_hapus, dep: hasil.dependensi })}
      </p>
      {hasil.teknologi > 0 && <p>{t('infoRepo.terterapkan', { n: hasil.teknologi })}</p>}
      <div className="flex gap-2">
        {perubahan && (
          <Link href={`/perubahan/${perubahan.id}`} className={tombolSekunder}>
            {perubahan.nomor}
          </Link>
        )}
        <Link href="/impor" className={tombolSekunder}>
          {t('impor.kembaliDaftar')}
        </Link>
      </div>
    </div>
  );
}

/**
 * Halaman review impor: user meninjau diff per modul -> menu -> halaman -> poin, mengedit atau
 * membatalkan bagian tertentu, memilih penanganan dependensi, lalu Simpan (satu transaksi).
 */
export default function ReviewImpor({ imporId, jenisImpor, rencanaAwal, opsiTautan, batas, perubahan, infoRepo = [] }) {
  const [pending, mulai] = useTransition();
  const [pohon, setPohon] = useState(rencanaAwal);
  // teknologi baru/berubah dicentang secara bawaan; user bisa melepasnya satu per satu
  const [teknologiDipilih, setTeknologiDipilih] = useState(() => new Set(infoRepo.map((x) => x.kunci)));
  const [error, setError] = useState('');
  const [hasil, setHasil] = useState(null);
  const counter = useRef(0);
  const ringkasan = useMemo(() => hitungRingkasan(pohon), [pohon]);

  /** Mengubah sebagian field node (modul/menu/halaman/poin/dependensi) berdasarkan kuncinya. */
  function ubah(kunci, patch) {
    setPohon((s) => perbaruiPohon(s, kunci, (node) => ({ ...node, ...patch })));
  }

  /** Menambah poin baru (kosong) ke sebuah halaman pada bagian tertentu. */
  function tambahPoin(halamanKunci, bagian) {
    counter.current += 1;
    const baru = { kunci: `${halamanKunci}-x${counter.current}`, op: 'tambah', bagian, isi: '', poin_id: null, batal: false, status: 'beta', pending: false, jenis_impor: jenisImpor, tautan: [] };
    setPohon((s) => perbaruiPohon(s, halamanKunci, (h) => ({ ...h, poin: [...h.poin, baru] })));
  }

  /** Membalik centang satu teknologi pada blok Info repo. */
  function toggleTeknologi(kunci) {
    setTeknologiDipilih((s) => {
      const baru = new Set(s);
      if (baru.has(kunci)) baru.delete(kunci);
      else baru.add(kunci);
      return baru;
    });
  }

  /** Memeriksa lalu mengirim rencana ke server. */
  function simpan() {
    setError('');
    const masalah = periksaSebelumSimpan(pohon);
    // ada isian yang belum lengkap: jangan kirim, tunjukkan masalahnya
    if (masalah) return setError(masalah);
    mulai(async () => {
      const teknologiTerpilih = infoRepo.filter((x) => teknologiDipilih.has(x.kunci)).map((x) => x.nama);
      const res = await simpanImpor({ impor_id: imporId, modul: pohon, teknologi_terpilih: teknologiTerpilih });
      // server menolak (data berubah, validasi): tampilkan pesan, review dipertahankan
      if (!res.ok) return setError(res.error);
      // jangan router.refresh(): halaman ini akan berganti ke tampilan "sudah disimpan" dan panel hasil hilang
      setHasil(res.data);
    });
  }

  // sudah tersimpan: tampilkan ringkasan hasil, bukan editor
  if (hasil) return <PanelTersimpan hasil={hasil} perubahan={perubahan} />;

  return (
    <div className="space-y-5">
      <Ringkasan r={ringkasan} />
      <BlokInfoRepo daftar={infoRepo} dipilih={teknologiDipilih} onToggle={toggleTeknologi} />
      {pohon.length === 0 && <p className="rounded-md border border-dashed border-line p-4 text-sm text-muted">{t('impor.kosong')}</p>}
      <div className="space-y-4">
        {pohon.map((m) => (
          <KartuModul key={m.kunci} modul={m} batas={batas} opsi={opsiTautan} onUbah={ubah} onTambahPoin={tambahPoin} />
        ))}
      </div>
      {error && (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      <div className="sticky bottom-0 flex items-center gap-2 border-t border-line bg-bg py-3">
        <button type="button" onClick={simpan} disabled={pending} className={tombolUtama}>
          {pending ? t('umum.memproses') : t('umum.simpan')}
        </button>
        <span className="text-xs text-muted">{t('impor.simpanHint')}</span>
      </div>
    </div>
  );
}
