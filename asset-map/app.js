// Bootstrap: wires top bar, view switching, landing page, client switcher.
import { state, hasActiveClient, activeClientId, switchToClient, leaveClient } from "./state.js";
import { listClients, deleteClient, renameClient } from "./clients.js";
import { renderStats, renderList, renderReports, renderCashflow } from "./views.js";
import { renderMap, fitView, zoom } from "./map.js";
import { renderPlan } from "./plan.js";
import { renderSettings } from "./settings.js";
import { renderLanding } from "./landing.js";
import {
  personForm, assetForm, liabilityForm, insuranceForm, cashflowForm,
} from "./forms.js";
import { SUPPORTED_CURRENCIES } from "./data.js";

let currentView = "map";

function rerender() {
  if (!hasActiveClient()) {
    showLanding();
    return;
  }
  showApp();
  renderStats();
  if (currentView === "map") renderMap(rerender);
  else if (currentView === "list") renderList(rerender);
  else if (currentView === "reports") renderReports();
  else if (currentView === "cashflow") renderCashflow();
  else if (currentView === "plan") renderPlan();
  else if (currentView === "settings") renderSettings(rerender);
  updateClientPill();
}

function setView(v) {
  currentView = v;
  for (const el of document.querySelectorAll(".tab")) {
    el.classList.toggle("active", el.dataset.view === v);
  }
  for (const el of document.querySelectorAll(".main .view")) {
    el.classList.toggle("active", el.id === `view-${v}`);
  }
  rerender();
}

function showLanding() {
  document.getElementById("view-landing").classList.add("active");
  document.querySelector(".stats").style.display = "none";
  document.querySelector(".main").style.display = "none";
  document.querySelector(".tabs").style.visibility = "hidden";
  document.getElementById("client-switcher").style.visibility = "hidden";
  renderLanding(() => {
    currentView = "map";
    rerender();
  });
}

function showApp() {
  document.getElementById("view-landing").classList.remove("active");
  document.querySelector(".stats").style.display = "";
  document.querySelector(".main").style.display = "";
  document.querySelector(".tabs").style.visibility = "";
  document.getElementById("client-switcher").style.visibility = "";
  // Ensure the active main view is shown.
  for (const el of document.querySelectorAll(".main .view")) {
    el.classList.toggle("active", el.id === `view-${currentView}`);
  }
}

// ---------- Client switcher ----------
function updateClientPill() {
  const id = activeClientId();
  const list = listClients();
  const me = list.find(c => c.id === id);
  const name = me?.name || "No client";
  document.getElementById("client-pill-name").textContent = name;
  document.getElementById("client-pill-avatar").textContent = initials(name);
}

function initials(s) {
  return (s || "·").split(/\s+/).filter(Boolean).map(w => w[0].toUpperCase()).slice(0, 2).join("") || "·";
}

function toggleClientMenu(force) {
  const menu = document.getElementById("client-menu");
  const pill = document.getElementById("client-pill");
  const open = force != null ? force : menu.hasAttribute("hidden");
  if (open) {
    renderClientMenu();
    menu.removeAttribute("hidden");
    pill.setAttribute("aria-expanded", "true");
  } else {
    menu.setAttribute("hidden", "");
    pill.setAttribute("aria-expanded", "false");
  }
}

function renderClientMenu() {
  const list = listClients().slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const id = activeClientId();
  const menu = document.getElementById("client-menu");
  menu.innerHTML = `
    <div class="cm-section">
      <div class="cm-head">Switch client</div>
      ${list.length === 0 ? `<div class="cm-empty">No other clients</div>` : list.map(c => `
        <button class="cm-item ${c.id === id ? "current" : ""}" data-switch="${c.id}">
          <span class="cm-avatar">${initials(c.name)}</span>
          <span class="cm-name">${esc(c.name)}</span>
          ${c.id === id ? `<span class="cm-tag">current</span>` : ""}
        </button>
      `).join("")}
    </div>
    <div class="cm-section">
      <button class="cm-item" data-act="all">All clients (home)</button>
      <button class="cm-item" data-act="rename">Rename current client</button>
      <button class="cm-item danger" data-act="delete">Delete current client…</button>
    </div>
  `;
  for (const b of menu.querySelectorAll("[data-switch]")) {
    b.onclick = () => {
      switchToClient(b.dataset.switch);
      toggleClientMenu(false);
      currentView = "map";
      setView("map");
    };
  }
  for (const b of menu.querySelectorAll("[data-act]")) {
    const act = b.dataset.act;
    b.onclick = () => {
      toggleClientMenu(false);
      if (act === "all") { leaveClient(); rerender(); }
      else if (act === "rename") {
        const cur = list.find(c => c.id === id)?.name || "";
        const next = prompt("Rename client:", cur);
        if (next && next.trim()) {
          renameClient(id, next.trim());
          state.name = next.trim();
          rerender();
        }
      } else if (act === "delete") {
        const cur = list.find(c => c.id === id)?.name || "this client";
        if (confirm(`Delete ${cur}? This cannot be undone.`)) {
          deleteClient(id);
          leaveClient();
          rerender();
        }
      }
    };
  }
}

function esc(s) {
  return String(s ?? "").replace(/[&<>]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;" }[c]));
}

// ---------- Top bar wiring ----------
function bindTopbar() {
  document.getElementById("brand-home").addEventListener("click", () => {
    leaveClient();
    rerender();
  });

  document.getElementById("client-pill").addEventListener("click", (e) => {
    e.stopPropagation();
    toggleClientMenu();
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#client-switcher")) toggleClientMenu(false);
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

  document.getElementById("btn-print").onclick = () => window.print();
}

function init() {
  bindTopbar();
  if (hasActiveClient()) {
    setView("map");
  } else {
    rerender(); // shows landing
  }
}

window.addEventListener("DOMContentLoaded", init);
