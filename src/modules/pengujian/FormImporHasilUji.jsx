'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PratinjauHasilUji from './PratinjauHasilUji';
import { inputDasar, tombolSekunder, tombolUtama } from '@/modules/shared/ui';
import { t } from '@/utils/i18n';

const ENDPOINT = '/api/v1/pengujian/hasil';

/** Kotak pesan error seragam (pesan boleh berbaris banyak). */
function PesanError({ error }) {
  if (!error) return null;
  return (
    <p role="alert" className="whitespace-pre-wrap rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
      {error}
    </p>
  );
}

/** Mengirim request ke server dan mengembalikan { ok, data | error } dari format respons seragam. */
async function kirimKeServer(url, opsi) {
  try {
    const res = await fetch(url, opsi);
    const json = await res.json();
    return json.success ? { ok: true, data: json.data } : { ok: false, error: json.message };
  } catch {
    // jaringan putus atau respons bukan JSON
    return { ok: false, error: t('pengujian.gagalHubungi') };
  }
}

/**
 * Form impor hasil uji. Langkah: pilih/tempel JSON dan pilih berkas bukti, lihat pratinjau,
 * lalu simpan (JSON dan berkas dikirim bersama; server memvalidasi ulang). Mengubah masukan menutup pratinjau.
 */
export default function FormImporHasilUji({ pengujianId }) {
  const router = useRouter();
  const [pending, mulai] = useTransition();
  const [json, setJson] = useState('');
  const [files, setFiles] = useState([]);
  const [pratinjau, setPratinjau] = useState(null);
  const [error, setError] = useState('');
  const [buatPdf, setBuatPdf] = useState(true);
  const [pdfGagal, setPdfGagal] = useState('');

  /** Mengubah masukan: pratinjau lama tidak berlaku lagi. */
  function ubah(aksi) {
    setPratinjau(null);
    setError('');
    aksi();
  }

  /** Membaca berkas JSON yang dipilih ke kolom teks. */
  async function bacaJson(e) {
    const file = e.target.files?.[0];
    // dialog dibatalkan: tidak ada berkas
    if (!file) return;
    const isi = await file.text();
    ubah(() => setJson(isi));
    e.target.value = ''; // izinkan memilih berkas yang sama lagi
  }

  /** Meminta pratinjau ke server (hanya JSON dan nama berkas bukti). */
  function lihatPratinjau() {
    setError('');
    mulai(async () => {
      const body = JSON.stringify({ pengujian_id: pengujianId, json, nama_bukti: files.map((f) => f.name) });
      const hasil = await kirimKeServer(`${ENDPOINT}/pratinjau`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      // JSON tidak cocok dengan Uji CR: tampilkan semua alasannya
      if (!hasil.ok) return setError(hasil.error);
      setPratinjau(hasil.data);
    });
  }

  /** Menyimpan hasil: JSON dan semua berkas bukti dikirim sebagai multipart. */
  function simpan() {
    setError('');
    const form = new FormData();
    form.set('pengujian_id', pengujianId);
    form.set('json', json);
    form.set('buat_pdf', buatPdf ? '1' : '0');
    files.forEach((f, i) => form.set(`bukti_${i}`, f));
    mulai(async () => {
      const hasil = await kirimKeServer(ENDPOINT, { method: 'POST', body: form });
      // validasi ulang di server menolak (berkas salah, dll): pratinjau dipertahankan agar bisa diperbaiki
      if (!hasil.ok) return setError(hasil.error);
      // hasil tersimpan tetapi PDF gagal dibuat: tetap di halaman ini agar alasannya terbaca
      if (hasil.data.pdf_gagal) return setPdfGagal(hasil.data.pdf_gagal);
      router.push(`/pengujian/${pengujianId}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className={`${tombolSekunder} cursor-pointer`}>
          {t('pengujian.pilihJson')}
          <input type="file" accept="application/json,.json" onChange={bacaJson} className="sr-only" />
        </label>
        <label className={`${tombolSekunder} cursor-pointer`}>
          {t('pengujian.pilihBukti')}
          <input type="file" multiple accept="image/png,image/jpeg,image/gif,image/webp,.txt,.log" onChange={(e) => ubah(() => setFiles([...e.target.files]))} className="sr-only" />
        </label>
        <span className="text-xs text-muted">{files.length > 0 ? t('pengujian.jumlahBukti', { n: files.length }) : t('pengujian.atauTempelJson')}</span>
      </div>
      <textarea
        aria-label={t('impor.json')}
        value={json}
        onChange={(e) => ubah(() => setJson(e.target.value))}
        rows={14}
        spellCheck={false}
        placeholder={'{\n  "unique_id": "a1b2c3d4",\n  "repo": "kode-repo",\n  "cr_id": "CR2605060003",\n  "putaran": 1,\n  ...\n}'}
        className={`${inputDasar} font-mono text-xs`}
      />
      <button type="button" onClick={lihatPratinjau} disabled={pending || !json.trim()} className={tombolUtama}>
        {pending && !pratinjau ? t('umum.memproses') : t('pengujian.pratinjau')}
      </button>
      <PesanError error={error} />
      {pratinjau && (
        <div className="space-y-3">
          <PratinjauHasilUji data={pratinjau} />
          <label className="flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={buatPdf} onChange={(e) => setBuatPdf(e.target.checked)} />
            {t('pengujian.buatPdf')}
          </label>
          {pdfGagal ? (
            <div className="space-y-2">
              <PesanError error={t('pengujian.pdfGagalSetelahSimpan', { alasan: pdfGagal })} />
              <Link href={`/pengujian/${pengujianId}`} className={tombolSekunder}>
                {t('pengujian.keDetail')}
              </Link>
            </div>
          ) : (
            <button type="button" onClick={simpan} disabled={pending} className={tombolUtama}>
              {pending ? t('umum.memproses') : t('pengujian.simpanHasil')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
