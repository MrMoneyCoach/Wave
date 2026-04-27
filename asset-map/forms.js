// Drawer forms for people/assets/liabilities/insurance/cashflows.
import {
  ASSET_KINDS, LIABILITY_KINDS, INSURANCE_KINDS,
  CASHFLOW_KINDS, FREQUENCIES, RELATIONSHIPS,
} from "./data.js";
import { state, upsert, remove } from "./state.js";

const drawer = () => document.getElementById("drawer");
const scrim = () => document.getElementById("drawer-scrim");
const title = () => document.getElementById("drawer-title");
const body  = () => document.getElementById("drawer-body");

let onCloseCb = null;

export function openDrawer(t, html, onClose) {
  title().textContent = t;
  body().innerHTML = html;
  drawer().classList.add("open");
  drawer().setAttribute("aria-hidden", "false");
  scrim().classList.add("open");
  onCloseCb = onClose || null;
}
export function closeDrawer() {
  drawer().classList.remove("open");
  drawer().setAttribute("aria-hidden", "true");
  scrim().classList.remove("open");
  const cb = onCloseCb; onCloseCb = null;
  if (cb) cb();
}

document.addEventListener("click", (e) => {
  if (e.target.id === "drawer-close" || e.target.id === "drawer-scrim") closeDrawer();
});

// ---------- Builders ----------
const opt = (v, l, sel) =>
  `<option value="${escapeAttr(v)}"${sel ? " selected" : ""}>${escape(l)}</option>`;
const escape = (s) => String(s ?? "").replace(/[&<>]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;" }[c]));
const escapeAttr = (s) => String(s ?? "").replace(/"/g, "&quot;");

const peopleCheckboxes = (selected = [], name = "ownerIds") =>
  state.people.length === 0
    ? `<div class="help">Add a person first to assign ownership.</div>`
    : state.people.map(p =>
        `<label style="display:flex;gap:6px;align-items:center;font-weight:500;color:var(--ink);padding:4px 0">
          <input type="checkbox" name="${name}" value="${p.id}" ${selected.includes(p.id) ? "checked" : ""}/> ${escape(p.name)}
        </label>`
      ).join("");

const footer = (id) => `
  <div class="drawer-footer">
    ${id ? `<button class="btn danger-ghost" data-action="delete">Delete</button>` : ""}
    <div class="spacer"></div>
    <button class="btn ghost" data-action="cancel">Cancel</button>
    <button class="btn primary" data-action="save">Save</button>
  </div>`;

function bindForm(coll, getValues, onAfter, id) {
  const root = body();
  root.addEventListener("click", (e) => {
    const a = e.target.closest("[data-action]");
    if (!a) return;
    const act = a.dataset.action;
    if (act === "cancel") return closeDrawer();
    if (act === "delete") {
      if (confirm("Delete this item?")) { remove(coll, id); closeDrawer(); onAfter && onAfter(); }
      return;
    }
    if (act === "save") {
      try {
        const v = getValues();
        upsert(coll, v);
        closeDrawer();
        onAfter && onAfter();
      } catch (err) {
        alert(err.message || "Could not save");
      }
    }
  });
}

const checkedValues = (sel) =>
  Array.from(body().querySelectorAll(sel)).filter(c => c.checked).map(c => c.value);
const val = (n) => body().querySelector(`[name="${n}"]`).value;
const num = (n) => parseFloat(val(n)) || 0;

const notesField = (notes, placeholder = "Optional advisor notes — only visible to you") => `
  <div class="field"><label>Notes</label>
    <textarea name="notes" rows="3" placeholder="${escapeAttr(placeholder)}">${escape(notes || "")}</textarea>
  </div>`;
const readNotes = () => (body().querySelector('[name="notes"]')?.value || "").trim();

// ---------- Person ----------
export function personForm(existing, onAfter) {
  const e = existing || { name: "", relationship: "Self", age: "", retirementAge: 65 };
  openDrawer(existing ? "Edit Person" : "Add Person", `
    <div class="field"><label>Name</label><input name="name" value="${escapeAttr(e.name)}" placeholder="Full name"/></div>
    <div class="field-row">
      <div class="field"><label>Relationship</label>
        <select name="relationship">${RELATIONSHIPS.map(r => opt(r, r, r === e.relationship)).join("")}</select>
      </div>
      <div class="field"><label>Age</label><input name="age" type="number" min="0" max="120" value="${escapeAttr(e.age)}"/></div>
    </div>
    <div class="field"><label>Retirement Age</label>
      <input name="retirementAge" type="number" min="0" max="120" value="${escapeAttr(e.retirementAge ?? "")}" placeholder="e.g. 67 — leave blank for N/A"/>
    </div>
    <div class="help">Used by projections to auto-stop salary income at retirement.</div>
    ${notesField(e.notes, "e.g. medical history, employer plan details")}
    ${footer(existing?.id)}
  `);
  bindForm("people", () => ({
    id: existing?.id, name: val("name").trim() || "Unnamed",
    relationship: val("relationship"),
    age: val("age") ? parseInt(val("age"), 10) : null,
    retirementAge: val("retirementAge") ? parseInt(val("retirementAge"), 10) : null,
    notes: readNotes(),
  }), onAfter, existing?.id);
}

// ---------- Asset ----------
export function assetForm(existing, onAfter) {
  const e = existing || { name: "", kind: "cash", value: 0, ownerIds: [], institution: "", growthRate: "" };
  openDrawer(existing ? "Edit Asset" : "Add Asset", `
    <div class="field"><label>Name</label><input name="name" value="${escapeAttr(e.name)}" placeholder="e.g. Joint Checking"/></div>
    <div class="field-row">
      <div class="field"><label>Type</label>
        <select name="kind">${ASSET_KINDS.map(k => opt(k.id, `${k.icon}  ${k.label}`, k.id === e.kind)).join("")}</select>
      </div>
      <div class="field"><label>Value (USD)</label><input name="value" type="number" min="0" step="100" value="${escapeAttr(e.value)}"/></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Institution</label><input name="institution" value="${escapeAttr(e.institution||"")}" placeholder="e.g. Bank, Brokerage"/></div>
      <div class="field"><label>Growth % (override)</label><input name="growthRate" type="number" step="0.1" value="${escapeAttr(e.growthRate ?? "")}" placeholder="default by type"/></div>
    </div>
    <div class="field"><label>Owner(s)</label>${peopleCheckboxes(e.ownerIds)}</div>
    ${notesField(e.notes, "e.g. inherited from grandmother, in trust until 25")}
    ${footer(existing?.id)}
  `);
  bindForm("assets", () => ({
    id: existing?.id, name: val("name").trim() || "Asset",
    kind: val("kind"), value: num("value"),
    institution: val("institution"), ownerIds: checkedValues('input[name="ownerIds"]'),
    growthRate: val("growthRate") === "" ? null : parseFloat(val("growthRate")),
    notes: readNotes(),
  }), onAfter, existing?.id);
}

// ---------- Liability ----------
export function liabilityForm(existing, onAfter) {
  const e = existing || { name: "", kind: "mortgage", balance: 0, rate: 0, payment: 0, ownerIds: [], institution: "" };
  openDrawer(existing ? "Edit Liability" : "Add Liability", `
    <div class="field"><label>Name</label><input name="name" value="${escapeAttr(e.name)}" placeholder="e.g. Mortgage"/></div>
    <div class="field-row">
      <div class="field"><label>Type</label>
        <select name="kind">${LIABILITY_KINDS.map(k => opt(k.id, `${k.icon}  ${k.label}`, k.id === e.kind)).join("")}</select>
      </div>
      <div class="field"><label>Balance (USD)</label><input name="balance" type="number" min="0" step="100" value="${escapeAttr(e.balance)}"/></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Rate (%)</label><input name="rate" type="number" min="0" step="0.01" value="${escapeAttr(e.rate)}"/></div>
      <div class="field"><label>Monthly Pmt</label><input name="payment" type="number" min="0" step="1" value="${escapeAttr(e.payment)}"/></div>
    </div>
    <div class="field"><label>Institution</label><input name="institution" value="${escapeAttr(e.institution||"")}"/></div>
    <div class="field"><label>Owner(s)</label>${peopleCheckboxes(e.ownerIds)}</div>
    ${notesField(e.notes, "e.g. fixed-rate ends Jul 2027, ERC applies until then")}
    ${footer(existing?.id)}
  `);
  bindForm("liabilities", () => ({
    id: existing?.id, name: val("name").trim() || "Liability",
    kind: val("kind"), balance: num("balance"),
    rate: num("rate"), payment: num("payment"),
    institution: val("institution"), ownerIds: checkedValues('input[name="ownerIds"]'),
    notes: readNotes(),
  }), onAfter, existing?.id);
}

// ---------- Insurance ----------
export function insuranceForm(existing, onAfter) {
  const e = existing || { name: "", kind: "life-term", coverage: 0, premium: 0, frequency: "monthly", insuredIds: [], beneficiaryIds: [] };
  openDrawer(existing ? "Edit Policy" : "Add Insurance", `
    <div class="field"><label>Policy Name</label><input name="name" value="${escapeAttr(e.name)}" placeholder="e.g. Term Life"/></div>
    <div class="field-row">
      <div class="field"><label>Type</label>
        <select name="kind">${INSURANCE_KINDS.map(k => opt(k.id, `${k.icon}  ${k.label}`, k.id === e.kind)).join("")}</select>
      </div>
      <div class="field"><label>Coverage (USD)</label><input name="coverage" type="number" min="0" step="1000" value="${escapeAttr(e.coverage)}"/></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Premium</label><input name="premium" type="number" min="0" step="1" value="${escapeAttr(e.premium)}"/></div>
      <div class="field"><label>Frequency</label>
        <select name="frequency">${FREQUENCIES.map(f => opt(f.id, f.label, f.id === e.frequency)).join("")}</select>
      </div>
    </div>
    <div class="field"><label>Insured</label>${peopleCheckboxes(e.insuredIds, "insuredIds")}</div>
    <div class="field"><label>Beneficiaries</label>${peopleCheckboxes(e.beneficiaryIds, "beneficiaryIds")}</div>
    ${notesField(e.notes, "e.g. policy in trust, exclusions, deferred period")}
    ${footer(existing?.id)}
  `);
  bindForm("insurance", () => ({
    id: existing?.id, name: val("name").trim() || "Policy",
    kind: val("kind"), coverage: num("coverage"),
    premium: num("premium"), frequency: val("frequency"),
    insuredIds: checkedValues('input[name="insuredIds"]'),
    beneficiaryIds: checkedValues('input[name="beneficiaryIds"]'),
    notes: readNotes(),
  }), onAfter, existing?.id);
}

// ---------- Cash flow ----------
export function cashflowForm(existing, onAfter) {
  const e = existing || { name: "", kind: "salary", amount: 0, frequency: "monthly", direction: "in", ownerIds: [], inflate: true, stopAtRetirement: false, startYear: "", endYear: "" };
  openDrawer(existing ? "Edit Cash Flow" : "Add Cash Flow", `
    <div class="field"><label>Name</label><input name="name" value="${escapeAttr(e.name)}" placeholder="e.g. Alex Salary"/></div>
    <div class="field-row">
      <div class="field"><label>Direction</label>
        <select name="direction">
          ${opt("in", "Income (in)", e.direction === "in")}
          ${opt("out", "Expense (out)", e.direction === "out")}
        </select>
      </div>
      <div class="field"><label>Type</label>
        <select name="kind">${CASHFLOW_KINDS.map(k => opt(k.id, `${k.icon}  ${k.label}`, k.id === e.kind)).join("")}</select>
      </div>
    </div>
    <div class="field-row">
      <div class="field"><label>Amount</label><input name="amount" type="number" min="0" step="1" value="${escapeAttr(e.amount)}"/></div>
      <div class="field"><label>Frequency</label>
        <select name="frequency">${FREQUENCIES.map(f => opt(f.id, f.label, f.id === e.frequency)).join("")}</select>
      </div>
    </div>
    <div class="field-row">
      <div class="field"><label>Start Year</label><input name="startYear" type="number" min="1900" max="2100" value="${escapeAttr(e.startYear ?? "")}" placeholder="now"/></div>
      <div class="field"><label>End Year</label><input name="endYear" type="number" min="1900" max="2100" value="${escapeAttr(e.endYear ?? "")}" placeholder="ongoing"/></div>
    </div>
    <div class="field">
      <label style="display:flex;gap:8px;align-items:center;font-weight:500;color:var(--ink);text-transform:none;letter-spacing:0">
        <input type="checkbox" name="inflate" ${e.inflate !== false ? "checked" : ""}/> Inflate annually with assumed inflation rate
      </label>
      <label style="display:flex;gap:8px;align-items:center;font-weight:500;color:var(--ink);text-transform:none;letter-spacing:0">
        <input type="checkbox" name="stopAtRetirement" ${e.stopAtRetirement ? "checked" : ""}/> Stop at owner retirement (salary-style)
      </label>
    </div>
    <div class="field"><label>Owner(s)</label>${peopleCheckboxes(e.ownerIds)}</div>
    ${notesField(e.notes, "e.g. bonus included; review at next pay rise")}
    ${footer(existing?.id)}
  `);
  bindForm("cashflows", () => ({
    id: existing?.id, name: val("name").trim() || "Cash Flow",
    kind: val("kind"), amount: num("amount"),
    frequency: val("frequency"), direction: val("direction"),
    ownerIds: checkedValues('input[name="ownerIds"]'),
    startYear: val("startYear") ? parseInt(val("startYear"), 10) : null,
    endYear: val("endYear") ? parseInt(val("endYear"), 10) : null,
    inflate: body().querySelector('[name="inflate"]').checked,
    stopAtRetirement: body().querySelector('[name="stopAtRetirement"]').checked,
    notes: readNotes(),
  }), onAfter, existing?.id);
}
