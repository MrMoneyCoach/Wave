// Render and table interactions.

const POS_CLASS = (p) => `pos-${p || ''}`;

export function renderTable(tbody, rows) {
  // Build rows in a doc fragment for speed.
  const frag = document.createDocumentFragment();
  rows.forEach((p, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td class="player-name">${escape(p.full_name || p.first_name + ' ' + p.last_name)}${
        p._rostered ? `<span class="rostered-tag">${escape(p._rosteredBy || 'rostered')}</span>` : ''
      }${p.injury_status ? `<span class="injured small">${escape(p.injury_status)}</span>` : ''}</td>
      <td class="${POS_CLASS(p.position)}">${escape(p.position || '')}</td>
      <td>${escape(p.team || '—')}</td>
      <td>${p.age ?? '—'}</td>
      <td>${p._games || 0}</td>
      <td>${p._targets || 0}</td>
      <td>${p._carries || 0}</td>
      <td>${p._attempts || 0}</td>
      <td>${fmt(p._pts)}</td>
      <td>${fmt(p._ppg)}</td>
      <td>${bar(p._opportunity)}${fmtInt(p._opportunity)}</td>
      <td>${bar(p._ageScore)}${fmtInt(p._ageScore)}</td>
      <td>${bar(p._prodScore)}${fmtInt(p._prodScore)}</td>
      <td class="value-cell">${fmt(p._value)}</td>
    `;
    frag.appendChild(tr);
  });
  tbody.replaceChildren(frag);
}

function fmt(n) { if (n == null || !isFinite(n)) return '—'; return n.toFixed(1); }
function fmtInt(n) { if (n == null || !isFinite(n)) return '—'; return Math.round(n); }
function bar(v) {
  const pct = Math.max(0, Math.min(100, v || 0));
  return `<span class="bar" style="width:${pct * 0.6}px"></span>`;
}
function escape(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function setupSortableHeaders(table, getRows, render) {
  let sortKey = 'value';
  let sortDir = -1;  // desc by default
  const ths = table.querySelectorAll('th[data-sort]');
  function update() {
    ths.forEach(th => th.classList.toggle('sorted', th.dataset.sort === sortKey));
    const rows = [...getRows()];
    rows.sort((a, b) => {
      const av = pickSort(a, sortKey);
      const bv = pickSort(b, sortKey);
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir * av.localeCompare(bv);
      }
      return sortDir * ((av || 0) - (bv || 0));
    });
    render(rows);
  }
  ths.forEach(th => {
    th.addEventListener('click', () => {
      const k = th.dataset.sort;
      if (k === sortKey) sortDir = -sortDir;
      else { sortKey = k; sortDir = -1; }
      update();
    });
  });
  return { resort: update, getSort: () => ({ sortKey, sortDir }) };
}

function pickSort(p, key) {
  switch (key) {
    case 'name': return p.full_name || '';
    case 'pos': return p.position || '';
    case 'team': return p.team || '';
    case 'age': return p.age || 0;
    case 'games': return p._games || 0;
    case 'targets': return p._targets || 0;
    case 'carries': return p._carries || 0;
    case 'attempts': return p._attempts || 0;
    case 'pts': return p._pts || 0;
    case 'ppg': return p._ppg || 0;
    case 'opportunity': return p._opportunity || 0;
    case 'ageScore': return p._ageScore || 0;
    case 'prodScore': return p._prodScore || 0;
    case 'value': return p._value || 0;
  }
  return 0;
}
