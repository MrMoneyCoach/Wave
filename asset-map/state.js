// State, persistence, calculations.
import {
  SAMPLE_HOUSEHOLD, FREQUENCIES, makeId, DEFAULT_ASSUMPTIONS, DEFAULT_RETURNS,
} from "./data.js";

const KEY = "householdmap.v1";

const EMPTY = () => ({
  name: "My Household",
  people: [],
  assets: [],
  liabilities: [],
  insurance: [],
  cashflows: [],
  assumptions: DEFAULT_ASSUMPTIONS(),
  events: [],
  goals: [],
});

export const state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY();
    const data = JSON.parse(raw);
    const merged = { ...EMPTY(), ...data };
    // Ensure nested defaults survive older payloads.
    merged.assumptions = { ...DEFAULT_ASSUMPTIONS(), ...(data.assumptions || {}) };
    merged.assumptions.defaultReturns = {
      ...DEFAULT_RETURNS, ...(data.assumptions?.defaultReturns || {}),
    };
    merged.events = data.events || [];
    merged.goals = data.goals || [];
    return merged;
  } catch {
    return EMPTY();
  }
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}

export function reset() {
  Object.assign(state, EMPTY());
  save();
}

export function loadSample() {
  const copy = JSON.parse(JSON.stringify(SAMPLE_HOUSEHOLD));
  Object.assign(state, copy);
  save();
}

export function importJSON(obj) {
  if (!obj || typeof obj !== "object") throw new Error("Invalid file");
  Object.assign(state, EMPTY(), obj);
  save();
}

// CRUD helpers
export function upsert(coll, item) {
  const list = state[coll];
  if (!item.id) item.id = makeId(coll.slice(0, 1));
  const i = list.findIndex(x => x.id === item.id);
  if (i >= 0) list[i] = item; else list.push(item);
  save();
  return item;
}
export function setAssumption(key, value) {
  state.assumptions[key] = value;
  save();
}
export function remove(coll, id) {
  const list = state[coll];
  const i = list.findIndex(x => x.id === id);
  if (i >= 0) list.splice(i, 1);
  // Clean person references
  if (coll === "people") {
    for (const c of ["assets","liabilities","cashflows"]) {
      for (const it of state[c]) it.ownerIds = (it.ownerIds||[]).filter(p => p !== id);
    }
    for (const it of state.insurance) {
      it.insuredIds = (it.insuredIds||[]).filter(p => p !== id);
      it.beneficiaryIds = (it.beneficiaryIds||[]).filter(p => p !== id);
    }
  }
  save();
}

// Calculations
export const fmtUSD = (n) =>
  (n < 0 ? "-" : "") + "$" + Math.abs(Math.round(n||0)).toLocaleString();

export const fmtUSDc = (n) =>
  (n < 0 ? "-" : "") + "$" + Math.abs(n||0).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});

export const freqPerYear = (id) =>
  (FREQUENCIES.find(f => f.id === id) || {per_year: 12}).per_year;

export const toMonthly = (amount, frequency) =>
  (amount || 0) * freqPerYear(frequency) / 12;

export function totals() {
  const totalAssets = state.assets.reduce((s, a) => s + (+a.value || 0), 0);
  const totalLiab   = state.liabilities.reduce((s, l) => s + (+l.balance || 0), 0);
  const netWorth    = totalAssets - totalLiab;
  const totalCoverage = state.insurance.reduce((s, i) => s + (+i.coverage || 0), 0);
  const monthlyPrem = state.insurance.reduce((s, i) => s + toMonthly(+i.premium, i.frequency), 0);

  let monthlyIn = 0, monthlyOut = 0;
  for (const c of state.cashflows) {
    const m = toMonthly(+c.amount, c.frequency);
    if (c.direction === "in") monthlyIn += m; else monthlyOut += m;
  }
  const monthlyNet = monthlyIn - monthlyOut;
  return { totalAssets, totalLiab, netWorth, totalCoverage, monthlyPrem,
           monthlyIn, monthlyOut, monthlyNet };
}

export function personById(id) {
  return state.people.find(p => p.id === id);
}
export function personLabels(ids) {
  if (!ids || !ids.length) return "—";
  return ids.map(id => {
    const p = personById(id);
    return p ? p.name.split(" ")[0] : "?";
  }).join(", ");
}

// ----------------------------------------------------------------------
// Projection engine
// ----------------------------------------------------------------------
//
// Each year:
//   1. Apply life events scheduled for that year.
//   2. Total income from active cash flows (inflated, stop at retirement).
//   3. Total expenses from active cash flows.
//   4. Add education event annual costs to expenses.
//   5. Net cash flow = income - expenses.
//   6. Amortize liabilities one year (using rate + payment).
//   7. Grow assets by their growth rate.
//   8. Apply net cash flow to a chosen "savings sink" asset
//      (cash/savings preferred). If negative, draw down liquid assets.
//   9. Snapshot totals.
//
// Returns: array of yearly snapshots and metadata.

export function simulate(opts = {}) {
  const a = state.assumptions || {};
  const startYear = opts.startYear ?? a.startYear ?? new Date().getFullYear();
  const years = Math.max(1, Math.min(70, opts.years ?? a.yearsToProject ?? 30));
  const inflation = (opts.inflationRate ?? a.inflationRate ?? 2.5) / 100;
  const defaultReturns = a.defaultReturns || {};

  // Deep-copy mutable simulation state.
  const people = state.people.map(p => ({ ...p }));
  const assets = state.assets.map(x => ({ ...x, value: +x.value || 0,
    growthRate: x.growthRate != null ? +x.growthRate
      : (defaultReturns[x.kind] != null ? defaultReturns[x.kind] : 3.0) }));
  const liab = state.liabilities.map(x => ({ ...x,
    balance: +x.balance || 0,
    rate: +x.rate || 0,
    payment: +x.payment || 0 }));
  const flows = state.cashflows.map(c => ({ ...c, amount: +c.amount || 0 }));
  const events = (state.events || []).slice().sort((e1, e2) => e1.year - e2.year);

  const isRetiredFor = (personId, year) => {
    const person = people.find(p => p.id === personId);
    if (!person || person.retirementAge == null) return false;
    if (person.age == null) return false;
    return (year - startYear) + person.age >= person.retirementAge;
  };

  const eventsByYear = new Map();
  for (const ev of events) {
    if (!eventsByYear.has(ev.year)) eventsByYear.set(ev.year, []);
    eventsByYear.get(ev.year).push(ev);
  }

  const snapshots = [];

  // Initial snapshot (year 0)
  snapshots.push(snapshot(startYear - 1, people, assets, liab, 0, 0, []));

  for (let i = 0; i < years; i++) {
    const year = startYear + i;
    const log = [];

    // 1. Apply events scheduled this year.
    for (const ev of (eventsByYear.get(year) || [])) {
      applyEvent(ev, { people, assets, liab, flows, log });
    }

    // 2 + 3. Sum income and expenses
    let income = 0, expenses = 0;
    const inflFactor = Math.pow(1 + inflation, i);
    for (const c of flows) {
      if (c.startYear && year < c.startYear) continue;
      if (c.endYear && year > c.endYear) continue;
      if (c.stopAtRetirement && c.ownerIds?.length) {
        const allRetired = c.ownerIds.every(id => isRetiredFor(id, year));
        if (allRetired) continue;
      }
      const annual = (c.amount || 0) * (FREQUENCIES.find(f => f.id === c.frequency)?.per_year || 12);
      const adj = c.inflate === false ? annual : annual * inflFactor;
      if (c.direction === "in") income += adj;
      else expenses += adj;
    }

    // 4. Education events: annual cost during the funded years
    for (const ev of events) {
      if (ev.kind !== "education") continue;
      if (year >= ev.year && year < ev.year + (ev.years || 4)) {
        const cost = (ev.annualCost || 0) * Math.pow(1 + inflation, year - ev.year);
        expenses += cost;
      }
    }

    // 5. Net cash flow
    const net = income - expenses;

    // 6. Amortize liabilities (annual)
    for (const l of liab) {
      if (l.balance <= 0) continue;
      const r = (l.rate || 0) / 100;
      const annualPmt = (l.payment || 0) * 12;
      const interest = l.balance * r;
      const principal = annualPmt - interest;
      l.balance = Math.max(0, l.balance - principal);
    }

    // 7. Grow assets
    for (const x of assets) {
      const g = (x.growthRate != null ? x.growthRate : 0) / 100;
      x.value = Math.max(0, x.value * (1 + g));
    }

    // 8. Apply net cash flow into / out of liquid assets
    applyNetFlow(assets, net);

    // 9. Snapshot
    snapshots.push(snapshot(year, people, assets, liab, income, expenses, log));
  }

  return { startYear, years, snapshots, inflation };
}

function snapshot(year, people, assets, liab, income, expenses, events) {
  const totalAssets = assets.reduce((s, x) => s + (+x.value || 0), 0);
  const totalLiab = liab.reduce((s, x) => s + (+x.balance || 0), 0);
  return {
    year,
    income, expenses, net: income - expenses,
    totalAssets, totalLiab,
    netWorth: totalAssets - totalLiab,
    assets: assets.map(x => ({ id: x.id, name: x.name, kind: x.kind, value: x.value })),
    liabilities: liab.map(x => ({ id: x.id, name: x.name, kind: x.kind, balance: x.balance })),
    events: events.slice(),
  };
}

function applyEvent(ev, ctx) {
  const { assets, liab, flows, log } = ctx;
  if (ev.kind === "asset-sale") {
    const a = assets.find(x => x.id === ev.assetId);
    if (a) {
      const proceeds = ev.salePrice != null ? +ev.salePrice : a.value;
      a.value = 0;
      a._soldProceeds = proceeds;
      // proceeds go into cash bucket
      const cash = assets.find(x => x.kind === "cash") || assets.find(x => x.kind === "savings");
      if (cash) cash.value += proceeds;
      log.push(`Sold ${a.name} for $${Math.round(proceeds).toLocaleString()}`);
    }
  } else if (ev.kind === "asset-purchase") {
    assets.push({
      id: ev.id + "_a", name: ev.name || "New Asset", kind: ev.assetKind || "other-asset",
      value: +ev.value || 0, growthRate: ev.growthRate != null ? +ev.growthRate : 3.0,
      ownerIds: ev.ownerIds || [],
    });
    // optional cash-down
    const cash = assets.find(x => x.kind === "cash") || assets.find(x => x.kind === "savings");
    const down = +ev.downPayment || 0;
    if (cash && down > 0) cash.value = Math.max(0, cash.value - down);
    if (ev.financedAmount > 0) {
      liab.push({
        id: ev.id + "_l", name: (ev.name || "Purchase") + " Loan", kind: ev.loanKind || "personal",
        balance: +ev.financedAmount, rate: +ev.loanRate || 5, payment: +ev.loanPayment || 0,
        ownerIds: ev.ownerIds || [],
      });
    }
    log.push(`Bought ${ev.name}`);
  } else if (ev.kind === "liability-payoff") {
    const l = liab.find(x => x.id === ev.liabilityId);
    if (l) {
      const cash = assets.find(x => x.kind === "cash") || assets.find(x => x.kind === "savings");
      const amt = l.balance;
      if (cash) cash.value = Math.max(0, cash.value - amt);
      l.balance = 0;
      log.push(`Paid off ${l.name} ($${Math.round(amt).toLocaleString()})`);
    }
  } else if (ev.kind === "income-change" || ev.kind === "expense-change") {
    const c = flows.find(x => x.id === ev.cashflowId);
    if (c) {
      if (ev.newAmount != null) c.amount = +ev.newAmount;
      if (ev.endNow) c.endYear = ev.year;
      log.push(`Adjusted ${c.name}`);
    }
  } else if (ev.kind === "lump-sum") {
    const cash = assets.find(x => x.kind === "cash") || assets.find(x => x.kind === "savings");
    const amt = +ev.amount || 0;
    if (cash) cash.value = Math.max(0, cash.value + (ev.direction === "in" ? amt : -amt));
    log.push(`${ev.direction === "in" ? "Received" : "Paid"} lump sum $${Math.round(amt).toLocaleString()}`);
  } else if (ev.kind === "retire") {
    log.push(`Retirement event`);
  }
  // education events handled inline during expense calc.
}

function applyNetFlow(assets, net) {
  if (net === 0) return;
  // Prefer cash, then savings, then brokerage, then retirement
  const order = ["cash","savings","brokerage","retirement","529","hsa","other-asset"];
  if (net > 0) {
    const sink = order.map(k => assets.find(x => x.kind === k)).find(Boolean);
    if (sink) sink.value += net;
    else if (assets.length) assets[0].value += net;
  } else {
    let need = -net;
    for (const k of order) {
      const x = assets.find(y => y.kind === k);
      if (!x) continue;
      const take = Math.min(need, x.value);
      x.value -= take;
      need -= take;
      if (need <= 0) break;
    }
    // If still need, leave as a "shortfall" (recorded only via negative net)
  }
}
