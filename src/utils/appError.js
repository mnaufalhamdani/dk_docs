/**
 * Error aplikasi yang membawa kode status HTTP agar bisa diterjemahkan
 * secara seragam oleh responseHandler / middleware (400 input, 404 tidak ada, 409 bentrok).
 */
export class AppError extends Error {
  /**
   * @param {string} message pesan yang aman ditampilkan ke user
   * @param {number} status kode status HTTP
   * @param {unknown} detail detail tambahan (opsional), misal daftar isu validasi
   */
  constructor(message, status = 400, detail = null) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.detail = detail;
  }
}

/**
 * Mengecek apakah sebuah error adalah AppError. Memakai nama, bukan instanceof,
 * karena Next.js bisa membundel modul ini lebih dari sekali (layer server berbeda).
 */
export function adalahAppError(error) {
  return error?.name === 'AppError' && typeof error.status === 'number';
}
