import 'server-only';

/** Model health: satu-satunya akses data adalah ping sederhana ke database. */
export function buatHealthModel({ db }) {
  return {
    /** Mengecek koneksi database dengan query ringan. */
    async ping() {
      await db.first('SELECT 1 AS ok');
      return true;
    },
  };
}
