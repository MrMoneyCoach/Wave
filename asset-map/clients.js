// Multi-client storage layer. Each advisor's local browser holds a list of
// client households, plus a pointer to the active one.
//
// Layout in localStorage:
//   householdmap.clients.v1   -> [{id, name, currency, updatedAt}]
//   householdmap.client.<id>.v1 -> full state object for that client
//   householdmap.active.v1    -> id of active client (or "")

const LIST_KEY = "householdmap.clients.v1";
const ACTIVE_KEY = "householdmap.active.v1";
const LEGACY_KEY = "householdmap.v1";

export const clientStorageKey = (id) => `householdmap.client.${id}.v1`;

function readJSON(k, fallback) {
  try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}
function writeJSON(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
}

export function listClients() {
  return readJSON(LIST_KEY, []);
}
export function saveClientList(list) { writeJSON(LIST_KEY, list); }

export function getActiveClientId() {
  return localStorage.getItem(ACTIVE_KEY) || "";
}
export function setActiveClientId(id) {
  if (id) localStorage.setItem(ACTIVE_KEY, id);
  else localStorage.removeItem(ACTIVE_KEY);
}

export function getClientData(id) {
  return readJSON(clientStorageKey(id), null);
}
export function saveClientData(id, data) {
  writeJSON(clientStorageKey(id), data);
}

export function makeClientId() {
  return "cli_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3);
}

// Append (or update) the client's row in the list with refreshed metadata.
export function touchClientMeta(id, data) {
  const list = listClients();
  const idx = list.findIndex(c => c.id === id);
  const meta = {
    id,
    name: (data && data.name) || "Untitled Household",
    currency: data?.assumptions?.currency || "GBP",
    updatedAt: Date.now(),
    netWorth: computeNetWorth(data),
    peopleCount: (data?.people || []).length,
  };
  if (idx >= 0) list[idx] = meta; else list.push(meta);
  saveClientList(list);
  return meta;
}

function computeNetWorth(data) {
  if (!data) return 0;
  const a = (data.assets || []).reduce((s, x) => s + (+x.value || 0), 0);
  const l = (data.liabilities || []).reduce((s, x) => s + (+x.balance || 0), 0);
  return a - l;
}

export function deleteClient(id) {
  const list = listClients().filter(c => c.id !== id);
  saveClientList(list);
  try { localStorage.removeItem(clientStorageKey(id)); } catch {}
  if (getActiveClientId() === id) setActiveClientId("");
}

export function renameClient(id, name) {
  const data = getClientData(id) || {};
  data.name = name;
  saveClientData(id, data);
  touchClientMeta(id, data);
}

// One-time migration: if the legacy single-household payload exists, turn it
// into the first client.
export function migrateFromLegacy() {
  const legacyRaw = localStorage.getItem(LEGACY_KEY);
  if (!legacyRaw) return null;
  // Only migrate if we don't already have any clients.
  if (listClients().length > 0) {
    try { localStorage.removeItem(LEGACY_KEY); } catch {}
    return null;
  }
  let data;
  try { data = JSON.parse(legacyRaw); }
  catch { return null; }
  const id = makeClientId();
  saveClientData(id, data);
  touchClientMeta(id, data);
  setActiveClientId(id);
  try { localStorage.removeItem(LEGACY_KEY); } catch {}
  return id;
}

// Create a brand-new empty client. Returns its id.
export function createClient(name = "New Household", initial = null) {
  const id = makeClientId();
  const base = initial || {};
  const data = {
    name,
    people: base.people || [],
    assets: base.assets || [],
    liabilities: base.liabilities || [],
    insurance: base.insurance || [],
    cashflows: base.cashflows || [],
    assumptions: base.assumptions || null, // state.js will fill defaults on load
    events: base.events || [],
    goals: base.goals || [],
  };
  saveClientData(id, data);
  touchClientMeta(id, data);
  return id;
}
