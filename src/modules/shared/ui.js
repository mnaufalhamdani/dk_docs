// Kelas Tailwind yang dipakai berulang agar tampilan konsisten.

/** Dasar semua tombol. */
const dasarTombol =
  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50';

/** Tombol utama (aksen). */
export const tombolUtama = `${dasarTombol} bg-accent text-white hover:opacity-90`;

/** Tombol sekunder (garis tepi). */
export const tombolSekunder = `${dasarTombol} border border-line bg-panel text-fg hover:bg-accent-soft`;

/** Tombol bahaya (hapus). */
export const tombolBahaya = `${dasarTombol} border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950`;

/** Input teks / select / textarea. */
export const inputDasar =
  'w-full rounded-md border border-line bg-panel px-3 py-1.5 text-sm text-fg placeholder:text-muted';

/** Kartu / panel. */
export const kartu = 'rounded-lg border border-line bg-panel';
