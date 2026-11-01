/**
 * dempster_shafer.js
 * Modul logika Dempster-Shafer untuk UROExpert
 * Sistem Pakar Diagnosa Gangguan Reproduksi Pria
 *
 * Konvensi key set: elemen diurutkan lalu digabung dengan "|"
 * Contoh: frozenset({"P01","P02"}) → "P01|P02"
 *         THETA (frame of discernment) → "P01|P02|P03|P04|P05|P06"
 */

// ─────────────────────────────────────────────
// DATA KNOWLEDGE BASE
// ─────────────────────────────────────────────

/** Daftar penyakit */
const PENYAKIT = {
  P01: "Prostatitis",
  P02: "Epididimitis",
  P03: "Orkitis",
  P04: "Uretritis",
  P05: "Varikokel",
  P06: "Disfungsi Ereksi",
};

/** Frame of Discernment (Θ) — semua penyakit yang mungkin */
const THETA_SET = new Set(Object.keys(PENYAKIT));
const THETA_KEY = setToKey(THETA_SET);

/**
 * Basis pengetahuan gejala:
 * kode → [nama, Set penyakit terkait, bobot belief pakar]
 */
const GEJALA = {
  G01: ["Rasa sakit/perih saat buang air kecil",           new Set(["P01","P02","P04"]), 0.8],
  G02: ["Sensasi panas terbakar saat berkemih",            new Set(["P01","P04"]),       0.8],
  G03: ["Sering buang air kecil terutama malam",           new Set(["P01"]),             0.6],
  G04: ["Masih ingin buang air kecil setelah selesai",     new Set(["P01"]),             0.8],
  G05: ["Pancaran urine kecil/terputus",                   new Set(["P01"]),             0.8],
  G06: ["Darah dalam urine",                               new Set(["P01"]),             0.8],
  G07: ["Sakit pada satu/kedua testis",                    new Set(["P02","P03","P05"]), 0.8],
  G08: ["Pembesaran pada satu testis",                     new Set(["P02","P03","P05"]), 0.8],
  G09: ["Pembesaran pada kedua testis",                    new Set(["P03"]),             0.8],
  G10: ["Kulit skrotum merah",                             new Set(["P02","P03"]),       0.8],
  G11: ["Skrotum terasa lebih panas",                      new Set(["P02","P03"]),       0.8],
  G12: ["Sensasi berat/tertarik pada skrotum",             new Set(["P05"]),             0.8],
  G13: ["Pembuluh darah skrotum membesar & berkelok",      new Set(["P05"]),             0.8],
  G14: ["Nyeri bertambah saat berdiri lama",               new Set(["P05"]),             0.8],
  G15: ["Nyeri antara anus dan skrotum",                   new Set(["P01"]),             0.8],
  G16: ["Nyeri perut bagian bawah",                        new Set(["P01"]),             0.6],
  G17: ["Sakit saat mengeluarkan sperma",                  new Set(["P01","P06"]),       0.8],
  G18: ["Tidak nyaman saat berhubungan seksual",           new Set(["P01","P06"]),       0.6],
  G19: ["Tidak mampu ereksi",                              new Set(["P06"]),             0.8],
  G20: ["Ereksi cepat hilang",                             new Set(["P06"]),             0.8],
  G21: ["Berkurangnya keinginan seksual",                  new Set(["P01","P06"]),       0.6],
  G22: ["Keluar cairan tidak normal dari penis",           new Set(["P02","P04"]),       0.8],
  G23: ["Cairan putih/kuning/hijau dari penis",            new Set(["P02","P04"]),       0.8],
  G24: ["Cairan penis berbau tidak biasa",                 new Set(["P04"]),             0.8],
  G25: ["Gatal pada lubang uretra",                        new Set(["P04"]),             0.8],
  G26: ["Rasa panas pada area genital",                    new Set(["P01","P02","P04"]), 0.6],
  G27: ["Suhu tubuh meningkat akibat infeksi",             new Set(["P01","P02","P03"]), 0.6],
  G28: ["Mual disertai muntah",                            new Set(["P03"]),             0.6],
  G29: ["Nyeri menjalar ke lipatan paha",                  new Set(["P02","P03","P05"]), 0.6],
  G30: ["Nyeri bawah tulang belakang",                     new Set(["P01"]),             0.6],
  G31: ["Kesulitan memiliki keturunan",                    new Set(["P02","P05"]),       0.6],
  G32: ["Jumlah sperma lebih sedikit",                     new Set(["P01","P02","P05"]), 0.6],
  G33: ["Tidak mampu mengeluarkan sperma",                 new Set(["P06"]),             0.8],
  G34: ["Sperma keluar terlalu cepat",                     new Set(["P06"]),             0.8],
  G35: ["Nyeri/tekanan saat duduk lama",                   new Set(["P01","P05"]),       0.6],
};

/** Rekomendasi penanganan per penyakit */
const SOLUSI = {
  P01: "Pemeriksaan urin dan prostat oleh dokter; terapi (mis. antibiotik bila infeksi bakteri) ditentukan dokter.",
  P02: "Antibiotik sesuai anjuran dokter dan kompres dingin; istirahat dan topang skrotum.",
  P03: "Evaluasi dokter untuk membedakan penyebab virus atau bakteri; pereda nyeri dan kompres dingin.",
  P04: "Pemeriksaan penyebab infeksi dan terapi antibiotik sesuai hasil; edukasi pencegahan penularan.",
  P05: "Pemeriksaan fisik dan USG skrotum; tindakan bedah dipertimbangkan bila nyeri atau infertilitas.",
  P06: "Cari penyebab dasar (penyakit kronis, hormonal, psikologis); gaya hidup, terapi, atau konseling.",
};

/** Kasus contoh dari jurnal → seharusnya menghasilkan Prostatitis */
const KASUS_JURNAL = ["G01", "G10", "G11", "G17", "G27", "G32"];

// ─────────────────────────────────────────────
// UTILITAS SET
// ─────────────────────────────────────────────

/**
 * Konversi Set ke string key yang diurutkan
 * @param {Set<string>} s
 * @returns {string}
 */
function setToKey(s) {
  return [...s].sort().join("|");
}

/**
 * Konversi string key kembali ke Set
 * @param {string} key
 * @returns {Set<string>}
 */
function keyToSet(key) {
  if (!key || key === "EMPTY") return new Set();
  return new Set(key.split("|"));
}

/**
 * Hitung irisan dua set (dari key)
 * @param {string} keyA
 * @param {string} keyB
 * @returns {string} key hasil irisan
 */
function intersectKeys(keyA, keyB) {
  const a = keyToSet(keyA);
  const b = keyToSet(keyB);
  const result = new Set([...a].filter(x => b.has(x)));
  return result.size === 0 ? "EMPTY" : setToKey(result);
}

/**
 * Representasi label yang mudah dibaca untuk key set
 * @param {string} key
 * @returns {string}
 */
function labelKey(key) {
  if (key === "EMPTY") return "∅";
  if (key === THETA_KEY) return "Θ";
  const parts = key.split("|");
  if (parts.length === 1) return `{${PENYAKIT[parts[0]] || parts[0]}}`;
  return `{${parts.map(p => PENYAKIT[p] || p).join(", ")}}`;
}

// ─────────────────────────────────────────────
// FUNGSI INTI DEMPSTER-SHAFER
// ─────────────────────────────────────────────

/**
 * Buat fungsi massa dasar untuk satu gejala
 * Menghasilkan dua massa:
 *   m{penyakit_terkait} = belief (bobot pakar)
 *   m{Θ}               = 1 - belief (ketidakpastian)
 *
 * @param {string} kodeGejala - mis. "G01"
 * @returns {Object} peta { keySet → nilai massa }
 */
function massGejala(kodeGejala) {
  const data = GEJALA[kodeGejala];
  if (!data) return null;
  const [, penyakitSet, belief] = data;
  const m = {};
  const pKey = setToKey(penyakitSet);
  m[pKey] = belief;
  // Jika penyakit set sama dengan THETA, gabungkan
  if (pKey === THETA_KEY) {
    m[THETA_KEY] = 1.0;
  } else {
    m[THETA_KEY] = parseFloat((1 - belief).toFixed(10));
  }
  return m;
}

/**
 * Aturan kombinasi Dempster untuk dua fungsi massa
 *
 * m₁₂(Z) = Σ_{X∩Y=Z} m₁(X)·m₂(Y)  /  (1 - K)
 * K       = Σ_{X∩Y=∅} m₁(X)·m₂(Y)   (konflik)
 *
 * @param {Object} m1 - fungsi massa pertama
 * @param {Object} m2 - fungsi massa kedua
 * @returns {{ hasil: Object, konflik: number, tabelPerkalian: Array }}
 */
function kombinasi(m1, m2) {
  const keys1 = Object.keys(m1);
  const keys2 = Object.keys(m2);

  let konflik = 0;
  const numerator = {}; // sebelum normalisasi
  const tabelPerkalian = []; // untuk visualisasi step-by-step

  // Hitung semua pasang (X, Y) dan irisan X ∩ Y
  for (const keyA of keys1) {
    for (const keyB of keys2) {
      const irisan = intersectKeys(keyA, keyB);
      const produk = m1[keyA] * m2[keyB];
      tabelPerkalian.push({ keyA, keyB, irisan, produk });

      if (irisan === "EMPTY") {
        konflik += produk;
      } else {
        numerator[irisan] = (numerator[irisan] || 0) + produk;
      }
    }
  }

  // Normalisasi: bagi dengan (1 - K)
  const normalizer = 1 - konflik;
  const hasil = {};
  if (normalizer < 1e-10) {
    // Konflik total — tidak bisa dikombinasikan (jarang terjadi)
    hasil["CONFLICT"] = 1.0;
  } else {
    for (const key in numerator) {
      hasil[key] = parseFloat((numerator[key] / normalizer).toFixed(10));
    }
  }

  return { hasil, konflik: parseFloat(konflik.toFixed(10)), tabelPerkalian };
}

/**
 * Jalankan diagnosa berdasarkan daftar kode gejala yang dipilih
 *
 * @param {string[]} kodeGejala - daftar kode mis. ["G01","G10","G27"]
 * @returns {{
 *   massaFinal: Object,
 *   top: { kode: string, nama: string, nilai: number }[],
 *   steps: Array,
 *   beliefMap: Object,
 *   plausibilityMap: Object
 * }}
 */
function diagnosa(kodeGejala) {
  if (!kodeGejala || kodeGejala.length === 0) {
    return { massaFinal: {}, top: [], steps: [], beliefMap: {}, plausibilityMap: {} };
  }

  const steps = []; // rekam setiap langkah

  // Inisialisasi dari gejala pertama
  let massaSaatIni = massGejala(kodeGejala[0]);
  steps.push({
    iterasi: 0,
    label: `Inisialisasi: ${kodeGejala[0]} — ${GEJALA[kodeGejala[0]][0]}`,
    m1: null,
    m2: massGejala(kodeGejala[0]),
    m2Label: kodeGejala[0],
    hasil: massaSaatIni,
    konflik: 0,
    tabelPerkalian: [],
  });

  // Kombinasikan satu per satu gejala berikutnya
  for (let i = 1; i < kodeGejala.length; i++) {
    const kode = kodeGejala[i];
    const m2 = massGejala(kode);
    const { hasil, konflik, tabelPerkalian } = kombinasi(massaSaatIni, m2);

    steps.push({
      iterasi: i,
      label: `Langkah ${i}: m_kumulatif ⊕ ${kode} (${GEJALA[kode][0]})`,
      m1: { ...massaSaatIni },
      m1Label: i === 1 ? kodeGejala[0] : `m_kumulatif_${i - 1}`,
      m2: { ...m2 },
      m2Label: kode,
      hasil: { ...hasil },
      konflik,
      tabelPerkalian,
    });

    massaSaatIni = hasil;
  }

  const massaFinal = massaSaatIni;

  // Hitung belief dan plausibility untuk setiap penyakit tunggal
  const beliefMap = {};
  const plausibilityMap = {};
  for (const kode of Object.keys(PENYAKIT)) {
    beliefMap[kode] = belief(massaFinal, new Set([kode]));
    plausibilityMap[kode] = plausibility(massaFinal, new Set([kode]));
  }

  // Ekstrak nilai massa langsung untuk tiap penyakit tunggal
  const nilaiFinal = {};
  for (const kode of Object.keys(PENYAKIT)) {
    nilaiFinal[kode] = massaFinal[kode] || 0;
  }

  // Urutkan penyakit berdasarkan nilai massa final tertinggi
  const top = Object.keys(PENYAKIT)
    .map(kode => ({
      kode,
      nama: PENYAKIT[kode],
      nilai: massaFinal[kode] || 0,
      belief: beliefMap[kode],
      plausibility: plausibilityMap[kode],
    }))
    .sort((a, b) => b.nilai - a.nilai);

  return { massaFinal, top, steps, beliefMap, plausibilityMap };
}

/**
 * Hitung Belief untuk himpunan A
 * Bel(A) = Σ m(B) untuk semua B ⊆ A
 *
 * @param {Object} m  - fungsi massa
 * @param {Set<string>} setA - himpunan target
 * @returns {number}
 */
function belief(m, setA) {
  let total = 0;
  for (const key in m) {
    if (key === "EMPTY" || key === "CONFLICT") continue;
    const subset = keyToSet(key);
    // Cek apakah subset ⊆ setA
    if ([...subset].every(x => setA.has(x))) {
      total += m[key];
    }
  }
  return parseFloat(total.toFixed(6));
}

/**
 * Hitung Plausibility untuk himpunan A
 * Pl(A) = Σ m(B) untuk semua B dengan B∩A ≠ ∅
 *
 * @param {Object} m  - fungsi massa
 * @param {Set<string>} setA - himpunan target
 * @returns {number}
 */
function plausibility(m, setA) {
  let total = 0;
  for (const key in m) {
    if (key === "EMPTY" || key === "CONFLICT") continue;
    const subset = keyToSet(key);
    // Cek apakah subset ∩ setA ≠ ∅
    if ([...subset].some(x => setA.has(x))) {
      total += m[key];
    }
  }
  return parseFloat(total.toFixed(6));
}

// ─────────────────────────────────────────────
// EKSPOR KE GLOBAL (non-module, untuk gh-pages)
// ─────────────────────────────────────────────
window.DS = {
  PENYAKIT,
  THETA_KEY,
  GEJALA,
  SOLUSI,
  KASUS_JURNAL,
  setToKey,
  keyToSet,
  labelKey,
  massGejala,
  kombinasi,
  diagnosa,
  belief,
  plausibility,
};
