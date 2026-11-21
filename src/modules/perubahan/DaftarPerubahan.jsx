import Link from 'next/link';
import { ambilDep } from '@/di/container';
import HeaderHalaman from '@/modules/shared/HeaderHalaman';
import { TipeBadge } from '@/modules/shared/Badge';
import { inputDasar, tombolSekunder, tombolUtama } from '@/modules/shared/ui';
import { t } from '@/utils/i18n';

/** Nama field filter pada query string. */
const FIELD_FILTER = ['q', 'tipe', 'dari', 'sampai', 'repo_id', 'modul_id', 'developer', 'dokumentasi'];

/** Membuat URL daftar dengan filter saat ini dan nomor halaman tertentu. */
function urlHalaman(query, halaman) {
  const p = new URLSearchParams();
  for (const k of FIELD_FILTER) if (query[k]) p.set(k, query[k]);
  if (halaman > 1) p.set('halaman', String(halaman));
  const teks = p.toString();
  return teks ? `/perubahan?${teks}` : '/perubahan';
}

/** Satu field filter dengan label. */
function Kolom({ label, children }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted">
      {label}
      {children}
    </label>
  );
}

/** Halaman Perubahan: filter, tabel padat, dan paginasi. */
export default async function DaftarPerubahan({ query }) {
  const { perubahanController, layoutController } = ambilDep();
  const [hasil, pohon] = await Promise.all([perubahanController.daftar(query), layoutController.pohon()]);
  const modulOpsi = pohon.flatMap((r) => r.modul.map((m) => ({ id: m.id, label: `${r.nama} / ${m.nama}` })));

  return (
    <div>
      <HeaderHalaman
        judul={t('perubahan.judul')}
        sub={<p className="text-sm text-muted">{t('perubahan.total', { n: hasil.total })}</p>}
        aksi={
          <Link href="/sync" className={tombolUtama}>
            {t('sync.judul')}
          </Link>
        }
      />

      <form method="get" action="/perubahan" className="mb-5 grid gap-3 rounded-lg border border-line bg-panel p-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kolom label={t('perubahan.cari')}>
          <input name="q" defaultValue={query.q ?? ''} placeholder={t('perubahan.cariPlaceholder')} className={inputDasar} />
        </Kolom>
        <Kolom label={t('perubahan.tipe')}>
          <select name="tipe" defaultValue={query.tipe ?? ''} className={inputDasar}>
            <option value="">{t('perubahan.semua')}</option>
            <option value="CR">CR</option>
            <option value="B">B</option>
          </select>
        </Kolom>
        <Kolom label={t('perubahan.dari')}>
          <input type="date" name="dari" defaultValue={query.dari ?? ''} className={inputDasar} />
        </Kolom>
        <Kolom label={t('perubahan.sampai')}>
          <input type="date" name="sampai" defaultValue={query.sampai ?? ''} className={inputDasar} />
        </Kolom>
        <Kolom label={t('perubahan.repo')}>
          <select name="repo_id" defaultValue={query.repo_id ?? ''} className={inputDasar}>
            <option value="">{t('perubahan.semua')}</option>
            {pohon.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nama}
              </option>
            ))}
          </select>
        </Kolom>
        <Kolom label={t('perubahan.modul')}>
          <select name="modul_id" defaultValue={query.modul_id ?? ''} className={inputDasar}>
            <option value="">{t('perubahan.semua')}</option>
            {modulOpsi.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </Kolom>
        <Kolom label={t('perubahan.developer')}>
          <select name="developer" defaultValue={query.developer ?? ''} className={inputDasar}>
            <option value="">{t('perubahan.semua')}</option>
            {hasil.developer.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </Kolom>
        <Kolom label={t('perubahan.filterDokumentasi')}>
          <select name="dokumentasi" defaultValue={query.dokumentasi ?? ''} className={inputDasar}>
            <option value="">{t('perubahan.semua')}</option>
            <option value="sudah">{t('perubahan.sudahDokumentasi')}</option>
            <option value="belum">{t('perubahan.belumDokumentasi')}</option>
          </select>
        </Kolom>
        <div className="flex items-end gap-2">
          <button type="submit" className={tombolUtama}>
            {t('perubahan.terapkan')}
          </button>
          <Link href="/perubahan" className={tombolSekunder}>
            {t('perubahan.reset')}
          </Link>
        </div>
      </form>

      {hasil.items.length === 0 ? (
        <p className="rounded-md border border-dashed border-line p-6 text-sm text-muted">{t('perubahan.kosong')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-panel">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">{t('perubahan.kolomNomor')}</th>
                <th className="px-3 py-2 font-medium">{t('perubahan.kolomTanggal')}</th>
                <th className="px-3 py-2 font-medium">{t('perubahan.kolomDeveloper')}</th>
                <th className="px-3 py-2 font-medium">{t('perubahan.kolomModul')}</th>
                <th className="px-3 py-2 text-right font-medium">{t('perubahan.kolomPesan')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {hasil.items.map((i) => (
                <tr key={i.id} className="hover:bg-accent-soft">
                  <td className="whitespace-nowrap px-3 py-2">
                    <span className="mr-2">
                      <TipeBadge tipe={i.tipe} />
                    </span>
                    <Link href={`/perubahan/${i.id}`} className="font-mono text-accent hover:underline">
                      {i.nomor}
                    </Link>
                    {i.sudah_didokumentasi && (
                      <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-[11px] text-green-800 dark:bg-green-900/40 dark:text-green-200">
                        {t('perubahan.badgeDokumentasi')}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-muted">{i.tanggal_terakhir ?? '-'}</td>
                  <td className="px-3 py-2 text-xs">{i.developer ?? '-'}</td>
                  <td className="px-3 py-2 text-xs">
                    {i.modul_nama ?? '-'}
                    {i.belum_dipetakan > 0 && (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                        {t('perubahan.belumDipetakan', { n: i.belum_dipetakan })}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-muted">{i.jumlah_pesan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasil.jumlah_halaman > 1 && (
        <nav aria-label={t('perubahan.paginasi')} className="mt-4 flex items-center justify-between text-sm">
          {hasil.halaman > 1 ? (
            <Link href={urlHalaman(query, hasil.halaman - 1)} className={tombolSekunder}>
              {t('perubahan.sebelumnya')}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-xs text-muted">{t('perubahan.halamanKe', { n: hasil.halaman, total: hasil.jumlah_halaman })}</span>
          {hasil.halaman < hasil.jumlah_halaman ? (
            <Link href={urlHalaman(query, hasil.halaman + 1)} className={tombolSekunder}>
              {t('perubahan.berikutnya')}
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
