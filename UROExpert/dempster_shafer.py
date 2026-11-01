"""
Sistem Pakar Diagnosa Gangguan Sistem Reproduksi Pria - Metode Dempster-Shafer
Tujuan file ini: menjelaskan logika perhitungan langkah demi langkah.
Jalankan: python dempster_shafer.py
"""

# ---------------------------------------------------------------
# 1. FRAME OF DISCERNMENT (θ) = himpunan semua penyakit
# ---------------------------------------------------------------
PENYAKIT = {
    "P01": "Prostatitis",
    "P02": "Epididimitis",
    "P03": "Orkitis",
    "P04": "Uretritis",
    "P05": "Varikokel",
    "P06": "Disfungsi Ereksi",
}
THETA = frozenset(PENYAKIT)  # {P01, ..., P06}

# ---------------------------------------------------------------
# 2. BASIS PENGETAHUAN
#    kode: (nama gejala, penyakit terkait, bobot belief dari pakar)
#    Bobot selain G01, G10, G11, G17, G27, G32 adalah ASUMSI
#    (spesifik = 0.8, umum = 0.6) dan perlu divalidasi pakar.
# ---------------------------------------------------------------
GEJALA = {
    "G01": ("Rasa sakit/perih saat buang air kecil", {"P01", "P02", "P04"}, 0.8),
    "G02": ("Sensasi panas terbakar saat berkemih", {"P01", "P04"}, 0.8),
    "G03": ("Sering buang air kecil terutama malam", {"P01"}, 0.6),
    "G04": ("Masih ingin buang air kecil setelah selesai", {"P01"}, 0.8),
    "G05": ("Pancaran urine kecil/terputus", {"P01"}, 0.8),
    "G06": ("Darah dalam urine", {"P01"}, 0.8),
    "G07": ("Sakit pada satu/kedua testis", {"P02", "P03", "P05"}, 0.8),
    "G08": ("Pembesaran pada satu testis", {"P02", "P03", "P05"}, 0.8),
    "G09": ("Pembesaran pada kedua testis", {"P03"}, 0.8),
    "G10": ("Kulit skrotum merah", {"P02", "P03"}, 0.8),
    "G11": ("Skrotum terasa lebih panas", {"P02", "P03"}, 0.8),
    "G12": ("Sensasi berat/tertarik pada skrotum", {"P05"}, 0.8),
    "G13": ("Pembuluh darah skrotum membesar & berkelok", {"P05"}, 0.8),
    "G14": ("Nyeri bertambah saat berdiri lama", {"P05"}, 0.8),
    "G15": ("Nyeri antara anus dan skrotum", {"P01"}, 0.8),
    "G16": ("Nyeri perut bagian bawah", {"P01"}, 0.6),
    "G17": ("Sakit saat mengeluarkan sperma", {"P01", "P06"}, 0.8),
    "G18": ("Tidak nyaman saat berhubungan seksual", {"P01", "P06"}, 0.6),
    "G19": ("Tidak mampu ereksi", {"P06"}, 0.8),
    "G20": ("Ereksi cepat hilang", {"P06"}, 0.8),
    "G21": ("Berkurangnya keinginan seksual", {"P01", "P06"}, 0.6),
    "G22": ("Keluar cairan tidak normal dari penis", {"P02", "P04"}, 0.8),
    "G23": ("Cairan putih/kuning/hijau dari penis", {"P02", "P04"}, 0.8),
    "G24": ("Cairan penis berbau tidak biasa", {"P04"}, 0.8),
    "G25": ("Gatal pada lubang uretra", {"P04"}, 0.8),
    "G26": ("Rasa panas pada area genital", {"P01", "P02", "P04"}, 0.6),
    "G27": ("Suhu tubuh meningkat akibat infeksi", {"P01", "P02", "P03"}, 0.6),
    "G28": ("Mual disertai muntah", {"P03"}, 0.6),
    "G29": ("Nyeri menjalar ke lipatan paha", {"P02", "P03", "P05"}, 0.6),
    "G30": ("Nyeri bawah tulang belakang", {"P01"}, 0.6),
    "G31": ("Kesulitan memiliki keturunan", {"P02", "P05"}, 0.6),
    "G32": ("Jumlah sperma lebih sedikit", {"P01", "P02", "P05"}, 0.6),
    "G33": ("Tidak mampu mengeluarkan sperma", {"P06"}, 0.8),
    "G34": ("Sperma keluar terlalu cepat", {"P06"}, 0.8),
    "G35": ("Nyeri/tekanan saat duduk lama", {"P01", "P05"}, 0.6),
}


# ---------------------------------------------------------------
# 3. MASS FUNCTION
#    Satu gejala menghasilkan dua massa:
#      m{penyakit terkait} = belief
#      m{θ}                = 1 - belief   (sisanya = ketidakpastian)
# ---------------------------------------------------------------
def mass_gejala(kode):
    _, penyakit, bel = GEJALA[kode]
    return {frozenset(penyakit): bel, THETA: round(1 - bel, 10)}


# ---------------------------------------------------------------
# 4. ATURAN KOMBINASI DEMPSTER
#    m3(Z) = Σ m1(X)·m2(Y) untuk X∩Y = Z  /  (1 - K)
#    K     = Σ m1(X)·m2(Y) untuk X∩Y = ∅   (konflik)
# ---------------------------------------------------------------
def kombinasi(m1, m2):
    hasil, konflik = {}, 0.0
    for x, vx in m1.items():
        for y, vy in m2.items():
            irisan = x & y
            if not irisan:                      # irisan kosong -> konflik
                konflik += vx * vy
            else:
                hasil[irisan] = hasil.get(irisan, 0.0) + vx * vy
    if konflik >= 1:
        raise ValueError("Bukti saling bertentangan total (K = 1).")
    return {z: v / (1 - konflik) for z, v in hasil.items()}, konflik


# ---------------------------------------------------------------
# 5. BELIEF & PLAUSIBILITY
#    Bel(A) = Σ m(B) untuk B ⊆ A
#    Pls(A) = Σ m(B) untuk B ∩ A ≠ ∅
# ---------------------------------------------------------------
def belief(m, a):
    return sum(v for b, v in m.items() if b <= a)


def plausibility(m, a):
    return sum(v for b, v in m.items() if b & a)


# ---------------------------------------------------------------
# 6. PROSES DIAGNOSA
# ---------------------------------------------------------------
def nama_set(s):
    return "θ" if s == THETA else ", ".join(PENYAKIT[k] for k in sorted(s))


def diagnosa(kode_gejala, tampilkan_langkah=True):
    kode_gejala = sorted(kode_gejala)
    m = mass_gejala(kode_gejala[0])
    if tampilkan_langkah:
        print(f"Mulai: {kode_gejala[0]} -> m1 = "
              f"{{{nama_set(frozenset(GEJALA[kode_gejala[0]][1]))}}}: {GEJALA[kode_gejala[0]][2]}, θ: {1 - GEJALA[kode_gejala[0]][2]:.1f}")

    for i, kode in enumerate(kode_gejala[1:], start=2):
        m, k = kombinasi(m, mass_gejala(kode))
        if tampilkan_langkah:
            print(f"\nGabung {kode} (K = {k:.4f}) -> m{i}:")
            for s, v in sorted(m.items(), key=lambda t: -t[1]):
                print(f"   {{{nama_set(s)}}}: {v:.4f}")

    # Diagnosis = penyakit TUNGGAL dengan massa tertinggi
    tunggal = {s: v for s, v in m.items() if len(s) == 1}
    top = max(tunggal, key=tunggal.get) if tunggal else None
    return m, top


if __name__ == "__main__":
    # Kasus dari jurnal: pasien Andi Hidayat, 35 tahun
    kasus = ["G01", "G10", "G11", "G17", "G27", "G32"]
    print("Gejala:", ", ".join(f"{k} ({GEJALA[k][0]})" for k in kasus), "\n")

    m, top = diagnosa(kasus)

    print("\n=== RANKING MASSA ===")
    for i, (s, v) in enumerate(sorted(m.items(), key=lambda t: -t[1]), 1):
        print(f"{i}. {nama_set(s):40s} {v:.4f}  ({v * 100:.2f}%)")

    print("\n=== BELIEF & PLAUSIBILITY ===")
    for kode, nama in PENYAKIT.items():
        a = frozenset({kode})
        print(f"{nama:18s} Bel={belief(m, a):.4f}  Pls={plausibility(m, a):.4f}")

    if top:
        nama = nama_set(top)
        print(f"\nDIAGNOSA: {nama} dengan tingkat kepercayaan {m[top] * 100:.2f}%")
