"""
Cardiovascular Disease Expert System - Certainty Factor method
Knowledge base source: Ajisari & Prasetyaningrum (2024), "Sistem Pakar Diagnosa
Penyakit Kardiovaskular Menggunakan Metode Certainty Factor",
Journal of Computer and Information Systems Ampera, Vol. 5 No. 2
(6 diseases, 29 symptoms, expert weights from Table 3).

Method (as in the journal):
    CF(symptom)  = CF_user x CF_expert
    CF_combine   = CF_old + CF_symptom x (1 - CF_old)      (per disease)
    Percentage   = CF_combine x 100%

Usage:
    python expert_system.py              -- konsultasi interaktif
    python expert_system.py --tests      -- jalankan semua test cases + simpan CSV
    python expert_system.py --case 1     -- tampilkan trace lengkap satu kasus
    python expert_system.py --auto N     -- jalankan N simulasi input otomatis

EDUCATIONAL DEMO ONLY - not a medical device and not medical advice.
"""
import csv
import sys
import random

# ---------------------------------------------------------------
# 1. KNOWLEDGE BASE  (journal Tables 1, 2, 3)
# ---------------------------------------------------------------
# Table 1 - user confidence scale
USER_LEVELS = [
    (0.0, "Tidak Tahu / Tidak Yakin"),
    (0.2, "Hampir Mungkin"),
    (0.4, "Mungkin"),
    (0.6, "Cukup Yakin"),
    (0.8, "Yakin"),
    (1.0, "Sangat Yakin"),
]

DISEASES = {
    "P01": "Jantung Koroner (Coronary Heart Disease)",
    "P02": "Gagal Jantung Kongestif (Congestive Heart Failure)",
    "P03": "Katup Jantung (Heart Valve Disease)",
    "P04": "Aritmia (Arrhythmia)",
    "P05": "Jantung Bawaan (Congenital Heart Disease)",
    "P06": "Pembuluh Darah (Vascular Disease)",
}

DISEASE_DESCRIPTIONS = {
    "P01": "Penyakit yang terjadi akibat penyempitan atau penyumbatan arteri koroner yang memasok darah ke otot jantung.",
    "P02": "Kondisi di mana jantung tidak dapat memompa darah secara efisien, menyebabkan cairan menumpuk di paru-paru dan jaringan tubuh.",
    "P03": "Gangguan pada katup jantung yang dapat menyebabkan kebocoran atau penyempitan aliran darah.",
    "P04": "Gangguan irama jantung yang menyebabkan jantung berdetak terlalu cepat, terlalu lambat, atau tidak teratur.",
    "P05": "Kelainan struktur jantung yang sudah ada sejak lahir, dapat mempengaruhi dinding, katup, atau pembuluh darah jantung.",
    "P06": "Penyakit yang mempengaruhi sistem pembuluh darah di luar jantung, termasuk arteri dan vena.",
}

DISEASE_RECOMMENDATIONS = {
    "P01": [
        "Segera konsultasi ke dokter spesialis jantung (kardiolog)",
        "Lakukan EKG dan tes darah (troponin, enzim jantung)",
        "Hindari aktivitas fisik berat sementara waktu",
        "Pantau tekanan darah dan kolesterol secara rutin",
        "Pertimbangkan perubahan gaya hidup: diet rendah lemak, berhenti merokok",
    ],
    "P02": [
        "Segera periksa ke dokter untuk evaluasi fungsi pompa jantung (ekokardiografi)",
        "Pantau berat badan harian untuk mendeteksi penumpukan cairan",
        "Batasi asupan garam dan cairan sesuai rekomendasi dokter",
        "Minum obat diuretik sesuai resep dokter",
        "Istirahat cukup dan hindari aktivitas yang melelahkan",
    ],
    "P03": [
        "Lakukan ekokardiografi untuk menilai kondisi katup jantung",
        "Konsultasi dengan kardiolog atau bedah jantung",
        "Pantau gejala seperti sesak nafas dan kelelahan",
        "Hindari infeksi yang dapat memperburuk kondisi (profilaksis antibiotik jika perlu)",
        "Pertimbangkan intervensi bedah jika diperlukan",
    ],
    "P04": [
        "Pasang monitor Holter (rekam EKG 24 jam) untuk mendiagnosis jenis aritmia",
        "Hindari kafein, alkohol, dan rokok yang dapat memicu aritmia",
        "Konsultasi dengan elektrofisiolog jantung",
        "Pantau denyut nadi secara rutin",
        "Diskusikan pilihan terapi: obat antiaritmia, ablasi, atau implantasi alat pacu jantung",
    ],
    "P05": [
        "Konsultasi segera dengan dokter spesialis jantung anak",
        "Lakukan ekokardiografi untuk menilai struktur jantung",
        "Pantau pertumbuhan dan perkembangan anak",
        "Pertimbangkan intervensi bedah korektif sesuai anjuran dokter",
        "Jaga kebersihan dan hindari infeksi saluran nafas",
    ],
    "P06": [
        "Konsultasi dengan dokter spesialis bedah vaskular",
        "Lakukan USG Doppler untuk menilai aliran darah",
        "Kontrol faktor risiko: gula darah, tekanan darah, dan kolesterol",
        "Jaga perawatan kaki: hindari luka dan infeksi",
        "Berhenti merokok karena dapat memperburuk kondisi pembuluh darah",
    ],
}

SYMPTOMS = {
    "G01": "Nyeri dada (Chest pain)",
    "G02": "Keringat dingin (Cold sweat)",
    "G03": "Nyeri ulu hati (Epigastric pain)",
    "G04": "Penurunan kesadaran (Reduced consciousness)",
    "G05": "Denyut nadi lemah (Weak pulse)",
    "G06": "Sesak nafas (Shortness of breath)",
    "G07": "Pusing (Dizziness)",
    "G08": "Mual / muntah (Nausea / vomiting)",
    "G09": "Kaki bengkak (Swollen legs)",
    "G10": "Perut membesar (Enlarged abdomen)",
    "G11": "Sesak saat malam hari (Breathless at night)",
    "G12": "Posisi tidur 2 bantal (Needs 2 pillows to sleep)",
    "G13": "Berdebar (Palpitations)",
    "G14": "Batuk berdarah (Coughing blood)",
    "G15": "Nadi tidak teraba (Pulse not palpable)",
    "G16": "Nadi tidak teratur (Irregular pulse)",
    "G17": "Mudah lelah (Easily fatigued)",
    "G18": "Bibir membiru (Bluish lips)",
    "G19": "Bagian bawah kuku membiru (Bluish nail beds)",
    "G20": "Infeksi saluran nafas berulang (Recurrent respiratory infections)",
    "G21": "Sulit menyusu pada bayi (Difficulty breastfeeding in infants)",
    "G22": "Nyeri pada tangan/kaki (Pain in hands/feet)",
    "G23": "Kaki/tangan memerah (Reddened hands/feet)",
    "G24": "Kaki/tangan membiru (Bluish hands/feet)",
    "G25": "Kaki/tangan terasa panas (Hands/feet feel hot)",
    "G26": "Kaki/tangan terasa dingin (Hands/feet feel cold)",
    "G27": "Luka kaki/tangan sulit sembuh (Non-healing wounds on hands/feet)",
    "G28": "Kesemutan kaki/tangan (Tingling in hands/feet)",
    "G29": "Pandangan kabur (Blurred vision)",
}

# Table 3 - expert weights: disease -> {symptom: CF_expert}
RULES = {
    "P01": {"G01": 0.8, "G02": 0.6, "G03": 0.4, "G04": 0.6,
            "G05": 0.6, "G06": 0.4, "G07": 0.2, "G08": 0.4},
    "P02": {"G06": 0.8, "G09": 0.6, "G10": 0.4, "G08": 0.4, "G01": 0.4,
            "G04": 0.2, "G11": 0.6, "G12": 0.8, "G17": 0.6},
    "P03": {"G13": 0.4, "G06": 0.6, "G14": 0.4, "G11": 0.6,
            "G17": 0.6, "G09": 0.6, "G04": 0.4},
    "P04": {"G13": 0.8, "G07": 0.4, "G17": 0.6, "G04": 0.6,
            "G06": 0.4, "G15": 0.8, "G16": 0.8},
    "P05": {"G06": 0.6, "G18": 0.8, "G19": 0.8, "G17": 0.4,
            "G20": 0.6, "G21": 0.8},
    "P06": {"G09": 0.6, "G22": 0.6, "G23": 0.8, "G24": 0.8, "G25": 0.8,
            "G26": 0.8, "G27": 0.8, "G28": 0.6, "G29": 0.4, "G01": 0.4,
            "G07": 0.4, "G04": 0.6},
}


# ---------------------------------------------------------------
# 2. INFERENCE ENGINE
# ---------------------------------------------------------------
def combine(cf_old: float, cf_new: float) -> float:
    """Journal formula: CF_old + CF_symptom * (1 - CF_old)."""
    return cf_old + cf_new * (1 - cf_old)


def diagnose(evidence: dict):
    """
    evidence: {symptom_code: user CF (0..1)}
    Returns (ranking, trace)
      ranking = [(disease_code, final_cf), ...] sorted high -> low
      trace   = {disease_code: [(symptom, cf_user, cf_expert, cf_symptom, cf_running), ...]}
    Symptoms with user CF = 0 are ignored (they add nothing).
    """
    ranking, trace = [], {}
    for pid, weights in RULES.items():
        running, steps = 0.0, []
        for gid, cf_expert in weights.items():
            cf_user = evidence.get(gid, 0.0)
            if cf_user <= 0:
                continue
            cf_sym = cf_user * cf_expert
            running = cf_sym if not steps else combine(running, cf_sym)
            steps.append((gid, cf_user, cf_expert, cf_sym, running))
        if steps:
            ranking.append((pid, running))
            trace[pid] = steps
    ranking.sort(key=lambda x: x[1], reverse=True)
    return ranking, trace


def interpret(ranking):
    """Interpretasi hasil diagnosis dengan tingkat kepercayaan."""
    if not ranking:
        return "Tidak ada diagnosis: tidak ada gejala yang dilaporkan dengan keyakinan > 0."
    top = ranking[0][1]
    pct = top * 100
    if pct >= 80:
        level = "TINGGI"
        desc = "Sangat disarankan segera konsultasi dokter."
    elif pct >= 60:
        level = "CUKUP TINGGI"
        desc = "Disarankan untuk periksa ke dokter."
    elif pct >= 40:
        level = "SEDANG"
        desc = "Perlu pemantauan lebih lanjut."
    elif pct >= 20:
        level = "RENDAH"
        desc = "Gejala belum cukup kuat, pantau kondisi Anda."
    else:
        level = "SANGAT RENDAH"
        desc = "Keyakinan diagnosis sangat rendah."

    note = f"Tingkat kepercayaan: {level} ({pct:.1f}%). {desc}"
    if len(ranking) > 1 and top - ranking[1][1] < 0.10:
        note += " AMBIGU: Perbedaan dengan kandidat kedua < 10 poin — diperlukan data gejala lebih lanjut."
    return note


def diagnose_as_dict(evidence: dict) -> dict:
    """
    API-friendly version of diagnose for the Flask web interface.
    Returns a structured dict with all relevant info.
    """
    ranking, trace = diagnose(evidence)

    results = []
    for pid, cf in ranking:
        steps_data = []
        for gid, cu, ce, cs, run in trace.get(pid, []):
            steps_data.append({
                "symptom_code": gid,
                "symptom_name": SYMPTOMS[gid],
                "cf_user": round(cu, 2),
                "cf_expert": round(ce, 2),
                "cf_symptom": round(cs, 4),
                "cf_running": round(run, 4),
            })
        results.append({
            "disease_code": pid,
            "disease_name": DISEASES[pid],
            "disease_description": DISEASE_DESCRIPTIONS[pid],
            "recommendations": DISEASE_RECOMMENDATIONS[pid],
            "cf_value": round(cf, 4),
            "cf_percent": round(cf * 100, 2),
            "steps": steps_data,
        })

    top_cf = ranking[0][1] if ranking else 0
    return {
        "results": results,
        "interpretation": interpret(ranking),
        "top_disease": DISEASES[ranking[0][0]] if ranking else None,
        "top_cf_percent": round(top_cf * 100, 2) if ranking else 0,
        "is_ambiguous": (
            len(ranking) > 1 and (ranking[0][1] - ranking[1][1]) < 0.10
        ),
        "evidence_count": sum(1 for v in evidence.values() if v > 0),
    }


def get_knowledge_base() -> dict:
    """Return the full knowledge base as a dict for the web interface."""
    return {
        "diseases": DISEASES,
        "disease_descriptions": DISEASE_DESCRIPTIONS,
        "symptoms": SYMPTOMS,
        "rules": RULES,
        "user_levels": [{"value": v, "label": l} for v, l in USER_LEVELS],
    }


# ---------------------------------------------------------------
# 3. AUTO-INPUT SIMULATOR (generates uncertainty scenarios)
# ---------------------------------------------------------------
def generate_auto_scenario(seed=None, mode="random"):
    """
    Generate a synthetic patient scenario for testing.

    mode:
        "random"        - fully random symptoms with random confidence
        "focused"       - focus on one disease with some noise
        "uncertain"     - many symptoms at low confidence (ambiguous case)
        "minimal"       - only 1-3 symptoms
        "contradictory" - symptoms from multiple opposing diseases

    Returns: (evidence_dict, metadata_dict)
    """
    if seed is not None:
        random.seed(seed)

    all_syms = list(SYMPTOMS.keys())
    all_cfvals = [v for v, _ in USER_LEVELS if v > 0]  # [0.2, 0.4, 0.6, 0.8, 1.0]
    evidence = {}
    meta = {"mode": mode, "seed": seed}

    if mode == "random":
        n = random.randint(3, 12)
        chosen = random.sample(all_syms, n)
        for g in chosen:
            evidence[g] = random.choice(all_cfvals)
        meta["description"] = f"Acak: {n} gejala dipilih secara random"

    elif mode == "focused":
        target = random.choice(list(RULES.keys()))
        meta["target_disease"] = target
        meta["target_name"] = DISEASES[target]
        target_syms = list(RULES[target].keys())
        n_core = random.randint(len(target_syms) // 2, len(target_syms))
        core = random.sample(target_syms, n_core)
        for g in core:
            evidence[g] = random.choice([0.6, 0.8, 1.0])
        n_noise = random.randint(1, 3)
        noise_pool = [s for s in all_syms if s not in target_syms]
        for g in random.sample(noise_pool, min(n_noise, len(noise_pool))):
            evidence[g] = random.choice([0.2, 0.4])
        meta["description"] = (
            f"Terfokus pada {DISEASES[target]} dengan {n_core} gejala utama + {n_noise} noise"
        )

    elif mode == "uncertain":
        n = random.randint(6, 15)
        chosen = random.sample(all_syms, n)
        for g in chosen:
            evidence[g] = random.choice([0.2, 0.4])  # low confidence only
        meta["description"] = f"Tidak pasti: {n} gejala dengan keyakinan rendah (0.2-0.4)"

    elif mode == "minimal":
        n = random.randint(1, 3)
        chosen = random.sample(all_syms, n)
        for g in chosen:
            evidence[g] = random.choice(all_cfvals)
        meta["description"] = f"Minimal: hanya {n} gejala dilaporkan"

    elif mode == "contradictory":
        diseases_picked = random.sample(list(RULES.keys()), 2)
        for d in diseases_picked:
            syms = list(RULES[d].keys())
            n = random.randint(2, len(syms))
            for g in random.sample(syms, n):
                evidence[g] = random.choice([0.4, 0.6, 0.8])
        meta["description"] = (
            f"Kontradiktif: gejala dari {DISEASES[diseases_picked[0]]} dan "
            f"{DISEASES[diseases_picked[1]]}"
        )

    return evidence, meta


def run_auto_simulations(n=20, output_csv="auto_simulation_results.csv"):
    """
    Run N automatic simulations across all modes and save to CSV.
    """
    modes = ["random", "focused", "uncertain", "minimal", "contradictory"]
    rows = []
    print(f"\n{'='*65}")
    print(f"  AUTO-INPUT SIMULATOR — {n} simulasi")
    print(f"{'='*65}")

    for i in range(n):
        mode = modes[i % len(modes)]
        seed = random.randint(0, 9999)
        evidence, meta = generate_auto_scenario(seed=seed, mode=mode)

        result = diagnose_as_dict(evidence)
        top = result["results"][0] if result["results"] else None

        print(f"\n[Sim {i+1:02d}] Mode: {mode:<14} | Seed: {seed}")
        print(f"  Deskripsi : {meta['description']}")
        print(f"  Gejala    : {', '.join(f'{k}={v}' for k, v in evidence.items())}")
        if top:
            flag = " AMBIGU" if result["is_ambiguous"] else ""
            print(f"  Diagnosis : {top['disease_name']} ({top['cf_percent']:.2f}%){flag}")
        else:
            print(f"  Diagnosis : Tidak ada (semua CF=0)")
        print(f"  Interpretasi: {result['interpretation']}")

        second = result["results"][1] if len(result["results"]) > 1 else None
        rows.append({
            "sim_no": i + 1,
            "mode": mode,
            "seed": seed,
            "description": meta.get("description", ""),
            "n_symptoms": len(evidence),
            "symptoms": "; ".join(f"{k}={v}" for k, v in evidence.items()),
            "top_disease": top["disease_name"] if top else "-",
            "top_cf_percent": top["cf_percent"] if top else 0,
            "second_disease": second["disease_name"] if second else "-",
            "second_cf_percent": second["cf_percent"] if second else 0,
            "is_ambiguous": result["is_ambiguous"],
            "interpretation": result["interpretation"],
        })

    with open(output_csv, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    ambiguous_count = sum(1 for r in rows if r["is_ambiguous"])
    no_diag = sum(1 for r in rows if r["top_disease"] == "-")
    print(f"\n{'='*65}")
    print(f"  RINGKASAN:")
    print(f"  Total simulasi    : {n}")
    print(f"  Hasil ambigu      : {ambiguous_count} ({ambiguous_count/n*100:.1f}%)")
    print(f"  Tanpa diagnosis   : {no_diag} ({no_diag/n*100:.1f}%)")
    print(f"  Tersimpan ke      : {output_csv}")
    print(f"{'='*65}\n")
    return rows


# ---------------------------------------------------------------
# 4. TEST DATA  (synthetic)
# ---------------------------------------------------------------
TEST_CASES = [
    {"id": 1, "name": "Contoh Jurnal (Tabel 4)", "expect": "P03",
     "desc": "Replikasi perhitungan manual jurnal, diharapkan Katup Jantung ~83.8%",
     "ev": {"G04": 0.6, "G06": 0.4, "G09": 0.4, "G11": 0.4,
            "G14": 0.6, "G13": 0.4, "G17": 0.4}},
    {"id": 2, "name": "Gambaran koroner klasik", "expect": "P01",
     "desc": "Nyeri dada kuat, keringat dingin, nadi lemah",
     "ev": {"G01": 1.0, "G02": 0.8, "G03": 0.6, "G05": 0.6, "G08": 0.4}},
    {"id": 3, "name": "Gangguan irama", "expect": "P04",
     "desc": "Jantung berdebar dengan nadi tidak teratur / sulit teraba",
     "ev": {"G13": 0.8, "G16": 0.8, "G15": 0.6, "G07": 0.4}},
    {"id": 4, "name": "Kasus kongenital bayi", "expect": "P05",
     "desc": "Sianosis (bibir, kuku) dan kesulitan menyusu pada bayi",
     "ev": {"G18": 1.0, "G19": 0.8, "G21": 0.8, "G20": 0.6, "G06": 0.6}},
    {"id": 5, "name": "Gagal jantung kongestif", "expect": "P02",
     "desc": "Ortopnea, pembengkakan kaki, sesak malam hari",
     "ev": {"G06": 0.8, "G09": 0.8, "G12": 1.0, "G11": 0.6,
            "G17": 0.6, "G10": 0.4}},
    {"id": 6, "name": "Penyakit pembuluh darah", "expect": "P06",
     "desc": "Nyeri/kemerahan pada anggota badan, luka sulit sembuh, kesemutan",
     "ev": {"G22": 0.8, "G23": 0.6, "G27": 0.8, "G28": 0.6, "G09": 0.4}},
    {"id": 7, "name": "Gejala tumpang tindih (tidak pasti)", "expect": None,
     "desc": "Hanya gejala bersama: sesak nafas, lelah, kaki bengkak",
     "ev": {"G06": 0.6, "G17": 0.6, "G09": 0.4, "G04": 0.2}},
    {"id": 8, "name": "Pasien sangat tidak yakin", "expect": None,
     "desc": "Tiga gejala samar, semua 'hampir mungkin' (0.2)",
     "ev": {"G07": 0.2, "G08": 0.2, "G01": 0.2}},
    {"id": 9, "name": "Gejala tunggal", "expect": "P01",
     "desc": "Hanya nyeri dada (0.8): menunjukkan persaingan antara P01 dan P06",
     "ev": {"G01": 0.8}},
    {"id": 10, "name": "Semua 'tidak tahu'", "expect": None,
     "desc": "Setiap jawaban = 0, sistem tidak boleh memberikan diagnosis",
     "ev": {"G01": 0.0, "G06": 0.0, "G13": 0.0}},
]


# ---------------------------------------------------------------
# 5. OUTPUT HELPERS
# ---------------------------------------------------------------
def print_result(ev, show_trace=True):
    ranking, trace = diagnose(ev)
    if show_trace:
        for pid, steps in trace.items():
            print(f"\n  {pid} {DISEASES[pid]}")
            for gid, cu, ce, cs, run in steps:
                print(f"    {gid} {SYMPTOMS[gid][:40]:<40} user {cu:.1f} x expert {ce:.1f}"
                      f" = {cs:.3f} -> combined {run:.5f}")
    print("\n  Peringkat:")
    if not ranking:
        print("    (tidak ada)")
    for pid, cf in ranking:
        print(f"    {DISEASES[pid]:<55} {cf * 100:6.2f}%")
    print("  " + interpret(ranking))
    return ranking


def run_tests():
    rows, passed = [], 0
    for tc in TEST_CASES:
        print(f"\n=== Kasus {tc['id']}: {tc['name']} ===\n  {tc['desc']}")
        ranking = print_result(tc["ev"], show_trace=False)
        top = ranking[0][0] if ranking else None
        ok = (tc["expect"] is None) or (top == tc["expect"])
        passed += ok
        status = "LULUS" if ok else "GAGAL"
        if tc["expect"] is None:
            status = "n/a (kasus ketidakpastian)"
        print(f"  Harapan: {tc['expect'] or 'tidak ada harapan tetap'} | Hasil: {top} | {status}")
        rows.append({
            "kasus": tc["id"], "nama": tc["name"],
            "gejala": "; ".join(f"{k}={v}" for k, v in tc["ev"].items()),
            "penyakit_teratas": DISEASES[top] if top else "-",
            "cf_teratas_%": round(ranking[0][1] * 100, 2) if ranking else 0,
            "penyakit_kedua": DISEASES[ranking[1][0]] if len(ranking) > 1 else "-",
            "cf_kedua_%": round(ranking[1][1] * 100, 2) if len(ranking) > 1 else 0,
            "interpretasi": interpret(ranking),
        })
    r, _ = diagnose(TEST_CASES[0]["ev"])
    journal_ok = abs(dict(r)["P03"] - 0.8381) < 0.001
    print(f"\nVerifikasi jurnal (Katup Jantung ~ 83.81%): {'OK' if journal_ok else 'TIDAK COCOK'}")
    print(f"Kasus dengan harapan yang lulus: {passed}/{len(TEST_CASES)}")
    with open("test_results.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    print("Tersimpan: test_results.csv")


def interactive():
    print("SISTEM PAKAR KARDIOVASKULAR (Certainty Factor)")
    print("Demo edukatif — bukan saran medis.\n")
    print("Untuk setiap gejala, pilih tingkat keyakinan Anda:")
    for i, (_, label) in enumerate(USER_LEVELS):
        print(f"  {i} = {label}")
    print("  (tekan Enter = 0)\n")
    ev = {}
    for gid, name in SYMPTOMS.items():
        while True:
            raw = input(f"{gid} {name}? [0-5]: ").strip() or "0"
            if raw.isdigit() and 0 <= int(raw) <= 5:
                ev[gid] = USER_LEVELS[int(raw)][0]
                break
            print("  Masukkan angka 0 sampai 5.")
    print("\n--- HASIL ---")
    print_result(ev)
    print("\nSilakan konsultasi ke dokter spesialis jantung untuk diagnosis yang sesungguhnya.")


if __name__ == "__main__":
    args = sys.argv[1:]
    if "--tests" in args:
        run_tests()
    elif "--auto" in args:
        idx = args.index("--auto")
        n = int(args[idx + 1]) if idx + 1 < len(args) else 20
        run_auto_simulations(n=n)
    elif "--case" in args:
        n = int(args[args.index("--case") + 1])
        tc = next(t for t in TEST_CASES if t["id"] == n)
        print(f"Kasus {n}: {tc['name']} - {tc['desc']}")
        print_result(tc["ev"])
    else:
        interactive()