# DK Docs

Website internal (tanpa login, jaringan internal) untuk developer:

1. **Belajar sistem**: baca dokumentasi singkat per Repo > Modul > Menu > Halaman tanpa membuka kode.
2. **Lacak perubahan**: cari dan telusuri CR/B beserta pesan pengerjaannya.

Dokumentasi tidak ditulis oleh website. Alurnya:

```
Website buat prompt -> dijalankan agen di repo target -> agen tulis JSON ke doc-generated/
 -> JSON diimpor -> developer review & edit -> Simpan (langsung final)
```

Status: prototype, Fase 1-5 dari `PROMPT_BUILD_DK_DOCS.md` selesai. Skema database: `schema.sql`. Konteks untuk Kiro: `.kiro/steering/project-context.md`.

## Teknologi

Next.js 16 (App Router), React 19, Tailwind 4, awilix (DI), mysql2 (tanpa ORM), zod 4, `@dnd-kit`. Versi di-pin. UI dan komentar kode berbahasa Indonesia (`src/locales/id_ID.json`).

## Menjalankan

```powershell
npm install
Copy-Item .env.example .env     # isi koneksi database
npm run db:init                 # buat skema (dilewati jika sudah ada)
npm run db:seed                 # data contoh DK Apps -> Transport (opsional)
npx next dev -p 3100            # development (restart bila ubah kode di src/di/)
npm run build ; npm run start   # produksi
```

Di PowerShell, `npm run dev -- -p 3100` membuang `--`, gunakan `npx next dev`.

## Konfigurasi

- **`.env`**: `DB_*` (database `dk_docs`), `SUMBER_DB_*` (database sumber CR/B, hanya dibaca), `UPLOAD_DIR`, `SERVER_ID` (2 digit, wajib beda per server yang menulis ke database yang sama). Tidak di-commit.
- **ID**: semua primary key `BIGINT UNSIGNED` tanpa AUTO_INCREMENT, dibuat `src/utils/idGenerator.js` (`<timestamp ms><SERVER_ID><counter>`, 17-18 digit) lewat DI `idGen`. Di JavaScript ID **selalu string** (pool mysql2 memakai `bigNumberStrings`, jadi `COUNT(*)` juga string). Jangan `Number(id)`. Urutan `ORDER BY id` mengikuti waktu; counter hanya 2 digit sehingga bila >= 100 ID dibuat dalam satu milidetik urutan bisa tidak naik. Script (`db:seed`, `db:migrasi-id`) memakai `SCRIPT_SERVER_ID` (default `99`).
- **Migrasi ID**: `npm run db:migrasi-id` (opsi `-- --db=<nama>` atau `-- --dump=<berkas>`) mencadangkan data ke `backup/*.json`, membuat ulang skema dari `schema.sql`, lalu mengisi ulang dengan ID baru beserta foreign key dan id poin di snapshot versi. Menolak berjalan bila database sudah memakai skema baru.
- **Akses lewat IP/perangkat lain (dev)**: `allowedDevOrigins` di `next.config.mjs` (restart `next dev` setelah diubah). Tambahkan pola bila rentang IP jaringan berbeda.
- **`WEBFUZO_URL_CR` / `WEBFUZO_URL_B`** (opsional): template URL halaman CR/B di website webfuzo dengan placeholder `{nomor}` (nomor sumber apa adanya, di-URL-encode). Dibaca lewat `src/config/webfuzo.config.js`. Kosong = tombol "Lihat dokumen" di detail perubahan disembunyikan. Contoh ada di `.env.example`.
- **Tabel `poin_perubahan`** (tabel ke-29): `db:init` tidak mengubah database yang sudah terpasang. Jalankan `npm run db:migrasi-poin-perubahan` (idempoten, hanya `CREATE TABLE IF NOT EXISTS`).
- **`src/config/sumber.config.js`**: pemetaan tabel sumber. Tipe ditentukan **tabel**, bukan awalan nomor:
  - CR: `cr_history_dev` + `cr` (modul dan menu mentah)
  - B: `cr_monitoring_bugs_history` + `cr_monitoring_bugs`
- **Halaman `/pengaturan`**: batas karakter dan kalimat poin, ukuran kelompok blueprint, `mode_analisis_blueprint` dan `mode_rapikan_bahasa` (`aturan` | `ai`; `ai` belum tersedia, otomatis memakai `aturan`).

## Arsitektur

```
*.jsx -> <modul>.controller.ts -> <modul>.usecase.ts -> <modul>.model.js (semua SQL)
```

- DI global di `src/di/container.js`; dependency tidak dibuat di dalam function.
- Ubah data lewat Server Actions (`<modul>.actions.js`); API HTTP lewat satu route `src/app/api/v1/[modul]/[[...path]]` yang membaca `<modul>.routes.js`.
- `src/app/` hanya routing; komponen halaman ada di `src/modules/<modul>/`.

| Modul | Fungsi |
|---|---|
| `repo`, `modul`, `menu`, `halaman` | CRUD registry, alias, kata kunci |
| `dokumentasi` | Poin, beta/live, versi, gambar, DocPolisher |
| `pencarian`, `layout` | Palet Ctrl+K, sidebar |
| `sync`, `perubahan` | Sync CR/B, pemetaan, daftar, riwayat |
| `tautan` | Tautan poin dokumentasi ke CR/B (`poin_perubahan`), status pending/aktif, chip nomor |
| `prompt`, `impor` | Generator prompt A/B/C, impor + review + simpan |
| `blueprint` | Poin, pencocokan, kelompok, urutan, prompt D; BlueprintAnalyzer, ModuleMatcher |

Template prompt: `src/templates/prompts/*.md`. Titik AI (BlueprintAnalyzer, ModuleMatcher, DocPolisher) punya `*.kontrak.js`, `aturan.*.js` (berfungsi), dan `ai.*.js` (stub).

## Fitur singkat

- **Registry dan dokumentasi**: CRUD, editor poin (drag, beta/live, peringatan panjang), jadikan semua live, gambar, versi otomatis, pencarian FULLTEXT.
- **Sync CR/B**: pratinjau dikelompokkan (baru, berubah di sumber, sudah tersimpan, hilang di sumber) dengan tombol Pilih semua / Batal pilih semua per kelompok dan penghitung "n dari m dipilih" (kelompok hilang tidak pernah dicentang otomatis). Simpan hanya menyimpan pesan yang dicentang; pesan baru yang tidak dicentang dicatat di `perubahan_pesan_abaikan` agar tidak dicentang lagi di sync berikutnya; pemetaan nama mentah ke modul/menu lewat alias; filter dan pencarian di `/perubahan`; tab Riwayat di modul, menu, halaman.
- **Prompt dan impor**: prompt per repo dengan `unique_id` bersama (salin/unduh `.md`); impor JSON divalidasi terhadap sesi, direview per modul sampai poin, disimpan dalam satu transaksi.
- **Tautan poin ke CR/B** (`poin_perubahan`): saat impor `usulan_perubahan` disimpan, tiap poin yang ditambah/diubah ditautkan ke CR/B sesinya (`teks_poin` = salinan teks saat itu). Chip berisi nomor CR/B (biru CR, merah muda B) tampil di samping poin pada tampilan baca dan editor (hanya status `aktif`/`pending`); klik membuka detail CR/B. Status:
  - `aktif`: poin masih hasil CR/B itu. `pending`: ditahan, dipilih dari menu chip (Pending / Aktifkan kembali) atau tombol Pending di review impor (berlaku saat Simpan); poin tampil redup, tercoret, berlabel "pending" (baca, editor, pencarian), tidak ikut dibandingkan/diubah/dihapus oleh `sinkron_modul`, dan `tambah` yang sama/mirip dengannya dilewati.
  - `sudah_berubah`: hanya diberi impor `sinkron_modul` saat poin bertautan CR/B dihapus atau diubah (item yang dibatalkan di review tidak mengubah status). `teks_poin` tetap teks lama; tautan tidak dihapus.
  - Poin dihapus lewat jalur apa pun: tautan tetap, `poin_id` menjadi NULL (FK `ON DELETE SET NULL`), riwayat memakai `teks_poin` ("poin sudah tidak ada"). Tanpa backfill data lama.
  - Detail CR/B memuat "Poin dokumentasi terkait" (modul > menu > halaman, badge status, nama developer dari `perubahan_pesan.user_name`). Daftar Perubahan punya filter dan badge "sudah masuk dokumentasi" (ada `poin_perubahan` atau `perubahan_dampak`).
  - Prompt memuat poin dengan penanda `[id: ...]`, `[CR/B nomor]`, dan `[PENDING]`; JSON agen boleh membawa `poin_id` opsional pada `ubah[]` dan `hapus[]` (`hapus` boleh teks atau `{ teks, poin_id }`).
- **Blueprint**: rapikan poin, cocokkan ke modul, kelompokkan per modul, urutkan dengan alasan, satu prompt per kelompok. Laporan agen tidak diimpor.
- **Titik AI**: mode dibaca dari pengaturan; kolom `poin_dokumentasi.asal` = `manual | impor | aturan | ai`.

## Aturan penting

- Simpan = final; stub dilepas saat poin tersimpan; poin hasil atau perubahan impor berstatus `beta`.
- Dependensi impor hanya ditambah. Aksi `hapus` pada menu/halaman di JSON benar-benar menghapus.
- Repo, modul, dan menu tidak bisa dihapus selama masih punya anak.
- Jenis impor: `usulan_perubahan` (membuat tautan CR/B), `dokumentasi_baru`, `audit_bugfix`, `sinkron_modul` (menyamakan satu modul dengan kode saat ini, memberi status `sudah_berubah`), dan blueprint.
- Aksi pending selalu dari konteks satu CR/B tertentu (satu poin bisa punya beberapa tautan); poin dianggap pending bila minimal satu tautannya pending.
- Blueprint: tiap poin harus punya modul pemilik sebelum prompt dibuat; menyimpan ulang poin atau pencocokan menghapus kelompok. Pemilik poin hanya saran heuristik, cek manual.

## Info repo, health, dan beranda dashboard

- **Info repo**: tabel `repo` punya `url_git`, `url_beta`, `url_live` (opsional, diisi manual lewat form repo; hanya `http`/`https`, tanpa user/password, maks 500 karakter, validasi di `src/utils/validasiUrl.js`). URL beta dan live ditampilkan sebagai tautan (tanpa badge status di UI); statusnya hanya dilaporkan oleh endpoint health (lihat bawah). Tabel `repo_teknologi` (`repo_id`, `nama`, `versi`, `sumber_file`; UNIQUE `repo_id + nama`) menyimpan bahasa/runtime dan framework utama; bisa dikoreksi manual di grup "Info repo" pada halaman repo. Info ini bukan poin dokumentasi.
- **Kontrak JSON agent**: kunci opsional `teknologi` di tingkat atas, array `{ nama, versi, sumber_file }`. Template `dokumentasi_baru`, `usulan_perubahan`, dan `sinkron_modul` meminta agent membaca file manifest dan mengisinya hanya bila pertama kali atau ada yang berubah (teknologi tercatat disertakan sebagai referensi). Halaman review impor menampilkan blok "Info repo" (baru / versi lama → baru) dengan kotak centang; yang dicentang di-upsert saat Simpan dalam transaksi yang sama.
- **Health** (`GET /api/v1/health`): mempertahankan `status`, `database`, `waktu`, dan menambah `komponen.database_docs` / `komponen.database_sumber` (`ok` atau `error` + `alasan` singkat yang aman) dengan batas waktu 3 detik per komponen. `status` menjadi `degraded` bila ada komponen gagal; kode HTTP tidak berubah. Halaman Sync memanggilnya dan menampilkan Online / Bermasalah / Offline (cache 10 detik, tombol Cek ulang). Tombol ambil data nonaktif saat Offline atau saat `database_sumber` error. Status ini hanya ada di halaman Sync. Setiap pemanggilan health juga memeriksa `url_beta` dan `url_live` semua repo (paralel, `HEAD` lalu `GET` bila ditolak, batas 2,5 detik per URL, redirect tidak diikuti, isi respons tidak dibaca) dan menambahkan `repo[]` (`beta`/`live`: `url`, `status` = `online` | `bermasalah` | `offline`, `kode_http`, `alasan`) serta `ringkasan_url`. `online` = HTTP 2xx/3xx atau 401/403; `bermasalah` = HTTP 4xx/5xx lain; `offline` = tidak terhubung (ditolak, DNS, waktu habis, sertifikat). `status` utama tetap hanya mencerminkan database, jadi situs beta/live yang mati tidak membuat DK Docs `degraded`.
- **Pemeriksaan SSL per URL** (`health.sertifikat.js`): untuk URL `https`, health ikut membaca sertifikat (`tls.connect` ke host dan port dari URL itu, `rejectUnauthorized: false` agar sertifikat tetap terbaca) paralel dengan pemeriksaan HTTP, batas 3 detik. Hasilnya field `ssl` pada `beta`/`live`: `berlaku_sampai` (ISO), `berlaku_sampai_teks` (WIB, contoh `25 Desember 2026, 14.32 WIB`, atau `tidak tersedia` bila sertifikat tidak terbaca), `sisa_hari`, `pesan_error` (daftar pesan Bahasa Indonesia, **hanya terisi bila SSL error**: rantai tidak lengkap/tidak cocok, kedaluwarsa, belum berlaku, self-signed, nama host tidak cocok), dan `peringatan` (sisa < 30 hari; bukan error dan tidak mengubah status). URL `http` menghasilkan `ssl: null`. Klasifikasi: server menjawab tetapi `pesan_error` tidak kosong menjadi `bermasalah` (alasan = pesan SSL pertama); galat sertifikat tidak lagi dilaporkan `offline`; `offline` hanya bila server tidak terjangkau (tanpa pesan SSL). Pemeriksaan HTTP kini memakai `node:http(s)` dengan `rejectUnauthorized: false` (hanya `HEAD`/`GET` tanpa data sensitif).
- **CA internal**: bila host internal memakai CA yang tidak ada di daftar CA bawaan Node, pesan "Rantai sertifikat tidak lengkap atau tidak cocok" akan muncul. Atur `NODE_EXTRA_CA_CERTS=<path file CA .pem>` sebagai **environment proses** saat aplikasi dijalankan (shell atau process manager); Node membacanya saat start sehingga **tidak berfungsi bila hanya ditaruh di `.env`**. Pesan error rantai tidak disembunyikan sebagai solusinya.
- **Beranda `/`** adalah dashboard: filter repo (banyak) dan rentang tanggal (7/30/90 hari, tahun ini, kustom; bawaan 30 hari) di query string `?repo=1,2&dari=YYYY-MM-DD&sampai=YYYY-MM-DD`, lalu enam widget (kartu ringkasan, antrean "Perlu tindakan", peta modul, aktivitas terbaru, poin beta, terakhir dibuka). Daftar repo lama dipindah ke `/repo`. Tanggal CR/B memakai tanggal pesan dari sumber (`perubahan_pesan.tanggal`); CR/B masuk repo bila modulnya (lewat pemetaan pesan atau `perubahan_dampak`) milik repo itu; CR/B tanpa modul hanya muncul pada "Semua repo". "Sudah masuk dokumentasi" = punya baris `poin_perubahan` atau `perubahan_dampak`. Satu query agregat per widget (`dashboard.model.js`), dimuat paralel dengan Suspense + skeleton, galat per widget, hasil di-cache 2 menit (`unstable_cache`, tag `dashboard`) dan dikosongkan (`updateTag`) oleh Server Action yang mengubah impor, Sync, repo, modul, menu, halaman, poin, flag, dan tautan. Parameter `lihat=crb|peta|stub|beta` memperluas satu daftar sampai 100 baris. "Terakhir dibuka" memakai `localStorage` (tanpa query database).
- **Migrasi database yang sudah terpasang**: `npm run db:migrasi-info-repo` (kolom URL + `repo_teknologi`) dan `npm run db:migrasi-indeks-dashboard` (indeks tambahan). `schema.sql` (30 tabel) sudah memuat keduanya untuk instalasi baru.

## Uji CR (Fase 6, 6A sampai 6D)

Menu **Uji CR** (`/pengujian`) untuk tim testing; spesifikasi di `PROMPT_FASE6_UJI_CR.md`. Berdiri sendiri: CR ID hanya teks unik, tidak memakai Sync maupun tabel Blueprint. DK Docs tidak menjalankan tes; ia merakit prompt untuk agen di repo lokal, lalu (6B) menerima hasilnya.

- **Pasang skema**: `npm run db:uji-cr` (menjalankan `schema_uji_cr.sql` setelah `db:init`; aman diulang). Menambah 10 tabel `pengujian*` dan nilai `pengujian` pada ENUM `sesi_prompt.jenis`. Belum digabung ke `schema.sql`.
- **Uji CR baru** (`/pengujian/baru`): isi CR ID, tempel blueprint, pecah menjadi poin (pemecah poin yang sama dengan Blueprint), edit/gabung/pecah/urutkan poin, lalu pilih target tiap poin: modul saja atau modul + menu. Repo diturunkan dari modul, jadi satu poin bisa mencakup beberapa repo.
- **Hasil simpan**: `pengujian`, `pengujian_poin`, `pengujian_poin_target`, putaran 1 (`unique_id` baru), sel poin x repo, dan satu `sesi_prompt` (`jenis = 'pengujian'`) per repo yang hanya memuat poin repo itu. Halaman detail (`/pengujian/[id]`) menampilkan poin, target, pengingat tools menurut platform repo, dan tab prompt per repo (Salin, Unduh `prompt_uji_<kodeRepo>_<uniqueId>.md`).
- **Status** tidak disimpan kecuali status skenario: status sel, status poin, dan hitungan dihitung saat tampil (`pengujian.status.js`). Level CR hanya hitungan, tanpa kesimpulan lulus/gagal.
- Template prompt: `src/templates/prompts/uji_cr.md` (format JSON hasil uji ditulis langsung di template).
- **Impor hasil uji** (6B, `/pengujian/[id]/impor`): unggah/tempel JSON hasil agen (format di `uji_cr.md`, contoh di `docs/contoh/uji_cr_hasil_contoh.json`) dan berkas bukti (PNG, JPG, GIF, WebP, TXT, LOG; maks 10 MB per berkas, 50 MB total, isi diperiksa dari byte). Pratinjau menampilkan hitungan skenario, daftar skenario, analisis perubahan, pernyataan tools, dan peringatan; Simpan memvalidasi ulang di server dan menyimpan dalam satu transaksi (`pengujian_skenario`, `pengujian_perubahan`, `pengujian_putaran_repo`, `impor_hasil`), lalu menulis bukti ke `uploads/pengujian/<id pengujian>/p<putaran>/<kodeRepo>/`.
  - Validasi: `unique_id`, `repo`, `cr_id` (tanpa membedakan huruf besar/kecil), dan `putaran` harus cocok; nomor `poin` pada skenario/analisis harus poin yang ditugaskan pada repo itu di putaran itu; kode skenario unik; semua bukti yang dirujuk harus ikut diunggah. Impor ulang repo yang sama pada putaran yang sama **menggantikan** hasil sebelumnya (bukti lama yang tak dirujuk dihapus). Bagian `lingkungan` di JSON hanya ditampilkan di pratinjau, tidak disimpan.
  - Kotak centang "Buat versi PDF baru" tampil nonaktif sampai 6D. Impor tidak muncul di daftar `/impor` (jenis `pengujian` disaring).
- **Halaman detail** memuat matriks poin x repo (klik sel membuka skenario, bukti, dan riwayat putaran sel), bagian "Di luar blueprint" (skenario tanpa poin dan analisis `outside`/`risky`), riwayat putaran (tanggal impor, hash HEAD, tools yang belum tersedia), dan prompt putaran terakhir. Bukti dilayani `GET /api/v1/pengujian/bukti?skenario_id=&nama=` (nama harus tercatat pada skenarionya).
- **Format CR ID**: diinput dan disimpan sebagai nomor polos (mis. `202502030002`; awalan `CR`/`B` yang ikut diketik dibuang, sehingga `CR202502030002` dan `202502030002` dianggap sama dan tidak bisa dobel). Di prompt Uji CR dan PDF nomor tampil seperti pesan commit, `CR202502030002` (awalan mengikuti tipe di tabel `perubahan` bila nomornya sudah di-Sync, bawaan `CR`), termasuk pada `git log --grep` dan `"cr_id"` di JSON. Impor hasil menerima `cr_id` JSON berawalan maupun polos. Pencocokan referensi hasil uji di prompt usulan perubahan juga memakai bentuk polos.
- **Uji ulang** (6C, `/pengujian/[id]/ulang`): pilih sel poin x repo (yang belum PASS tercentang bawaan; sel PASS boleh dicentang untuk regresi) dan/atau tambah poin baru (nomor lanjutan, `ditambah_putaran = N`). Membuat putaran N+1 dengan `unique_id` baru, `pengujian_putaran_sel` hanya untuk sel terpilih, dan satu prompt hanya untuk repo yang punya sel terpilih. Prompt memuat hasil putaran sebelumnya untuk sel itu (skenario belum lulus beserta alasannya) dan hanya commit sejak `hash_head` terakhir yang tercatat untuk repo itu (`git log <hash>..<branch>`; tanpa hash, semua commit ber-CR ID). Status sel mengikuti putaran terbaru yang mencakupnya, jadi sel yang baru dijadwalkan ulang tampil "Belum diuji" sampai hasilnya diimpor; riwayat putaran sel tetap terlihat di panelnya.
- **Catatan keputusan** (6C): satu teks opsional per sel (`pengujian_catatan`) di panel sel; kosong menghapus, tanggal otomatis. Tidak mengubah status. Sel bercatatan diberi penanda ✎ di matriks dan catatannya ikut masuk PDF.
- **PDF** (6D): dibuat di DK Docs dari database dengan `pdfkit` (tanpa browser headless) dan `sharp` (gambar bukti dikecilkan ke JPEG lebar maks 900 px; GIF/WebP ikut terlampir). Satu PDF kumulatif per Uji CR. Setiap **Buat versi baru** menambah baris `pengujian_pdf` dan berkas `uploads/pengujian/<id>/pdf/pengujian_<CR-ID>_v<versi>.pdf`; versi lama tidak ditimpa dan bisa diunduh berulang lewat `GET /api/v1/pengujian/pdf?id=`. Nomor versi dipesan dengan mencatat barisnya lebih dulu, jadi dua permintaan bersamaan mendapat nomor berbeda. Isi baku: judul dan metadata repo (branch, HEAD), ringkasan hitungan (poin dan skenario), pernyataan tools, blueprint dan matriks, analisis perubahan, riwayat per poin, skenario terbaru per sel, detail FAIL (termasuk yang pernah terjadi, dengan catatan keputusan) beserta alasan BLOCKED/NOT EXECUTED, dan lampiran gambar. Tanpa label final dan tanpa kesimpulan lulus/gagal.
- **Penanda "PDF belum memuat hasil terbaru"**: muncul bila ada hasil yang diimpor atau catatan keputusan yang berubah setelah versi terakhir (atau belum ada PDF padahal sudah ada hasil). Membuat putaran atau menambah poin tanpa hasil tidak memicunya; menghapus catatan juga tidak terdeteksi. Kotak centang "Buat versi PDF baru" di halaman impor (bawaan aktif) membuat PDF setelah hasil tersimpan; bila PDF gagal, hasil tetap tersimpan dan alasannya ditampilkan.
- **Referensi di prompt usulan perubahan**: bila ada Uji CR dengan CR ID sama dengan nomor perubahan (tanpa membedakan huruf besar/kecil), prompt `usulan_perubahan` per repo memuat bagian `## Hasil uji CR (referensi)`: poin PASS pada repo itu beserta skenario ringkas dan kategori perubahan, poin FAIL/BLOCKED hanya sebagai catatan "dokumentasinya mungkin berubah", dengan penegasan bahwa kode yang benar bila berbeda dan PASS bukan berarti live. Tanpa pengujian atau tanpa hasil berarti, prompt identik dengan sebelumnya.

## Penyimpangan dari spesifikasi

- Project di root workspace; satu route API untuk semua modul; ada `<modul>.actions.js` dan banyak helper di `src/utils/`.
- Tipe CR/B dari tabel sumber; nama menu mentah (`cr.menu`) ikut dipakai untuk pemetaan.
- `schema.sql` diubah: `perubahan_pesan` memakai `user_id` + `user_name`, ditambah `menu_sumber`, indeks developer diarahkan ke `user_name`.
- Template C ditambah `{{catatan_audit}}`; template D dibuat di Fase 4.
- Tidak dibuat: `apiClient`, `guard`, `pinia`, `router`, `sync.service.js`, UI kelola dependensi manual.
- Database saat pengerjaan MariaDB 11.8 (bukan MySQL 8). Tanpa test otomatis sesuai aturan kerja.

## Keamanan

Query parameterized; identifier tabel sumber divalidasi; pool sumber dipaksa read-only; unggah gambar dicek dari isi berkas (maks 5 MB, nama UUID); rencana review divalidasi ulang di server. **Tidak ada autentikasi**, hanya untuk jaringan internal.

## Belum diuji dan perlu dilakukan

- Belum diuji: interaksi browser (drag, dropdown, Salin, unggah, tombol Pilih semua di Sync, menu chip CR/B, tombol Pending di review), `next start`, MySQL 8 asli.
- Ganti user `SUMBER_DB_*` dari `root` ke user read-only.
- Cek manual alur utama di browser.
- Untuk AI sungguhan: isi metode di tiga berkas `ai.*.js`, lalu ubah mode di `/pengaturan`.

## Konvensi kode

Mengikuti `.kiro/steering/working-rules.md`: clean architecture + DI, komentar Indonesia pada tiap function dan percabangan, nesting maksimal 2-3 level, tanpa test otomatis, kode tak terpakai tidak dihapus, tidak commit otomatis.
