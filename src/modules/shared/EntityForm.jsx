'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { inputDasar, tombolSekunder, tombolUtama } from './ui';
import { t } from '@/utils/i18n';

/** Nilai awal sebuah field: array digabung jadi teks, checkbox jadi boolean. */
function nilaiAwal(field, initial) {
  const nilai = initial?.[field.name];
  if (field.type === 'checkbox') return Boolean(nilai ?? field.default ?? false);
  if (Array.isArray(nilai)) return nilai.join(field.type === 'lines' ? '\n' : ', ');
  return nilai ?? field.default ?? '';
}

/** Apakah field ditampilkan, berdasarkan aturan showIf { field, equals } terhadap nilai lain. */
function tampil(field, values) {
  // tanpa aturan: selalu tampil
  if (!field.showIf) return true;
  return values[field.showIf.field] === field.showIf.equals;
}

/** Satu field form sesuai tipenya. */
function Field({ field, nilai, onChange }) {
  const id = `f-${field.name}`;
  if (field.type === 'checkbox') {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={nilai} onChange={(e) => onChange(e.target.checked)} />
        {field.label}
      </label>
    );
  }
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">
        {field.label}
        {field.required && <span className="text-red-600"> *</span>}
      </label>
      {field.type === 'select' ? (
        <select id={id} className={inputDasar} value={nilai} onChange={(e) => onChange(e.target.value)}>
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : field.type === 'textarea' || field.type === 'lines' ? (
        <textarea id={id} rows={field.type === 'lines' ? 3 : 2} className={`${inputDasar} ${field.mono ? 'font-mono' : ''}`} value={nilai} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} type="text" className={`${inputDasar} ${field.mono ? 'font-mono' : ''}`} value={nilai} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
      {field.hint && <p className="text-xs text-muted">{field.hint}</p>}
    </div>
  );
}

/**
 * Form generik berbasis definisi field. `action` adalah Server Action yang menerima
 * objek nilai (digabung `hidden`) dan mengembalikan { ok, data: { href }, error }.
 */
export default function EntityForm({ fields, initial = null, hidden = {}, action, submitLabel, batalHref }) {
  const router = useRouter();
  const [pending, mulai] = useTransition();
  const [error, setError] = useState('');
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((f) => [f.name, nilaiAwal(f, initial)])));

  /** Mengirim nilai ke action; sukses -> pindah ke href, gagal -> tampilkan pesan. */
  function kirim(e) {
    e.preventDefault();
    setError('');
    mulai(async () => {
      const hasil = await action({ ...hidden, ...values });
      // gagal validasi / bentrok: tampilkan pesan dan tetap di form
      if (!hasil.ok) return setError(hasil.error);
      router.push(hasil.data.href);
      router.refresh();
    });
  }

  return (
    <form onSubmit={kirim} className="max-w-2xl space-y-4">
      {fields.filter((f) => tampil(f, values)).map((f) => (
        <Field key={f.name} field={f} nilai={values[f.name]} onChange={(v) => setValues((s) => ({ ...s, [f.name]: v }))} />
      ))}
      {error && (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={tombolUtama}>
          {pending ? t('umum.memproses') : submitLabel}
        </button>
        <Link href={batalHref} className={tombolSekunder}>
          {t('umum.batal')}
        </Link>
      </div>
    </form>
  );
}
