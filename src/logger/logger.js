/** Format satu baris log: waktu ISO, level, pesan. */
function formatBaris(level, pesan) {
  return `[${new Date().toISOString()}] ${level.toUpperCase()} ${pesan}`;
}

/** Logger sederhana ke console; satu tempat agar mudah diganti ke file/layanan lain nanti. */
export const logger = {
  /** Catat informasi biasa. */
  info(pesan) {
    console.info(formatBaris('info', pesan));
  },
  /** Catat peringatan. */
  warn(pesan) {
    console.warn(formatBaris('warn', pesan));
  },
  /** Catat error beserta stack bila ada. */
  error(pesan, error) {
    console.error(formatBaris('error', pesan), error?.stack ?? error ?? '');
  },
};
