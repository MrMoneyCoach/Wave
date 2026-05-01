// Tab dispatch: route the active tab to its render function and keep the URL hash in sync.

import { $, $$, clear } from './helpers.js';
import { state } from './state.js';

import { renderOverview }  from './tabs/overview.js';
import { renderStandings } from './tabs/standings.js';
import { renderPower }     from './tabs/power.js';
import { renderLuck }      from './tabs/luck.js';
import { renderSchedule }  from './tabs/schedule.js';
import { renderMatchups }  from './tabs/matchups.js';
import { renderPlayers }   from './tabs/players.js';
import { renderAwards }    from './tabs/awards.js';
import { renderTrades }    from './tabs/trades.js';
import { renderPartners }  from './tabs/partners.js';
import { renderRosters }   from './tabs/rosters.js';
import { renderDrafts }    from './tabs/drafts.js';
import { renderH2H }       from './tabs/h2h.js';
import { renderHistory }   from './tabs/history.js';

const TABS = {
  overview:  renderOverview,
  standings: renderStandings,
  power:     renderPower,
  luck:      renderLuck,
  schedule:  renderSchedule,
  matchups:  renderMatchups,
  players:   renderPlayers,
  awards:    renderAwards,
  trades:    renderTrades,
  partners:  renderPartners,
  rosters:   renderRosters,
  drafts:    renderDrafts,
  h2h:       renderH2H,
  history:   renderHistory,
};

export function setActiveTab(tab) {
  if (!(tab in TABS)) tab = 'overview';
  state.activeTab = tab;
  $$('.sb-link[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  if (location.hash !== `#${tab}`) location.hash = tab;
  const host = $('#tabHost');
  clear(host);
  // Each render function takes the host element and an optional reload flag.
  Promise.resolve(TABS[tab](host)).catch(err => {
    console.error('Tab render error:', err);
    host.appendChild(Object.assign(document.createElement('div'), {
      className: 'panel empty-panel',
      textContent: `Couldn't render this tab: ${err.message}`,
    }));
  });

  // Close mobile sidebar after navigation
  document.getElementById('sidebar')?.classList.remove('open');
}

export function initRouter() {
  $$('.sb-link[data-tab]').forEach(b => {
    b.addEventListener('click', () => setActiveTab(b.dataset.tab));
  });
  window.addEventListener('hashchange', () => {
    const tab = location.hash.replace(/^#/, '') || 'overview';
    if (tab !== state.activeTab) setActiveTab(tab);
  });
}
