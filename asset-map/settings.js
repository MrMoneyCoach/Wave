// Settings view: household name, currency, projection assumptions, data actions.
import { ASSET_KINDS, SUPPORTED_CURRENCIES } from "./data.js";
import { state, save, setAssumption, reset, loadSample, importJSON } from "./state.js";

const esc = (s) => String(s ?? "").replace(/[&<>]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;" }[c]));

let onChange = null;

export function renderSettings(rerenderAll) {
  onChange = rerenderAll;
  const a = state.assumptions;
  const root = document.getElementById("settings-content");
  root.innerHTML = `
    <div class="settings-grid">
      <div class="card">
        <h3>Household</h3>
        <div class="field"><label>Name</label>
          <input id="s-name" value="${esc(state.name || "")}" placeholder="e.g. The Carter Household"/></div>
        <div class="field"><label>Currency</label>
          <div class="currency-row">
            ${SUPPORTED_CURRENCIES.map(c => `
              <label class="currency-pill ${a.currency === c.id ? "selected" : ""}">
                <input type="radio" name="s-currency" value="${c.id}" ${a.currency === c.id ? "checked" : ""}/>
                <span class="ccy-symbol">${c.symbol}</span>
                <span class="ccy-id">${c.id}</span>
                <span class="ccy-label">${esc(c.label)}</span>
              </label>
            `).join("")}
          </div>
        </div>
      </div>

      <div class="card">
        <h3>Projection Assumptions
          <button class="btn ghost collapsible-toggle" data-toggle="proj">Collapse</button>
        </h3>
        <div data-section="proj">
          <div class="field-row">
            <div class="field"><label>Start Year</label>
              <input type="number" id="s-startYear" value="${a.startYear}" min="1900" max="2100"/></div>
            <div class="field"><label>Years to Project</label>
              <input type="number" id="s-years" value="${a.yearsToProject}" min="1" max="70"/></div>
          </div>
          <div class="field-row">
            <div class="field"><label>Inflation %</label>
              <input type="number" id="s-inflation" value="${a.inflationRate}" step="0.1" min="0" max="20"/></div>
            <div class="field"><label>Withdrawal Rate %</label>
              <input type="number" id="s-withdrawal" value="${a.retirementWithdrawalRate}" step="0.1" min="0" max="20"/></div>
          </div>
        </div>
      </div>

      <div class="card">
        <h3>Default Returns by Asset Class
          <button class="btn ghost collapsible-toggle" data-toggle="ret">Collapse</button>
        </h3>
        <div data-section="ret">
          <div class="returns-grid">
            ${ASSET_KINDS.map(k => `
              <label class="ret-row">
                <span>${k.icon} ${esc(k.label)}</span>
                <input type="number" step="0.1" data-ret="${k.id}" value="${a.defaultReturns[k.id] ?? 0}"/>
                <span class="ret-suffix">%</span>
              </label>
            `).join("")}
          </div>
          <div class="help">Used in the Plan view when an individual asset has no override.</div>
        </div>
      </div>

      <div class="card">
        <h3>Data</h3>
        <div class="settings-actions">
          <button class="btn primary" id="s-sample">Load sample household</button>
          <button class="btn ghost" id="s-export">Export JSON</button>
          <button class="btn ghost" id="s-import">Import JSON</button>
          <button class="btn ghost" id="s-print">Print / PDF</button>
          <button class="btn danger-ghost" id="s-reset">Reset all data</button>
          <input id="s-file" type="file" accept="application/json" hidden/>
        </div>
        <div class="help">All data is stored locally in this browser. Cloud sync arrives with the advisor account in a later release.</div>
      </div>
    </div>
  `;
  bind();
}

function bind() {
  document.getElementById("s-name").addEventListener("input", (e) => {
    state.name = e.target.value;
    save();
    const t = document.getElementById("household-name");
    if (t) t.value = state.name;
    fire();
  });

  for (const r of document.querySelectorAll('input[name="s-currency"]')) {
    r.addEventListener("change", (e) => {
      setAssumption("currency", e.target.value);
      // Update visual selected state without full rerender of this card
      for (const p of document.querySelectorAll(".currency-pill"))
        p.classList.toggle("selected", p.querySelector("input").value === e.target.value);
      fire();
    });
  }

  const numHandlers = [
    ["s-startYear",  "startYear",                v => parseInt(v, 10) || new Date().getFullYear()],
    ["s-years",      "yearsToProject",           v => Math.max(1, parseInt(v, 10) || 30)],
    ["s-inflation",  "inflationRate",            v => parseFloat(v) || 0],
    ["s-withdrawal", "retirementWithdrawalRate", v => parseFloat(v) || 0],
  ];
  for (const [id, key, parse] of numHandlers) {
    document.getElementById(id).addEventListener("change", (e) => {
      setAssumption(key, parse(e.target.value));
      fire();
    });
  }

  for (const r of document.querySelectorAll("[data-ret]")) {
    r.addEventListener("change", () => {
      const next = { ...state.assumptions.defaultReturns };
      for (const x of document.querySelectorAll("[data-ret]"))
        next[x.dataset.ret] = parseFloat(x.value) || 0;
      setAssumption("defaultReturns", next);
      fire();
    });
  }

  for (const t of document.querySelectorAll(".collapsible-toggle")) {
    t.addEventListener("click", () => {
      const id = t.dataset.toggle;
      const sec = document.querySelector(`[data-section="${id}"]`);
      const collapsed = sec.classList.toggle("collapsed");
      t.textContent = collapsed ? "Expand" : "Collapse";
    });
  }

  document.getElementById("s-sample").onclick = () => {
    if (state.people.length || state.assets.length) {
      if (!confirm("Replace current data with the sample household?")) return;
    }
    loadSample();
    fire();
    renderSettings(onChange);
  };
  document.getElementById("s-reset").onclick = () => {
    if (!confirm("Clear all data? This cannot be undone.")) return;
    reset();
    fire();
    renderSettings(onChange);
  };
  document.getElementById("s-print").onclick = () => window.print();

  document.getElementById("s-export").onclick = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safe = (state.name || "household").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    a.href = url; a.download = `${safe}-map.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const file = document.getElementById("s-file");
  document.getElementById("s-import").onclick = () => file.click();
  file.addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        importJSON(JSON.parse(r.result));
        fire();
        renderSettings(onChange);
      } catch (err) { alert("Could not import file: " + err.message); }
    };
    r.readAsText(f);
    e.target.value = "";
  });
}

function fire() { if (onChange) onChange(); }
