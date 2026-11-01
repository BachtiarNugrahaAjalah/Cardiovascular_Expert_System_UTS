"""
UROExpert - Sistem Pakar Interaktif Diagnosa Gangguan Reproduksi Pria
Metode: Dempster-Shafer

Letakkan file ini satu folder dengan dempster_shafer.py, lalu jalankan:
    python sistem_interaktif.py
"""
import json
import os
from datetime import datetime

from dempster_shafer import (GEJALA, PENYAKIT, THETA, belief, diagnosa,
                             nama_set, plausibility)

FILE_RIWAYAT = "riwayat_diagnosa.json"

SOLUSI = {
    "P01": "Pemeriksaan urin dan prostat oleh dokter; terapi (mis. antibiotik bila infeksi bakteri) ditentukan dokter.",
    "P02": "Antibiotik sesuai anjuran dokter dan kompres dingin; istirahat dan topang skrotum.",
    "P03": "Evaluasi dokter untuk membedakan penyebab virus atau bakteri; pereda nyeri dan kompres dingin.",
    "P04": "Pemeriksaan penyebab infeksi dan terapi antibiotik sesuai hasil; edukasi pencegahan penularan.",
    "P05": "Pemeriksaan fisik dan USG skrotum; tindakan bedah dipertimbangkan bila nyeri atau infertilitas.",
    "P06": "Cari penyebab dasar (penyakit kronis, hormonal, psikologis); gaya hidup, terapi, atau konseling.",
}

DAFTAR_KODE = sorted(GEJALA)  # G01..G35


# ------------------------------------------------------------------
# Input helper
# ------------------------------------------------------------------
def tanya(teks, wajib=True):
    while True:
        jawab = input(teks).strip()
        if jawab or not wajib:
            return jawab
        print("  Tidak boleh kosong.")


def tanya_usia():
    while True:
        s = input("Usia           : ").strip()
        if s.isdigit() and 1 <= int(s) <= 120:
            return int(s)
        print("  Masukkan usia 1-120.")


def tampilkan_gejala():
    print("\nDAFTAR GEJALA")
    print("-" * 70)
    for i, kode in enumerate(DAFTAR_KODE, 1):
        print(f"{i:>2}. {kode}  {GEJALA[kode][0]}")
    print("-" * 70)


def pilih_gejala():
    """Pengguna mengetik nomor atau kode, dipisah koma. Contoh: 1,10,11 atau G01,G10"""
    tampilkan_gejala()
    print("Ketik nomor atau kode gejala dipisah koma (contoh: 1,10,11,17,27,32 atau G01,G10).")
    while True:
        teks = input("Gejala yang dialami: ").replace(" ", "").upper()
        if not teks:
            print("  Pilih minimal satu gejala.")
            continue
        terpilih, salah = [], []
        for t in teks.split(","):
            if not t:
                continue
            if t.isdigit() and 1 <= int(t) <= len(DAFTAR_KODE):
                kode = DAFTAR_KODE[int(t) - 1]
            elif t in GEJALA:
                kode = t
            else:
                salah.append(t)
                continue
            if kode not in terpilih:
                terpilih.append(kode)
        if salah:
            print("  Tidak dikenali:", ", ".join(salah), "- coba lagi.")
            continue
        return sorted(terpilih)


# ------------------------------------------------------------------
# Riwayat
# ------------------------------------------------------------------
def muat_riwayat():
    if os.path.exists(FILE_RIWAYAT):
        with open(FILE_RIWAYAT, encoding="utf-8") as f:
            return json.load(f)
    return []


def simpan_riwayat(rec):
    data = muat_riwayat()
    data.append(rec)
    with open(FILE_RIWAYAT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def lihat_riwayat():
    data = muat_riwayat()
    if not data:
        print("\nBelum ada riwayat diagnosa.")
        return
    print(f"\nRIWAYAT DIAGNOSA ({len(data)} data)")
    print("-" * 70)
    for i, r in enumerate(data, 1):
        print(f"{i:>2}. {r['waktu']} | {r['nama']} ({r['usia']} th) -> "
              f"{r['diagnosa']} {r['persen']:.2f}%")
        print(f"    Gejala: {', '.join(r['gejala'])}")


# ------------------------------------------------------------------
# Diagnosa
# ------------------------------------------------------------------
def diagnosa_baru():
    print("\n=== DATA PASIEN ===")
    nama = tanya("Nama pasien    : ")
    usia = tanya_usia()
    hp = tanya("No. HP (opsional): ", wajib=False) or "-"

    gejala = pilih_gejala()
    print("\nGejala dipilih:")
    for k in gejala:
        print(f"  {k} - {GEJALA[k][0]}")
    if input("\nLanjutkan diagnosa? (y/n): ").strip().lower() != "y":
        print("Dibatalkan.")
        return
    langkah = input("Tampilkan langkah perhitungan? (y/n): ").strip().lower() == "y"

    print("\n=== PROSES DEMPSTER-SHAFER ===")
    m, top = diagnosa(gejala, tampilkan_langkah=langkah)

    print("\n=== HASIL DIAGNOSA ===")
    print(f"Pasien : {nama} | Usia: {usia} | HP: {hp}")
    print("\nRanking massa densitas:")
    for i, (s, v) in enumerate(sorted(m.items(), key=lambda t: -t[1]), 1):
        print(f"  {i}. {nama_set(s):42s} {v:.4f}  ({v * 100:.2f}%)")

    print("\nBelief dan plausibility:")
    for kode, nm in PENYAKIT.items():
        a = frozenset({kode})
        print(f"  {nm:18s} Bel={belief(m, a):.4f}  Pls={plausibility(m, a):.4f}")

    if top:
        kode = next(iter(top))
        persen = m[top] * 100
        print(f"\n>>> DIAGNOSA: {PENYAKIT[kode]} (nilai {m[top]:.4f} / {persen:.2f}%)")
        print(f">>> Penanganan: {SOLUSI[kode]}")
        hasil = PENYAKIT[kode]
    else:
        persen = 0.0
        hasil = "Belum dapat ditentukan"
        print("\n>>> Gejala belum cukup mengerucut ke satu penyakit. Tambahkan gejala spesifik.")

    print("\nCatatan: hasil ini hanya diagnosa awal. Konsultasikan ke dokter spesialis urologi.")

    simpan_riwayat({
        "waktu": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "nama": nama, "usia": usia, "hp": hp,
        "gejala": gejala, "diagnosa": hasil, "persen": persen,
    })
    print(f"(Hasil disimpan ke {FILE_RIWAYAT})")


def main():
    print("=" * 70)
    print(" UROExpert - Sistem Pakar Gangguan Reproduksi Pria (Dempster-Shafer)")
    print("=" * 70)
    while True:
        print("\nMENU\n  1. Diagnosa baru\n  2. Lihat riwayat\n  3. Keluar")
        pilih = input("Pilih menu: ").strip()
        if pilih == "1":
            diagnosa_baru()
        elif pilih == "2":
            lihat_riwayat()
        elif pilih == "3":
            print("Terima kasih.")
            break
        else:
            print("Pilihan tidak valid.")


if __name__ == "__main__":
    main()
