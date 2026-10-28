"""
auto_input.py — Script Input Otomatis Sistem Pakar Kardiovaskular
=================================================================
Script ini mendemonstrasikan berbagai skenario input otomatis yang
menghasilkan ketidakpastian (uncertainty) pada sistem pakar.

Penggunaan:
    python auto_input.py                    -- 20 simulasi default
    python auto_input.py --n 50             -- jalankan 50 simulasi
    python auto_input.py --mode focused     -- satu mode saja
    python auto_input.py --seed 42          -- seed tertentu (reproducible)
    python auto_input.py --analyze          -- analisis uncertainty mendalam
    python auto_input.py --api              -- kirim ke Flask API (server harus jalan)
"""
import argparse
import json
import random
import sys
from collections import defaultdict

# Pastikan modul expert_system tersedia
try:
    from expert_system import (
        generate_auto_scenario,
        diagnose_as_dict,
        run_auto_simulations,
        DISEASES, SYMPTOMS, RULES, USER_LEVELS,
    )
except ImportError:
    print("ERROR: expert_system.py tidak ditemukan di direktori ini.")
    sys.exit(1)


# ───────────────────────────────────────────────────────────────
# 1. UNCERTAINTY ANALYZER
#    Hitung berbagai metrik ketidakpastian dari satu hasil diagnosa
# ───────────────────────────────────────────────────────────────
def compute_uncertainty_metrics(diag_result: dict) -> dict:
    """
    Hitung metrik ketidakpastian dari hasil diagnosa:
    - entropy       : ketidakpastian distribusi CF (mirip Shannon entropy)
    - cf_spread     : selisih CF tertinggi - terendah
    - top2_gap      : selisih antara peringkat 1 dan 2
    - coverage      : berapa % penyakit yang muncul dalam ranking
    - uncertainty_level : kategorisasi tekstual
    """
    results = diag_result.get("results", [])
    if not results:
        return {
            "entropy": 0.0,
            "cf_spread": 0.0,
            "top2_gap": 0.0,
            "coverage": 0.0,
            "uncertainty_level": "TIDAK ADA DATA",
        }

    cfs = [r["cf_value"] for r in results]
    total = sum(cfs)

    # Entropy (normalisasi 0..1)
    if total > 0:
        import math
        probs = [c / total for c in cfs]
        entropy = -sum(p * math.log2(p) for p in probs if p > 0)
        max_entropy = math.log2(len(DISEASES))
        norm_entropy = entropy / max_entropy if max_entropy > 0 else 0
    else:
        norm_entropy = 0

    cf_spread = max(cfs) - min(cfs) if len(cfs) > 1 else cfs[0]
    top2_gap  = (cfs[0] - cfs[1]) if len(cfs) > 1 else 1.0
    coverage  = len(cfs) / len(DISEASES)

    # Uncertainty level classification
    if not results:
        lvl = "TIDAK ADA DATA"
    elif top2_gap < 0.05:
        lvl = "SANGAT TINGGI (top2 gap < 5%)"
    elif top2_gap < 0.10:
        lvl = "TINGGI (top2 gap < 10%)"
    elif norm_entropy > 0.7:
        lvl = "SEDANG (entropi tinggi)"
    elif coverage > 0.8:
        lvl = "SEDANG (banyak penyakit terlibat)"
    else:
        lvl = "RENDAH (hasil relatif jelas)"

    return {
        "entropy":           round(norm_entropy, 4),
        "cf_spread":         round(cf_spread, 4),
        "top2_gap":          round(top2_gap, 4),
        "coverage":          round(coverage, 4),
        "uncertainty_level": lvl,
    }


# ───────────────────────────────────────────────────────────────
# 2. SINGLE SCENARIO RUNNER
# ───────────────────────────────────────────────────────────────
def run_single(mode="random", seed=None, verbose=True) -> dict:
    """Jalankan satu skenario auto-input dan kembalikan hasilnya."""
    evidence, meta = generate_auto_scenario(seed=seed, mode=mode)
    result   = diagnose_as_dict(evidence)
    uncertainty = compute_uncertainty_metrics(result)

    if verbose:
        print(f"\n{'─'*60}")
        print(f"Mode    : {mode}")
        print(f"Seed    : {seed if seed is not None else 'acak'}")
        print(f"Deskripsi: {meta.get('description','')}")
        print(f"\nGejala yang dilaporkan ({len(evidence)} gejala):")
        for gcode, cval in evidence.items():
            label = next(l for v,l in USER_LEVELS if v == cval)
            print(f"  {gcode} — {SYMPTOMS[gcode][:45]:<45} CF={cval:.1f} [{label}]")

        print(f"\nHasil Diagnosa:")
        if result["results"]:
            for i, r in enumerate(result["results"]):
                flag = " ◀ TERATAS" if i == 0 else ""
                print(f"  {r['disease_code']} {r['disease_name']:<50} {r['cf_percent']:6.2f}%{flag}")
            print(f"\n  Interpretasi: {result['interpretation']}")
        else:
            print("  Tidak ada diagnosis")

        print(f"\nMetrik Ketidakpastian:")
        print(f"  Entropi (normal): {uncertainty['entropy']:.4f}")
        print(f"  CF Spread       : {uncertainty['cf_spread']:.4f}")
        print(f"  Gap Peringkat1-2: {uncertainty['top2_gap']:.4f}")
        print(f"  Coverage        : {uncertainty['coverage']:.2%}")
        print(f"  Tingkat Unc.    : {uncertainty['uncertainty_level']}")
        print(f"{'─'*60}")

    return {
        "mode": mode, "seed": seed,
        "evidence": evidence,
        "meta": meta,
        "result": result,
        "uncertainty": uncertainty,
    }


# ───────────────────────────────────────────────────────────────
# 3. DEEP UNCERTAINTY ANALYSIS
#    Jalankan banyak simulasi dan analisis distribusi ketidakpastian
# ───────────────────────────────────────────────────────────────
def analyze_uncertainty(n_per_mode=20):
    """
    Analisis mendalam ketidakpastian per mode simulasi.
    """
    modes = ["random", "focused", "uncertain", "minimal", "contradictory"]
    print(f"\n{'='*70}")
    print(f"  ANALISIS KETIDAKPASTIAN MENDALAM — {n_per_mode} skenario/mode")
    print(f"{'='*70}")

    all_stats = {}
    for mode in modes:
        entropies, top2_gaps, coverages, ambiguous_count = [], [], [], 0

        for i in range(n_per_mode):
            seed = random.randint(0, 99999)
            output = run_single(mode=mode, seed=seed, verbose=False)
            unc = output["uncertainty"]
            entropies.append(unc["entropy"])
            top2_gaps.append(unc["top2_gap"])
            coverages.append(unc["coverage"])
            if output["result"]["is_ambiguous"]:
                ambiguous_count += 1

        avg_entropy = sum(entropies) / n_per_mode
        avg_gap     = sum(top2_gaps) / n_per_mode
        avg_cov     = sum(coverages) / n_per_mode
        amb_pct     = ambiguous_count / n_per_mode * 100

        all_stats[mode] = {
            "avg_entropy": avg_entropy,
            "avg_top2_gap": avg_gap,
            "avg_coverage": avg_cov,
            "ambiguous_pct": amb_pct,
        }

        print(f"\n  Mode: {mode.upper()}")
        print(f"  ├─ Rata-rata Entropi    : {avg_entropy:.4f}  (semakin tinggi = semakin tidak pasti)")
        print(f"  ├─ Rata-rata Gap Top1-2 : {avg_gap:.4f}  (semakin kecil = semakin ambigu)")
        print(f"  ├─ Rata-rata Coverage   : {avg_cov:.2%}  (penyakit yang terlibat)")
        print(f"  └─ Hasil Ambigu         : {ambiguous_count}/{n_per_mode} ({amb_pct:.1f}%)")

    # Ranking by uncertainty
    print(f"\n{'='*70}")
    print(f"  RANKING MODE BERDASARKAN TINGKAT KETIDAKPASTIAN (Entropi)")
    print(f"{'='*70}")
    ranked = sorted(all_stats.items(), key=lambda x: x[1]["avg_entropy"], reverse=True)
    for rank, (mode, stats) in enumerate(ranked, 1):
        print(f"  {rank}. {mode:<15} entropi={stats['avg_entropy']:.4f}, ambigu={stats['ambiguous_pct']:.1f}%")

    return all_stats


# ───────────────────────────────────────────────────────────────
# 4. API SENDER (kirim ke Flask yang sedang berjalan)
# ───────────────────────────────────────────────────────────────
def send_to_api(n=5, base_url="http://localhost:5000"):
    """
    Kirim N skenario ke Flask API dan tampilkan hasilnya.
    Server Flask harus berjalan terlebih dahulu (python app.py).
    """
    try:
        import urllib.request
        import urllib.error
    except ImportError:
        print("ERROR: modul urllib tidak tersedia")
        return

    modes = ["random", "focused", "uncertain", "minimal", "contradictory"]
    print(f"\n{'='*60}")
    print(f"  MENGIRIM {n} SKENARIO KE FLASK API: {base_url}")
    print(f"{'='*60}")

    for i in range(n):
        mode = modes[i % len(modes)]
        seed = random.randint(0, 9999)
        evidence, meta = generate_auto_scenario(seed=seed, mode=mode)

        payload = json.dumps({"evidence": evidence}).encode("utf-8")
        req = urllib.request.Request(
            f"{base_url}/api/diagnose",
            data=payload,
            headers={"Content-Type": "application/json"},
        )

        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read())
            top = data["results"][0] if data["results"] else None
            print(f"\n[{i+1}] Mode={mode} | Seed={seed}")
            print(f"     Deskripsi: {meta.get('description','')}")
            print(f"     Gejala: {', '.join(f'{k}={v}' for k,v in evidence.items())}")
            if top:
                flag = " [AMBIGU]" if data["is_ambiguous"] else ""
                print(f"     Diagnosis: {top['disease_name']} ({top['cf_percent']:.2f}%){flag}")
            else:
                print(f"     Diagnosis: Tidak ada")
        except urllib.error.URLError as e:
            print(f"ERROR menghubungi API: {e}. Pastikan 'python app.py' sedang berjalan.")
            break


# ───────────────────────────────────────────────────────────────
# 5. MAIN
# ───────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Auto-input simulator untuk Sistem Pakar Kardiovaskular CF"
    )
    parser.add_argument("--n",       type=int, default=20, help="Jumlah simulasi (default: 20)")
    parser.add_argument("--mode",    type=str, default=None,
        choices=["random","focused","uncertain","minimal","contradictory","all"],
        help="Mode skenario (default: rotasi semua mode)")
    parser.add_argument("--seed",    type=int, default=None, help="Random seed (reproducible)")
    parser.add_argument("--analyze", action="store_true", help="Jalankan analisis ketidakpastian mendalam")
    parser.add_argument("--api",     action="store_true", help="Kirim ke Flask API (server harus jalan)")
    parser.add_argument("--url",     type=str, default="http://localhost:5000", help="URL Flask API")
    parser.add_argument("--output",  type=str, default="auto_simulation_results.csv", help="Nama file CSV output")

    args = parser.parse_args()

    print("""
╔══════════════════════════════════════════════════════════════╗
║   AUTO-INPUT SIMULATOR — SISTEM PAKAR KARDIOVASKULAR         ║
║   Metode Certainty Factor (CF)                               ║
║   Demo Edukatif — Bukan Saran Medis                         ║
╚══════════════════════════════════════════════════════════════╝
""")

    if args.analyze:
        analyze_uncertainty(n_per_mode=max(10, args.n // 5))

    elif args.api:
        send_to_api(n=args.n, base_url=args.url)

    elif args.mode and args.mode != "all":
        # Single mode, possibly with specific seed
        print(f"Menjalankan {args.n} simulasi dengan mode: {args.mode}")
        rows = []
        for i in range(args.n):
            seed = args.seed if args.seed is not None else random.randint(0, 99999)
            output = run_single(mode=args.mode, seed=seed, verbose=True)
            rows.append(output)
        print(f"\n✔ Selesai: {args.n} simulasi mode '{args.mode}'")

    else:
        # Default: rotasi semua mode
        run_auto_simulations(n=args.n, output_csv=args.output)


if __name__ == "__main__":
    main()
