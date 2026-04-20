import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { apiPost } from '../lib/api.js';
import { NETWORKS } from '../lib/networks.js';

export default function Settings() {
  const { profile, refreshProfile } = useAuth();
  const [form, setForm] = useState({
    network: 'independent',
    adviser_name: '',
    firm_name: '',
    firm_fca_number: '',
    default_ongoing_charge: '',
    default_initial_charge: '',
  });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (profile) {
      setForm({
        network: profile.network || 'independent',
        adviser_name: profile.adviser_name || '',
        firm_name: profile.firm_name || '',
        firm_fca_number: profile.firm_fca_number || '',
        default_ongoing_charge: profile.default_ongoing_charge || '',
        default_initial_charge: profile.default_initial_charge || '',
      });
    }
  }, [profile?.id]);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiPost('/api/profile', form);
      await refreshProfile();
      setSavedAt(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openPortal = async () => {
    try {
      const { url } = await apiPost('/api/stripe/portal', {});
      window.location.href = url;
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">These details are inserted into every letter you generate.</p>
      </div>

      <form onSubmit={save} className="card space-y-4">
        <h2 className="section-heading">Adviser & firm</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Adviser name</label>
            <input className="input" value={form.adviser_name} onChange={(e) => update('adviser_name', e.target.value)} />
          </div>
          <div>
            <label className="label">Firm name</label>
            <input className="input" value={form.firm_name} onChange={(e) => update('firm_name', e.target.value)} />
          </div>
          <div>
            <label className="label">Firm FCA reference number</label>
            <input className="input" value={form.firm_fca_number} onChange={(e) => update('firm_fca_number', e.target.value)} />
          </div>
          <div>
            <label className="label">Network</label>
            <select className="input" value={form.network} onChange={(e) => update('network', e.target.value)}>
              {NETWORKS.map((n) => (
                <option key={n.value} value={n.value}>
                  {n.label}{n.available ? '' : ' — Coming Soon'}
                </option>
              ))}
            </select>
          </div>
        </div>

        <h2 className="section-heading">Default adviser charges</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Default ongoing charge</label>
            <input className="input" placeholder="0.75%" value={form.default_ongoing_charge} onChange={(e) => update('default_ongoing_charge', e.target.value)} />
          </div>
          <div>
            <label className="label">Default initial charge</label>
            <input className="input" placeholder="3%" value={form.default_initial_charge} onChange={(e) => update('default_initial_charge', e.target.value)} />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">{savedAt ? `Saved at ${savedAt.toLocaleTimeString()}` : '\u00a0'}</p>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>

      <div className="card">
        <h2 className="section-heading">Billing</h2>
        <p className="text-sm text-slate-600 mb-3">
          Plan status: <strong>{profile?.subscription_status || 'free'}</strong>
        </p>
        <button onClick={openPortal} className="btn-secondary">Open Stripe billing portal</button>
      </div>
    </div>
  );
}
