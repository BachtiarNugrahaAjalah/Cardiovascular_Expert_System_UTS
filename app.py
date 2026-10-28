"""
Flask Web Application - Sistem Pakar Kardiovaskular
Backend REST API untuk antarmuka web sistem pakar.
"""
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import sys

# Import modul sistem pakar
from expert_system import (
    diagnose_as_dict,
    get_knowledge_base,
    generate_auto_scenario,
    run_auto_simulations,
    DISEASES, SYMPTOMS, USER_LEVELS, RULES,
)

app = Flask(__name__, static_folder="static", static_url_path="")
CORS(app)


# ---------------------------------------------------------------
# Halaman utama - serve static files
# ---------------------------------------------------------------
@app.route("/")
def index():
    return send_from_directory("static", "index.html")


# ---------------------------------------------------------------
# API: Knowledge base (daftar penyakit, gejala, dll.)
# ---------------------------------------------------------------
@app.route("/api/knowledge-base", methods=["GET"])
def api_knowledge_base():
    return jsonify(get_knowledge_base())


# ---------------------------------------------------------------
# API: Diagnosa berdasarkan gejala yang dimasukkan user
# ---------------------------------------------------------------
@app.route("/api/diagnose", methods=["POST"])
def api_diagnose():
    data = request.get_json()
    if not data or "evidence" not in data:
        return jsonify({"error": "Field 'evidence' diperlukan. Format: {G01: 0.8, G02: 0.6, ...}"}), 400

    evidence = data["evidence"]

    # Validasi nilai CF
    valid_cf = {0.0, 0.2, 0.4, 0.6, 0.8, 1.0}
    for key, val in evidence.items():
        if key not in SYMPTOMS:
            return jsonify({"error": f"Kode gejala tidak valid: {key}"}), 400
        if float(val) not in valid_cf:
            return jsonify({"error": f"Nilai CF tidak valid untuk {key}: {val}. Gunakan: 0, 0.2, 0.4, 0.6, 0.8, atau 1.0"}), 400

    evidence = {k: float(v) for k, v in evidence.items()}
    result = diagnose_as_dict(evidence)
    return jsonify(result)


# ---------------------------------------------------------------
# API: Auto simulasi - generate skenario otomatis
# ---------------------------------------------------------------
@app.route("/api/auto-simulate", methods=["POST"])
def api_auto_simulate():
    data = request.get_json() or {}
    mode = data.get("mode", "random")
    seed = data.get("seed", None)

    valid_modes = ["random", "focused", "uncertain", "minimal", "contradictory"]
    if mode not in valid_modes:
        return jsonify({"error": f"Mode tidak valid. Pilih: {', '.join(valid_modes)}"}), 400

    evidence, meta = generate_auto_scenario(seed=seed, mode=mode)
    result = diagnose_as_dict(evidence)

    return jsonify({
        "meta": meta,
        "evidence": evidence,
        "diagnosis": result,
    })


# ---------------------------------------------------------------
# API: Batch simulasi - jalankan N simulasi sekaligus
# ---------------------------------------------------------------
@app.route("/api/batch-simulate", methods=["POST"])
def api_batch_simulate():
    data = request.get_json() or {}
    n = int(data.get("n", 10))
    n = min(n, 50)  # Maksimal 50 simulasi per request

    modes = ["random", "focused", "uncertain", "minimal", "contradictory"]
    import random as rnd
    results = []
    for i in range(n):
        mode = modes[i % len(modes)]
        seed = rnd.randint(0, 9999)
        evidence, meta = generate_auto_scenario(seed=seed, mode=mode)
        diag = diagnose_as_dict(evidence)
        results.append({
            "sim_no": i + 1,
            "mode": mode,
            "seed": seed,
            "meta": meta,
            "evidence": evidence,
            "top_disease": diag["top_disease"],
            "top_cf_percent": diag["top_cf_percent"],
            "is_ambiguous": diag["is_ambiguous"],
            "interpretation": diag["interpretation"],
        })

    ambiguous = sum(1 for r in results if r["is_ambiguous"])
    no_diag = sum(1 for r in results if r["top_disease"] is None)
    return jsonify({
        "simulations": results,
        "summary": {
            "total": n,
            "ambiguous": ambiguous,
            "no_diagnosis": no_diag,
            "ambiguous_pct": round(ambiguous / n * 100, 1),
        },
    })


# ---------------------------------------------------------------
# API: Daftar gejala per penyakit (untuk referensi)
# ---------------------------------------------------------------
@app.route("/api/disease/<disease_code>/symptoms", methods=["GET"])
def api_disease_symptoms(disease_code):
    if disease_code not in DISEASES:
        return jsonify({"error": f"Kode penyakit tidak ditemukan: {disease_code}"}), 404
    syms = {gid: {"name": SYMPTOMS[gid], "cf_expert": cf}
            for gid, cf in RULES[disease_code].items()}
    return jsonify({
        "disease_code": disease_code,
        "disease_name": DISEASES[disease_code],
        "symptoms": syms,
    })


if __name__ == "__main__":
    os.makedirs("static", exist_ok=True)
    print("=" * 60)
    print("  Sistem Pakar Kardiovaskular - Web Interface")
    print("  Buka browser: http://localhost:5000")
    print("=" * 60)
    app.run(debug=True, host="0.0.0.0", port=5000)
