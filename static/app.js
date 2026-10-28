/**
 * app.js - Frontend & Standalone Certainty Factor Inference Engine
 * Sistem Pakar Kardiovaskular — 100% Client-Side (GitHub Pages Ready)
 * Sumber Basis Pengetahuan: Ajisari & Prasetyaningrum (2024)
 */

// ===============================================================
// 1. KNOWLEDGE BASE (BASIS PENGETAHUAN LENGKAP)
// ===============================================================

const USER_LEVELS = [
  { value: 0.0, label: "Tidak Tahu / Tidak Yakin" },
  { value: 0.2, label: "Hampir Mungkin" },
  { value: 0.4, label: "Mungkin" },
  { value: 0.6, label: "Cukup Yakin" },
  { value: 0.8, label: "Yakin" },
  { value: 1.0, label: "Sangat Yakin" },
];

const DISEASES = {
  "P01": "Jantung Koroner (Coronary Heart Disease)",
  "P02": "Gagal Jantung Kongestif (Congestive Heart Failure)",
  "P03": "Katup Jantung (Heart Valve Disease)",
  "P04": "Aritmia (Arrhythmia)",
  "P05": "Jantung Bawaan (Congenital Heart Disease)",
  "P06": "Pembuluh Darah (Vascular Disease)",
};

const DISEASE_DESCRIPTIONS = {
  "P01": "Penyakit yang terjadi akibat penyempitan atau penyumbatan arteri koroner yang memasok darah ke otot jantung.",
  "P02": "Kondisi di mana jantung tidak dapat memompa darah secara efisien, menyebabkan cairan menumpuk di paru-paru dan jaringan tubuh.",
  "P03": "Gangguan pada katup jantung yang dapat menyebabkan kebocoran atau penyempitan aliran darah.",
  "P04": "Gangguan irama jantung yang menyebabkan jantung berdetak terlalu cepat, terlalu lambat, atau tidak teratur.",
  "P05": "Kelainan struktur jantung yang sudah ada sejak lahir, dapat mempengaruhi dinding, katup, atau pembuluh darah jantung.",
  "P06": "Penyakit yang mempengaruhi sistem pembuluh darah di luar jantung, termasuk arteri dan vena.",
};

const DISEASE_RECOMMENDATIONS = {
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
};

const SYMPTOMS = {
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
};

const RULES = {
  "P01": { "G01": 0.8, "G02": 0.6, "G03": 0.4, "G04": 0.6, "G05": 0.6, "G06": 0.4, "G07": 0.2, "G08": 0.4 },
  "P02": { "G06": 0.8, "G09": 0.6, "G10": 0.4, "G08": 0.4, "G01": 0.4, "G04": 0.2, "G11": 0.6, "G12": 0.8, "G17": 0.6 },
  "P03": { "G13": 0.4, "G06": 0.6, "G14": 0.4, "G11": 0.6, "G17": 0.6, "G09": 0.6, "G04": 0.4 },
  "P04": { "G13": 0.8, "G07": 0.4, "G17": 0.6, "G04": 0.6, "G06": 0.4, "G15": 0.8, "G16": 0.8 },
  "P05": { "G06": 0.6, "G18": 0.8, "G19": 0.8, "G17": 0.4, "G20": 0.6, "G21": 0.8 },
  "P06": { "G09": 0.6, "G22": 0.6, "G23": 0.8, "G24": 0.8, "G25": 0.8, "G26": 0.8, "G27": 0.8, "G28": 0.6, "G29": 0.4, "G01": 0.4, "G07": 0.4, "G04": 0.6 },
};

const knowledgeBase = {
  diseases: DISEASES,
  disease_descriptions: DISEASE_DESCRIPTIONS,
  disease_recommendations: DISEASE_RECOMMENDATIONS,
  symptoms: SYMPTOMS,
  rules: RULES,
  user_levels: USER_LEVELS,
};

// ===============================================================
// 2. CERTAINTY FACTOR INFERENCE ENGINE (CLIENT-SIDE)
// ===============================================================

/**
 * Rumus kombinasi CF: CF_old + CF_symptom * (1 - CF_old)
 */
function combineCF(cfOld, cfNew) {
  return cfOld + cfNew * (1 - cfOld);
}

/**
 * Inferensi Certainty Factor berdasarkan evidence user
 * @param {Object} evidence - { "G01": 1.0, "G02": 0.8, ... }
 */
function diagnoseCF(evidence) {
  const ranking = [];
  const trace = {};

  for (const [pid, weights] of Object.entries(RULES)) {
    let running = 0.0;
    const steps = [];

    for (const [gid, cfExpert] of Object.entries(weights)) {
      const cfUser = parseFloat(evidence[gid] || 0.0);
      if (cfUser <= 0) continue;

      const cfSym = cfUser * cfExpert;
      running = steps.length === 0 ? cfSym : combineCF(running, cfSym);

      steps.push({
        symptom_code: gid,
        symptom_name: SYMPTOMS[gid] || gid,
        cf_user: cfUser,
        cf_expert: cfExpert,
        cf_symptom: cfSym,
        cf_running: running,
      });
    }

    if (steps.length > 0) {
      ranking.push({ disease_code: pid, cf_value: running });
      trace[pid] = steps;
    }
  }

  ranking.sort((a, b) => b.cf_value - a.cf_value);
  return { ranking, trace };
}

/**
 * Interpretasi verbal hasil diagnosis dan deteksi ambiguitas
 */
function interpretDiagnosis(ranking) {
  if (!ranking || ranking.length === 0) {
    return "Tidak ada diagnosis: tidak ada gejala yang dilaporkan dengan keyakinan > 0.";
  }

  const top = ranking[0].cf_value;
  const pct = top * 100;
  let level, desc;

  if (pct >= 80) {
    level = "TINGGI";
    desc = "Sangat disarankan segera konsultasi dokter.";
  } else if (pct >= 60) {
    level = "CUKUP TINGGI";
    desc = "Disarankan untuk periksa ke dokter.";
  } else if (pct >= 40) {
    level = "SEDANG";
    desc = "Perlu pemantauan lebih lanjut.";
  } else if (pct >= 20) {
    level = "RENDAH";
    desc = "Gejala belum cukup kuat, pantau kondisi Anda.";
  } else {
    level = "SANGAT RENDAH";
    desc = "Keyakinan diagnosis sangat rendah.";
  }

  let note = `Tingkat kepercayaan: ${level} (${pct.toFixed(1)}%). ${desc}`;
  if (ranking.length > 1 && (top - ranking[1].cf_value) < 0.10) {
    note += " AMBIGU: Perbedaan dengan kandidat kedua < 10 poin — diperlukan data gejala lebih lanjut.";
  }
  return note;
}

/**
 * Format terstruktur untuk UI
 */
function diagnoseAsDict(evidence) {
  const { ranking, trace } = diagnoseCF(evidence);
  const results = [];

  for (const item of ranking) {
    const pid = item.disease_code;
    const cf = item.cf_value;
    const stepsData = (trace[pid] || []).map(s => ({
      symptom_code: s.symptom_code,
      symptom_name: s.symptom_name,
      cf_user: Number(s.cf_user.toFixed(2)),
      cf_expert: Number(s.cf_expert.toFixed(2)),
      cf_symptom: Number(s.cf_symptom.toFixed(4)),
      cf_running: Number(s.cf_running.toFixed(4)),
    }));

    results.push({
      disease_code: pid,
      disease_name: DISEASES[pid],
      disease_description: DISEASE_DESCRIPTIONS[pid],
      recommendations: DISEASE_RECOMMENDATIONS[pid],
      cf_value: Number(cf.toFixed(4)),
      cf_percent: Number((cf * 100).toFixed(2)),
      steps: stepsData,
    });
  }

  const topCf = ranking.length > 0 ? ranking[0].cf_value : 0;
  const isAmbiguous = ranking.length > 1 && (ranking[0].cf_value - ranking[1].cf_value) < 0.10;

  return {
    results,
    interpretation: interpretDiagnosis(ranking),
    top_disease: ranking.length > 0 ? DISEASES[ranking[0].disease_code] : null,
    top_cf_percent: Number((topCf * 100).toFixed(2)),
    is_ambiguous: isAmbiguous,
    evidence_count: Object.values(evidence).filter(v => parseFloat(v) > 0).length,
  };
}

// ===============================================================
// 3. AUTO-SIMULATOR GENERATOR (CLIENT-SIDE)
// ===============================================================

function createRng(seed) {
  if (seed === null || seed === undefined || isNaN(seed) || seed === "") {
    return Math.random;
  }
  let s = Math.floor(Number(seed)) >>> 0;
  return function() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleArray(arr, n, rng) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

function choiceArray(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

function generateAutoScenario(mode = "random", seed = null) {
  const rng = createRng(seed);
  const allSyms = Object.keys(SYMPTOMS);
  const allCfVals = [0.2, 0.4, 0.6, 0.8, 1.0];
  const evidence = {};
  const meta = { mode, seed };

  if (mode === "random") {
    const n = Math.floor(rng() * 10) + 3; // 3 to 12
    const chosen = sampleArray(allSyms, n, rng);
    chosen.forEach(g => {
      evidence[g] = choiceArray(allCfVals, rng);
    });
    meta.description = `Acak: ${n} gejala dipilih secara random`;
  } else if (mode === "focused") {
    const diseaseKeys = Object.keys(RULES);
    const target = choiceArray(diseaseKeys, rng);
    meta.target_disease = target;
    meta.target_name = DISEASES[target];

    const targetSyms = Object.keys(RULES[target]);
    const minCore = Math.max(2, Math.floor(targetSyms.length / 2));
    const nCore = Math.floor(rng() * (targetSyms.length - minCore + 1)) + minCore;
    const core = sampleArray(targetSyms, nCore, rng);
    core.forEach(g => {
      evidence[g] = choiceArray([0.6, 0.8, 1.0], rng);
    });

    const noisePool = allSyms.filter(s => !targetSyms.includes(s));
    const nNoise = Math.floor(rng() * 3) + 1; // 1 to 3
    const noise = sampleArray(noisePool, Math.min(nNoise, noisePool.length), rng);
    noise.forEach(g => {
      evidence[g] = choiceArray([0.2, 0.4], rng);
    });

    meta.description = `Terfokus pada ${DISEASES[target]} dengan ${nCore} gejala utama + ${noise.length} noise`;
  } else if (mode === "uncertain") {
    const n = Math.floor(rng() * 10) + 6; // 6 to 15
    const chosen = sampleArray(allSyms, n, rng);
    chosen.forEach(g => {
      evidence[g] = choiceArray([0.2, 0.4], rng);
    });
    meta.description = `Tidak pasti: ${n} gejala dengan keyakinan rendah (0.2–0.4)`;
  } else if (mode === "minimal") {
    const n = Math.floor(rng() * 3) + 1; // 1 to 3
    const chosen = sampleArray(allSyms, n, rng);
    chosen.forEach(g => {
      evidence[g] = choiceArray(allCfVals, rng);
    });
    meta.description = `Minimal: hanya ${n} gejala dilaporkan`;
  } else if (mode === "contradictory") {
    const diseaseKeys = Object.keys(RULES);
    const picked = sampleArray(diseaseKeys, 2, rng);
    picked.forEach(d => {
      const syms = Object.keys(RULES[d]);
      const n = Math.floor(rng() * (syms.length - 1)) + 2;
      sampleArray(syms, n, rng).forEach(g => {
        evidence[g] = choiceArray([0.4, 0.6, 0.8], rng);
      });
    });
    meta.description = `Kontradiktif: gejala dari ${DISEASES[picked[0]]} dan ${DISEASES[picked[1]]}`;
  }

  return { evidence, meta };
}

function runBatchSimulations(n = 10) {
  n = Math.min(Math.max(1, n), 50);
  const modes = ["random", "focused", "uncertain", "minimal", "contradictory"];
  const simulations = [];

  for (let i = 0; i < n; i++) {
    const mode = modes[i % modes.length];
    const seed = Math.floor(Math.random() * 10000);
    const { evidence, meta } = generateAutoScenario(mode, seed);
    const diag = diagnoseAsDict(evidence);

    simulations.push({
      sim_no: i + 1,
      mode,
      meta,
      evidence,
      top_disease: diag.top_disease,
      top_cf_percent: diag.top_cf_percent,
      is_ambiguous: diag.is_ambiguous,
      interpretation: diag.interpretation,
    });
  }

  const ambiguousCount = simulations.filter(s => s.is_ambiguous).length;
  const noDiagCount = simulations.filter(s => !s.top_disease).length;

  return {
    simulations,
    summary: {
      total: n,
      ambiguous: ambiguousCount,
      ambiguous_pct: Number(((ambiguousCount / n) * 100).toFixed(1)),
      no_diagnosis: noDiagCount,
      no_diagnosis_pct: Number(((noDiagCount / n) * 100).toFixed(1)),
    },
  };
}

// ===============================================================
// 4. FRONTEND UI & INTERACTION CONTROLLER
// ===============================================================

let lastBatchData = null;

document.addEventListener("DOMContentLoaded", () => {
  renderLegend();
  renderSymptomForm();
  setupTabs();
  setupDiagnoseForm();
  setupSimulateTab();
  setupKnowledgeTab();
});

// ── Tab Navigation ───────────────────────────────────────────
function setupTabs() {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-section").forEach(s => {
        s.classList.remove("active");
        s.classList.add("hidden");
      });
      btn.classList.add("active");
      const section = document.getElementById(`tab-${tab}`);
      section.classList.remove("hidden");
      section.classList.add("active");

      if (tab === "knowledge") renderKnowledgeTab();
    });
  });
}

// ── Render CF Legend ─────────────────────────────────────────
function renderLegend() {
  const grid = document.getElementById("legend-grid");
  if (!grid) return;
  grid.innerHTML = USER_LEVELS.map(({ value, label }) => `
    <div class="legend-item">
      <span class="legend-val">${value.toFixed(1)}</span>
      <span>${label}</span>
    </div>
  `).join("");
}

// ── Render Symptom Form ──────────────────────────────────────
function renderSymptomForm() {
  const container = document.getElementById("symptom-container");
  if (!container) return;

  const cfLabels = USER_LEVELS.map(l => l.label);
  const cfValues = USER_LEVELS.map(l => l.value);

  container.innerHTML = Object.entries(SYMPTOMS).map(([code, name]) => `
    <div class="symptom-card" id="card-${code}">
      <div class="symptom-header">
        <span class="symptom-code">${code}</span>
        <span class="symptom-name">${name}</span>
      </div>
      <div class="cf-slider-row">
        <input type="range" class="cf-slider" id="slider-${code}"
          min="0" max="1" step="0.2" value="0"
          data-code="${code}"
          style="--fill:0%"
          aria-label="${name}" />
        <span class="cf-value-label" id="val-${code}">0.0</span>
      </div>
      <div class="cf-text-label" id="lbl-${code}">Tidak Tahu / Tidak Yakin</div>
    </div>
  `).join("");

  container.querySelectorAll(".cf-slider").forEach(slider => {
    slider.addEventListener("input", () => updateSlider(slider, cfValues, cfLabels));
    updateSlider(slider, cfValues, cfLabels);
  });
}

function updateSlider(slider, cfValues, cfLabels) {
  const v = parseFloat(slider.value);
  const code = slider.dataset.code;
  const pct = (v / 1.0) * 100;

  slider.style.setProperty("--fill", `${pct}%`);
  const valEl = document.getElementById(`val-${code}`);
  if (valEl) valEl.textContent = v.toFixed(1);

  const idx = cfValues.indexOf(v);
  const label = idx >= 0 ? cfLabels[idx] : "";
  const lblEl = document.getElementById(`lbl-${code}`);
  if (lblEl) lblEl.textContent = label;

  const card = document.getElementById(`card-${code}`);
  if (card) {
    if (v > 0) card.classList.add("selected");
    else card.classList.remove("selected");
  }
}

// ── Diagnose Form ────────────────────────────────────────────
function setupDiagnoseForm() {
  const form = document.getElementById("diagnose-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    runDiagnosis();
  });

  document.getElementById("btn-reset").addEventListener("click", resetForm);
  document.getElementById("btn-random-fill").addEventListener("click", randomFill);

  const btnPreset = document.getElementById("btn-preset-ok");
  if (btnPreset) {
    btnPreset.addEventListener("click", applyCaseStudyPreset);
  }

  document.getElementById("btn-toggle-trace").addEventListener("click", toggleTrace);
}

function collectEvidence() {
  const evidence = {};
  document.querySelectorAll(".cf-slider").forEach(slider => {
    const v = parseFloat(slider.value);
    if (v > 0) evidence[slider.dataset.code] = v;
  });
  return evidence;
}

function runDiagnosis() {
  const evidence = collectEvidence();
  if (Object.keys(evidence).length === 0) {
    showToast("Pilih minimal satu gejala dengan keyakinan > 0");
    return;
  }

  showLoading(true);
  setTimeout(() => {
    try {
      const data = diagnoseAsDict(evidence);
      renderResult(data);
    } catch (err) {
      console.error(err);
      showToast("Terjadi kesalahan saat mendiagnosis.");
    } finally {
      showLoading(false);
    }
  }, 120);
}

function renderResult(data) {
  const panel = document.getElementById("result-panel");
  panel.classList.remove("hidden");
  panel.scrollIntoView({ behavior: "smooth", block: "start" });

  const badge = document.getElementById("result-badge");
  const pct = data.top_cf_percent;

  if (!data.results || data.results.length === 0) {
    badge.textContent = "TIDAK ADA DIAGNOSIS";
    badge.className = "result-badge low";
  } else if (data.is_ambiguous) {
    badge.textContent = "⚠ AMBIGU";
    badge.className = "result-badge ambiguous";
  } else if (pct >= 80) {
    badge.textContent = `${pct.toFixed(1)}% — STATUS: OK ✔ (TINGGI)`;
    badge.className = "result-badge high";
  } else if (pct >= 60) {
    badge.textContent = `${pct.toFixed(1)}% — STATUS: OK ✔ (CUKUP TINGGI)`;
    badge.className = "result-badge high";
  } else if (pct >= 40) {
    badge.textContent = `${pct.toFixed(1)}% — STATUS: OK ✔ (SEDANG)`;
    badge.className = "result-badge moderate";
  } else {
    badge.textContent = `${pct.toFixed(1)}% — RENDAH`;
    badge.className = "result-badge low";
  }

  const summary = document.getElementById("result-summary");
  if (!data.results || data.results.length === 0) {
    summary.innerHTML = `
      <div class="top-disease-name">Tidak Ada Diagnosis</div>
      <div class="disease-desc">Tidak ada gejala yang dilaporkan dengan keyakinan > 0.</div>
    `;
  } else {
    const top = data.results[0];
    const statusNote = data.is_ambiguous
      ? '<span style="color:var(--warning);font-weight:600;">⚠ Status Ambigu (Perbedaan #1 dan #2 &lt; 10%)</span>'
      : '<span style="color:var(--success);font-weight:600;">✔ Status OK (Diagnosis Jelas &amp; Tidak Ambigu)</span>';

    summary.innerHTML = `
      <div style="margin-bottom:0.6rem;">${statusNote}</div>
      <div class="top-disease-name">${top.disease_name}</div>
      <div class="disease-desc">${top.disease_description}</div>
      <div class="interp-text">🔍 ${data.interpretation}</div>
      <div class="recommendations">
        <h4>Rekomendasi Tindakan</h4>
        <ul class="rec-list">
          ${top.recommendations.map(r => `<li>${r}</li>`).join("")}
        </ul>
      </div>
    `;
  }

  const barsEl = document.getElementById("cf-bars");
  barsEl.innerHTML = "";
  if (data.results && data.results.length > 0) {
    data.results.forEach((r, i) => {
      const item = document.createElement("div");
      item.className = `cf-bar-item${i === 0 ? " top" : ""}`;
      item.innerHTML = `
        <div class="cf-bar-label">
          <span class="cf-bar-name">${r.disease_name}</span>
          <span class="cf-bar-pct">${r.cf_percent.toFixed(2)}%</span>
        </div>
        <div class="cf-bar-track">
          <div class="cf-bar-fill" data-target="${r.cf_percent}"></div>
        </div>
      `;
      barsEl.appendChild(item);
      setTimeout(() => {
        item.querySelector(".cf-bar-fill").style.width = `${r.cf_percent}%`;
      }, 50 + i * 40);
    });
  }

  panel.dataset.traceData = JSON.stringify(data.results);
  document.getElementById("trace-table-section").classList.add("hidden");
  document.getElementById("btn-toggle-trace").textContent = "📊 Tampilkan Perhitungan Detail";
}

function toggleTrace() {
  const section = document.getElementById("trace-table-section");
  const btn = document.getElementById("btn-toggle-trace");
  const panel = document.getElementById("result-panel");

  if (section.classList.contains("hidden")) {
    const results = JSON.parse(panel.dataset.traceData || "[]");
    section.innerHTML = results.map(r => `
      <div class="trace-section glass-card" style="margin-bottom:1rem;">
        <div class="trace-disease-title">
          <span class="code-tag">${r.disease_code}</span>
          ${r.disease_name} — CF = ${r.cf_value.toFixed(4)} (${r.cf_percent.toFixed(2)}%)
        </div>
        <div class="table-wrapper">
          <table class="data-table compact">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Gejala</th>
                <th>CF User</th>
                <th>CF Pakar</th>
                <th>CF Gejala</th>
                <th>CF Kombinasi</th>
              </tr>
            </thead>
            <tbody>
              ${r.steps.map(s => `
                <tr>
                  <td class="mono">${s.symptom_code}</td>
                  <td>${s.symptom_name}</td>
                  <td><span class="cf-pill">${s.cf_user.toFixed(2)}</span></td>
                  <td><span class="cf-pill">${s.cf_expert.toFixed(2)}</span></td>
                  <td><span class="cf-pill">${s.cf_symptom.toFixed(4)}</span></td>
                  <td><span class="cf-pill" style="color:var(--accent-light)">${s.cf_running.toFixed(4)}</span></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `).join("");
    section.classList.remove("hidden");
    btn.textContent = "🔼 Sembunyikan Perhitungan";
  } else {
    section.classList.add("hidden");
    btn.textContent = "📊 Tampilkan Perhitungan Detail";
  }
}

function resetForm() {
  const cfLabels = USER_LEVELS.map(l => l.label);
  const cfValues = USER_LEVELS.map(l => l.value);

  document.querySelectorAll(".cf-slider").forEach(slider => {
    slider.value = 0;
    updateSlider(slider, cfValues, cfLabels);
  });
  document.getElementById("result-panel").classList.add("hidden");
}

function applyCaseStudyPreset() {
  // Skenario studi kasus: Koroner Klasik (Status OK)
  const caseEvidence = {
    "G01": 1.0, // Nyeri dada (Sangat Yakin)
    "G02": 0.8, // Keringat dingin (Yakin)
    "G03": 0.6, // Nyeri ulu hati (Cukup Yakin)
    "G05": 0.6, // Denyut nadi lemah (Cukup Yakin)
    "G08": 0.4, // Mual / muntah (Mungkin)
  };

  resetForm();
  const cfLabels = USER_LEVELS.map(l => l.label);
  const cfValues = USER_LEVELS.map(l => l.value);

  Object.entries(caseEvidence).forEach(([code, val]) => {
    const slider = document.getElementById(`slider-${code}`);
    if (slider) {
      slider.value = val;
      updateSlider(slider, cfValues, cfLabels);
    }
  });

  showToast("Kasus Tn. Hendra dimuat (Status OK: Jantung Koroner 95.75%)");
  runDiagnosis();
}

function randomFill() {
  resetForm();
  const { evidence } = generateAutoScenario("random");
  const cfLabels = USER_LEVELS.map(l => l.label);
  const cfValues = USER_LEVELS.map(l => l.value);

  Object.entries(evidence).forEach(([code, val]) => {
    const slider = document.getElementById(`slider-${code}`);
    if (slider) {
      slider.value = val;
      updateSlider(slider, cfValues, cfLabels);
    }
  });

  showToast(`${Object.keys(evidence).length} gejala diisi secara otomatis`);
}

// ── Auto Simulate Tab ─────────────────────────────────────────
function setupSimulateTab() {
  const modeSelect = document.getElementById("sim-mode");
  modeSelect.addEventListener("change", () => {
    const mode = modeSelect.value;
    document.querySelectorAll(".mode-desc").forEach(d => {
      d.classList.toggle("highlight", d.dataset.mode === mode);
    });
  });
  modeSelect.dispatchEvent(new Event("change"));

  document.getElementById("btn-single-sim").addEventListener("click", runSingleSimulation);
  document.getElementById("btn-batch-sim").addEventListener("click", runBatchSimulation);
  document.getElementById("btn-export-csv").addEventListener("click", exportBatchCSV);
}

function runSingleSimulation() {
  const mode = document.getElementById("sim-mode").value;
  const seedV = document.getElementById("sim-seed").value;
  const seed = seedV ? parseInt(seedV) : null;

  showLoading(true);
  setTimeout(() => {
    const { evidence, meta } = generateAutoScenario(mode, seed);
    const diag = diagnoseAsDict(evidence);

    const box = document.getElementById("single-sim-result");
    const top = diag.results[0];

    const evTags = Object.entries(evidence).map(([k, v]) =>
      `<span class="ev-tag">${k}=${v.toFixed(1)}</span>`
    ).join("");

    const topDisease = top ? `
      <div style="margin-top:0.75rem;">
        <strong style="color:var(--text-primary)">${top.disease_name}</strong>
        <span style="font-family:var(--mono);margin-left:0.5rem;color:var(--accent-light)">${top.cf_percent.toFixed(2)}%</span>
        ${diag.is_ambiguous
          ? '<span class="badge-ambiguous" style="margin-left:0.5rem">⚠ Ambigu</span>'
          : '<span class="badge-ok" style="margin-left:0.5rem">✔ OK</span>'}
      </div>
      <div style="margin-top:0.4rem;font-size:0.82rem;color:var(--text-secondary)">${diag.interpretation}</div>
    ` : `<div style="color:var(--danger);margin-top:0.75rem">Tidak ada diagnosis (semua CF = 0)</div>`;

    box.innerHTML = `
      <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.4rem">
        Mode: <strong style="color:var(--accent-light)">${mode}</strong>
        ${seed !== null ? ` · Seed: <code style="color:var(--text-secondary)">${seed}</code>` : ""}
        · ${meta.description}
      </div>
      <div class="sim-evidence-tags">${evTags}</div>
      ${topDisease}
    `;
    box.classList.remove("hidden");
    showLoading(false);
  }, 100);
}

function runBatchSimulation() {
  const n = parseInt(document.getElementById("batch-n").value) || 10;
  showLoading(true);

  setTimeout(() => {
    const data = runBatchSimulations(n);
    lastBatchData = data;
    renderBatchResults(data);
    showLoading(false);
  }, 150);
}

function renderBatchResults(data) {
  const { simulations, summary } = data;

  const sumEl = document.getElementById("batch-summary");
  sumEl.innerHTML = `
    <div class="summary-stat success">
      <div class="stat-val">${summary.total}</div>
      <div class="stat-label">Total Simulasi</div>
    </div>
    <div class="summary-stat warn">
      <div class="stat-val">${summary.ambiguous}</div>
      <div class="stat-label">Ambigu (${summary.ambiguous_pct}%)</div>
    </div>
    <div class="summary-stat danger">
      <div class="stat-val">${summary.no_diagnosis}</div>
      <div class="stat-label">Tanpa Diagnosis</div>
    </div>
  `;
  sumEl.classList.remove("hidden");

  const tbody = document.getElementById("batch-tbody");
  tbody.innerHTML = simulations.map(s => {
    let statusBadge;
    if (!s.top_disease) {
      statusBadge = `<span class="badge-none">Tidak Ada</span>`;
    } else if (s.is_ambiguous) {
      statusBadge = `<span class="badge-ambiguous">⚠ Ambigu</span>`;
    } else {
      statusBadge = `<span class="badge-ok">✔ OK</span>`;
    }

    const modeColor = {
      random: "var(--accent-light)",
      focused: "var(--success)",
      uncertain: "var(--warning)",
      minimal: "var(--text-secondary)",
      contradictory: "var(--purple)",
    }[s.mode] || "var(--text-secondary)";

    return `
      <tr>
        <td class="mono" style="color:var(--text-muted)">${s.sim_no}</td>
        <td><span style="color:${modeColor};font-weight:600;font-size:0.8rem">${s.mode}</span></td>
        <td style="font-size:0.78rem;color:var(--text-muted);max-width:200px">${s.meta?.description || "-"}</td>
        <td style="font-size:0.83rem;color:var(--text-primary)">${s.top_disease || "—"}</td>
        <td class="mono" style="color:var(--accent-light)">${s.top_cf_percent ? s.top_cf_percent.toFixed(2) + "%" : "—"}</td>
        <td>${statusBadge}</td>
      </tr>
    `;
  }).join("");

  document.getElementById("batch-table-wrapper").classList.remove("hidden");
  document.getElementById("btn-export-csv").classList.remove("hidden");
}

function exportBatchCSV() {
  if (!lastBatchData) return;
  const rows = lastBatchData.simulations;
  const headers = ["#", "Mode", "Deskripsi", "Gejala", "Diagnosis Teratas", "CF%", "Ambigu", "Interpretasi"];
  const lines = [
    headers.join(","),
    ...rows.map(r => [
      r.sim_no,
      r.mode,
      `"${r.meta?.description || ""}"`,
      `"${Object.entries(r.evidence || {}).map(([k,v]) => `${k}=${v}`).join("; ")}"`,
      `"${r.top_disease || "-"}"`,
      r.top_cf_percent || 0,
      r.is_ambiguous ? "Ya" : "Tidak",
      `"${r.interpretation}"`,
    ].join(","))
  ];

  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `simulasi_cf_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("CSV berhasil diunduh");
}

// ── Knowledge Base Tab ────────────────────────────────────────
function setupKnowledgeTab() {}

function renderKnowledgeTab() {
  renderDiseaseCards();
  renderRulesTable();
}

function renderDiseaseCards() {
  const grid = document.getElementById("disease-cards");
  if (!grid || grid.innerHTML.trim()) return;

  grid.innerHTML = Object.entries(DISEASES).map(([code, name]) => {
    const ruleSymptoms = Object.entries(RULES[code] || {});
    const tags = ruleSymptoms.map(([gid, cf]) => {
      const cls = cf >= 0.8 ? "high" : cf >= 0.6 ? "mid" : "";
      const tooltip = SYMPTOMS[gid] || gid;
      return `<span class="dc-sym-tag ${cls}" title="${tooltip}">${gid} (${cf})</span>`;
    }).join("");

    return `
      <div class="disease-card">
        <div class="dc-code">${code}</div>
        <div class="dc-name">${name}</div>
        <div class="dc-desc">${DISEASE_DESCRIPTIONS[code] || ""}</div>
        <div class="dc-symptoms">${tags}</div>
      </div>
    `;
  }).join("");
}

function renderRulesTable() {
  const thead = document.getElementById("rules-thead");
  const tbody = document.getElementById("rules-tbody");
  if (!thead || !tbody || thead.innerHTML.trim()) return;

  const diseaseCodes = Object.keys(DISEASES);
  const symptomCodes = Object.keys(SYMPTOMS);

  thead.innerHTML = `
    <tr>
      <th>Gejala</th>
      ${diseaseCodes.map(d => `<th title="${DISEASES[d]}">${d}</th>`).join("")}
    </tr>
  `;

  tbody.innerHTML = symptomCodes.map(gid => {
    const cells = diseaseCodes.map(pid => {
      const cf = RULES[pid]?.[gid];
      if (!cf) return `<td class="rules-cell empty">·</td>`;
      const cls = cf >= 0.8 ? "v08" : cf >= 0.6 ? "v06" : cf >= 0.4 ? "v04" : "v02";
      return `<td class="rules-cell ${cls}">${cf}</td>`;
    }).join("");
    return `<tr><td>${gid} — ${SYMPTOMS[gid]}</td>${cells}</tr>`;
  }).join("");
}

// ── Helpers ───────────────────────────────────────────────────
function showLoading(state) {
  const el = document.getElementById("loading-overlay");
  if (el) el.classList.toggle("hidden", !state);
}

function showToast(msg, duration = 3000) {
  let toast = document.getElementById("toast-el");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast-el";
    toast.style.cssText = `
      position:fixed; bottom:2rem; right:2rem; z-index:9999;
      background:rgba(13,22,38,0.95); border:1px solid rgba(255,255,255,0.1);
      color:#f0f6ff; padding:0.75rem 1.25rem; border-radius:10px;
      font-size:0.85rem; backdrop-filter:blur(10px);
      box-shadow:0 8px 32px rgba(0,0,0,0.4);
      transition: opacity 0.3s ease;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = "1";
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.opacity = "0"; }, duration);
}
