import { t } from '@/utils/i18n';

/** Warna per status: PASS hijau, FAIL merah, BLOCKED amber, belum diuji abu-abu. */
const WARNA = {
  PASS: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
  FAIL: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  BLOCKED: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  NOT_EXECUTED: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  BELUM: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

/** Lencana status uji (status poin/sel yang dihitung, bukan yang disimpan). */
export default function BadgeStatusUji({ status }) {
  return <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${WARNA[status] ?? WARNA.BELUM}`}>{t(`pengujian.status.${status}`)}</span>;
}
