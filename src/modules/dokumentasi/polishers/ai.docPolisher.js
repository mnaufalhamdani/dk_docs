import { aiBelumTersedia } from '@/utils/pemilihImplementasi';

/**
 * Stub DocPolisher berbasis AI. Belum memanggil model apa pun: menyatakan "belum tersedia"
 * sehingga pemilih kembali ke implementasi aturan.
 */
export function buatAiDocPolisher() {
  return {
    rapikanPoin: () => aiBelumTersedia('DocPolisher'),
  };
}
