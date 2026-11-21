// Pemetaan database sumber CR/B (read-only). Diisi developer, bukan ditebak agent.
// Dipakai oleh sync.model.js. Tipe ditentukan oleh TABEL yang dipilih, bukan oleh awalan nomor:
//   CR -> tabel cr (induk) + cr_history_dev (pesan)
//   B  -> tabel cr_monitoring_bugs (induk) + cr_monitoring_bugs_history (pesan)
export default {
  CR: {
    tabelPesan: 'cr_history_dev',
    tabelInduk: 'cr',
    kolomPesan: {
      sumber_id: 'id', // id unik baris pesan pengerjaan
      nomor: 'nomer_cr', // nomor CR, relasi ke induk
      pesan: 'description',
      user_id: 'user_id',
      user_name: 'user_name',
      tanggal: 'created_at', // Unix timestamp (detik)
    },
    kolomInduk: {
      nomor: 'nomer', // cr.nomer = cr_history_dev.nomer_cr
      modul: 'modul', // nama mentah modul
      menu: 'menu', // nama mentah menu
    },
  },
  B: {
    tabelPesan: 'cr_monitoring_bugs_history',
    tabelInduk: 'cr_monitoring_bugs',
    kolomPesan: {
      sumber_id: 'id',
      nomor: 'nomer', // relasi ke induk
      pesan: 'description',
      user_id: 'user_id',
      user_name: 'user_name',
      tanggal: 'created_at', // Unix timestamp (detik)
    },
    kolomInduk: {
      nomor: 'nomer', // cr_monitoring_bugs.nomer = cr_monitoring_bugs_history.nomer
      modul: 'modul',
      menu: 'menu',
    },
  },
};
