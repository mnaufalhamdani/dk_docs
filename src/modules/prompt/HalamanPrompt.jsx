import Link from 'next/link';
import { ambilDep } from '@/di/container';
import { muat } from '@/utils/muat';
import HeaderHalaman from '@/modules/shared/HeaderHalaman';
import { TipeBadge } from '@/modules/shared/Badge';
import { tombolUtama } from '@/modules/shared/ui';
import TabPrompt from './TabPrompt';
import { t } from '@/utils/i18n';

/** Halaman satu sesi prompt: satu tab per repo (semua memakai unique_id yang sama). */
export default async function HalamanPrompt({ uniqueId }) {
  const sesi = await muat(() => ambilDep().promptController.ambilSesi(uniqueId));
  const pertama = sesi[0];
  return (
    <div>
      <HeaderHalaman
        breadcrumb={[{ nama: t('prompt.judul'), href: '/prompt' }]}
        judul={`${t(`prompt.jenis.${pertama.jenis}`)} · ${uniqueId}`}
        badge={pertama.perubahan ? <TipeBadge tipe={pertama.perubahan.tipe} /> : null}
        sub={
          <p className="text-xs text-muted">
            {pertama.perubahan && (
              <Link href={`/perubahan/${pertama.perubahan.id}`} className="mr-2 font-mono text-accent hover:underline">
                {pertama.perubahan.nomor}
              </Link>
            )}
            {t('prompt.petunjukJalankan')}
          </p>
        }
        aksi={
          // prompt blueprint menghasilkan laporan .md untuk dibaca manusia, tidak diimpor;
          // hasil prompt pengujian diimpor lewat halaman Uji CR (Fase 6B), bukan impor dokumentasi
          pertama.jenis === 'blueprint' || pertama.jenis === 'pengujian' ? null : (
            <Link href={`/impor?unique_id=${uniqueId}`} className={tombolUtama}>
              {t('impor.judul')}
            </Link>
          )
        }
      />
      <TabPrompt sesi={sesi} />
    </div>
  );
}
