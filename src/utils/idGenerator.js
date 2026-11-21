import { randomUUID } from 'crypto';

// Pembuat ID untuk semua primary key (BIGINT UNSIGNED).
// (src/utils/idGenerator.js); hanya komentar yang ditambahkan.
// Format: <timestamp ms><SERVER_ID 2 digit><counter>. Nilainya HARUS diperlakukan sebagai
// string di JavaScript (lebih dari 16 digit, melebihi Number.MAX_SAFE_INTEGER).
// Dipakai lewat DI (`idGen`), dengan SERVER_ID dari .env.
class IdGenerator {
  static randId = randomUUID();
  static serverId = (process.env.SERVER_ID || "1")
    .toString()
    .padStart(2, "0");

  static lastTimestamp = 0;
  static counter = 0;

  /** Membuat satu ID baru; counter dinaikkan bila dipanggil di milidetik yang sama. */
  static generate() {
    let now = Date.now();

    if (now === this.lastTimestamp) {
      this.counter++;

      if (this.counter > 999) {
        // wait next millisecond
        do {
          now = Date.now();
        } while (now <= this.lastTimestamp);

        this.counter = 1;
        this.lastTimestamp = now;
      }
    } else {
      this.counter = 1;
      this.lastTimestamp = now;
    }

    const counterStr = String(this.counter).padStart(2, "0");

    return `${now}${this.serverId}${counterStr}`;
  }
}

export default IdGenerator;
