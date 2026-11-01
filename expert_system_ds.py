"""
Cardiovascular Disease Expert System - DEMPSTER-SHAFER method
Same knowledge base as the journal (Ajisari & Prasetyaningrum, 2024):
6 diseases, 29 symptoms, expert weights from Table 3.

REQUIRES cardio_cf_expert_system.py in the same folder (it holds the shared
knowledge base and the 10 test cases, so both methods use identical data).

Dempster-Shafer in short
  Frame of discernment  Theta = {P01..P06}
  Each symptom is a body of evidence: mass m(A) = density on a set A of
  diseases, and the rest m(Theta) = 1 - density means "I don't know".
  Bodies are merged with Dempster's rule:
      m12(Z) = sum_{X and Y intersect = Z} m1(X) m2(Y) / (1 - K)
      K      = conflict = sum of m1(X) m2(Y) where X and Y do not intersect
  Results:  Bel(d) = lower bound   Pl(d) = upper bound   Pl - Bel = uncertainty

Two ways to turn the journal's weights into masses (--mode):
  rule     (default) one body per (symptom, disease) pair, density =
           CF_user x CF_expert. Keeps every expert weight exactly as in the
           journal, so it is directly comparable with the CF result.
  symptom  textbook style: one body per symptom, focal set = ALL diseases that
           have this symptom, density = CF_user x MEAN expert weight of those
           diseases. (Mean is MY assumption - the journal gives no DS densities.)

Usage:
    python cardio_ds_expert_system.py                 interactive
    python cardio_ds_expert_system.py --tests         all 10 cases, CF vs DS, writes CSV
    python cardio_ds_expert_system.py --case 7        full trace of one case
    add  --mode symptom  to use the textbook construction

EDUCATIONAL DEMO ONLY - not a medical device and not medical advice.
"""
import csv
import sys

try:
    from expert_system import (DISEASES, SYMPTOMS, RULES, USER_LEVELS,
                                         TEST_CASES, diagnose as cf_diagnose)
except ImportError:
    sys.exit("Put cardio_cf_expert_system.py in the same folder as this file.")

THETA = frozenset(DISEASES)  # frame of discernment


# ---------------------------------------------------------------
# 1. DEMPSTER-SHAFER ENGINE
# ---------------------------------------------------------------
def name_set(A):
    return "Theta" if A == THETA else "{" + ",".join(sorted(A)) + "}"


def dempster(m1, m2):
    """Dempster's rule of combination. Returns (new mass, conflict K)."""
    raw, k = {}, 0.0
    for a, va in m1.items():
        for b, vb in m2.items():
            inter = a & b
            if inter:
                raw[inter] = raw.get(inter, 0.0) + va * vb
            else:
                k += va * vb
    if k >= 1 - 1e-12:
        raise ValueError("Total conflict: evidence cannot be combined")
    return {s: v / (1 - k) for s, v in raw.items()}, k


def build_evidence(evidence, mode="rule"):
    """List of (label, density, focal_set). Symptoms with user CF = 0 are skipped."""
    bodies = []
    for gid in SYMPTOMS:
        u = evidence.get(gid, 0.0)
        if u <= 0:
            continue
        weights = {pid: w[gid] for pid, w in RULES.items() if gid in w}
        if mode == "rule":
            for pid, w in weights.items():
                bodies.append((f"{gid}->{pid}", u * w, frozenset([pid])))
        else:
            dens = u * sum(weights.values()) / len(weights)
            bodies.append((gid, dens, frozenset(weights)))
    return bodies


def bel(m, A):
    return sum(v for s, v in m.items() if s <= A)


def pl(m, A):
    return sum(v for s, v in m.items() if s & A)


def diagnose_ds(evidence, mode="rule"):
    bodies = build_evidence(evidence, mode)
    m, steps, keep = {THETA: 1.0}, [], 1.0
    for label, dens, focal in bodies:
        body = {focal: dens}
        body[THETA] = body.get(THETA, 0.0) + (1 - dens)
        m, k = dempster(m, body)
        keep *= (1 - k)
        steps.append((label, dens, focal, k))
    candidates = set().union(*[f for _, _, f in bodies]) if bodies else set()
    ranking = [(pid, bel(m, frozenset([pid])), pl(m, frozenset([pid])))
               for pid in candidates]
    # sort by Bel, then Pl; round to ignore float noise; disease code makes ties deterministic
    ranking.sort(key=lambda r: (-round(r[1], 9), -round(r[2], 9), r[0]))
    return {"ranking": ranking, "mass": m, "steps": steps,
            "ignorance": m.get(THETA, 0.0), "total_conflict": 1 - keep}


def interpret(res):
    """Reading aid (my addition): is the top disease separated from the runner-up?"""
    r = res["ranking"]
    if not r:
        return "No diagnosis: no symptom reported with confidence > 0."
    pid, b, p = r[0]
    txt = f"Top: Bel {b * 100:.1f}% / Pl {p * 100:.1f}%, ignorance m(Theta) {res['ignorance'] * 100:.1f}%."
    if len(r) > 1:
        if b >= r[1][2] - 1e-9:
            txt += " DECISIVE: Bel(top) >= Pl(runner-up)."
        else:
            txt += " NOT DECISIVE: top and runner-up belief intervals overlap."
    return txt


def closed_form_check(evidence):
    """Independent check for rule mode: each rule supports one disease, so
    Dempster's rule has a closed form. Returns max abs difference vs the engine."""
    s = {p: 1.0 for p in DISEASES}
    for gid, u in evidence.items():
        for pid, w in RULES.items():
            if gid in w and u > 0:
                s[pid] *= 1 - u * w[gid]
    allp = 1.0
    for v in s.values():
        allp *= v
    un = {}
    for d in DISEASES:
        others = 1.0
        for e in DISEASES:
            if e != d:
                others *= s[e]
        un[d] = (1 - s[d]) * others
    total = sum(un.values()) + allp
    res = diagnose_ds(evidence, "rule")
    got = {p: b for p, b, _ in res["ranking"]}
    return max((abs(un[d] / total - got.get(d, 0.0)) for d in DISEASES), default=0.0)


# ---------------------------------------------------------------
# 2. OUTPUT
# ---------------------------------------------------------------
def print_result(ev, mode, show_trace=True):
    res = diagnose_ds(ev, mode)
    if show_trace and res["steps"]:
        print(f"\n  Evidence combined in order (mode = {mode}):")
        for label, dens, focal, k in res["steps"]:
            print(f"    {label:<8} m({name_set(focal)}) = {dens:.3f}  "
                  f"| conflict K = {k:.4f}")
        print("\n  Final mass function:")
        for s, v in sorted(res["mass"].items(), key=lambda x: -x[1]):
            print(f"    m({name_set(s)}) = {v:.4f}")
    print(f"\n  Ranking by belief   (total conflict absorbed: {res['total_conflict'] * 100:.1f}%)")
    if not res["ranking"]:
        print("    (none)")
    for pid, b, p in res["ranking"]:
        print(f"    {DISEASES[pid]:<52} Bel {b * 100:6.2f}%  Pl {p * 100:6.2f}%")
    print("  " + interpret(res))
    return res


def run_tests(mode):
    rows, max_err = [], 0.0
    for tc in TEST_CASES:
        print(f"\n=== Case {tc['id']}: {tc['name']} ===\n  {tc['desc']}")
        res = print_result(tc["ev"], mode, show_trace=False)
        max_err = max(max_err, closed_form_check(tc["ev"]))
        cf_rank, _ = cf_diagnose(tc["ev"])
        row = {"case": tc["id"], "name": tc["name"],
               "cf_top": cf_rank[0][0] if cf_rank else "-",
               "cf_percent": round(cf_rank[0][1] * 100, 2) if cf_rank else 0}
        for m in ("rule", "symptom"):
            r = diagnose_ds(tc["ev"], m)
            top = r["ranking"][0] if r["ranking"] else None
            tag = "ds_rule" if m == "rule" else "ds_symptom"
            row[f"{tag}_top"] = top[0] if top else "-"
            row[f"{tag}_bel"] = round(top[1] * 100, 2) if top else 0
            row[f"{tag}_pl"] = round(top[2] * 100, 2) if top else 0
            row[f"{tag}_ignorance"] = round(r["ignorance"] * 100, 2)
            row[f"{tag}_conflict"] = round(r["total_conflict"] * 100, 2)
            row[f"{tag}_reading"] = interpret(r)
        rows.append(row)
    print("\n" + "=" * 66)
    print("COMPARISON (top disease and its score)")
    print(f"{'#':<3}{'CF':<16}{'DS rule-mode':<20}{'DS symptom-mode':<20}")
    for r in rows:
        print(f"{r['case']:<3}{r['cf_top']} {r['cf_percent']:>6.1f}%    "
              f"{r['ds_rule_top']} Bel {r['ds_rule_bel']:>5.1f}%   "
              f"{r['ds_symptom_top']} Bel {r['ds_symptom_bel']:>5.1f}%")
    print(f"\nClosed-form check of the engine (rule mode): max difference = {max_err:.2e}")
    with open("test_results_ds.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    print("Saved: test_results_ds.csv")


def interactive(mode):
    print(f"CARDIOVASCULAR EXPERT SYSTEM (Dempster-Shafer, mode = {mode})")
    print("Educational demo only - not medical advice.\n")
    print("For each symptom choose how sure you are:")
    for i, (_, label) in enumerate(USER_LEVELS):
        print(f"  {i} = {label}")
    print("  (press Enter = 0)\n")
    ev = {}
    for gid, name in SYMPTOMS.items():
        while True:
            raw = input(f"{gid} {name}? [0-5]: ").strip() or "0"
            if raw.isdigit() and 0 <= int(raw) <= 5:
                ev[gid] = USER_LEVELS[int(raw)][0]
                break
            print("  Enter a number from 0 to 5.")
    print("\n--- RESULT ---")
    print_result(ev, mode)
    print("\nPlease consult a cardiologist for a real diagnosis.")


if __name__ == "__main__":
    args = sys.argv[1:]
    mode = args[args.index("--mode") + 1] if "--mode" in args else "rule"
    if mode not in ("rule", "symptom"):
        sys.exit("--mode must be 'rule' or 'symptom'")
    if "--tests" in args:
        run_tests(mode)
    elif "--case" in args:
        n = int(args[args.index("--case") + 1])
        tc = next(t for t in TEST_CASES if t["id"] == n)
        print(f"Case {n}: {tc['name']} - {tc['desc']}")
        print_result(tc["ev"], mode)
    else:
        interactive(mode)