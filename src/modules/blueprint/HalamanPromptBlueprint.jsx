import Link from 'next/link';
import { ambilDep } from '@/di/container';
import { muat } from '@/utils/muat';
import HeaderHalaman from '@/modules/shared/HeaderHalaman';
import { tombolSekunder } from '@/modules/shared/ui';
import TabPrompt from '@/modules/prompt/TabPrompt';
import { t } from '@/utils/i18n';

/** Prompt per kelompok blueprint, terurut sesuai urutan eksekusi (tab bernomor, alasan di bawahnya). */
export default async function HalamanPromptBlueprint({ id }) {
  const { blueprint, prompt } = await muat(() => ambilDep().blueprintController.ambilPrompt(id));
  return (
    <div>
      <HeaderHalaman
        breadcrumb={[
          { nama: t('blueprint.judul'), href: '/blueprint' },
          { nama: blueprint.judul, href: `/blueprint/${blueprint.id}` },
        ]}
        judul={t('blueprint.promptJudul')}
        sub={<p className="text-xs text-muted">{t('blueprint.laporanHint')}</p>}
        aksi={
          <Link href={`/blueprint/${blueprint.id}`} className={tombolSekunder}>
            {t('blueprint.kembaliEditor')}
          </Link>
        }
      />
      {prompt.length === 0 ? <p className="rounded-md border border-dashed border-line p-6 text-sm text-muted">{t('blueprint.promptKosong')}</p> : <TabPrompt sesi={prompt} />}
    </div>
  );
}
