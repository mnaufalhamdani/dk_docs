import { z } from 'zod';
import { DAFTAR_BAGIAN, DAFTAR_JENIS_HALAMAN, DAFTAR_POLA_MENU, DAFTAR_STATUS_POIN } from '@/enums';
import { idSchema } from '@/utils/schemaDasar';
import { teknologiAgenSchema } from '@/modules/repo/repo.schema';

/** Kode id_modul/id_menu/id_halaman: huruf kecil, angka, '-' atau '_'. */
const kode = z
  .string()
  .trim()
  .min(1, 'Kode wajib diisi.')
  .max(80, 'Kode maksimal 80 karakter.')
  .regex(/^[a-z0-9_-]+$/, "Kode hanya boleh huruf kecil, angka, '-' atau '_'.");

/** Teks wajib berisi dengan batas panjang. */
const teks = (maks) => z.string().trim().min(1, 'Tidak boleh kosong.').max(maks, `Maksimal ${maks} karakter.`);

/** Teks opsional: kosong / null dianggap tidak diisi. */
const teksOpsional = (maks) =>
  z
    .string()
    .trim()
    .max(maks, `Maksimal ${maks} karakter.`)
    .nullish()
    .transform((v) => (v == null || v === '' ? null : v));

/** Satu entri bergantung_pada dari agen. */
const dependensiAgen = z.object({
  nama: teks(150),
  route: teksOpsional(300),
  keterangan: teksOpsional(300),
});

/** id poin (string digit) yang boleh disertakan agen agar merujuk poin lama dengan pasti; kosong = null. */
const poinIdAgen = idSchema.nullish().transform((v) => v ?? null);

/**
 * Operasi poin pada satu bagian: tambah / ubah / hapus.
 * ubah[].poin_id opsional. hapus[] boleh berupa teks saja, atau { teks, poin_id }; keduanya
 * dinormalkan menjadi objek { teks, poin_id } agar pemakai di hilir hanya mengenal satu bentuk.
 */
const operasiBagian = z.strictObject({
  tambah: z.array(teks(2000)).default([]),
  ubah: z.array(z.object({ poin_id: poinIdAgen, dari: teks(2000), menjadi: teks(2000) })).default([]),
  hapus: z
    .array(
      z.union([
        teks(2000).transform((isi) => ({ teks: isi, poin_id: null })),
        z.object({ teks: teks(2000), poin_id: poinIdAgen }),
      ]),
    )
    .default([]),
});

/** Objek bagian: hanya kunci bagian yang valid (kunci lain ditolak dengan pesan jelas). */
const bagianAgen = z.strictObject(Object.fromEntries(DAFTAR_BAGIAN.map((b) => [b, operasiBagian.optional()])));

/** Halaman dari agen. Halaman baru hanya boleh memakai `tambah`. */
const halamanAgen = z
  .object({
    id_halaman: kode,
    aksi: z.enum(['baru', 'ubah', 'hapus']),
    jenis: z.enum(DAFTAR_JENIS_HALAMAN).default('lainnya'),
    nama: teks(150),
    route: teksOpsional(300),
    file_utama: z.array(z.string().trim().min(1).max(500)).default([]),
    bagian: bagianAgen.default({}),
    bergantung_pada: z.array(dependensiAgen).default([]),
  })
  .superRefine((h, ctx) => {
    const adaUbahHapus = Object.values(h.bagian).some((b) => b && (b.ubah.length > 0 || b.hapus.length > 0));
    // halaman baru tidak punya poin lama yang bisa diubah/dihapus
    if (h.aksi === 'baru' && adaUbahHapus) ctx.addIssue({ code: 'custom', path: ['bagian'], message: 'Halaman baru hanya boleh memakai "tambah".' });
  });

/** Menu dari agen. */
const menuAgen = z.object({
  id_menu: kode,
  aksi: z.enum(['baru', 'ubah', 'hapus']),
  nama: teks(150),
  pola: z.enum(DAFTAR_POLA_MENU).default('lainnya'),
  route: teksOpsional(300),
  path_kode: teksOpsional(500),
  ringkasan: teksOpsional(300),
  bergantung_pada: z.array(dependensiAgen).default([]),
  halaman: z.array(halamanAgen).default([]),
});

/** Modul dari agen. */
const modulAgen = z.object({
  id_modul: kode,
  aksi: z.enum(['baru', 'ubah']),
  nama: teks(150),
  path_kode: teksOpsional(500),
  ringkasan: teksOpsional(300),
  bergantung_pada: z.array(dependensiAgen).default([]),
  menu: z.array(menuAgen).default([]),
});

/** Dokumen JSON hasil agen (bagian 8 prompt). */
export const dokumenAgenSchema = z
  .object({
    unique_id: z.string().trim().regex(/^[a-z0-9]{8}$/, 'unique_id harus 8 karakter huruf kecil/angka.'),
    repo: kode,
    jenis: z.enum(['usulan_perubahan', 'dokumentasi_baru', 'audit_bugfix', 'sinkron_modul']),
    perubahan: teksOpsional(60),
    hash_terakhir_diaudit: teksOpsional(64),
    selisih_dokumentasi: z.array(z.string().trim().min(1).max(1000)).default([]),
    // teknologi repo (opsional): bahasa/runtime dan framework utama beserta versinya
    teknologi: z.array(teknologiAgenSchema).max(50, 'Terlalu banyak teknologi.').default([]),
    modul: z.array(modulAgen),
  })
  .superRefine((d, ctx) => {
    // usulan perubahan wajib menyebut nomor CR/B agar bisa dicocokkan dengan sesi
    if (d.jenis === 'usulan_perubahan' && !d.perubahan) ctx.addIssue({ code: 'custom', path: ['perubahan'], message: 'Wajib diisi untuk usulan_perubahan.' });
    // audit wajib membawa hash HEAD agar acuan audit berikutnya bisa diperbarui
    if (d.jenis === 'audit_bugfix' && !d.hash_terakhir_diaudit) ctx.addIssue({ code: 'custom', path: ['hash_terakhir_diaudit'], message: 'Wajib diisi untuk audit_bugfix.' });
  });

/** Schema pembuatan impor dari teks JSON mentah. */
export const buatImporSchema = z.object({
  json: z.string().min(2, 'JSON kosong.').max(2_000_000, 'JSON terlalu besar (maksimal 2 MB).'),
});

// ---------- rencana yang diedit di halaman review lalu dikirim kembali ----------

const kunci = z.string().max(60);

/** Pilihan penanganan dependensi yang belum dikenal. */
const depRencana = z.object({
  kunci,
  nama: teks(150),
  route: teksOpsional(300),
  keterangan: teksOpsional(300),
  tingkat: z.enum(['modul', 'menu', 'halaman']),
  pilihan: z.enum(['tautkan', 'stub', 'abaikan']),
  target_id: z.union([idSchema, z.null()]).default(null),
});

/** Satu operasi poin pada rencana (sudah dicocokkan dengan poin lama). */
const poinRencana = z.object({
  kunci,
  op: z.enum(['tambah', 'ubah', 'hapus']),
  bagian: z.enum(DAFTAR_BAGIAN),
  isi: z.string().trim().max(2000).default(''),
  poin_id: z.union([idSchema, z.null()]).default(null),
  batal: z.boolean().default(false),
  // pilihan "Pending" di review (hanya berarti untuk poin hasil usulan_perubahan yang ditambah/diubah)
  pending: z.boolean().default(false),
  status: z.enum(DAFTAR_STATUS_POIN).default('beta'),
});

const halamanRencana = z.object({
  kunci,
  kode,
  aksi: z.enum(['baru', 'ubah', 'hapus']),
  jenis: z.enum(DAFTAR_JENIS_HALAMAN),
  nama: teks(150),
  route: teksOpsional(300),
  file_utama: z.array(z.string().trim().min(1).max(500)).default([]),
  batal: z.boolean().default(false),
  dependensi: z.array(depRencana).default([]),
  poin: z.array(poinRencana).default([]),
});

const menuRencana = z.object({
  kunci,
  kode,
  aksi: z.enum(['baru', 'ubah', 'hapus']),
  nama: teks(150),
  pola: z.enum(DAFTAR_POLA_MENU),
  route: teksOpsional(300),
  path_kode: teksOpsional(500),
  ringkasan: teksOpsional(300),
  batal: z.boolean().default(false),
  dependensi: z.array(depRencana).default([]),
  halaman: z.array(halamanRencana).default([]),
});

const modulRencana = z.object({
  kunci,
  kode,
  aksi: z.enum(['baru', 'ubah']),
  nama: teks(150),
  path_kode: teksOpsional(500),
  ringkasan: teksOpsional(300),
  batal: z.boolean().default(false),
  dependensi: z.array(depRencana).default([]),
  menu: z.array(menuRencana).default([]),
});

/** Schema penyimpanan: id impor dan pohon modul hasil review. */
export const simpanImporSchema = z.object({
  impor_id: idSchema,
  modul: z.array(modulRencana).max(50, 'Terlalu banyak modul.'),
  // nama teknologi (blok "Info repo") yang dicentang; nilainya diambil ulang dari JSON tersimpan
  teknologi_terpilih: z.array(z.string().trim().min(1).max(100)).max(50).default([]),
});

/** Schema id impor tunggal. */
export const imporIdSchema = idSchema;
