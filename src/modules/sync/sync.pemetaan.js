/**
 * Menyusun baris pemetaan { modul_id, menu_id } dari hasil pencocokan alias database.
 * - modulCocok: [{ modul_id }] alias modul yang cocok dengan nama modul mentah.
 * - menuCocok : [{ menu_id, modul_id }] alias menu yang cocok dengan nama menu mentah.
 * Fungsi murni (tanpa akses database) agar mudah dipahami dan dites.
 */
export function susunPeta(modulCocok, menuCocok) {
  const modulIds = [...new Set(modulCocok.map((m) => m.modul_id))];

  // tidak ada alias modul: nama mentah mungkin level menu, pakai kecocokan menu apa adanya
  if (modulIds.length === 0) {
    return menuCocok.map((m) => ({ modul_id: m.modul_id, menu_id: m.menu_id }));
  }

  const hasil = [];
  for (const modulId of modulIds) {
    // menu yang cocok hanya dipakai bila berada di modul yang cocok (menghindari alias menu umum seperti "UMUM")
    const menuDiModul = menuCocok.filter((m) => m.modul_id === modulId);
    if (menuDiModul.length === 0) {
      hasil.push({ modul_id: modulId, menu_id: null });
      continue;
    }
    for (const m of menuDiModul) hasil.push({ modul_id: modulId, menu_id: m.menu_id });
  }
  return hasil;
}
