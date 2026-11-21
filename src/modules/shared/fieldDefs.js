import { DAFTAR_PLATFORM, DAFTAR_POLA_MENU, DAFTAR_JENIS_HALAMAN, POLA_MENU } from '@/enums';
import { t } from '@/utils/i18n';

/** Mengubah daftar nilai enum menjadi opsi select { value, label } dengan label dari locale. */
const opsi = (daftar, prefiks) => daftar.map((v) => ({ value: v, label: prefiks ? t(`${prefiks}.${v}`) : v }));

/** Field form repo. */
export const fieldRepo = () => [
  { name: 'nama', label: t('form.nama'), type: 'text', required: true },
  { name: 'kode', label: t('form.kode'), type: 'text', required: true, mono: true, hint: t('form.kodeRepoHint') },
  { name: 'platform', label: t('form.platform'), type: 'select', options: opsi(DAFTAR_PLATFORM), default: 'js' },
  { name: 'branch_utama', label: t('form.branchUtama'), type: 'text', mono: true, default: 'development' },
  { name: 'url_git', label: t('form.urlGit'), type: 'text', mono: true, placeholder: 'https://git.contoh.com/tim/repo', hint: t('form.urlGitHint') },
  { name: 'url_beta', label: t('form.urlBeta'), type: 'text', mono: true, placeholder: 'https://beta.contoh.com', hint: t('form.urlBetaHint') },
  { name: 'url_live', label: t('form.urlLive'), type: 'text', mono: true, placeholder: 'https://app.contoh.com', hint: t('form.urlLiveHint') },
];

/** Field form modul. */
export const fieldModul = () => [
  { name: 'nama', label: t('form.nama'), type: 'text', required: true },
  { name: 'kode', label: t('form.kode'), type: 'text', mono: true, hint: t('form.kodeOtomatisHint') },
  { name: 'path_kode', label: t('form.pathKode'), type: 'text', mono: true },
  { name: 'ringkasan', label: t('form.ringkasan'), type: 'textarea', hint: t('form.ringkasanHint') },
  { name: 'alias_database', label: t('form.aliasDatabase'), type: 'tags', hint: t('form.aliasDatabaseHint') },
  { name: 'kata_kunci', label: t('form.kataKunci'), type: 'tags', hint: t('form.kataKunciHint') },
];

/** Field form menu; opsi halaman standar hanya muncul untuk pola CRUD saat membuat. */
export const fieldMenu = ({ baru }) => [
  { name: 'nama', label: t('form.nama'), type: 'text', required: true },
  { name: 'kode', label: t('form.kode'), type: 'text', mono: true, hint: t('form.kodeOtomatisHint') },
  { name: 'pola', label: t('form.pola'), type: 'select', options: opsi(DAFTAR_POLA_MENU, 'pola'), default: POLA_MENU.LAINNYA },
  { name: 'route', label: t('form.route'), type: 'text', mono: true, placeholder: '/transport/daily' },
  { name: 'path_kode', label: t('form.pathKode'), type: 'text', mono: true },
  { name: 'ringkasan', label: t('form.ringkasan'), type: 'textarea', hint: t('form.ringkasanHint') },
  { name: 'alias_database', label: t('form.aliasDatabase'), type: 'tags', hint: t('form.aliasDatabaseHint') },
  { name: 'kata_kunci', label: t('form.kataKunci'), type: 'tags', hint: t('form.kataKunciHint') },
  ...(baru
    ? [{ name: 'buat_halaman_standar', label: t('form.buatHalamanStandar'), type: 'checkbox', default: true, showIf: { field: 'pola', equals: POLA_MENU.CRUD } }]
    : []),
];

/** Field form halaman. */
export const fieldHalaman = () => [
  { name: 'nama', label: t('form.nama'), type: 'text', required: true },
  { name: 'kode', label: t('form.kode'), type: 'text', mono: true, hint: t('form.kodeOtomatisHint') },
  { name: 'jenis', label: t('form.jenis'), type: 'select', options: opsi(DAFTAR_JENIS_HALAMAN, 'jenis'), default: 'lainnya' },
  { name: 'route', label: t('form.route'), type: 'text', mono: true },
  { name: 'file_utama', label: t('form.fileUtama'), type: 'lines', mono: true, hint: t('form.fileUtamaHint') },
  { name: 'kata_kunci', label: t('form.kataKunci'), type: 'tags', hint: t('form.kataKunciHint') },
];
