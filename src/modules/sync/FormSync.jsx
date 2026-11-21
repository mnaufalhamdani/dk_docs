'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { pratinjauSync, simpanSync } from './sync.actions';
import PanelStatusSumber, { useKesehatanSumber } from './KesehatanSumber';
import { TipeBadge } from '@/modules/shared/Badge';
import { inputDasar, tombolSekunder, tombolUtama } from '@/modules/shared/ui';
import { t } from '@/utils/i18n';

/** Label status pesan (selain "sudah ada") beserta warnanya. */
const LABEL_STATUS = {
  baru: { kunci: 'sync.statusBaru', kelas: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200' },
  berubah: { kunci: 'sync.statusBerubah', kelas: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
  diabaikan: { kunci: 'sync.statusDiabaikan', kelas: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200' },
};

/** Membalik keanggotaan sebuah id pada Set (mengembalikan Set baru). */
function balik(set, id) {
  const baru = new Set(set);
  if (baru.has(id)) baru.delete(id);
  else baru.add(id);
  return baru;
}

/** Pilihan awal pratinjau: pesan baru dan yang berubah dicentang; yang diabaikan dan yang hilang tidak. */
function pilihanAwal(data) {
  return {
    simpan: new Set(data.pesan.filter((p) => p.status === 'baru').map((p) => p.sumber_id)),
    perbarui: new Set(data.pesan.filter((p) => p.status === 'berubah').map((p) => p.sumber_id)),
    hapus: new Set(),
  };
}

/** Metadata pesan (pengirim, tanggal, nama mentah, hasil pemetaan). */
function MetaPesan({ p }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
      <span>{p.user_name ?? '-'}</span>
      <span>{p.tanggal ?? '-'}</span>
      <span className="font-mono">{[p.modul_sumber, p.menu_sumber].filter(Boolean).join(' / ') || t('perubahan.tanpaNama')}</span>
      {p.peta.length > 0 ? (
        p.peta.map((x, i) => (
          <span key={i} className="rounded bg-accent-soft px-1.5 py-0.5 text-accent">
            {x.repo_nama} / {x.modul_nama}
            {x.menu_nama ? ` / ${x.menu_nama}` : ''}
          </span>
        ))
      ) : (
        <span className="text-amber-700 dark:text-amber-300">{t('perubahan.belumDipetakanLabel')}</span>
      )}
    </div>
  );
}

/** Satu pesan sumber: kotak centang (kecuali yang sudah tersimpan sama persis), isi, dan status. */
function BarisPesan({ p, dicentang, onToggle }) {
  const label = LABEL_STATUS[p.status];
  const bisaDipilih = p.status !== 'sudah_ada';
  const aksi = p.status === 'berubah' ? t('sync.pilihPerbarui') : t('sync.pilihSimpan');
  return (
    <li className={`rounded-md border border-line bg-panel p-3 ${bisaDipilih ? '' : 'opacity-60'}`}>
      <div className="flex gap-3">
        {/* pesan yang sudah tersimpan sama persis tidak bisa dicentang */}
        <input type="checkbox" checked={bisaDipilih && dicentang} disabled={!bisaDipilih} onChange={onToggle} aria-label={`${aksi}: ${p.sumber_id}`} className="mt-1 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            {label && <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${label.kelas}`}>{t(label.kunci)}</span>}
            {p.status === 'sudah_ada' && <span className="rounded border border-line px-1.5 py-0.5 text-[11px]">{t('sync.sudahAda')}</span>}
          </div>
          <p className="whitespace-pre-wrap text-sm">{p.pesan}</p>
          {p.pesan_lama && (
            <div className="mt-2 rounded border border-dashed border-line bg-bg p-2 text-xs text-muted">
              <p className="font-medium">{t('sync.pesanLama')}</p>
              <p className="whitespace-pre-wrap">{p.pesan_lama}</p>
            </div>
          )}
          <MetaPesan p={p} />
        </div>
      </div>
    </li>
  );
}

/** Pesan tersimpan yang sudah tidak ada di sumber; hapus bersifat opsional (bawaan: dibiarkan). */
function BagianHilang({ hilang, dipilih, jumlahDipilih, onToggle, onPilihSemua }) {
  // tidak ada pesan yang hilang: bagian ini tidak ditampilkan
  if (hilang.length === 0) return null;
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{t('sync.hilangJudul', { n: hilang.length })}</h3>
      <p className="text-xs text-muted">{t('sync.hilangHint')}</p>
      <KontrolKelompok dipilih={jumlahDipilih} total={hilang.length} onPilihSemua={onPilihSemua} />
      <ul className="space-y-2">
        {hilang.map((h) => (
          <li key={h.sumber_id} className="rounded-md border border-red-200 bg-panel p-3 dark:border-red-900">
            <label className="flex gap-3">
              <input type="checkbox" checked={dipilih.has(h.sumber_id)} onChange={() => onToggle(h.sumber_id)} className="mt-1 h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="mb-1 block text-[11px] font-medium text-red-700 dark:text-red-300">{t('sync.pilihHapus')}</span>
                <span className="block whitespace-pre-wrap text-sm">{h.pesan}</span>
                <span className="mt-1 block text-xs text-muted">
                  {h.user_name ?? '-'} · {h.tanggal ?? '-'}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Ringkasan jumlah pesan per status. */
function Ringkasan({ data }) {
  const lanjut = data.jumlah_berubah + data.jumlah_diabaikan + data.hilang.length > 0;
  return (
    <div className="space-y-1">
      <p className="text-sm">{t('sync.ringkasan', { jumlah: data.jumlah, baru: data.jumlah_baru, ada: data.jumlah_sudah_ada })}</p>
      {lanjut && <p className="text-xs text-muted">{t('sync.ringkasanLanjut', { berubah: data.jumlah_berubah, diabaikan: data.jumlah_diabaikan, hilang: data.hilang.length })}</p>}
    </div>
  );
}

/** Tombol "Pilih semua / Batal pilih semua" beserta penghitung "n dari m dipilih" untuk satu kelompok. */
function KontrolKelompok({ dipilih, total, onPilihSemua }) {
  const semua = total > 0 && dipilih === total;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={() => onPilihSemua(!semua)} disabled={total === 0} className={`${tombolSekunder} px-2! py-0.5! text-xs!`}>
        {semua ? t('sync.batalPilihSemua') : t('sync.pilihSemua')}
      </button>
      <span className="text-xs text-muted">{t('sync.terpilihKelompok', { n: dipilih, m: total })}</span>
    </div>
  );
}

/** Satu kelompok pesan (baru / berubah) dengan kontrol pilih semua; kelompok kosong tidak ditampilkan. */
function KelompokPesan({ judul, daftar, kunci, pilih, ubah, setSemua }) {
  // tidak ada pesan pada kelompok ini: bagian tidak ditampilkan
  if (daftar.length === 0) return null;
  const ids = daftar.map((p) => p.sumber_id);
  const dipilih = ids.filter((id) => pilih[kunci].has(id)).length;
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{judul}</h3>
      <KontrolKelompok dipilih={dipilih} total={ids.length} onPilihSemua={(nilai) => setSemua(kunci, ids, nilai)} />
      <ul className="space-y-2">
        {daftar.map((p) => (
          <BarisPesan key={p.sumber_id} p={p} dicentang={pilih[kunci].has(p.sumber_id)} onToggle={() => ubah(kunci, p.sumber_id)} />
        ))}
      </ul>
    </section>
  );
}

/** Pesan yang sudah tersimpan sama persis: ditampilkan tanpa kotak pilih agar konteks tetap terlihat. */
function KelompokSudahAda({ daftar }) {
  // tidak ada pesan yang sudah tersimpan: bagian tidak ditampilkan
  if (daftar.length === 0) return null;
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{t('sync.sudahAdaJudul', { n: daftar.length })}</h3>
      <ul className="space-y-2">
        {daftar.map((p) => (
          <BarisPesan key={p.sumber_id} p={p} dicentang={false} onToggle={() => {}} />
        ))}
      </ul>
    </section>
  );
}

/** Jumlah pesan yang akan diproses saat Simpan dan jumlah yang bisa dipilih di seluruh pratinjau. */
function hitungTerpilih(data, pilih) {
  const bisa = data.pesan.filter((p) => p.status !== 'sudah_ada').length + data.hilang.length;
  const dipilih = pilih.simpan.size + pilih.perbarui.size + pilih.hapus.size;
  return { dipilih, bisa };
}

/** Pratinjau pesan hasil ambil dari sumber beserta pilihan simpan / perbarui / hapus. */
function Pratinjau({ data, pilih, setPilih }) {
  const ubah = (kunci, id) => setPilih((s) => ({ ...s, [kunci]: balik(s[kunci], id) }));
  /** Mencentang / mengosongkan seluruh id pada satu kelompok saja; kelompok lain tidak tersentuh. */
  const setSemua = (kunci, ids, nilai) =>
    setPilih((s) => {
      const baru = new Set(s[kunci]);
      ids.forEach((id) => (nilai ? baru.add(id) : baru.delete(id)));
      return { ...s, [kunci]: baru };
    });
  const { dipilih, bisa } = hitungTerpilih(data, pilih);
  // pesan baru dan yang diabaikan sebelumnya sama-sama masuk daftar "simpan"
  const baru = data.pesan.filter((p) => p.status === 'baru' || p.status === 'diabaikan');
  const berubah = data.pesan.filter((p) => p.status === 'berubah');
  const sudahAda = data.pesan.filter((p) => p.status === 'sudah_ada');
  const hilangIds = data.hilang.map((h) => h.sumber_id);
  const hilangDipilih = hilangIds.filter((id) => pilih.hapus.has(id)).length;
  return (
    <div className="space-y-4">
      <Ringkasan data={data} />
      <p className="text-sm font-medium">{t('sync.terpilihTotal', { n: dipilih, m: bisa })}</p>
      {data.belum_dipetakan.length > 0 && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {t('sync.adaBelumDipetakan', { n: data.belum_dipetakan.length })}
        </p>
      )}
      <div className="max-h-[60vh] space-y-4 overflow-y-auto">
        <KelompokPesan judul={t('sync.kelompokBaru')} daftar={baru} kunci="simpan" pilih={pilih} ubah={ubah} setSemua={setSemua} />
        <KelompokPesan judul={t('sync.kelompokBerubah')} daftar={berubah} kunci="perbarui" pilih={pilih} ubah={ubah} setSemua={setSemua} />
        <KelompokSudahAda daftar={sudahAda} />
      </div>
      <BagianHilang
        hilang={data.hilang}
        dipilih={pilih.hapus}
        jumlahDipilih={hilangDipilih}
        onToggle={(id) => ubah('hapus', id)}
        onPilihSemua={(nilai) => setSemua('hapus', hilangIds, nilai)}
      />
    </div>
  );
}

/** Form Sync: pilih tipe, isi nomor, lihat pratinjau, pilih pesan, lalu simpan. */
export default function FormSync({ status, awal }) {
  const router = useRouter();
  const [pending, mulai] = useTransition();
  const [tipe, setTipe] = useState(awal.tipe ?? 'CR');
  const [nomor, setNomor] = useState(awal.nomor ?? '');
  const [data, setData] = useState(null);
  const [pilih, setPilih] = useState({ simpan: new Set(), perbarui: new Set(), hapus: new Set() });
  const [error, setError] = useState('');
  const siap = status[tipe].siap;
  const { hasil: kesehatan, memeriksa, cek } = useKesehatanSumber();
  // tombol ambil data baru aktif setelah status sumber diketahui dan tidak melarang
  const sumberBolehDipakai = Boolean(kesehatan?.bolehAmbil) && !memeriksa;

  /** Mengambil pratinjau dari sumber. */
  function ambil(e) {
    e.preventDefault();
    setError('');
    setData(null);
    mulai(async () => {
      const kondisi = await cek(true); // cek ulang tanpa cache tepat sebelum mengambil
      // sumber offline atau database sumber error: batalkan, alasannya sudah tampil di panel status
      if (!kondisi.bolehAmbil) return setError(t('kesehatan.ambilDitolak'));
      const hasil = await pratinjauSync({ tipe, nomor });
      // nomor tidak ditemukan / sumber bermasalah: tampilkan pesan
      if (!hasil.ok) return setError(hasil.error);
      setPilih(pilihanAwal(hasil.data));
      setData(hasil.data);
    });
  }

  /** Menyimpan sesuai pilihan lalu membuka detail perubahan. */
  function simpan() {
    setError('');
    mulai(async () => {
      const hasil = await simpanSync({
        tipe: data.tipe,
        nomor: data.nomor,
        simpan_ids: [...pilih.simpan],
        perbarui_ids: [...pilih.perbarui],
        hapus_ids: [...pilih.hapus],
      });
      if (!hasil.ok) return setError(hasil.error);
      router.push(hasil.data.href);
    });
  }

  return (
    <div className="space-y-5">
      <PanelStatusSumber hasil={kesehatan} memeriksa={memeriksa} onCekUlang={() => cek(true)} />
      {!siap && (
        <p role="status" className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {t('sync.sumberBelumSiap')} {status[tipe].alasan}
        </p>
      )}
      <form onSubmit={ambil} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          {t('perubahan.tipe')}
          <select value={tipe} onChange={(e) => { setTipe(e.target.value); setData(null); }} className={inputDasar}>
            <option value="CR">CR</option>
            <option value="B">B</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          {t('sync.nomor')}
          <input value={nomor} onChange={(e) => setNomor(e.target.value)} placeholder="202507220021" className={`${inputDasar} font-mono`} />
        </label>
        <button type="submit" disabled={pending || !siap || !nomor.trim() || !sumberBolehDipakai} className={tombolSekunder}>
          {pending && !data ? t('umum.memproses') : t('sync.ambil')}
        </button>
      </form>
      {error && (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      {data && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TipeBadge tipe={data.tipe} />
            <span className="font-mono">{data.nomor}</span>
          </div>
          <Pratinjau data={data} pilih={pilih} setPilih={setPilih} />
          <p className="text-xs text-muted">{t('sync.akanDilakukan', { simpan: pilih.simpan.size, perbarui: pilih.perbarui.size, hapus: pilih.hapus.size })}</p>
          <button type="button" onClick={simpan} disabled={pending} className={tombolUtama}>
            {pending ? t('umum.memproses') : t('umum.simpan')}
          </button>
        </div>
      )}
    </div>
  );
}
