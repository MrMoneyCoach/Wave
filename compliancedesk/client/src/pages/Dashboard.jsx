import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { apiGet, apiPost } from '../lib/api.js';
import { networkLabel } from '../lib/networks.js';

const FREE_LIMIT = 3;

export default function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ lifetime: 0, thisMonth: 0 });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upgradeError, setUpgradeError] = useState(null);

  useEffect(() => {
    Promise.all([apiGet('/api/letters/stats'), apiGet('/api/letters?limit=5')])
      .then(([s, l]) => {
        setStats(s);
        setRecent(l.letters);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isPaid = profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing';
  const lettersLeft = isPaid ? null : Math.max(0, FREE_LIMIT - stats.lifetime);

  const handleUpgrade = async () => {
    try {
      const { url } = await apiPost('/api/stripe/checkout', {});
      window.location.href = url;
    } catch (err) {
      setUpgradeError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy-900">Welcome back{profile?.adviser_name ? `, ${profile.adviser_name.split(' ')[0]}` : ''}.</h1>
          <p className="text-sm text-slate-500 mt-1">{networkLabel(profile?.network)} · {profile?.firm_name || 'No firm name set'}</p>
        </div>
        <Link to="/generate" className="btn-gold">+ Generate new letter</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-xs uppercase tracking-widest text-slate-500">This month</p>
          <p className="text-3xl font-semibold text-navy-900 mt-1">{stats.thisMonth}</p>
          <p className="text-sm text-slate-500 mt-1">letters generated</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-widest text-slate-500">Plan</p>
          <p className="text-2xl font-semibold text-navy-900 mt-1">
            {isPaid ? 'Unlimited' : 'Free trial'}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {isPaid
              ? `Renews ${profile.subscription_current_period_end ? new Date(profile.subscription_current_period_end).toLocaleDateString() : 'monthly'}`
              : `${lettersLeft} of ${FREE_LIMIT} letters remaining`}
          </p>
        </div>
        <div className="card flex flex-col justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500">Total drafted</p>
            <p className="text-3xl font-semibold text-navy-900 mt-1">{stats.lifetime}</p>
          </div>
          {!isPaid && (
            <button onClick={handleUpgrade} className="btn-gold mt-3">Upgrade — £99/mo</button>
          )}
        </div>
      </div>

      {upgradeError && <p className="text-sm text-red-600">{upgradeError}</p>}

      <section className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Recent letters</h2>
          <Link to="/history" className="text-sm text-navy-800 font-semibold">View all →</Link>
        </div>
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : recent.length === 0 ? (
          <p className="text-sm text-slate-500">No letters yet — your first draft is one click away.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map((l) => (
              <li key={l.id} className="py-3 flex items-center justify-between">
                <div>
                  <Link to={`/history/${l.id}`} className="font-medium text-navy-800 hover:underline">{l.client_name}</Link>
                  <p className="text-xs text-slate-500">{l.product_type || '—'} · {new Date(l.created_at).toLocaleString()}</p>
                </div>
                <Link to={`/history/${l.id}`} className="text-sm text-navy-800">Open</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
