import 'server-only';

/** Model layout: data ringan untuk pohon sidebar (repo -> modul -> menu). */
export function buatLayoutModel({ db }) {
  return {
    /** Semua repo (id, nama). */
    repo() {
      return db.rows('SELECT id, nama FROM repo ORDER BY nama');
    },
    /** Semua modul (id, repo, nama, stub). */
    modul() {
      return db.rows('SELECT id, repo_id, nama, is_stub FROM modul ORDER BY nama');
    },
    /** Semua menu (id, modul, nama, stub). */
    menu() {
      return db.rows('SELECT id, modul_id, nama, is_stub FROM menu ORDER BY urutan, nama');
    },
  };
}
