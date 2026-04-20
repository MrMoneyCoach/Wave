import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { apiPost } from '../lib/api.js';
import { NETWORKS } from '../lib/networks.js';

export default function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adviserName, setAdviserName] = useState('');
  const [firmName, setFirmName] = useState('');
  const [network, setNetwork] = useState('independent');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { network, adviser_name: adviserName, firm_name: firmName } },
    });

    if (authError) {
      setError(authError.message);
      setSubmitting(false);
      return;
    }

    // If email confirmation is OFF, we get a session immediately and can write the profile.
    if (data.session) {
      try {
        await apiPost('/api/profile', {
          network,
          adviser_name: adviserName,
          firm_name: firmName,
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[signup] profile write deferred', err);
      }
      navigate('/dashboard');
    } else {
      setSubmitting(false);
      setError('Check your email to confirm your account, then sign in.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8 text-navy-900">
          <span className="inline-block w-7 h-7 rounded bg-gold" />
          <span className="font-semibold tracking-tight text-lg">ComplianceDesk</span>
        </Link>

        <div className="card">
          <h1 className="text-2xl font-semibold mb-1">Create your account</h1>
          <p className="text-sm text-slate-500 mb-6">Start with 3 free letters. No card required.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Adviser name</label>
              <input className="input" required value={adviserName} onChange={(e) => setAdviserName(e.target.value)} placeholder="e.g. Alex Morgan" />
            </div>
            <div>
              <label className="label">Firm name</label>
              <input className="input" required value={firmName} onChange={(e) => setFirmName(e.target.value)} placeholder="e.g. Morgan Wealth Ltd" />
            </div>
            <div>
              <label className="label">Adviser network</label>
              <select className="input" value={network} onChange={(e) => setNetwork(e.target.value)}>
                {NETWORKS.map((n) => (
                  <option key={n.value} value={n.value}>
                    {n.label}{n.available ? '' : ' — Coming Soon'}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">Controls which letter template is used.</p>
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
              <p className="text-xs text-slate-500 mt-1">Minimum 8 characters.</p>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-sm text-slate-500 mt-6 text-center">
            Already registered? <Link to="/login" className="text-navy-800 font-semibold">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
