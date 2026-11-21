# PROMPT: Tambah Fitur "Uji CR" ke DK Docs (Fase 6)

> **Cara pakai:** taruh file ini dan `schema_uji_cr.sql` di root project DK Docs yang sudah berjalan, lalu di chat agent tulis:
> `Baca PROMPT_FASE6_UJI_CR.md lalu kerjakan Fase 6A.`
> Kerjakan **satu sub-fase per permintaan** (6A, 6B, 6C, 6D). Jika tidak disebut, mulai dari 6A.

---

## 1. Konteks dan tujuan

DK Docs sudah berjalan dan ada perubahan dari rancangan awal. **Jangan berasumsi**: baca struktur dan kode project yang sebenarnya lebih dulu (lihat bagian 2).

**Uji CR** adalah menu baru untuk **tim testing**. Fungsinya: merakit prompt pengujian untuk agent, menyimpan hasil ujinya, menampilkan status per poin dan per repo, mendukung uji ulang, dan membuat laporan PDF.

Prinsip:
- Uji CR **berdiri sendiri**. Ia **tidak menarik data seperti Sync CR/B** dan **tidak bergantung pada tabel atau fitur Blueprint** yang sudah ada. CR ID cukup disimpan sebagai teks.
- DK Docs **tidak menjalankan tes**. Tes dijalankan agent di repo lokal tim testing; DK Docs hanya merakit prompt, menerima hasil, menampilkan, dan membuat PDF.
- Agent penguji **tidak mengubah source code** project yang diuji.

Alur:

```
Tim testing: isi CR ID + tempel blueprint (poin) + pilih repo/modul(+menu) tiap poin
 -> DK Docs membuat 1 prompt per repo (satu unique_id per putaran)
 -> agent di tiap repo: pernyataan tools -> analisis commit -> skenario -> eksekusi -> tulis JSON + bukti
 -> impor ke DK Docs -> status per poin x repo
 -> uji ulang (pilih sel yang belum PASS / tambah poin) -> putaran berikutnya
 -> PDF dibuat di DK Docs (versi, bisa diunduh berulang)
```

---

## 2. Aturan pengerjaan

- **Sebelum menulis kode**, baca `rules.md`, `architecture.md`, `project-context.md`, `README.md` (bila ada), lalu periksa struktur folder, modul, tabel, dan util yang **benar-benar ada** (misalnya util pembuat `unique_id`, pemecah poin, pembungkus endpoint, container DI, tabel `repo`, `modul`, `menu`, `sesi_prompt`, `impor_hasil`). Pakai ulang yang sudah ada; jangan membuat duplikat. Jika nama atau bentuknya berbeda dari yang disebut dokumen ini, sesuaikan dan catat di laporan.
- **Scope**: hanya fitur Uji CR (dan perubahan kecil pada pembuat prompt "Usulkan perubahan dokumentasi" di sub-fase 6D). Jangan mengubah fitur lain.
- **Pola modul** mengikuti project: tiap modul satu folder `src/modules/<modul>/` berisi `*.jsx` (tampilan), `<modul>.controller.ts`, `<modul>.usecase.ts`, `<modul>.model.js` (**semua query SQL**), `<modul>.routes.js`, `<modul>.schema.js`, dan `<modul>.service.js` hanya bila perlu. Alur: tampilan -> controller -> usecase -> model.
- **Dependency injection**: dependency tidak dibuat di dalam class/function; registrasikan di container DI project.
- **Dokumentasi kode**: setiap function diberi komentar ringkas **Bahasa Indonesia**; setiap percabangan non-trivial diberi komentar alasan/maksud (bukan mengulang isi kode). Cek ulang komentar sebelum selesai.
- **Kompleksitas**: nesting maksimal 2-3 level (early return / extract function), function ±40-50 baris, satu function satu tanggung jawab, logika berulang diekstrak ke helper.
- **Tanpa test** (unit/widget/dll). **Jangan menghapus kode** yang tidak terpakai atau dikomentari. **Jangan commit.**
- **Berhenti hanya jika butuh keputusan**; selain itu selesaikan sub-fase sampai tuntas.
- Query **parameterized**. Berkas yang diunggah divalidasi (tipe dan ukuran).
- **Penutup tiap sub-fase**: perbarui **hanya `README.md` dan `project-context.md`** (bagian yang relevan dengan Uji CR). **Jangan membuat atau memperbarui `ringkasan-perubahan.md`** atau dokumen ringkasan lain.

---

## 3. Database

- Jalankan `schema_uji_cr.sql` **setelah** skema dasar (aman diulang). Buat script npm (misal `db:uji-cr`) mengikuti pola `db:init` yang ada. Skrip ini menambah 10 tabel dan memperluas ENUM `sesi_prompt.jenis` dengan `'pengujian'`.
- Tabel: `pengujian`, `pengujian_poin`, `pengujian_poin_target`, `pengujian_putaran`, `pengujian_putaran_repo`, `pengujian_putaran_sel`, `pengujian_skenario`, `pengujian_perubahan`, `pengujian_catatan`, `pengujian_pdf`.
- `pengujian_poin_target.menu_kunci` adalah **generated column**: jangan diisi saat `INSERT`.
- Jika tabel dasar di project berbeda dari `schema.sql` awal (nama tabel/kolom/FK), sesuaikan SQL tambahan dan catat penyimpangannya.

**Hanya status skenario yang disimpan.** Status lain **dihitung saat ditampilkan**:
- **Status sel (poin x repo)**: dari skenario putaran **terbaru yang mencakup sel itu**. Ada `FAIL` -> FAIL; selain itu ada `BLOCKED` atau `NOT_EXECUTED` -> BLOCKED; semua `PASS` (minimal satu) -> PASS; tidak ada skenario -> "belum diuji".
- **Status poin**: gabungan dari repo yang terlibat saja (repo ditentukan dari `modul.repo_id` pada target poin). Repo tak terlibat ditampilkan `-` dan tidak dihitung. FAIL jika ada sel FAIL; BLOCKED jika tidak ada FAIL tapi ada BLOCKED; PASS jika semua sel PASS; selain itu "belum diuji".
- **Level CR**: hanya **hitungan** (jumlah poin per status). **Tidak ada kesimpulan lulus/gagal dan tidak ada status "final".**

---

## 4. Fitur dan sub-fase

### Fase 6A - Menu Uji CR, poin, target, generator prompt

1. Menu **Uji CR** di navigasi: daftar CR yang diuji (CR ID, jumlah poin, hitungan status, putaran terakhir) dan tombol **Uji CR baru**.
2. **Form Uji CR baru**: isi **CR ID** (teks, unik) dan **tempel blueprint**. Pecah menjadi poin memakai **util pemecah poin yang sudah ada** (jika ada; jangan mengubah fitur Blueprint). Poin bisa digabung, dipecah, diedit, diurutkan.
3. Untuk **tiap poin**, pilih target (satu atau lebih): **modul saja** atau **modul + menu**. **Repo diturunkan dari modul**, jadi satu poin bisa mencakup lebih dari satu repo (aplikasi + API). Saran otomatis dari nama/alias/kata kunci modul/menu boleh ditampilkan bila util pencocokan sudah ada; pilihan tetap manual.
4. Simpan: `pengujian`, `pengujian_poin`, `pengujian_poin_target`, lalu buat **putaran 1**: `pengujian_putaran` dengan `unique_id` baru (pakai util yang ada), `pengujian_putaran_sel` untuk semua sel (poin x repo), dan `pengujian_putaran_repo` per repo.
5. **Generator prompt**: tampilkan **satu tab per repo** yang terlibat. Isi prompt memakai template E (bagian 8), hanya memuat poin yang menyangkut repo itu. Platform diambil dari `repo.platform` dan branch dari `repo.branch_utama`. Dokumentasi referensi: untuk modul+menu terpilih sisipkan dokumentasi menu/halaman yang ada; untuk modul saja cukup ringkasan modul dan daftar menu/halaman ringkas. Tiap tab punya **Salin** dan **Unduh .md** (`prompt_uji_<kodeRepo>_<uniqueId>.md`). Simpan ke `sesi_prompt` (`jenis = 'pengujian'`) dan isi `pengujian_putaran_repo.sesi_prompt_id`.
6. **Pernyataan tools** ditampilkan di atas tab prompt sebagai pengingat, berdasarkan platform repo (daftar umum, bagian 8). Yang menentukan tools mana yang benar-benar belum tersedia adalah **agent saat eksekusi**.

**Selesai jika:** bisa membuat Uji CR dengan beberapa poin lintas repo, mendapat satu prompt per repo hanya berisi poin yang relevan, dan prompt bisa disalin atau diunduh.

### Fase 6B - Impor hasil uji dan detail pengujian

1. **Impor hasil uji** (per putaran, per repo): unggah **JSON** (format bagian 7) dan **berkas bukti** (banyak berkas; dirujuk di JSON lewat nama berkas). Simpan bukti ke folder upload project, misalnya `uploads/pengujian/<cr_id>/p<putaran>/<kodeRepo>/`.
2. **Validasi**: `unique_id`, `repo`, `cr_id`, dan `putaran` di JSON harus cocok dengan putaran dan repo di DK Docs; `poin` pada skenario harus nomor poin yang ada; status/jenis/tipe valid. Pesan error jelas. JSON mentah disimpan ke `impor_hasil`.
3. **Pratinjau** sebelum simpan: hitungan skenario per status, daftar skenario, ringkasan analisis perubahan, dan **pernyataan tools yang belum tersedia**. Boleh impor beberapa kali untuk putaran yang sama (repo berbeda).
4. **Simpan** dalam satu transaksi: `pengujian_skenario`, `pengujian_perubahan`, serta `pengujian_putaran_repo` (`hash_head`, `branch`, `tools_belum_tersedia`, `diimpor_pada`). Kotak centang **"Buat versi PDF baru"** (default aktif, dijalankan di 6D; sebelum 6D tampilkan tombol nonaktif).
5. **Halaman detail pengujian per CR**:
   - Header: CR ID, jumlah poin, **hitungan status** (tanpa kesimpulan).
   - **Matriks poin x repo**: tiap sel menampilkan status (PASS, FAIL, BLOCKED, belum diuji) dan `-` untuk repo tak terlibat; kolom **Status poin** di kanan. Klik sel membuka daftar skenario sel itu (langkah, hasil diharapkan vs aktual, status, catatan, **bukti**) dari putaran terbaru, plus riwayat putaran sel itu.
   - Bagian **"Di luar blueprint"**: skenario tanpa poin dan analisis perubahan berkategori `outside` atau `risky`.
   - **Riwayat putaran** (nomor, tanggal, repo yang sudah diimpor, `hash_head`) dan **pernyataan tools** tiap putaran.
6. Endpoint HTTP untuk menampilkan/mengunduh bukti dan mengunduh `.md` prompt (ikuti pola `*.routes.js` project).

**Selesai jika:** JSON contoh (buat satu file contoh untuk uji manual) dari dua repo bisa diimpor, dan matriks menampilkan status per sel, per poin, serta skenario di luar blueprint.

### Fase 6C - Uji ulang dan catatan keputusan

1. Tombol **Uji ulang** di detail pengujian membuka pemilih sel:
   - Sel yang **belum PASS** tercentang default (FAIL, BLOCKED, belum diuji). Sel PASS boleh dicentang manual (untuk regresi).
   - Tombol **Tambah poin**: poin baru (isi, target modul/modul+menu) dengan nomor lanjutan dan `ditambah_putaran = N`. Cocok untuk poin blueprint yang terlewat.
2. Buat **putaran N+1** dengan `unique_id` baru, `pengujian_putaran_sel` hanya untuk sel terpilih, lalu prompt per repo (template E dengan blok putaran lanjutan): poin terpilih, **hasil putaran sebelumnya untuk sel itu** (skenario gagal beserta alasan), dan **`hash_head` putaran sebelumnya** agar agent memeriksa commit sejak hash itu (`git log <hash>..<branch>`). Hanya repo yang punya sel terpilih yang mendapat prompt.
3. Setelah hasil diimpor, status sel diperbarui sesuai aturan bagian 3 (putaran terbaru yang mencakup sel itu), dan riwayat putaran tetap tersimpan.
4. **Catatan keputusan opsional** per sel (`pengujian_catatan`): satu kolom teks bebas, boleh diisi atau dikosongkan (kosong = hapus baris), tanggal otomatis. Dipakai untuk hasil FAIL/BLOCKED yang dibiarkan atau diabaikan. **Tidak mengubah status.** Tampil di matriks (penanda kecil), di detail sel, dan di PDF.

**Selesai jika:** uji ulang hanya pada sel FAIL membuat prompt hanya untuk repo terkait, poin baru bisa ditambahkan saat uji ulang, dan catatan keputusan tersimpan tanpa mengubah status.

### Fase 6D - PDF dan integrasi dokumentasi

1. **PDF dibuat di DK Docs** dari data di database (bukan oleh agent). Pilih library yang **tidak membutuhkan browser headless** bila memungkinkan (misalnya `pdfkit` atau `@react-pdf/renderer`); catat pilihan di laporan.
2. **Satu PDF per Uji CR (kumulatif)**, memuat status terbaru semua poin. **Setiap "Buat versi baru" menambah versi** (`pengujian_pdf`: `versi`, `putaran_tercakup`, `path_file`, `ringkasan_status`); versi lama **tidak ditimpa**. Berkas disimpan sehingga **bisa diunduh berulang tanpa generate ulang**.
3. Pembuatan versi baru **bersifat pilihan**: tombol **Buat versi baru**, dan kotak centang pada saat impor hasil (6B). Jika ada putaran baru atau catatan keputusan setelah versi terakhir, tampilkan penanda **"PDF belum memuat hasil terbaru"** dengan tombol pembuatnya. Menambah poin tanpa hasil tidak memicu PDF.
4. **Tidak ada PDF final**: tanpa label "SEMUA PASS", tanpa kesimpulan lulus/gagal. PDF adalah potret kondisi saat dibuat.
5. **Isi baku PDF** (urutan tetap, A4, Bahasa Indonesia, label status selalu `PASS`, `FAIL`, `BLOCKED`, `NOT EXECUTED`):
   1. Judul dan metadata: CR ID, versi PDF, putaran tercakup, tanggal, repo (branch, hash HEAD terakhir tiap repo).
   2. Ringkasan: hitungan status (poin dan skenario), tanpa kesimpulan.
   3. Pernyataan tools yang belum tersedia (per putaran/repo).
   4. Ringkasan blueprint dan **matriks poin x repo** beserta status poin.
   5. Analisis perubahan: Matches, Supporting, Outside, Risky (ringkasan dan file).
   6. Riwayat singkat per poin (misalnya "Poin 2: FAIL di putaran 1, PASS di putaran 2").
   7. Skenario putaran terakhir tiap sel: kode, tipe, jenis, langkah, diharapkan vs aktual, status, bukti.
   8. Detail FAIL (termasuk yang pernah terjadi): langkah reproduksi, bukti, analisis, **catatan keputusan** bila ada. Alasan BLOCKED/NOT EXECUTED.
   9. Lampiran bukti (gambar; kecilkan ukurannya agar PDF tidak membengkak).
   - Nama berkas: `pengujian_<CR-ID>_v<versi>.pdf`.
6. **Integrasi referensi**: pada pembuat prompt fitur **"Usulkan perubahan dokumentasi"** yang sudah ada, jika terdapat `pengujian` dengan `cr_id` yang sama (tanpa membedakan huruf besar/kecil), tambahkan bagian **"Hasil uji CR (referensi)"**: poin yang **PASS** (ringkasan poin, skenario ringkas, kategori perubahan) sebagai perilaku yang sudah tervalidasi. Poin FAIL/BLOCKED hanya catatan: "belum lulus uji, dokumentasinya mungkin berubah". Tambahkan kalimat: jika berbeda dengan kode, **kode yang benar**; PASS di pengujian **bukan** berarti `live`. Jika tidak ada pengujian untuk CR itu, perilaku lama tidak berubah. Jangan mengubah bagian lain dari fitur tersebut.

**Selesai jika:** PDF bisa dibuat, diunduh berulang, versi lama tetap ada, penanda "belum memuat hasil terbaru" muncul dengan benar, dan prompt usulan perubahan dokumentasi memuat hasil uji PASS bila tersedia.

---

## 5. Antarmuka (ringkas)

- Ikuti gaya UI DK Docs yang sudah ada: padat, cepat dibaca, mode terang/gelap.
- Warna status konsisten: PASS hijau, FAIL merah, BLOCKED/NOT EXECUTED amber, belum diuji abu-abu. Sel yang punya catatan keputusan diberi penanda kecil.
- **Matriks poin x repo** adalah pusat halaman detail; klik sel membuka panel skenario dan bukti.
- Dialog **Uji ulang** menampilkan sel belum PASS tercentang dan tombol **Tambah poin**.
- Panel PDF: daftar versi (tanggal, putaran tercakup, ringkasan status), tombol unduh per versi, tombol **Buat versi baru**, dan penanda "PDF belum memuat hasil terbaru".

---

## 6. Konstanta

Simpan di `enums/` (sesuai pola project): status skenario (`PASS`, `FAIL`, `BLOCKED`, `NOT_EXECUTED`), tipe (`planned`, `unplanned`), jenis (`positive`, `negative`, `regression`, `impact`), kategori perubahan (`matches`, `supporting`, `outside`, `risky`), dan daftar tools umum per platform (di bawah).

**Tools umum per platform** (untuk pengingat di UI dan pernyataan di template; tidak semuanya wajib, tergantung jenis pengujian):

| Platform repo | Tools/runtime | Contoh test executor |
|---|---|---|
| Web | Runtime project (misal Node.js), browser yang didukung, dependency project | Playwright, Selenium, Puppeteer, atau Cypress (Playwright bukan kewajiban mutlak) |
| API | Runtime project, HTTP client, akses ke environment/API yang diuji | curl, Postman/Newman, atau script HTTP |
| Kotlin Android | JDK, Gradle/Gradle Wrapper, Android SDK, ADB, emulator atau perangkat untuk UI/instrumentation test | Gradle Test, JUnit, Espresso, atau Appium |
| Flutter | Flutter SDK, Dart SDK, Android SDK untuk target Android, emulator atau perangkat untuk integration/UI test | flutter test, Flutter Integration Test, atau Appium |

Unit test atau API test dapat berjalan tanpa emulator; emulator/perangkat hanya untuk skenario UI atau interaksi langsung.

---

## 7. Format JSON hasil uji

Ditulis agent di repo yang diuji: `doc-generated/uji_<kodeRepo>_<uniqueId>.json`. Bukti di folder `doc-generated/bukti_<uniqueId>/`.

```json
{
  "unique_id": "a1b2c3d4",
  "repo": "kode-repo",
  "cr_id": "CR2605060003",
  "putaran": 1,
  "branch": "development",
  "hash_head": "abc123...",
  "tools_belum_tersedia": [
    { "nama": "Playwright", "dibutuhkan_untuk": "uji UI web", "saran_pemasangan": "..." }
  ],
  "lingkungan": {
    "versi_tools": ["node 20.11", "playwright 1.x"],
    "perintah": ["npx playwright test ..."],
    "keterbatasan": ["emulator tidak tersedia"]
  },
  "analisis_perubahan": [
    { "kategori": "matches", "poin": 1, "ringkasan": "...", "file": ["src/..."] },
    { "kategori": "outside", "poin": null, "ringkasan": "...", "file": ["src/..."] }
  ],
  "skenario": [
    {
      "kode": "S-1-01",
      "poin": 1,
      "nama": "Driver wajib diisi saat simpan",
      "tipe": "planned",
      "jenis": "negative",
      "langkah": ["Buka form", "Kosongkan driver", "Klik simpan"],
      "hasil_diharapkan": "Muncul pesan wajib diisi",
      "hasil_aktual": "Pesan muncul",
      "status": "PASS",
      "catatan": "",
      "bukti": ["S-1-01.png"]
    }
  ]
}
```

Aturan:
- `unique_id`, `repo` (= `kode` repo), `cr_id`, dan `putaran` harus sama dengan yang ada di prompt.
- `poin` = nomor poin di prompt; **`null`** untuk skenario/perubahan di luar blueprint.
- `kode` skenario unik per repo per putaran, format `S-<poin>-<nn>` (untuk di luar blueprint: `S-X-<nn>`).
- `status`: `PASS` | `FAIL` | `BLOCKED` | `NOT_EXECUTED`. **Jangan `PASS` tanpa eksekusi dan bukti.**
- `tipe`: `planned` | `unplanned`. `jenis`: `positive` | `negative` | `regression` | `impact`.
- `kategori`: `matches` | `supporting` | `outside` | `risky`.
- `bukti` berisi nama berkas di folder bukti.

---

## 8. Template prompt E (`src/templates/prompts/uji_cr.md`)

Simpan sebagai **file template** dengan placeholder `{{...}}` (bukan ditulis keras di kode). Placeholder: `{{cr_id}}`, `{{putaran}}`, `{{unique_id}}`, `{{kode_repo}}`, `{{branch}}`, `{{platform}}`, `{{tools_platform}}`, `{{poin_ditugaskan}}`, `{{dokumentasi_referensi}}`, `{{blok_putaran_lanjutan}}`, `{{format_json}}` (isi bagian 7).

```
# Uji CR: {{cr_id}} (Putaran {{putaran}})
Sesi: {{unique_id}} | Repo: {{kode_repo}} | Branch: {{branch}} | Platform: {{platform}}

## Peran dan batasan
Kamu adalah orchestrator pengujian. Eksekusi dan validasi dilakukan oleh test framework,
runtime, SDK, dan tools yang tersedia di lingkungan lokal.
- JANGAN mengubah source code project. JANGAN commit.
- JANGAN memasang atau mengubah dependency project tanpa izin.
- Uji hanya di lingkungan testing; jangan mengubah data produksi. Samarkan data sensitif di bukti.
- JANGAN menyatakan PASS tanpa eksekusi dan bukti yang memadai.

## Langkah 1 - Periksa tools dan beri pernyataan SEBELUM eksekusi
Pengujian ini dapat membutuhkan tools berikut (sesuai jenis pengujian):
{{tools_platform}}
Periksa runtime, SDK, dependency, test framework, browser, dan emulator/perangkat yang
dibutuhkan skenario. Tulis pernyataan di awal jawabanmu:
"Pengujian ini membutuhkan tools berikut yang belum tersedia: ..." (nama, dibutuhkan untuk apa,
saran pemasangan). Daftar hanya tools yang BELUM ada/terpasang. Pakai tools yang sudah
dipakai project lebih dulu (Playwright bukan kewajiban mutlak). Lanjutkan jenis pengujian
yang masih memungkinkan. Skenario yang tidak dapat dijalankan: NOT_EXECUTED atau BLOCKED
beserta alasan. Catat versi tools, perintah yang dijalankan, dan keterbatasan environment.

## Langkah 2 - Kumpulkan perubahan
{{blok_commit}}
Gabungkan semua commit ber-CR ID sebagai satu rangkaian perubahan. Jangan campur commit CR lain.
Commit tanpa CR ID: analisis keterkaitannya (file yang berubah, class/function/module
terdampak, dependency terhadap bagian di blueprint, dampak ke alur CR). Keluarkan yang tidak
berkaitan, tetapi tandai perubahan di luar modul utama yang berpotensi memengaruhi CR.

## Langkah 3 - Bandingkan blueprint dengan Git Diff
Kelompokkan: matches (sesuai blueprint), supporting (pendukung implementasi), outside (tidak
ada di blueprint), risky (berisiko atau belum jelas alasannya). Outside bukan otomatis bug:
identifikasi konteks dan dampaknya dulu.

## Langkah 4 - Buat skenario dan eksekusi
Poin yang ditugaskan (hanya ini):
{{poin_ditugaskan}}
- Planned: dari poin. Unplanned: dari perubahan tambahan yang relevan. Keduanya dengan
  positive dan negative. Tambahkan regression (fitur lama tetap jalan) dan impact (modul/fitur
  lain yang berpotensi terdampak).
- Gunakan selector atau accessibility identifier yang stabil, bukan koordinat layar.
- Validasi dengan assertion objektif: tampilan UI, response API, data database, business logic,
  perilaku fitur lama.
- Simpan bukti (screenshot/log) bernama jelas di doc-generated/bukti_{{unique_id}}/.
- Analisis kegagalan boleh disertakan; kesimpulan root cause harus didukung bukti atau analisis kode.

## Dokumentasi referensi (bisa tertinggal; jika berbeda dengan kode, kode yang benar)
{{dokumentasi_referensi}}

{{blok_putaran_lanjutan}}

## Output
Tulis JSON ke `doc-generated/uji_{{kode_repo}}_{{unique_id}}.json`. Jangan menulis JSON di chat.
Format:
{{format_json}}
```

`{{blok_commit}}` untuk putaran 1: `git log {{branch}} --grep="{{cr_id}}" --format="%H %s"`; untuk putaran lanjutan: hanya commit sejak `hash_head` putaran sebelumnya (`git log <hash>..{{branch}} ...`).

`{{blok_putaran_lanjutan}}` (hanya putaran > 1): hasil putaran sebelumnya untuk sel yang diuji ulang (skenario gagal beserta alasan), hash HEAD putaran sebelumnya, dan catatan bahwa hanya sel yang ditugaskan yang diuji.

---

## 9. Laporan akhir tiap sub-fase

Ringkasan singkat di chat: **apa yang dikerjakan**, **file diubah/baru** (path), **kondisi sekarang** (apa yang sudah berjalan dan cara mengujinya), **penyimpangan** dari dokumen ini atau dari rules.md/architecture.md, dan **keputusan yang dibutuhkan** dari developer. Jangan menyalin isi kode. Perbarui hanya `README.md` dan `project-context.md` sesuai bagian 2.
