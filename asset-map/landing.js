// Landing page: shown when no active client, or when the user clicks
// "Home / All Clients". Lets the advisor pick an existing client,
// create a new one, or load the sample.
import {
  listClients, getActiveClientId, deleteClient, renameClient,
} from "./clients.js";
import { switchToClient, newClient, loadSample } from "./state.js";
import { fmtMoney } from "./state.js";
import { SUPPORTED_CURRENCIES } from "./data.js";

const esc = (s) => String(s ?? "").replace(/[&<>]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;" }[c]));
let onOpen = null;

export function renderLanding(onOpenClient) {
  onOpen = onOpenClient;
  const clients = listClients().slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const root = document.getElementById("landing-content");
  root.innerHTML = `
    <div class="landing-hero">
      <div class="landing-mark">
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <circle cx="16" cy="16" r="14" fill="url(#lg)"></circle>
          <path d="M9 17l5-7 4 5 5-3v8H9z" fill="#fff" opacity=".95"></path>
          <defs>
            <linearGradient id="lg" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stop-color="#2bbfa6"/>
              <stop offset="1" stop-color="#1f7ad6"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
      <h1>HouseholdMap</h1>
      <p class="lede">Visual financial maps and multi-year cash-flow modeling for advisors.
        Each client is a household; the map shows the people, assets, liabilities,
        insurance and cash flows; the Plan view projects it forward.</p>
      <div class="landing-cta">
        <button class="btn primary big" id="cta-new">+ New Client</button>
        <button class="btn ghost big" id="cta-sample">Try the sample</button>
      </div>
    </div>

    <div class="landing-clients">
      <div class="landing-clients-head">
        <h2>Your Clients</h2>
        <div class="muted">${clients.length} ${clients.length === 1 ? "household" : "households"}</div>
      </div>
      ${clients.length === 0 ? `
        <div class="empty-card">
          <p>No clients yet. Create your first one or load the sample household to explore.</p>
        </div>
      ` : `
        <div class="client-grid">
          ${clients.map(c => clientCard(c)).join("")}
        </div>
      `}
    </div>
  `;
  bind();
}

function clientCard(c) {
  const updated = c.updatedAt ? new Date(c.updatedAt).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric"
  }) : "—";
  const sym = (SUPPORTED_CURRENCIES.find(x => x.id === c.currency) || { symbol: "£" }).symbol;
  return `
    <div class="client-card" data-id="${esc(c.id)}">
      <div class="client-card-top">
        <div class="client-avatar">${initials(c.name)}</div>
        <div class="client-meta">
          <div class="client-name" title="${esc(c.name)}">${esc(c.name)}</div>
          <div class="client-sub">${c.peopleCount || 0} ${c.peopleCount === 1 ? "person" : "people"} · Updated ${esc(updated)}</div>
        </div>
        <div class="client-currency">${sym}${esc(c.currency || "GBP")}</div>
      </div>
      <div class="client-net">
        <span class="lbl">Net Worth</span>
        <span class="val">${fmtMoney(c.netWorth || 0, c.currency || "GBP")}</span>
      </div>
      <div class="client-actions">
        <button class="btn primary" data-act="open">Open</button>
        <button class="btn ghost" data-act="rename">Rename</button>
        <button class="btn danger-ghost" data-act="delete">Delete</button>
      </div>
    </div>
  `;
}

function initials(name) {
  return (name || "").split(/\s+/).filter(Boolean).map(s => s[0].toUpperCase()).slice(0, 2).join("") || "·";
}

function bind() {
  document.getElementById("cta-new").onclick = () => {
    const name = prompt("Name this client (e.g. The Carter Household):", "New Household");
    if (name == null) return;
    newClient(name.trim() || "New Household");
    if (onOpen) onOpen();
  };
  document.getElementById("cta-sample").onclick = () => {
    loadSample();
    if (onOpen) onOpen();
  };
  for (const card of document.querySelectorAll(".client-card")) {
    const id = card.dataset.id;
    card.addEventListener("click", (e) => {
      const act = e.target.closest("[data-act]")?.dataset.act;
      if (act === "open" || (!act && e.target.classList.contains("client-card-top"))) {
        switchToClient(id);
        if (onOpen) onOpen();
      } else if (act === "rename") {
        const cur = listClients().find(c => c.id === id)?.name || "";
        const next = prompt("Rename client:", cur);
        if (next && next.trim()) {
          renameClient(id, next.trim());
          renderLanding(onOpen);
        }
      } else if (act === "delete") {
        const cur = listClients().find(c => c.id === id)?.name || "this client";
        if (confirm(`Delete ${cur}? This cannot be undone.`)) {
          deleteClient(id);
          renderLanding(onOpen);
        }
      } else {
        // bare click on card body opens it
        switchToClient(id);
        if (onOpen) onOpen();
      }
    });
  }
}
