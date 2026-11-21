/** Controller layout: menyediakan data pohon sidebar. */
export function buatLayoutController({ layoutUsecase }) {
  return {
    /** Pohon repo -> modul -> menu. */
    pohon: () => layoutUsecase.pohon(),
  };
}
