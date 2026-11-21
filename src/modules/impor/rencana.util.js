// Fungsi murni untuk mengedit pohon rencana review di sisi browser.

/** Nama properti anak yang ditelusuri pada pohon rencana. */
const ANAK = ['menu', 'halaman', 'poin', 'dependensi'];

/** Menerapkan `fn` pada node ber-kunci tertentu dan mengembalikan pohon baru (immutable). */
export function perbaruiNode(node, kunci, fn) {
  // node yang dicari ketemu: ubah node ini
  if (node.kunci === kunci) return fn(node);
  const baru = { ...node };
  for (const k of ANAK) {
    if (Array.isArray(node[k])) baru[k] = node[k].map((anak) => perbaruiNode(anak, kunci, fn));
  }
  return baru;
}

/** Memperbarui node di dalam daftar modul. */
export function perbaruiPohon(pohon, kunci, fn) {
  return pohon.map((m) => perbaruiNode(m, kunci, fn));
}

/** Menghitung ringkasan jumlah modul/menu/halaman aktif dan operasi poin (mengabaikan yang dibatalkan). */
export function hitungRingkasan(pohon) {
  const r = { modul: 0, menu: 0, halaman: 0, tambah: 0, ubah: 0, hapus: 0 };
  for (const m of pohon) {
    if (m.batal) continue;
    r.modul += 1;
    for (const mn of m.menu) {
      if (mn.batal) continue;
      r.menu += 1;
      for (const h of mn.halaman) {
        if (h.batal) continue;
        r.halaman += 1;
        for (const p of h.poin) if (!p.batal && (p.op !== 'tambah' || p.isi.trim())) r[p.op] += 1;
      }
    }
  }
  return r;
}

/**
 * Memeriksa rencana sebelum dikirim. Mengembalikan pesan kesalahan pertama, atau null bila siap:
 * poin ubah/hapus harus punya sasaran, dependensi "tautkan" harus punya target.
 */
export function periksaSebelumSimpan(pohon) {
  for (const m of pohon) {
    if (m.batal) continue;
    const kesalahan = periksaDependensi(m.dependensi) ?? m.menu.map(periksaMenu).find(Boolean);
    if (kesalahan) return kesalahan;
  }
  return null;
}

/** Pemeriksaan satu menu beserta halamannya. */
function periksaMenu(mn) {
  if (mn.batal) return null;
  const dep = periksaDependensi(mn.dependensi);
  if (dep) return dep;
  for (const h of mn.halaman) {
    if (h.batal) continue;
    const kesalahan = periksaDependensi(h.dependensi) ?? periksaPoin(h);
    if (kesalahan) return kesalahan;
  }
  return null;
}

/** Poin ubah/hapus yang masih aktif wajib sudah dipilih sasarannya; ubah wajib berisi teks. */
function periksaPoin(halaman) {
  for (const p of halaman.poin) {
    if (p.batal || p.op === 'tambah') continue;
    if (!p.poin_id) return `Halaman "${halaman.nama}": ada poin yang belum dipilih sasarannya (atau batalkan poin itu).`;
    if (p.op === 'ubah' && !p.isi.trim()) return `Halaman "${halaman.nama}": isi poin yang diubah tidak boleh kosong.`;
  }
  return null;
}

/** Dependensi "tautkan" wajib punya target. */
function periksaDependensi(daftar) {
  const bermasalah = daftar.find((d) => d.pilihan === 'tautkan' && !d.target_id);
  return bermasalah ? `Dependensi "${bermasalah.nama}": pilih target yang akan ditautkan, atau ganti pilihannya.` : null;
}
