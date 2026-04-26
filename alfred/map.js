// SVG household map: people in the center, four category clusters around them.
import { ASSET_KINDS, LIABILITY_KINDS, INSURANCE_KINDS, CASHFLOW_KINDS } from "./data.js";
import { state, fmtUSD, toMonthly, personLabels } from "./state.js";
import {
  personForm, assetForm, liabilityForm, insuranceForm, cashflowForm,
} from "./forms.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const W = 1600, H = 1100;

const lookup = (arr, id) => arr.find(k => k.id === id) || { icon: "•", label: id };

let viewBox = { x: 0, y: 0, w: W, h: H };
let isPanning = false;
let panStart = null;

function el(tag, attrs = {}, children = []) {
  const n = document.createElementNS(SVG_NS, tag);
  for (const [k,v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    n.setAttribute(k, v);
  }
  for (const c of (Array.isArray(children) ? children : [children])) {
    if (c == null) continue;
    n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return n;
}

function setViewBox(svg) {
  svg.setAttribute("viewBox", `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
}

export function fitView() {
  viewBox = { x: 0, y: 0, w: W, h: H };
  const svg = document.getElementById("map-svg");
  if (svg) setViewBox(svg);
}

export function zoom(factor, cx, cy) {
  const svg = document.getElementById("map-svg");
  const rect = svg.getBoundingClientRect();
  if (cx == null) { cx = rect.width/2; cy = rect.height/2; }
  const sx = viewBox.x + (cx/rect.width) * viewBox.w;
  const sy = viewBox.y + (cy/rect.height) * viewBox.h;
  viewBox.w *= factor;
  viewBox.h *= factor;
  viewBox.x = sx - (cx/rect.width) * viewBox.w;
  viewBox.y = sy - (cy/rect.height) * viewBox.h;
  setViewBox(svg);
}

function attachInteractions(svg, rerender) {
  svg.addEventListener("wheel", (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    const r = svg.getBoundingClientRect();
    zoom(factor, e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });

  svg.addEventListener("mousedown", (e) => {
    if (e.target.closest("[data-clickable]")) return;
    isPanning = true;
    svg.classList.add("grabbing");
    panStart = { x: e.clientX, y: e.clientY, vx: viewBox.x, vy: viewBox.y };
  });
  window.addEventListener("mousemove", (e) => {
    if (!isPanning) return;
    const r = svg.getBoundingClientRect();
    const dx = (e.clientX - panStart.x) * (viewBox.w / r.width);
    const dy = (e.clientY - panStart.y) * (viewBox.h / r.height);
    viewBox.x = panStart.vx - dx;
    viewBox.y = panStart.vy - dy;
    setViewBox(svg);
  });
  window.addEventListener("mouseup", () => {
    isPanning = false;
    svg.classList.remove("grabbing");
  });

  svg.addEventListener("click", (e) => {
    const t = e.target.closest("[data-clickable]");
    if (!t) return;
    const kind = t.dataset.kind;
    const id = t.dataset.id;
    if (kind === "person") {
      const p = state.people.find(x => x.id === id);
      if (p) personForm(p, rerender);
    } else if (kind === "asset") {
      const a = state.assets.find(x => x.id === id);
      if (a) assetForm(a, rerender);
    } else if (kind === "liability") {
      const l = state.liabilities.find(x => x.id === id);
      if (l) liabilityForm(l, rerender);
    } else if (kind === "insurance") {
      const i = state.insurance.find(x => x.id === id);
      if (i) insuranceForm(i, rerender);
    } else if (kind === "cashflow") {
      const c = state.cashflows.find(x => x.id === id);
      if (c) cashflowForm(c, rerender);
    } else if (kind === "add-person") {
      personForm(null, rerender);
    } else if (kind === "add-asset")     { assetForm(null, rerender); }
    else if (kind === "add-liability")   { liabilityForm(null, rerender); }
    else if (kind === "add-insurance")   { insuranceForm(null, rerender); }
    else if (kind === "add-cashflow")    { cashflowForm(null, rerender); }
  });
}

let attached = false;

// Layout helpers
function arrangeAroundCenter(items, anchor, dir, columns = 1, slotW = 230, slotH = 90, gap = 14) {
  // Returns positions for items in a grid radiating from `anchor` in direction `dir`.
  // dir: { x: ±1, y: ±1 } indicating quadrant; supports cardinal too via 0.
  const positions = [];
  const blockW = columns * slotW + (columns - 1) * gap;
  const rows = Math.ceil(items.length / columns) || 1;
  const blockH = rows * slotH + (rows - 1) * gap;

  let originX, originY;
  if (dir.x !== 0 && dir.y !== 0) {
    // diagonal
    originX = anchor.x + dir.x * 220;
    originY = anchor.y + dir.y * 200;
    if (dir.x < 0) originX -= blockW;
    if (dir.y < 0) originY -= blockH;
  } else if (dir.x !== 0) {
    originX = anchor.x + dir.x * 220;
    originY = anchor.y - blockH/2;
    if (dir.x < 0) originX -= blockW;
  } else {
    originX = anchor.x - blockW/2;
    originY = anchor.y + dir.y * 200;
    if (dir.y < 0) originY -= blockH;
  }

  for (let i = 0; i < items.length; i++) {
    const r = Math.floor(i / columns);
    const c = i % columns;
    positions.push({
      x: originX + c * (slotW + gap),
      y: originY + r * (slotH + gap),
      w: slotW, h: slotH,
    });
  }
  return positions;
}

function nodeCard(item, kind, x, y, w, h, top, mid, amount, amountClass) {
  const g = el("g", { class: `node-card node-${kind}`, transform: `translate(${x} ${y})`,
    "data-clickable": "1", "data-kind": kind, "data-id": item.id });
  g.appendChild(el("rect", { class: "node-bg", x: 0, y: 0, width: w, height: h, rx: 10, ry: 10 }));
  g.appendChild(el("text", { class: "node-icon", x: 12, y: 26 }, top.icon || ""));
  g.appendChild(el("text", { class: "node-title", x: 38, y: 22 }, top.title || ""));
  if (top.sub) g.appendChild(el("text", { class: "node-sub", x: 38, y: 38 }, top.sub));
  g.appendChild(el("text", { class: "node-sub", x: 12, y: h - 22 }, mid || ""));
  g.appendChild(el("text", { class: `node-amount ${amountClass||""}`, x: w - 12, y: h - 18, "text-anchor": "end" }, amount));
  return g;
}

function categoryHeader(label, x, y, kind, addKind) {
  const g = el("g", { transform: `translate(${x} ${y})` });
  g.appendChild(el("rect", { class: `cat-bg cat-${kind}`, x: 0, y: 0, width: 200, height: 38, rx: 19, ry: 19 }));
  g.appendChild(el("text", { class: `cat-title cat-${kind}-fill`, x: 18, y: 24 }, label));
  const addBtn = el("g", {
    class: "node-card", transform: "translate(150 4)", "data-clickable": "1", "data-kind": addKind,
  });
  addBtn.appendChild(el("circle", { cx: 15, cy: 15, r: 14, fill: "#fff", stroke: `var(--${kind})`, "stroke-width": 1.5 }));
  addBtn.appendChild(el("text", { x: 15, y: 20, "text-anchor": "middle", "font-size": 18, "font-weight": 700, fill: `var(--${kind})` }, "+"));
  g.appendChild(addBtn);
  return g;
}

export function renderMap(rerender) {
  const svg = document.getElementById("map-svg");
  svg.innerHTML = "";
  svg.setAttribute("viewBox", `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

  // Lines layer first (so they sit under cards)
  const linesLayer = el("g");
  svg.appendChild(linesLayer);

  // Center: household block with people inside
  const center = { x: W/2, y: H/2 };
  const houseW = 320, houseH = 80 + Math.max(state.people.length, 1) * 60;
  const houseX = center.x - houseW/2;
  const houseY = center.y - houseH/2;

  const house = el("g", { transform: `translate(${houseX} ${houseY})` });
  house.appendChild(el("rect", { class: "household-bg", x: 0, y: 0, width: houseW, height: houseH, rx: 14, ry: 14 }));
  house.appendChild(el("text", { class: "household-label", x: houseW/2, y: 28, "text-anchor": "middle" }, state.name || "Household"));

  if (state.people.length === 0) {
    house.appendChild(el("text", { class: "empty-hint", x: houseW/2, y: houseH/2 + 8 }, "Click + Person to add household members"));
    const addBtn = el("g", { transform: `translate(${houseW/2 - 70} ${houseH - 36})`, "data-clickable":"1", "data-kind":"add-person" });
    addBtn.appendChild(el("rect", { x: 0, y: 0, width: 140, height: 26, rx: 13, ry: 13, fill: "var(--brand)", stroke: "transparent" }));
    addBtn.appendChild(el("text", { x: 70, y: 18, "text-anchor": "middle", fill: "#fff", "font-weight": 600 }, "+ Add Person"));
    house.appendChild(addBtn);
  } else {
    state.people.forEach((p, i) => {
      const py = 50 + i * 60;
      const g = el("g", { transform: `translate(16 ${py})`, class: "person-card",
        "data-clickable":"1", "data-kind":"person", "data-id": p.id });
      g.appendChild(el("rect", { class: "person-bg", x: 0, y: 0, width: houseW - 32, height: 52, rx: 10, ry: 10 }));
      g.appendChild(el("circle", { class: "person-avatar", cx: 26, cy: 26, r: 18 }));
      g.appendChild(el("text", { class: "person-initials", x: 26, y: 31, "text-anchor": "middle" }, initials(p.name)));
      g.appendChild(el("text", { class: "person-name", x: 56, y: 24 }, p.name));
      g.appendChild(el("text", { class: "person-meta", x: 56, y: 40 }, `${p.relationship}${p.age?` · ${p.age}`:""}`));
      house.appendChild(g);
    });
  }
  svg.appendChild(house);

  // Anchors for category clusters
  const topLeft = { x: houseX - 40, y: houseY - 20 };
  const topRight = { x: houseX + houseW + 40, y: houseY - 20 };
  const bottomLeft = { x: houseX - 40, y: houseY + houseH + 20 };
  const bottomRight = { x: houseX + houseW + 40, y: houseY + houseH + 20 };

  // Build clusters
  const clusters = [
    { key: "assets",       label: "Assets",       kind: "asset",     addKind: "add-asset",
      anchor: topLeft, dir: { x: -1, y: -1 }, items: state.assets,
      itemRender: (a) => buildAssetCard(a) },
    { key: "liabilities",  label: "Liabilities",  kind: "liability", addKind: "add-liability",
      anchor: topRight, dir: { x: 1, y: -1 }, items: state.liabilities,
      itemRender: (l) => buildLiabilityCard(l) },
    { key: "insurance",    label: "Insurance",    kind: "insurance", addKind: "add-insurance",
      anchor: bottomLeft, dir: { x: -1, y: 1 }, items: state.insurance,
      itemRender: (i) => buildInsuranceCard(i) },
    { key: "cashflows",    label: "Cash Flow",    kind: "cashflow",  addKind: "add-cashflow",
      anchor: bottomRight, dir: { x: 1, y: 1 }, items: state.cashflows,
      itemRender: (c) => buildCashflowCard(c) },
  ];

  for (const cl of clusters) {
    // Header label position
    const cols = cl.items.length > 8 ? 2 : 1;
    const positions = arrangeAroundCenter(cl.items, cl.anchor, cl.dir, cols);

    // header position = closest position back toward house
    let hx = cl.anchor.x, hy = cl.anchor.y - 50;
    if (cl.dir.x < 0) hx -= 200;
    if (cl.dir.y > 0) hy = cl.anchor.y + 8;
    if (cl.dir.y < 0) hy = cl.anchor.y - 50;
    svg.appendChild(categoryHeader(cl.label, hx, hy, cl.kind, cl.addKind));

    if (cl.items.length === 0) {
      const hint = el("text", { class: "empty-hint", x: hx + 100, y: hy + (cl.dir.y > 0 ? 70 : -10) }, `Click + to add ${cl.label.toLowerCase()}`);
      svg.appendChild(hint);
      continue;
    }

    cl.items.forEach((it, idx) => {
      const pos = positions[idx];
      const card = cl.itemRender(it);
      card.setAttribute("transform", `translate(${pos.x} ${pos.y})`);
      svg.appendChild(card);

      // line from house edge to card
      const cardCenter = { x: pos.x + pos.w/2, y: pos.y + pos.h/2 };
      const houseCenter = { x: center.x, y: center.y };
      const start = edgePoint(houseX, houseY, houseW, houseH, cardCenter);
      const end = edgePoint(pos.x, pos.y, pos.w, pos.h, houseCenter);
      const path = el("path", {
        class: `link-line link-${cl.kind}`,
        d: curve(start, end),
      });
      linesLayer.appendChild(path);
    });
  }

  if (!attached) { attachInteractions(svg, rerender); attached = true; }
}

function buildAssetCard(a) {
  const k = lookup(ASSET_KINDS, a.kind);
  return nodeCard(a, "asset", 0, 0, 230, 90,
    { icon: k.icon, title: a.name, sub: k.label },
    personLabels(a.ownerIds), fmtUSD(a.value), "");
}
function buildLiabilityCard(l) {
  const k = lookup(LIABILITY_KINDS, l.kind);
  const sub = `${k.label}${l.rate?` · ${l.rate}%`:""}`;
  return nodeCard(l, "liability", 0, 0, 230, 90,
    { icon: k.icon, title: l.name, sub },
    personLabels(l.ownerIds), fmtUSD(l.balance), "");
}
function buildInsuranceCard(i) {
  const k = lookup(INSURANCE_KINDS, i.kind);
  const sub = `${k.label} · ${fmtUSD(i.premium)}/${i.frequency}`;
  return nodeCard(i, "insurance", 0, 0, 230, 90,
    { icon: k.icon, title: i.name, sub },
    personLabels(i.insuredIds), fmtUSD(i.coverage), "");
}
function buildCashflowCard(c) {
  const k = lookup(CASHFLOW_KINDS, c.kind);
  const monthly = toMonthly(c.amount, c.frequency);
  const sign = c.direction === "in" ? "+" : "−";
  const sub = `${k.label} · ${c.frequency}`;
  return nodeCard(c, "cashflow", 0, 0, 230, 90,
    { icon: k.icon, title: c.name, sub },
    personLabels(c.ownerIds), `${sign}${fmtUSD(monthly)}/mo`, "");
}

function initials(name) {
  return (name || "").split(/\s+/).filter(Boolean).map(s => s[0].toUpperCase()).slice(0,2).join("");
}

// Returns a point on the edge of a rect facing a target point.
function edgePoint(x, y, w, h, target) {
  const cx = x + w/2, cy = y + h/2;
  const dx = target.x - cx, dy = target.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const slope = dy / (dx || 1e-6);
  const halfW = w/2, halfH = h/2;
  let ex, ey;
  if (Math.abs(slope) < halfH/halfW) {
    ex = dx > 0 ? cx + halfW : cx - halfW;
    ey = cy + slope * (ex - cx);
  } else {
    ey = dy > 0 ? cy + halfH : cy - halfH;
    ex = cx + (ey - cy) / slope;
  }
  return { x: ex, y: ey };
}

function curve(a, b) {
  const mx = (a.x + b.x) / 2;
  return `M ${a.x} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`;
}
