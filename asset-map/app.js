// Bootstrap: wires top bar, view switching, and all renderers.
import { state, save, reset, loadSample, importJSON } from "./state.js";
import { renderStats, renderList, renderReports, renderCashflow } from "./views.js";
import { renderMap, fitView, zoom } from "./map.js";
import {
  personForm, assetForm, liabilityForm, insuranceForm, cashflowForm,
} from "./forms.js";

let currentView = "map";

function rerender() {
  renderStats();
  if (currentView === "map") renderMap(rerender);
  else if (currentView === "list") renderList(rerender);
  else if (currentView === "reports") renderReports();
  else if (currentView === "cashflow") renderCashflow();
}

function setView(v) {
  currentView = v;
  for (const el of document.querySelectorAll(".tab")) {
    el.classList.toggle("active", el.dataset.view === v);
  }
  for (const el of document.querySelectorAll(".view")) {
    el.classList.toggle("active", el.id === `view-${v}`);
  }
  rerender();
}

function bindTopbar() {
  document.getElementById("household-name").value = state.name || "";
  document.getElementById("household-name").addEventListener("input", (e) => {
    state.name = e.target.value;
    save();
    if (currentView === "map") renderMap(rerender);
  });

  for (const t of document.querySelectorAll(".tab")) {
    t.addEventListener("click", () => setView(t.dataset.view));
  }

  document.getElementById("btn-add-person").onclick     = () => personForm(null, rerender);
  document.getElementById("btn-add-asset").onclick      = () => assetForm(null, rerender);
  document.getElementById("btn-add-liability").onclick  = () => liabilityForm(null, rerender);
  document.getElementById("btn-add-insurance").onclick  = () => insuranceForm(null, rerender);
  document.getElementById("btn-add-cashflow").onclick   = () => cashflowForm(null, rerender);

  document.getElementById("btn-zoom-in").onclick    = () => zoom(0.85);
  document.getElementById("btn-zoom-out").onclick   = () => zoom(1.15);
  document.getElementById("btn-zoom-reset").onclick = () => fitView();

  document.getElementById("btn-sample").onclick = () => {
    if (state.people.length || state.assets.length) {
      if (!confirm("Replace current data with sample household?")) return;
    }
    loadSample();
    document.getElementById("household-name").value = state.name;
    rerender();
  };
  document.getElementById("btn-reset").onclick = () => {
    if (!confirm("Clear all data? This cannot be undone.")) return;
    reset();
    document.getElementById("household-name").value = state.name;
    rerender();
  };
  document.getElementById("btn-print").onclick = () => window.print();

  document.getElementById("btn-export").onclick = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safe = (state.name || "household").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    a.href = url; a.download = `${safe}-map.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fileInput = document.getElementById("file-import");
  document.getElementById("btn-import").onclick = () => fileInput.click();
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        importJSON(JSON.parse(r.result));
        document.getElementById("household-name").value = state.name;
        rerender();
      } catch (err) {
        alert("Could not import file: " + err.message);
      }
    };
    r.readAsText(file);
    e.target.value = "";
  });

  // Window resize: nothing to do, SVG uses preserveAspectRatio.
}

function init() {
  bindTopbar();
  setView("map");
  // First-run convenience: if there's no state at all, suggest sample.
  if (!state.people.length && !state.assets.length && !state.liabilities.length
      && !state.insurance.length && !state.cashflows.length) {
    // Don't auto-load; let user click Sample. Just render empty state.
  }
}

window.addEventListener("DOMContentLoaded", init);
