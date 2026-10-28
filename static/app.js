/**
 * app.js - Frontend JavaScript
 * Sistem Pakar Kardiovaskular — Certainty Factor
 */

// ── Constants ────────────────────────────────────────────────
const API = {
  knowledgeBase:  "/api/knowledge-base",
  diagnose:       "/api/diagnose",
  autoSimulate:   "/api/auto-simulate",
  batchSimulate:  "/api/batch-simulate",
};

const CF_COLORS = {
  high:      "var(--success)",
  moderate:  "var(--accent-light)",
  low:       "var(--warning)",
  verylow:   "var(--text-muted)",
};

let knowledgeBase = null;
let lastBatchData  = null;

// ── Init ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  await loadKnowledgeBase();
  setupTabs();
  setupDiagnoseForm();
  setupSimulateTab();
  setupKnowledgeTab();
});

// ── Load KB from API ─────────────────────────────────────────
async function loadKnowledgeBase() {
  try {
    const res = await fetch(API.knowledgeBase);
    knowledgeBase = await res.json();
    renderLegend();
    renderSymptomForm();
  } catch (e) {
    console.error("Gagal memuat knowledge base:", e);
  }
}

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

      // Lazy render knowledge tab
      if (tab === "knowledge" && knowledgeBase) renderKnowledgeTab();
    });
  });
}

// ── Render CF Legend ─────────────────────────────────────────
function renderLegend() {
  const grid = document.getElementById("legend-grid");
  if (!grid || !knowledgeBase) return;
  grid.innerHTML = knowledgeBase.user_levels.map(({ value, label }) => `
    <div class="legend-item">
      <span class="legend-val">${value.toFixed(1)}</span>
      <span>${label}</span>
    </div>
  `).join("");
}

// ── Render Symptom Form ──────────────────────────────────────
function renderSymptomForm() {
  const container = document.getElementById("symptom-container");
  if (!container || !knowledgeBase) return;

  const cfLabels = knowledgeBase.user_levels.map(l => l.label);
  const cfValues = knowledgeBase.user_levels.map(l => l.value);
  const steps    = cfValues.join(" ");

  container.innerHTML = Object.entries(knowledgeBase.symptoms).map(([code, name]) => `
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

  // Wire sliders
  container.querySelectorAll(".cf-slider").forEach(slider => {
    slider.addEventListener("input", () => updateSlider(slider, cfValues, cfLabels));
    updateSlider(slider, cfValues, cfLabels); // init
  });
}

function updateSlider(slider, cfValues, cfLabels) {
  const v    = parseFloat(slider.value);
  const code = slider.dataset.code;
  const pct  = (v / 1.0) * 100;

  slider.style.setProperty("--fill", `${pct}%`);
  document.getElementById(`val-${code}`).textContent = v.toFixed(1);

  const idx   = cfValues.indexOf(v);
  const label = idx >= 0 ? cfLabels[idx] : "";
  document.getElementById(`lbl-${code}`).textContent = label;

  const card = document.getElementById(`card-${code}`);
  if (v > 0) card.classList.add("selected");
  else        card.classList.remove("selected");
}

// ── Diagnose Form ────────────────────────────────────────────
function setupDiagnoseForm() {
  const form = document.getElementById("diagnose-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await runDiagnosis();
  });

  document.getElementById("btn-reset").addEventListener("click", resetForm);
  document.getElementById("btn-random-fill").addEventListener("click", randomFill);
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

async function runDiagnosis() {
  const evidence = collectEvidence();
  if (Object.keys(evidence).length === 0) {
    showToast("Pilih minimal satu gejala dengan keyakinan > 0");
    return;
  }

  showLoading(true);
  try {
    const res  = await fetch(API.diagnose, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ evidence }),
    });
    const data = await res.json();
    renderResult(data);
  } catch (err) {
    console.error(err);
    showToast("Terjadi kesalahan saat mendiagnosis. Pastikan server berjalan.");
  } finally {
    showLoading(false);
  }
}

function renderResult(data) {
  const panel = document.getElementById("result-panel");
  panel.classList.remove("hidden");
  panel.scrollIntoView({ behavior: "smooth", block: "start" });

  // Badge
  const badge = document.getElementById("result-badge");
  const pct   = data.top_cf_percent;
  if (!data.results || data.results.length === 0) {
    badge.textContent = "TIDAK ADA DIAGNOSIS";
    badge.className   = "result-badge low";
  } else if (data.is_ambiguous) {
    badge.textContent = "⚠ AMBIGU";
    badge.className   = "result-badge ambiguous";
  } else if (pct >= 60) {
    badge.textContent = `${pct.toFixed(1)}% — TINGGI`;
    badge.className   = "result-badge high";
  } else if (pct >= 40) {
    badge.textContent = `${pct.toFixed(1)}% — SEDANG`;
    badge.className   = "result-badge moderate";
  } else {
    badge.textContent = `${pct.toFixed(1)}% — RENDAH`;
    badge.className   = "result-badge low";
  }

  // Summary card
  const summary = document.getElementById("result-summary");
  if (!data.results || data.results.length === 0) {
    summary.innerHTML = `
      <div class="top-disease-name">Tidak Ada Diagnosis</div>
      <div class="disease-desc">Tidak ada gejala yang dilaporkan dengan keyakinan > 0, atau nilai CF terlalu rendah untuk membuat diagnosis.</div>
    `;
  } else {
    const top = data.results[0];
    summary.innerHTML = `
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

  // CF Bars
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
      }, 80 + i * 60);
    });
  }

  // Store trace data for toggle
  panel.dataset.traceData = JSON.stringify(data.results);
  document.getElementById("trace-table-section").classList.add("hidden");
  document.getElementById("btn-toggle-trace").textContent = "📊 Tampilkan Perhitungan Detail";
}

function toggleTrace() {
  const section = document.getElementById("trace-table-section");
  const btn     = document.getElementById("btn-toggle-trace");
  const panel   = document.getElementById("result-panel");

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
  document.querySelectorAll(".cf-slider").forEach(slider => {
    slider.value = 0;
    updateSlider(slider,
      knowledgeBase.user_levels.map(l => l.value),
      knowledgeBase.user_levels.map(l => l.label)
    );
  });
  document.getElementById("result-panel").classList.add("hidden");
}

async function randomFill() {
  // Call auto-simulate API with "random" mode then fill sliders
  try {
    showLoading(true);
    const res  = await fetch(API.autoSimulate, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ mode: "random" }),
    });
    const data = await res.json();
    const evidence = data.evidence;

    // Reset all first
    document.querySelectorAll(".cf-slider").forEach(s => {
      s.value = 0;
      updateSlider(s,
        knowledgeBase.user_levels.map(l => l.value),
        knowledgeBase.user_levels.map(l => l.label)
      );
    });

    // Set selected symptoms
    Object.entries(evidence).forEach(([code, val]) => {
      const slider = document.getElementById(`slider-${code}`);
      if (slider) {
        slider.value = val;
        updateSlider(slider,
          knowledgeBase.user_levels.map(l => l.value),
          knowledgeBase.user_levels.map(l => l.label)
        );
      }
    });

    showToast(`${Object.keys(evidence).length} gejala diisi secara otomatis`);
  } catch (err) {
    console.error(err);
    showToast("Gagal memuat simulasi. Pastikan server berjalan.");
  } finally {
    showLoading(false);
  }
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
  modeSelect.dispatchEvent(new Event("change")); // init highlight

  document.getElementById("btn-single-sim").addEventListener("click", runSingleSimulation);
  document.getElementById("btn-batch-sim").addEventListener("click", runBatchSimulation);
  document.getElementById("btn-export-csv").addEventListener("click", exportBatchCSV);
}

async function runSingleSimulation() {
  const mode  = document.getElementById("sim-mode").value;
  const seedV = document.getElementById("sim-seed").value;
  const seed  = seedV ? parseInt(seedV) : null;

  showLoading(true);
  try {
    const res  = await fetch(API.autoSimulate, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ mode, seed }),
    });
    const data = await res.json();

    const box   = document.getElementById("single-sim-result");
    const diag  = data.diagnosis;
    const top   = diag.results[0];
    const meta  = data.meta;

    const evTags = Object.entries(data.evidence).map(([k, v]) =>
      `<span class="ev-tag">${k}=${v.toFixed(1)}</span>`
    ).join("");

    const topDisease = top ? `
      <div style="margin-top:0.75rem;">
        <strong style="color:var(--text-primary)">${top.disease_name}</strong>
        <span style="font-family:var(--mono);margin-left:0.5rem;color:var(--accent-light)">${top.cf_percent.toFixed(2)}%</span>
        ${diag.is_ambiguous ? '<span class="badge-ambiguous" style="margin-left:0.5rem">⚠ Ambigu</span>' : ''}
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
  } catch (err) {
    console.error(err);
    showToast("Gagal menjalankan simulasi.");
  } finally {
    showLoading(false);
  }
}

async function runBatchSimulation() {
  const n = parseInt(document.getElementById("batch-n").value) || 10;
  showLoading(true);
  try {
    const res  = await fetch(API.batchSimulate, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ n }),
    });
    const data = await res.json();
    lastBatchData = data;
    renderBatchResults(data);
  } catch (err) {
    console.error(err);
    showToast("Gagal menjalankan batch simulasi.");
  } finally {
    showLoading(false);
  }
}

function renderBatchResults(data) {
  const { simulations, summary } = data;

  // Summary stats
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

  // Table
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
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = `simulasi_cf_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("CSV berhasil diunduh");
}

// ── Knowledge Base Tab ────────────────────────────────────────
function setupKnowledgeTab() {
  // Will be rendered when tab is clicked
}

function renderKnowledgeTab() {
  renderDiseaseCards();
  renderRulesTable();
}

function renderDiseaseCards() {
  const grid = document.getElementById("disease-cards");
  if (!grid || !knowledgeBase || grid.innerHTML.trim()) return;

  const { diseases, disease_descriptions, rules } = knowledgeBase;

  grid.innerHTML = Object.entries(diseases).map(([code, name]) => {
    const ruleSymptoms = Object.entries(rules[code] || {});
    const tags = ruleSymptoms.map(([gid, cf]) => {
      const cls = cf >= 0.8 ? "high" : cf >= 0.6 ? "mid" : "";
      const tooltip = knowledgeBase.symptoms[gid] || gid;
      return `<span class="dc-sym-tag ${cls}" title="${tooltip}">${gid} (${cf})</span>`;
    }).join("");

    return `
      <div class="disease-card">
        <div class="dc-code">${code}</div>
        <div class="dc-name">${name}</div>
        <div class="dc-desc">${disease_descriptions[code] || ""}</div>
        <div class="dc-symptoms">${tags}</div>
      </div>
    `;
  }).join("");
}

function renderRulesTable() {
  const thead = document.getElementById("rules-thead");
  const tbody = document.getElementById("rules-tbody");
  if (!thead || !tbody || !knowledgeBase || thead.innerHTML.trim()) return;

  const { diseases, symptoms, rules } = knowledgeBase;
  const diseaseCodes = Object.keys(diseases);
  const symptomCodes = Object.keys(symptoms);

  // Header
  thead.innerHTML = `
    <tr>
      <th>Gejala</th>
      ${diseaseCodes.map(d => `<th title="${diseases[d]}">${d}</th>`).join("")}
    </tr>
  `;

  // Rows
  tbody.innerHTML = symptomCodes.map(gid => {
    const cells = diseaseCodes.map(pid => {
      const cf = rules[pid]?.[gid];
      if (!cf) return `<td class="rules-cell empty">·</td>`;
      const cls = cf >= 0.8 ? "v08" : cf >= 0.6 ? "v06" : cf >= 0.4 ? "v04" : "v02";
      return `<td class="rules-cell ${cls}">${cf}</td>`;
    }).join("");
    return `<tr><td>${gid} — ${symptoms[gid]}</td>${cells}</tr>`;
  }).join("");
}

// ── Helpers ───────────────────────────────────────────────────
function showLoading(state) {
  document.getElementById("loading-overlay").classList.toggle("hidden", !state);
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
