/** Controller health: meneruskan permintaan cek ke usecase. */
export function buatHealthController({ healthUsecase }) {
  return {
    /** Cek kesehatan aplikasi. */
    cek: () => healthUsecase.cek(),
  };
}
