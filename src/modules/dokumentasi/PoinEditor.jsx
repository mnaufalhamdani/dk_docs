'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DAFTAR_BAGIAN } from '@/enums';
import { periksaPoin } from '@/modules/shared/poin.util';
import { inputDasar, tombolSekunder, tombolUtama } from '@/modules/shared/ui';
import ChipTautan from '@/modules/tautan/ChipTautan';
import { adaPending, gantiStatusTautan, tautanTampil } from '@/modules/tautan/tautan.util';
import { t } from '@/utils/i18n';

/** Urutan tampil/kirim: dikelompokkan per bagian, urutan dalam bagian mengikuti posisi array. */
function normal(items) {
  return DAFTAR_BAGIAN.flatMap((b) => items.filter((i) => i.bagian === b));
}

/** Bentuk ringkas yang dibandingkan untuk mendeteksi perubahan (dirty). */
function tandaTangan(items) {
  return JSON.stringify(normal(items).map((i) => [i.id ?? null, i.bagian, i.isi, i.status]));
}

/** Satu baris poin yang bisa diseret, diedit, diganti status/bagian, dan dihapus. */
function BarisPoin({ item, batas, onUbah, onHapus, onPindahBagian, ringkasAction }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.key });
  const cek = periksaPoin(item.isi, batas);
  const chip = tautanTampil(item.tautan);
  const pending = adaPending(item.tautan);
  const [usulan, setUsulan] = useState(null);
  const [memeriksa, setMemeriksa] = useState(false);

  /** Meminta usulan ringkas dari DocPolisher untuk teks poin saat ini. */
  async function mintaUsulan() {
    setMemeriksa(true);
    const hasil = await ringkasAction({ isi: item.isi });
    setMemeriksa(false);
    // gagal (misal validasi): tampilkan sebagai pesan tanpa usulan
    setUsulan(hasil.ok ? hasil.data : { usulan: null, alasan: [hasil.error] });
  }

  /** Memakai usulan: teks diganti dan asal poin dicatat sesuai pembuat usulan (aturan/ai). */
  function pakaiUsulan() {
    onUbah({ isi: usulan.usulan, asal: usulan.asal });
    setUsulan(null);
  }
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };

  return (
    <li ref={setNodeRef} style={style} className="group rounded-md border border-line bg-panel p-2">
      <div className="flex items-start gap-2">
        <button type="button" aria-label={t('editor.seret')} className="mt-1 cursor-grab touch-none px-1 text-muted hover:text-fg" {...attributes} {...listeners}>
          ⋮⋮
        </button>
        <div className="min-w-0 flex-1">
          <textarea
            aria-label={t('editor.isiPoin')}
            value={item.isi}
            autoFocus={item.baru}
            rows={Math.max(1, Math.ceil(item.isi.length / 80))}
            onChange={(e) => {
              setUsulan(null); // teks berubah: usulan lama tidak relevan lagi
              onUbah({ isi: e.target.value, asal: 'manual' });
            }}
            className={`${inputDasar} resize-none ${pending ? 'line-through opacity-60' : ''}`}
          />
          {chip.length > 0 && (
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              {pending && <span className="rounded border border-dashed border-line px-1 py-0.5 text-[10px] uppercase text-muted">{t('tautan.labelPending')}</span>}
              {chip.map((x) => (
                <ChipTautan key={x.id} tautan={x} onStatus={(id, status) => onUbah({ tautan: gantiStatusTautan(item.tautan, id, status) })} />
              ))}
            </div>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <span className={cek.peringatan ? 'font-medium text-amber-700 dark:text-amber-300' : 'text-muted'}>
              {cek.panjang}/{batas.karakter}
            </span>
            {cek.peringatan && (
              <span role="status" className="text-amber-700 dark:text-amber-300">
                {cek.terlaluPanjang ? t('editor.terlaluPanjang') : t('editor.terlaluBanyakKalimat', { n: batas.kalimat })}
              </span>
            )}
            {cek.peringatan && ringkasAction && (
              <button type="button" onClick={mintaUsulan} disabled={memeriksa} className="rounded px-1.5 py-0.5 text-accent hover:bg-accent-soft disabled:opacity-50">
                {memeriksa ? t('editor.memeriksa') : t('editor.usulkanRingkas')}
              </button>
            )}
            {item.asal && item.asal !== 'manual' && <span className="text-muted">{t(`editor.asal.${item.asal}`)}</span>}
          </div>
          {usulan && (
            <div role="status" className="mt-2 space-y-1 rounded-md border border-line bg-bg p-2 text-xs">
              {usulan.usulan ? (
                <>
                  <p className="font-medium">{t('editor.usulanDari', { asal: usulan.asal })}</p>
                  <p className="text-sm">{usulan.usulan}</p>
                  <p className="text-muted">{usulan.alasan.join(' ')}</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={pakaiUsulan} className="rounded bg-accent px-2 py-0.5 text-white">
                      {t('editor.pakaiUsulan')}
                    </button>
                    <button type="button" onClick={() => setUsulan(null)} className="rounded px-2 py-0.5 text-muted hover:bg-accent-soft">
                      {t('editor.abaikanUsulan')}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p>{usulan.alasan.join(' ') || t('editor.tidakAdaUsulan')}</p>
                  <button type="button" onClick={() => setUsulan(null)} className="rounded px-2 py-0.5 text-muted hover:bg-accent-soft">
                    {t('editor.abaikanUsulan')}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        {/* aksi tampil saat hover atau fokus keyboard */}
        <div className="flex items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <select aria-label={t('editor.pindahBagian')} value={item.bagian} onChange={(e) => onPindahBagian(e.target.value)} className="rounded border border-line bg-panel px-1 py-0.5 text-xs">
            {DAFTAR_BAGIAN.map((b) => (
              <option key={b} value={b}>
                {t(`bagian.${b}`)}
              </option>
            ))}
          </select>
          <button type="button" onClick={onHapus} className="rounded px-1.5 py-0.5 text-xs text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950">
            {t('umum.hapus')}
          </button>
        </div>
        <button
          type="button"
          aria-pressed={item.status === 'live'}
          title={t('editor.ubahStatus')}
          onClick={() => onUbah({ status: item.status === 'live' ? 'beta' : 'live' })}
          className={`mt-1 rounded px-1.5 py-0.5 text-[11px] font-medium ${
            item.status === 'live'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
          }`}
        >
          {t(`status.${item.status}`)}
        </button>
      </div>
    </li>
  );
}

/** Satu blok bagian dengan daftar poin yang bisa diurutkan lewat drag. */
function BlokBagian({ bagian, items, batas, onTambah, onUbah, onHapus, onPindahBagian, onUrut, ringkasAction }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  /** Setelah drag selesai: minta induk mengurutkan ulang item bagian ini. */
  function selesaiDrag({ active, over }) {
    // dilepas di posisi semula / di luar area: tidak ada perubahan
    if (!over || active.id === over.id) return;
    onUrut(bagian, active.id, over.id);
  }

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{t(`bagian.${bagian}`)}</h3>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={selesaiDrag}>
        <SortableContext items={items.map((i) => i.key)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {items.map((item) => (
              <BarisPoin
                key={item.key}
                item={item}
                batas={batas}
                onUbah={(patch) => onUbah(item.key, patch)}
                onHapus={() => onHapus(item.key)}
                onPindahBagian={(b) => onPindahBagian(item.key, b)}
                ringkasAction={ringkasAction}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <button type="button" onClick={() => onTambah(bagian)} className="text-xs text-accent hover:underline">
        + {t('editor.tambahPoin')}
      </button>
    </section>
  );
}

/**
 * Editor poin satu halaman. Semua perubahan ditampung di state lalu dikirim
 * sekaligus lewat tombol Simpan (satu simpan = satu versi tersimpan).
 */
export default function PoinEditor({ halamanId, poinAwal, batas, simpanAction, ringkasAction, kembaliHref }) {
  const router = useRouter();
  const [pending, mulai] = useTransition();
  const [error, setError] = useState('');
  const counter = useRef(0);
  const [items, setItems] = useState(() => poinAwal.map((p) => ({ key: `p${p.id}`, id: p.id, bagian: p.bagian, isi: p.isi, status: p.status, asal: p.asal, tautan: p.tautan ?? [] })));
  const dasar = useMemo(() => tandaTangan(poinAwal.map((p) => ({ id: p.id, bagian: p.bagian, isi: p.isi, status: p.status }))), [poinAwal]);
  const kotor = tandaTangan(items) !== dasar;

  // peringatan bawaan browser bila user menutup tab dengan perubahan belum disimpan
  useEffect(() => {
    if (!kotor) return undefined;
    const tahan = (e) => e.preventDefault();
    window.addEventListener('beforeunload', tahan);
    return () => window.removeEventListener('beforeunload', tahan);
  }, [kotor]);

  /** Menambah poin baru kosong (beta) di akhir bagian. */
  function tambah(bagian) {
    counter.current += 1;
    setItems((s) => [...s, { key: `n${counter.current}`, id: null, bagian, isi: '', status: 'beta', baru: true }]);
  }

  /** Mengubah sebagian field sebuah poin. */
  function ubah(key, patch) {
    setItems((s) => s.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }

  /** Menghapus poin dari state (baru berlaku di database setelah Simpan). */
  function hapus(key) {
    setItems((s) => s.filter((i) => i.key !== key));
  }

  /** Memindahkan poin ke bagian lain; ditaruh di akhir bagian tujuan. */
  function pindahBagian(key, bagian) {
    setItems((s) => {
      const item = s.find((i) => i.key === key);
      return [...s.filter((i) => i.key !== key), { ...item, bagian }];
    });
  }

  /** Mengurutkan ulang poin dalam satu bagian setelah drag. */
  function urut(bagian, dariKey, keKey) {
    setItems((s) => {
      const sub = s.filter((i) => i.bagian === bagian);
      const dari = sub.findIndex((i) => i.key === dariKey);
      const ke = sub.findIndex((i) => i.key === keKey);
      const baru = arrayMove(sub, dari, ke);
      return DAFTAR_BAGIAN.flatMap((b) => (b === bagian ? baru : s.filter((i) => i.bagian === b)));
    });
  }

  /** Mengirim semua poin ke server; sukses -> kembali ke tampilan baca. */
  function simpan() {
    setError('');
    const kirim = normal(items).filter((i) => !(i.id === null && i.isi.trim() === '')); // poin baru yang kosong diabaikan
    // poin lama dikosongkan: minta user menghapusnya secara eksplisit
    if (kirim.some((i) => i.isi.trim() === '')) return setError(t('editor.isiKosong'));
    mulai(async () => {
      const hasil = await simpanAction({ halaman_id: halamanId, poin: kirim.map((i) => ({ id: i.id, bagian: i.bagian, isi: i.isi, status: i.status, asal: i.asal ?? 'manual' })) });
      // gagal (validasi / data berubah): tampilkan pesan, state editor dipertahankan
      if (!hasil.ok) return setError(hasil.error);
      router.push(kembaliHref);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {DAFTAR_BAGIAN.map((b) => (
        <BlokBagian
          key={b}
          bagian={b}
          items={items.filter((i) => i.bagian === b)}
          batas={batas}
          onTambah={tambah}
          onUbah={ubah}
          onHapus={hapus}
          onPindahBagian={pindahBagian}
          onUrut={urut}
          ringkasAction={ringkasAction}
        />
      ))}
      {error && (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      <div className="sticky bottom-0 flex items-center gap-2 border-t border-line bg-bg py-3">
        <button type="button" onClick={simpan} disabled={pending || !kotor} className={tombolUtama}>
          {pending ? t('umum.memproses') : t('umum.simpan')}
        </button>
        <Link href={kembaliHref} className={tombolSekunder}>
          {t('umum.batal')}
        </Link>
        {kotor && <span className="text-xs text-muted">{t('editor.belumDisimpan')}</span>}
      </div>
    </div>
  );
}
