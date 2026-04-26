// State, persistence, calculations.
import { SAMPLE_HOUSEHOLD, FREQUENCIES, makeId } from "./data.js";

const KEY = "householdmap.v1";

const EMPTY = () => ({
  name: "My Household",
  people: [],
  assets: [],
  liabilities: [],
  insurance: [],
  cashflows: [],
});

export const state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY();
    const data = JSON.parse(raw);
    return { ...EMPTY(), ...data };
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
