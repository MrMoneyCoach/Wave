// List, Reports, Cash Flow views.
import {
  ASSET_KINDS, LIABILITY_KINDS, INSURANCE_KINDS, CASHFLOW_KINDS,
} from "./data.js";
import {
  state, totals, fmtUSD, toMonthly, personLabels,
} from "./state.js";
import {
  assetForm, liabilityForm, insuranceForm, cashflowForm, personForm,
} from "./forms.js";

const escape = (s) => String(s ?? "").replace(/[&<>]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;" }[c]));
const lookup = (arr, id) => arr.find(k => k.id === id) || { icon: "•", label: id };

// ---------- Stats bar ----------
export function renderStats() {
  const t = totals();
  const monthlyClass = t.monthlyNet >= 0 ? "pos" : "neg";
  const netClass = t.netWorth >= 0 ? "pos" : "neg";
  document.getElementById("stats").innerHTML = `
    <div class="stat-card net">
      <span class="stat-label">Net Worth</span>
      <span class="stat-value ${netClass}">${fmtUSD(t.netWorth)}</span>
      <span class="stat-sub">Assets − Liabilities</span>
    </div>
    <div class="stat-card assets">
      <span class="stat-label">Total Assets</span>
      <span class="stat-value">${fmtUSD(t.totalAssets)}</span>
      <span class="stat-sub">${state.assets.length} item${state.assets.length===1?"":"s"}</span>
    </div>
    <div class="stat-card liab">
      <span class="stat-label">Total Liabilities</span>
      <span class="stat-value">${fmtUSD(t.totalLiab)}</span>
      <span class="stat-sub">${state.liabilities.length} item${state.liabilities.length===1?"":"s"}</span>
    </div>
    <div class="stat-card ins">
      <span class="stat-label">Total Coverage</span>
      <span class="stat-value">${fmtUSD(t.totalCoverage)}</span>
      <span class="stat-sub">${state.insurance.length} polic${state.insurance.length===1?"y":"ies"}</span>
    </div>
    <div class="stat-card cf">
      <span class="stat-label">Monthly Cash Flow</span>
      <span class="stat-value ${monthlyClass}">${fmtUSD(t.monthlyNet)}</span>
      <span class="stat-sub">In ${fmtUSD(t.monthlyIn)} · Out ${fmtUSD(t.monthlyOut)}</span>
    </div>
  `;
}

// ---------- List view ----------
function row(iconClass, icon, name, meta, owner, amount, amountClass, onEdit, onRemove, notes) {
  const tr = document.createElement("div");
  tr.className = "row";
  tr.innerHTML = `
    <div class="icon iconbox-${iconClass}">${icon}</div>
    <div>
      <div class="name">${escape(name)}</div>
      <div class="meta">${escape(meta||"")}</div>
      ${notes ? `<div class="row-notes">📝 ${escape(notes)}</div>` : ""}
    </div>
    <div class="meta">${escape(meta || "")}</div>
    <div class="owner">${escape(owner||"")}</div>
    <div class="amount ${amountClass}">${amount}</div>
    <div class="actions">
      <button class="btn ghost" data-edit>Edit</button>
    </div>`;
  tr.querySelector("[data-edit]").addEventListener("click", onEdit);
  return tr;
}

function section(headHtml) {
  const sec = document.createElement("div");
  sec.className = "section";
  sec.innerHTML = headHtml;
  return sec;
}

export function renderList(rerender) {
  const root = document.getElementById("list-content");
  root.innerHTML = "";

  // People
  {
    const sec = section(`
      <div class="section-head">
        <h3>People</h3>
        <span class="pill">${state.people.length}</span>
        <span class="total"></span>
        <button class="btn primary" id="add-person-l">+ Person</button>
      </div>`);
    sec.querySelector("#add-person-l").onclick = () => personForm(null, rerender);
    if (!state.people.length) sec.insertAdjacentHTML("beforeend", `<div class="empty">No people yet. Add the household members to get started.</div>`);
    for (const p of state.people) {
      const r = row("person", "👤", p.name, p.relationship + (p.age?` · ${p.age}`:""), "", "", "neutral",
        () => personForm(p, rerender), null);
      sec.appendChild(r);
    }
    root.appendChild(sec);
  }

  // Assets
  {
    const total = state.assets.reduce((s,a)=>s+(+a.value||0),0);
    const sec = section(`
      <div class="section-head">
        <h3>Assets</h3>
        <span class="pill">${state.assets.length}</span>
        <span class="total">${fmtUSD(total)}</span>
        <button class="btn primary" id="add-asset-l">+ Asset</button>
      </div>`);
    sec.querySelector("#add-asset-l").onclick = () => assetForm(null, rerender);
    if (!state.assets.length) sec.insertAdjacentHTML("beforeend", `<div class="empty">No assets yet.</div>`);
    for (const a of state.assets) {
      const k = lookup(ASSET_KINDS, a.kind);
      sec.appendChild(row("asset", k.icon, a.name, `${k.label}${a.institution?` · ${a.institution}`:""}`,
        personLabels(a.ownerIds), fmtUSD(a.value), "pos", () => assetForm(a, rerender), null, a.notes));
    }
    root.appendChild(sec);
  }

  // Liabilities
  {
    const total = state.liabilities.reduce((s,l)=>s+(+l.balance||0),0);
    const sec = section(`
      <div class="section-head">
        <h3>Liabilities</h3>
        <span class="pill">${state.liabilities.length}</span>
        <span class="total">${fmtUSD(total)}</span>
        <button class="btn primary" id="add-liab-l">+ Liability</button>
      </div>`);
    sec.querySelector("#add-liab-l").onclick = () => liabilityForm(null, rerender);
    if (!state.liabilities.length) sec.insertAdjacentHTML("beforeend", `<div class="empty">No liabilities yet.</div>`);
    for (const l of state.liabilities) {
      const k = lookup(LIABILITY_KINDS, l.kind);
      const meta = `${k.label}${l.rate?` · ${l.rate}%`:""}${l.payment?` · ${fmtUSD(l.payment)}/mo`:""}`;
      sec.appendChild(row("liability", k.icon, l.name, meta, personLabels(l.ownerIds),
        fmtUSD(l.balance), "neg", () => liabilityForm(l, rerender), null, l.notes));
    }
    root.appendChild(sec);
  }

  // Insurance
  {
    const total = state.insurance.reduce((s,i)=>s+(+i.coverage||0),0);
    const sec = section(`
      <div class="section-head">
        <h3>Insurance</h3>
        <span class="pill">${state.insurance.length}</span>
        <span class="total">${fmtUSD(total)}</span>
        <button class="btn primary" id="add-ins-l">+ Insurance</button>
      </div>`);
    sec.querySelector("#add-ins-l").onclick = () => insuranceForm(null, rerender);
    if (!state.insurance.length) sec.insertAdjacentHTML("beforeend", `<div class="empty">No coverage yet.</div>`);
    for (const i of state.insurance) {
      const k = lookup(INSURANCE_KINDS, i.kind);
      const meta = `${k.label} · ${fmtUSD(i.premium)}/${i.frequency}`;
      sec.appendChild(row("insurance", k.icon, i.name, meta, personLabels(i.insuredIds),
        fmtUSD(i.coverage), "neutral", () => insuranceForm(i, rerender), null, i.notes));
    }
    root.appendChild(sec);
  }

  // Cash flows
  {
    const monthlyIn = state.cashflows.filter(c=>c.direction==="in").reduce((s,c)=>s+toMonthly(c.amount,c.frequency),0);
    const monthlyOut = state.cashflows.filter(c=>c.direction==="out").reduce((s,c)=>s+toMonthly(c.amount,c.frequency),0);
    const sec = section(`
      <div class="section-head">
        <h3>Cash Flow</h3>
        <span class="pill">${state.cashflows.length}</span>
        <span class="total">${fmtUSD(monthlyIn-monthlyOut)}/mo</span>
        <button class="btn primary" id="add-cf-l">+ Cash Flow</button>
      </div>`);
    sec.querySelector("#add-cf-l").onclick = () => cashflowForm(null, rerender);
    if (!state.cashflows.length) sec.insertAdjacentHTML("beforeend", `<div class="empty">No income or expenses yet.</div>`);
    for (const c of state.cashflows) {
      const k = lookup(CASHFLOW_KINDS, c.kind);
      const meta = `${k.label} · ${c.frequency}`;
      const monthly = toMonthly(c.amount, c.frequency);
      const cls = c.direction === "in" ? "pos" : "neg";
      const display = (c.direction === "in" ? "+" : "−") + fmtUSD(monthly).replace("-","") + "/mo";
      sec.appendChild(row("cashflow", k.icon, c.name, meta, personLabels(c.ownerIds),
        display, cls, () => cashflowForm(c, rerender), null, c.notes));
    }
    root.appendChild(sec);
  }
}

// ---------- Reports ----------
function donutSVG(slices, size = 180) {
  const r = size/2 - 12;
  const cx = size/2, cy = size/2;
  const total = slices.reduce((s,x)=>s+x.value, 0) || 1;
  let acc = 0;
  const paths = slices.map(s => {
    const start = acc / total * Math.PI * 2 - Math.PI/2;
    acc += s.value;
    const end = acc / total * Math.PI * 2 - Math.PI/2;
    const large = end - start > Math.PI ? 1 : 0;
    const x1 = cx + r*Math.cos(start), y1 = cy + r*Math.sin(start);
    const x2 = cx + r*Math.cos(end),   y2 = cy + r*Math.sin(end);
    return `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z" fill="${s.color}"/>`;
  }).join("");
  return `<svg class="donut" viewBox="0 0 ${size} ${size}">
    ${paths}
    <circle cx="${cx}" cy="${cy}" r="${r*0.55}" fill="#fff"/>
    <text x="${cx}" y="${cy-2}" text-anchor="middle" font-size="11" fill="#7d8aa0">Total</text>
    <text x="${cx}" y="${cy+16}" text-anchor="middle" font-size="14" font-weight="700" fill="#0f1f33">${fmtUSD(total)}</text>
  </svg>`;
}

function aggBy(items, keyFn, valFn, kindList) {
  const map = new Map();
  for (const it of items) {
    const key = keyFn(it);
    map.set(key, (map.get(key) || 0) + (+valFn(it) || 0));
  }
  const palette = ["#2bbfa6","#1f7ad6","#5b6ee1","#c08433","#e2596a","#d68a1f","#7a4ed1","#3b9c79","#5d7891","#a04a8d"];
  return [...map.entries()].sort((a,b)=>b[1]-a[1]).map(([k,v], i) => ({
    key: k, label: lookup(kindList, k).label, value: v, color: palette[i % palette.length],
  }));
}

export function renderReports() {
  const t = totals();
  const root = document.getElementById("reports-content");

  const assetSlices = aggBy(state.assets, a=>a.kind, a=>a.value, ASSET_KINDS);
  const liabSlices = aggBy(state.liabilities, l=>l.kind, l=>l.balance, LIABILITY_KINDS);

  // Health metrics
  const dti = t.monthlyIn ? (t.monthlyOut / t.monthlyIn) * 100 : 0;
  const savingsRate = t.monthlyIn ? (Math.max(0, t.monthlyNet) / t.monthlyIn) * 100 : 0;
  const monthlyExpensesNoSavings = t.monthlyOut; // approximation
  const emergencyMonths = monthlyExpensesNoSavings ? (t.totalAssets > 0
    ? (state.assets.filter(a=>a.kind==="cash"||a.kind==="savings").reduce((s,a)=>s+(+a.value||0),0) / monthlyExpensesNoSavings)
    : 0) : 0;
  const debtToAssets = t.totalAssets ? (t.totalLiab / t.totalAssets) * 100 : 0;

  const cls = (good, warn, val, higherIsBetter=true) => {
    if (higherIsBetter) return val >= good ? "h-good" : val >= warn ? "h-warn" : "h-bad";
    return val <= good ? "h-good" : val <= warn ? "h-warn" : "h-bad";
  };

  root.innerHTML = `
    <div class="report-grid">
      <div class="card">
        <h3>Financial Health</h3>
        <div class="health">
          <div class="item">
            <h4>Emergency Fund</h4>
            <div class="v ${cls(6, 3, emergencyMonths)}">${emergencyMonths.toFixed(1)} mo</div>
            <div class="meta">Cash + Savings vs. monthly expenses</div>
          </div>
          <div class="item">
            <h4>Savings Rate</h4>
            <div class="v ${cls(15, 5, savingsRate)}">${savingsRate.toFixed(1)}%</div>
            <div class="meta">Net cash flow / income</div>
          </div>
          <div class="item">
            <h4>Debt-to-Income</h4>
            <div class="v ${cls(36, 50, dti, false)}">${dti.toFixed(0)}%</div>
            <div class="meta">Monthly outflow / income</div>
          </div>
          <div class="item">
            <h4>Debt-to-Assets</h4>
            <div class="v ${cls(20, 40, debtToAssets, false)}">${debtToAssets.toFixed(0)}%</div>
            <div class="meta">Liabilities / assets</div>
          </div>
        </div>
      </div>

      <div class="card">
        <h3>Net Worth</h3>
        <div class="bar-row">
          <div class="label">Assets</div>
          <div class="bar"><span style="width:${pct(t.totalAssets, Math.max(t.totalAssets,t.totalLiab))}%; background: var(--asset)"></span></div>
          <div class="val">${fmtUSD(t.totalAssets)}</div>
        </div>
        <div class="bar-row">
          <div class="label">Liabilities</div>
          <div class="bar"><span style="width:${pct(t.totalLiab, Math.max(t.totalAssets,t.totalLiab))}%; background: var(--liability)"></span></div>
          <div class="val">${fmtUSD(t.totalLiab)}</div>
        </div>
        <div class="bar-row">
          <div class="label"><strong>Net Worth</strong></div>
          <div class="bar"><span style="width:${pct(Math.max(t.netWorth,0), Math.max(t.totalAssets,t.totalLiab))}%; background: var(--brand)"></span></div>
          <div class="val"><strong>${fmtUSD(t.netWorth)}</strong></div>
        </div>
      </div>

      <div class="card">
        <h3>Asset Allocation</h3>
        ${state.assets.length ? `
          <div class="donut-wrap">
            ${donutSVG(assetSlices)}
            <div class="donut-legend">
              ${assetSlices.map(s => `
                <div class="leg-row">
                  <div class="swatch" style="background:${s.color}"></div>
                  <div>${escape(s.label)}</div>
                  <div class="v">${fmtUSD(s.value)}</div>
                </div>`).join("")}
            </div>
          </div>` : `<div class="empty">No assets yet.</div>`}
      </div>

      <div class="card">
        <h3>Liability Breakdown</h3>
        ${state.liabilities.length ? `
          <div class="donut-wrap">
            ${donutSVG(liabSlices)}
            <div class="donut-legend">
              ${liabSlices.map(s => `
                <div class="leg-row">
                  <div class="swatch" style="background:${s.color}"></div>
                  <div>${escape(s.label)}</div>
                  <div class="v">${fmtUSD(s.value)}</div>
                </div>`).join("")}
            </div>
          </div>` : `<div class="empty">No liabilities yet.</div>`}
      </div>

      <div class="card" style="grid-column: 1 / -1">
        <h3>Insurance Coverage</h3>
        ${state.insurance.length ? state.insurance.map(i => {
          const k = lookup(INSURANCE_KINDS, i.kind);
          return `<div class="bar-row">
            <div class="label">${escape(i.name)} <span class="meta">${escape(k.label)}</span></div>
            <div class="bar"><span style="width:${pct(i.coverage, Math.max(...state.insurance.map(x=>+x.coverage||0), 1))}%; background: var(--insurance)"></span></div>
            <div class="val">${fmtUSD(i.coverage)}</div>
          </div>`;
        }).join("") : `<div class="empty">No coverage yet.</div>`}
      </div>
    </div>
  `;
}

function pct(v, max) { return max ? Math.max(0, Math.min(100, (v/max)*100)) : 0; }

// ---------- Cash flow view ----------
export function renderCashflow() {
  const t = totals();
  const root = document.getElementById("cashflow-content");
  const incomes = state.cashflows.filter(c => c.direction === "in");
  const expenses = state.cashflows.filter(c => c.direction === "out");

  const renderRows = (arr, sign) => arr.length ? arr.map(c => {
    const k = lookup(CASHFLOW_KINDS, c.kind);
    const monthly = toMonthly(c.amount, c.frequency);
    return `<div class="bar-row">
      <div class="label">${k.icon} ${escape(c.name)} <span class="meta">${escape(c.frequency)}</span></div>
      <div class="bar"><span style="width:${pct(monthly, Math.max(t.monthlyIn, t.monthlyOut, 1))}%; background:${sign==="in"?"var(--asset)":"var(--liability)"}"></span></div>
      <div class="val ${sign==="in"?"":""}">${sign==="in"?"+":"−"}${fmtUSD(monthly)}/mo</div>
    </div>`;
  }).join("") : `<div class="empty">Nothing yet.</div>`;

  root.innerHTML = `
    <div class="cf-summary">
      <div class="card"><h3>Monthly Income</h3><div class="v" style="font-size:24px;font-weight:700;color:var(--asset)">${fmtUSD(t.monthlyIn)}</div></div>
      <div class="card"><h3>Monthly Expenses</h3><div class="v" style="font-size:24px;font-weight:700;color:var(--liability)">${fmtUSD(t.monthlyOut)}</div></div>
      <div class="card"><h3>Net Monthly</h3><div class="v" style="font-size:24px;font-weight:700;color:${t.monthlyNet>=0?"var(--brand)":"var(--liability)"}">${fmtUSD(t.monthlyNet)}</div></div>
    </div>
    <div class="cf-grid">
      <div class="card">
        <h3>Income</h3>
        ${renderRows(incomes, "in")}
      </div>
      <div class="card">
        <h3>Expenses</h3>
        ${renderRows(expenses, "out")}
      </div>
    </div>
  `;
}
