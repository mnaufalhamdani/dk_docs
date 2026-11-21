import 'server-only';

/** Usecase layout: menyusun pohon sidebar beserta penanda beta/stub. */
export function buatLayoutUsecase({ layoutModel, dokumentasiModel }) {
  return {
    /** Pohon repo -> modul -> menu. Halaman sengaja tidak dimasukkan. */
    async pohon() {
      const [repo, modul, menu, beta] = await Promise.all([
        layoutModel.repo(),
        layoutModel.modul(),
        layoutModel.menu(),
        dokumentasiModel.idBeta(),
      ]);
      const modulBeta = new Set(beta.modul);
      const menuBeta = new Set(beta.menu);

      const menuPerModul = new Map();
      for (const m of menu) {
        const daftar = menuPerModul.get(m.modul_id) ?? [];
        daftar.push({ id: m.id, nama: m.nama, stub: !!m.is_stub, beta: menuBeta.has(m.id) });
        menuPerModul.set(m.modul_id, daftar);
      }
      const modulPerRepo = new Map();
      for (const m of modul) {
        const daftar = modulPerRepo.get(m.repo_id) ?? [];
        daftar.push({ id: m.id, nama: m.nama, stub: !!m.is_stub, beta: modulBeta.has(m.id), menu: menuPerModul.get(m.id) ?? [] });
        modulPerRepo.set(m.repo_id, daftar);
      }
      return repo.map((r) => ({ id: r.id, nama: r.nama, modul: modulPerRepo.get(r.id) ?? [] }));
    },
  };
}
