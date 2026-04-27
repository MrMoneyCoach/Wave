// Plan view: charts, year-by-year table, life events.
// (Assumptions live on the Settings page so they're configured once.)
import { ASSET_KINDS, LIABILITY_KINDS, EVENT_KINDS } from "./data.js";
import {
  state, save, simulate, fmtUSD, upsert, remove, personLabels,
} from "./state.js";

const escape = (s) => String(s ?? "").replace(/[&<>]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;" }[c]));
const esc = escape;
const lookup = (arr, id) => arr.find(k => k.id === id) || { icon: "•", label: id };

let lastSim = null;

export function renderPlan() {
  const sim = simulate();
  lastSim = sim;
  const root = document.getElementById("plan-content");
  const a = state.assumptions;
  root.innerHTML = `
    <div class="plan-grid">
      <div class="card plan-assumptions">
        <h3>Assumptions <a class="assumptions-link" data-jump-settings>Edit in Settings →</a></h3>
        <div class="assumptions-summary">
          <div><span class="lbl">Currency</span><span class="val">${a.currency}</span></div>
          <div><span class="lbl">Start Year</span><span class="val">${a.startYear}</span></div>
          <div><span class="lbl">Years</span><span class="val">${a.yearsToProject}</span></div>
          <div><span class="lbl">Inflation</span><span class="val">${a.inflationRate}%</span></div>
          <div><span class="lbl">Withdrawal</span><span class="val">${a.retirementWithdrawalRate}%</span></div>
        </div>
      </div>
      <div class="card plan-events">
        <h3>Life Events <button class="btn primary" id="add-event">+ Event</button></h3>
        ${eventsList()}
      </div>
    </div>

    <div class="card">
      <h3>Net Worth Projection</h3>
      ${netWorthChart(sim)}
    </div>

    <div class="card">
      <h3>Annual Cash Flow</h3>
      ${cashflowChart(sim)}
    </div>

    <div class="card">
      <h3>Asset Composition Over Time</h3>
      ${stackedAssetsChart(sim)}
    </div>

    <div class="card">
      <h3>Year-by-Year</h3>
      ${yearTable(sim)}
    </div>
  `;
  bindEvents();
  const jump = root.querySelector("[data-jump-settings]");
  if (jump) jump.addEventListener("click", (e) => {
    e.preventDefault();
    const tab = document.querySelector('.tab[data-view="settings"]');
    if (tab) tab.click();
  });
}

// ---------- Events list ----------
function eventsList() {
  const evs = (state.events || []).slice().sort((a, b) => a.year - b.year);
  if (!evs.length) return `<div class="empty">No life events yet. Add retirement, college, home purchase, etc.</div>`;
  return `<div class="events-rows">
    ${evs.map(ev => {
      const k = EVENT_KINDS.find(x => x.id === ev.kind) || { icon: "•", label: ev.kind };
      return `<div class="event-row" data-event-id="${esc(ev.id)}">
        <div class="ev-year">${esc(ev.year)}</div>
        <div class="ev-icon">${k.icon}</div>
        <div class="ev-label">
          <div class="ev-title">${esc(eventTitle(ev))}</div>
          <div class="ev-sub">${esc(k.label)}${ev.personId ? " · " + esc(personLabels([ev.personId])) : ""}</div>
        </div>
        <div class="ev-actions">
          <button class="btn ghost" data-edit-event="${esc(ev.id)}">Edit</button>
          <button class="btn danger-ghost" data-del-event="${esc(ev.id)}">Delete</button>
        </div>
      </div>`;
    }).join("")}
  </div>`;
}

function eventTitle(ev) {
  if (ev.kind === "education") return `${ev.school || "College"} · $${(ev.annualCost||0).toLocaleString()}/yr × ${ev.years||4} yrs`;
  if (ev.kind === "asset-sale") {
    const a = state.assets.find(x => x.id === ev.assetId);
    return `Sell ${a ? a.name : "asset"}`;
  }
  if (ev.kind === "asset-purchase") return `Buy ${ev.name || "asset"} · $${(+ev.value||0).toLocaleString()}`;
  if (ev.kind === "liability-payoff") {
    const l = state.liabilities.find(x => x.id === ev.liabilityId);
    return `Pay off ${l ? l.name : "liability"}`;
  }
  if (ev.kind === "lump-sum") return `Lump sum ${ev.direction || "in"} · $${(+ev.amount||0).toLocaleString()}`;
  if (ev.kind === "income-change" || ev.kind === "expense-change") {
    const c = state.cashflows.find(x => x.id === ev.cashflowId);
    return `Adjust ${c ? c.name : "cash flow"}${ev.newAmount != null ? " to $" + (+ev.newAmount).toLocaleString() : ""}`;
  }
  if (ev.kind === "retire") {
    const p = state.people.find(x => x.id === ev.personId);
    return `${p ? p.name : "Someone"} retires`;
  }
  return ev.kind;
}

function bindEvents() {
  document.getElementById("add-event").onclick = () => eventForm(null);
  for (const b of document.querySelectorAll("[data-edit-event]")) {
    b.onclick = () => {
      const ev = state.events.find(x => x.id === b.dataset.editEvent);
      if (ev) eventForm(ev);
    };
  }
  for (const b of document.querySelectorAll("[data-del-event]")) {
    b.onclick = () => {
      if (!confirm("Delete this life event?")) return;
      remove("events", b.dataset.delEvent);
      renderPlan();
    };
  }
}

// ---------- Event form (rendered in side drawer) ----------
function eventForm(existing) {
  const drawer = document.getElementById("drawer");
  const scrim = document.getElementById("drawer-scrim");
  const title = document.getElementById("drawer-title");
  const body = document.getElementById("drawer-body");
  const e = existing || { kind: "retire", year: state.assumptions.startYear + 5 };

  title.textContent = existing ? "Edit Life Event" : "Add Life Event";
  body.innerHTML = `
    <div class="field-row">
      <div class="field"><label>Year</label>
        <input type="number" name="year" value="${esc(e.year)}" min="1900" max="2100"/></div>
      <div class="field"><label>Type</label>
        <select name="kind">
          ${EVENT_KINDS.map(k => `<option value="${k.id}" ${k.id === e.kind ? "selected" : ""}>${k.icon} ${esc(k.label)}</option>`).join("")}
        </select>
      </div>
    </div>
    <div id="ev-fields"></div>
    <div class="drawer-footer">
      ${existing ? `<button class="btn danger-ghost" data-act="delete">Delete</button>` : ""}
      <div class="spacer"></div>
      <button class="btn ghost" data-act="cancel">Cancel</button>
      <button class="btn primary" data-act="save">Save</button>
    </div>
  `;
  const renderFields = () => {
    const kind = body.querySelector('[name="kind"]').value;
    body.querySelector("#ev-fields").innerHTML = eventFields(kind, e);
  };
  renderFields();
  body.querySelector('[name="kind"]').addEventListener("change", renderFields);

  drawer.classList.add("open"); scrim.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");

  body.addEventListener("click", (clickEv) => {
    const a = clickEv.target.closest("[data-act]");
    if (!a) return;
    if (a.dataset.act === "cancel") { close(); return; }
    if (a.dataset.act === "delete") {
      if (!confirm("Delete this event?")) return;
      remove("events", existing.id); close(); renderPlan(); return;
    }
    if (a.dataset.act === "save") {
      const v = readEventForm(body, existing);
      upsert("events", v);
      close(); renderPlan();
    }
  });

  function close() {
    drawer.classList.remove("open");
    scrim.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
  }
}

function eventFields(kind, e) {
  const peopleOpts = state.people.map(p => `<option value="${p.id}" ${p.id === e.personId ? "selected" : ""}>${esc(p.name)}</option>`).join("");
  const assetOpts = state.assets.map(a => `<option value="${a.id}" ${a.id === e.assetId ? "selected" : ""}>${esc(a.name)} ($${Math.round(a.value).toLocaleString()})</option>`).join("");
  const liabOpts = state.liabilities.map(l => `<option value="${l.id}" ${l.id === e.liabilityId ? "selected" : ""}>${esc(l.name)}</option>`).join("");
  const cfOpts = state.cashflows.map(c => `<option value="${c.id}" ${c.id === e.cashflowId ? "selected" : ""}>${esc(c.name)}</option>`).join("");

  if (kind === "retire") {
    return `<div class="field"><label>Person</label><select name="personId"><option value="">—</option>${peopleOpts}</select></div>
            <div class="help">Retirement age on the person also auto-retires their salary-type income.</div>`;
  }
  if (kind === "asset-sale") {
    return `<div class="field"><label>Asset</label><select name="assetId">${assetOpts}</select></div>
            <div class="field"><label>Sale Price (USD)</label><input type="number" name="salePrice" value="${esc(e.salePrice ?? "")}" min="0" step="100"/></div>`;
  }
  if (kind === "asset-purchase") {
    return `<div class="field"><label>Name</label><input name="name" value="${esc(e.name||"")}"/></div>
      <div class="field-row">
        <div class="field"><label>Type</label>
          <select name="assetKind">${ASSET_KINDS.map(k => `<option value="${k.id}" ${k.id === e.assetKind ? "selected" : ""}>${k.icon} ${esc(k.label)}</option>`).join("")}</select>
        </div>
        <div class="field"><label>Value</label><input type="number" name="value" value="${esc(e.value||0)}" step="100"/></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Down Payment</label><input type="number" name="downPayment" value="${esc(e.downPayment||0)}" step="100"/></div>
        <div class="field"><label>Financed Amount</label><input type="number" name="financedAmount" value="${esc(e.financedAmount||0)}" step="100"/></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Loan Rate %</label><input type="number" name="loanRate" value="${esc(e.loanRate||0)}" step="0.01"/></div>
        <div class="field"><label>Loan Pmt /mo</label><input type="number" name="loanPayment" value="${esc(e.loanPayment||0)}" step="1"/></div>
      </div>`;
  }
  if (kind === "liability-payoff") {
    return `<div class="field"><label>Liability</label><select name="liabilityId">${liabOpts}</select></div>`;
  }
  if (kind === "lump-sum") {
    return `<div class="field-row">
      <div class="field"><label>Direction</label>
        <select name="direction">
          <option value="in" ${e.direction === "in" ? "selected" : ""}>Inflow (in)</option>
          <option value="out" ${e.direction === "out" ? "selected" : ""}>Outflow (out)</option>
        </select>
      </div>
      <div class="field"><label>Amount</label><input type="number" name="amount" value="${esc(e.amount||0)}" step="100"/></div>
    </div>`;
  }
  if (kind === "income-change" || kind === "expense-change") {
    return `<div class="field"><label>Cash Flow</label><select name="cashflowId">${cfOpts}</select></div>
            <div class="field"><label>New Amount (per period)</label><input type="number" name="newAmount" value="${esc(e.newAmount ?? "")}" step="1"/></div>
            <div class="field"><label><input type="checkbox" name="endNow" ${e.endNow ? "checked" : ""}/> End this cash flow at this year</label></div>`;
  }
  if (kind === "education") {
    return `<div class="field"><label>For</label><select name="personId">${peopleOpts}</select></div>
            <div class="field"><label>School</label><input name="school" value="${esc(e.school||"College")}"/></div>
            <div class="field-row">
              <div class="field"><label>Annual Cost</label><input type="number" name="annualCost" value="${esc(e.annualCost||0)}" step="100"/></div>
              <div class="field"><label>Years</label><input type="number" name="years" value="${esc(e.years||4)}" min="1" max="10"/></div>
            </div>`;
  }
  return "";
}

function readEventForm(body, existing) {
  const v = (n) => body.querySelector(`[name="${n}"]`)?.value;
  const num = (n) => v(n) === undefined || v(n) === "" ? null : parseFloat(v(n));
  const kind = v("kind");
  const out = { id: existing?.id, year: parseInt(v("year"), 10), kind };
  if (kind === "retire") out.personId = v("personId") || null;
  else if (kind === "asset-sale") { out.assetId = v("assetId"); out.salePrice = num("salePrice"); }
  else if (kind === "asset-purchase") {
    out.name = v("name"); out.assetKind = v("assetKind");
    out.value = num("value"); out.downPayment = num("downPayment");
    out.financedAmount = num("financedAmount"); out.loanRate = num("loanRate");
    out.loanPayment = num("loanPayment");
  }
  else if (kind === "liability-payoff") out.liabilityId = v("liabilityId");
  else if (kind === "lump-sum") { out.direction = v("direction"); out.amount = num("amount"); }
  else if (kind === "income-change" || kind === "expense-change") {
    out.cashflowId = v("cashflowId");
    out.newAmount = num("newAmount");
    out.endNow = body.querySelector('[name="endNow"]').checked;
  }
  else if (kind === "education") {
    out.personId = v("personId"); out.school = v("school");
    out.annualCost = num("annualCost"); out.years = num("years") || 4;
  }
  return out;
}

// ---------- Charts ----------
function netWorthChart(sim) {
  const W = 1000, H = 280, pad = { l: 60, r: 16, t: 12, b: 28 };
  const snaps = sim.snapshots;
  const min = Math.min(...snaps.map(s => Math.min(s.netWorth, -s.totalLiab)));
  const max = Math.max(...snaps.map(s => s.totalAssets));
  const yMin = Math.min(0, min);
  const yMax = max * 1.05;
  const x = (i) => pad.l + (i / (snaps.length - 1)) * (W - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v - yMin) / (yMax - yMin)) * (H - pad.t - pad.b);
  const linePath = (key, fn) => snaps.map((s, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(fn(s))}`).join(" ");
  const areaPath = (fn) => `M ${x(0)} ${y(0)} ` + snaps.map((s, i) => `L ${x(i)} ${y(fn(s))}`).join(" ") + ` L ${x(snaps.length - 1)} ${y(0)} Z`;
  const ticks = niceTicks(yMin, yMax, 5);
  return `
    <svg viewBox="0 0 ${W} ${H}" class="proj-chart" preserveAspectRatio="xMidYMid meet">
      ${ticks.map(t => `
        <line x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}" stroke="#e3e8ef" stroke-width="1"/>
        <text x="${pad.l - 8}" y="${y(t) + 4}" text-anchor="end" font-size="11" fill="#7d8aa0">${shortUSD(t)}</text>`).join("")}
      <path d="${areaPath(s => s.totalAssets)}" fill="rgba(43,191,166,0.18)"/>
      <path d="${areaPath(s => s.totalLiab)}" fill="rgba(226,89,106,0.18)"/>
      <path d="${linePath("a", s => s.totalAssets)}" fill="none" stroke="#2bbfa6" stroke-width="2"/>
      <path d="${linePath("l", s => s.totalLiab)}" fill="none" stroke="#e2596a" stroke-width="2"/>
      <path d="${linePath("nw", s => s.netWorth)}" fill="none" stroke="#1f7ad6" stroke-width="2.5"/>
      ${snaps.filter((_,i)=>i%5===0).map((s,i,arr) => {
        const idx = snaps.indexOf(s);
        return `<text x="${x(idx)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="#7d8aa0">${s.year}</text>`;
      }).join("")}
    </svg>
    <div class="chart-legend">
      <span><i style="background:#1f7ad6"></i> Net Worth</span>
      <span><i style="background:#2bbfa6"></i> Assets</span>
      <span><i style="background:#e2596a"></i> Liabilities</span>
    </div>`;
}

function cashflowChart(sim) {
  const W = 1000, H = 220, pad = { l: 60, r: 16, t: 12, b: 28 };
  const data = sim.snapshots.slice(1); // skip pre-year-0 snapshot
  const max = Math.max(1, ...data.map(s => Math.max(s.income, s.expenses)));
  const min = Math.min(0, ...data.map(s => s.net));
  const yMin = Math.min(0, min) * 1.05;
  const yMax = max * 1.05;
  const x = (i) => pad.l + (i / Math.max(1, data.length - 1)) * (W - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v - yMin) / (yMax - yMin)) * (H - pad.t - pad.b);
  const barW = Math.max(2, (W - pad.l - pad.r) / data.length / 2.4);
  const ticks = niceTicks(yMin, yMax, 4);
  return `
    <svg viewBox="0 0 ${W} ${H}" class="proj-chart" preserveAspectRatio="xMidYMid meet">
      ${ticks.map(t => `
        <line x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}" stroke="#e3e8ef" stroke-width="1"/>
        <text x="${pad.l - 8}" y="${y(t) + 4}" text-anchor="end" font-size="11" fill="#7d8aa0">${shortUSD(t)}</text>`).join("")}
      ${data.map((s, i) => {
        const cx = x(i);
        const inTop = y(s.income), zero = y(0), outTop = y(s.expenses);
        return `
          <rect x="${cx - barW - 1}" y="${inTop}" width="${barW}" height="${zero - inTop}" fill="#2bbfa6" opacity="0.85"/>
          <rect x="${cx + 1}" y="${outTop}" width="${barW}" height="${zero - outTop}" fill="#e2596a" opacity="0.85"/>
        `;
      }).join("")}
      <path d="${data.map((s, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(s.net)}`).join(" ")}" fill="none" stroke="#1f7ad6" stroke-width="2"/>
      ${data.filter((_,i)=>i%5===0).map((s) => {
        const idx = data.indexOf(s);
        return `<text x="${x(idx)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="#7d8aa0">${s.year}</text>`;
      }).join("")}
    </svg>
    <div class="chart-legend">
      <span><i style="background:#2bbfa6"></i> Income</span>
      <span><i style="background:#e2596a"></i> Expenses</span>
      <span><i style="background:#1f7ad6"></i> Net</span>
    </div>`;
}

function stackedAssetsChart(sim) {
  const W = 1000, H = 240, pad = { l: 60, r: 16, t: 12, b: 28 };
  const snaps = sim.snapshots;
  const kinds = uniqueKinds(snaps);
  const palette = ["#2bbfa6","#1f7ad6","#5b6ee1","#c08433","#e2596a","#d68a1f","#7a4ed1","#3b9c79","#5d7891","#a04a8d","#888","#bbb"];
  const max = Math.max(1, ...snaps.map(s => s.totalAssets)) * 1.05;
  const x = (i) => pad.l + (i / (snaps.length - 1)) * (W - pad.l - pad.r);
  const y = (v) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const ticks = niceTicks(0, max, 5);
  const polys = kinds.map((kind, ki) => {
    let topPath = "", bottomPath = "";
    let prevTop = [], prevBottom = [];
    for (let i = 0; i < snaps.length; i++) {
      let lower = 0, upper = 0;
      for (let kj = 0; kj < kinds.length; kj++) {
        const v = sumKind(snaps[i], kinds[kj]);
        if (kj < ki) lower += v;
        if (kj <= ki) upper += v;
      }
      prevBottom.push([x(i), y(lower)]);
      prevTop.push([x(i), y(upper)]);
    }
    const top = prevTop.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
    const bottom = prevBottom.slice().reverse().map(p => `L ${p[0]} ${p[1]}`).join(" ");
    return `<path d="${top} ${bottom} Z" fill="${palette[ki % palette.length]}" opacity="0.85"/>`;
  }).join("");
  return `
    <svg viewBox="0 0 ${W} ${H}" class="proj-chart" preserveAspectRatio="xMidYMid meet">
      ${ticks.map(t => `
        <line x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}" stroke="#e3e8ef" stroke-width="1"/>
        <text x="${pad.l - 8}" y="${y(t) + 4}" text-anchor="end" font-size="11" fill="#7d8aa0">${shortUSD(t)}</text>`).join("")}
      ${polys}
      ${snaps.filter((_,i)=>i%5===0).map((s) => {
        const idx = snaps.indexOf(s);
        return `<text x="${x(idx)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="#7d8aa0">${s.year}</text>`;
      }).join("")}
    </svg>
    <div class="chart-legend">
      ${kinds.map((k, i) => {
        const meta = lookup(ASSET_KINDS, k);
        return `<span><i style="background:${palette[i % palette.length]}"></i> ${meta.icon} ${esc(meta.label)}</span>`;
      }).join("")}
    </div>`;
}

function uniqueKinds(snaps) {
  const set = new Set();
  for (const s of snaps) for (const a of s.assets) set.add(a.kind);
  return [...set];
}
function sumKind(snap, kind) {
  return snap.assets.filter(a => a.kind === kind).reduce((s, a) => s + a.value, 0);
}

function yearTable(sim) {
  const rows = sim.snapshots.slice(1).map((s) => `
    <tr>
      <td>${s.year}</td>
      <td>${fmtUSD(s.income)}</td>
      <td>${fmtUSD(s.expenses)}</td>
      <td class="${s.net >= 0 ? "pos" : "neg"}">${fmtUSD(s.net)}</td>
      <td>${fmtUSD(s.totalAssets)}</td>
      <td>${fmtUSD(s.totalLiab)}</td>
      <td><strong>${fmtUSD(s.netWorth)}</strong></td>
      <td class="ev-cell">${(s.events||[]).join("; ")}</td>
    </tr>
  `).join("");
  return `<div class="year-table-wrap">
    <table class="year-table">
      <thead><tr>
        <th>Year</th><th>Income</th><th>Expenses</th><th>Net</th>
        <th>Assets</th><th>Liabilities</th><th>Net Worth</th><th>Events</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

// ---------- helpers ----------
function shortUSD(v) {
  const a = Math.abs(v);
  if (a >= 1e6) return (v < 0 ? "-" : "") + "$" + (a / 1e6).toFixed(1) + "M";
  if (a >= 1e3) return (v < 0 ? "-" : "") + "$" + (a / 1e3).toFixed(0) + "k";
  return "$" + Math.round(v);
}
function niceTicks(min, max, n) {
  const range = max - min || 1;
  const step = Math.pow(10, Math.floor(Math.log10(range / n)));
  const err = (n / range) * step;
  let s = step;
  if (err <= 0.15) s *= 10;
  else if (err <= 0.35) s *= 5;
  else if (err <= 0.75) s *= 2;
  const out = [];
  const start = Math.floor(min / s) * s;
  for (let v = start; v <= max + 1e-9; v += s) out.push(Math.round(v));
  return out;
}
