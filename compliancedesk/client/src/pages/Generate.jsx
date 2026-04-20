import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FormSection, { Field } from '../components/FormSection.jsx';
import LetterPanel from '../components/LetterPanel.jsx';
import { streamGenerate, apiPost } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const RISK_OPTIONS = [
  'Investment risk',
  'Inflation risk',
  'Longevity risk',
  'Liquidity risk',
  'Transfer risk',
  'Tax risk',
  'Regulatory/product risk',
];

const RISK_LABELS = {
  1: 'Very Cautious',
  2: 'Cautious',
  3: 'Cautious-Balanced',
  4: 'Balanced-Cautious',
  5: 'Balanced',
  6: 'Balanced-Adventurous',
  7: 'Moderately Adventurous',
  8: 'Adventurous',
  9: 'Highly Adventurous',
  10: 'Very Adventurous',
};

const initialForm = {
  clientName: '',
  clientAge: '',
  employmentStatus: 'employed',
  maritalStatus: 'married',
  dependants: 0,
  annualIncome: '',
  totalAssets: '',
  totalLiabilities: '',
  monthlySurplus: '',
  emergencyFund: 'yes',
  primaryObjective: '',
  secondaryObjectives: '',
  timeHorizon: 10,
  attitudeToRisk: 5,
  capacityForLoss: 'Medium',
  productType: 'Pension',
  productName: '',
  recommendedFunds: '',
  totalAmount: '',
  ongoingCharge: '',
  initialCharge: '',
  isTransfer: 'no',
  cedingProvider: '',
  vulnerabilityIdentified: 'no',
  vulnerabilityDescription: '',
  risksDiscussed: ['Investment risk', 'Inflation risk'],
};

export default function Generate() {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const [form, setForm] = useState(() => {
    const stored = sessionStorage.getItem('cd:form');
    return stored ? { ...initialForm, ...JSON.parse(stored) } : initialForm;
  });
  const [letterText, setLetterText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [savedId, setSavedId] = useState(null);
  const [showForm, setShowForm] = useState(true);

  useEffect(() => {
    if (profile && form.ongoingCharge === '' && profile.default_ongoing_charge) {
      setForm((f) => ({ ...f, ongoingCharge: profile.default_ongoing_charge }));
    }
    if (profile && form.initialCharge === '' && profile.default_initial_charge) {
      setForm((f) => ({ ...f, initialCharge: profile.default_initial_charge }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const toggleRisk = (risk) =>
    setForm((f) => ({
      ...f,
      risksDiscussed: f.risksDiscussed.includes(risk)
        ? f.risksDiscussed.filter((r) => r !== risk)
        : [...f.risksDiscussed, risk],
    }));

  const handleUpgrade = async () => {
    try {
      const { url } = await apiPost('/api/stripe/checkout', {});
      window.location.href = url;
    } catch (err) {
      setError(err.message);
    }
  };

  const submit = async (e) => {
    e?.preventDefault();
    setError(null);
    setLetterText('');
    setSavedId(null);
    setIsStreaming(true);
    setShowForm(false);
    sessionStorage.setItem('cd:form', JSON.stringify(form));

    try {
      await streamGenerate(form, {
        delta: (d) => setLetterText((t) => t + d.text),
        saved: (d) => setSavedId(d.id),
        warning: (d) => setError(d.message),
        error: (d) => setError(d.message),
      });
      await refreshProfile();
    } catch (err) {
      if (err.payload?.code === 'UPGRADE_REQUIRED') {
        setError('You\'ve used all 3 free letters. Upgrade to keep generating.');
      } else {
        setError(err.message || 'Generation failed');
      }
      setShowForm(true);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-navy-900">Generate suitability letter</h1>
          <p className="text-sm text-slate-500 mt-1">
            All inputs stay private to your account. Drafts must always be reviewed before sending.
          </p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-secondary">Edit inputs</button>
        )}
      </div>

      {error && (
        <div className="card border-red-200 bg-red-50 flex items-start justify-between gap-4">
          <p className="text-sm text-red-700">{error}</p>
          {error.toLowerCase().includes('upgrade') && (
            <button onClick={handleUpgrade} className="btn-gold">Upgrade — £99/mo</button>
          )}
        </div>
      )}

      {showForm && (
        <form onSubmit={submit} className="space-y-6">
          <FormSection title="Client Details">
            <Field label="Client full name">
              <input className="input" required value={form.clientName} onChange={(e) => update('clientName', e.target.value)} />
            </Field>
            <Field label="Client age">
              <input className="input" type="number" min="16" max="120" required value={form.clientAge} onChange={(e) => update('clientAge', e.target.value)} />
            </Field>
            <Field label="Employment status">
              <select className="input" value={form.employmentStatus} onChange={(e) => update('employmentStatus', e.target.value)}>
                <option value="employed">Employed</option>
                <option value="self-employed">Self-employed</option>
                <option value="retired">Retired</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Marital status">
              <select className="input" value={form.maritalStatus} onChange={(e) => update('maritalStatus', e.target.value)}>
                <option value="single">Single</option>
                <option value="married">Married / Civil Partnership</option>
                <option value="cohabiting">Cohabiting</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
              </select>
            </Field>
            <Field label="Number of financial dependants">
              <input className="input" type="number" min="0" value={form.dependants} onChange={(e) => update('dependants', e.target.value)} />
            </Field>
          </FormSection>

          <FormSection title="Financial Position">
            <Field label="Annual income (£)">
              <input className="input" type="number" min="0" value={form.annualIncome} onChange={(e) => update('annualIncome', e.target.value)} />
            </Field>
            <Field label="Total assets (£)">
              <input className="input" type="number" min="0" value={form.totalAssets} onChange={(e) => update('totalAssets', e.target.value)} />
            </Field>
            <Field label="Total liabilities (£)">
              <input className="input" type="number" min="0" value={form.totalLiabilities} onChange={(e) => update('totalLiabilities', e.target.value)} />
            </Field>
            <Field label="Monthly surplus income (£)">
              <input className="input" type="number" value={form.monthlySurplus} onChange={(e) => update('monthlySurplus', e.target.value)} />
            </Field>
            <Field label="Emergency fund in place?">
              <select className="input" value={form.emergencyFund} onChange={(e) => update('emergencyFund', e.target.value)}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </Field>
          </FormSection>

          <FormSection title="Objectives">
            <Field full label="Primary objective" hint='e.g. "retire at 60 with £3,000/month income"'>
              <textarea className="input min-h-[80px]" required value={form.primaryObjective} onChange={(e) => update('primaryObjective', e.target.value)} />
            </Field>
            <Field full label="Secondary objectives (optional)">
              <textarea className="input min-h-[60px]" value={form.secondaryObjectives} onChange={(e) => update('secondaryObjectives', e.target.value)} />
            </Field>
            <Field label="Investment time horizon (years)">
              <input className="input" type="number" min="1" max="60" value={form.timeHorizon} onChange={(e) => update('timeHorizon', e.target.value)} />
            </Field>
            <Field label={`Attitude to risk: ${form.attitudeToRisk} — ${RISK_LABELS[form.attitudeToRisk]}`}>
              <input type="range" min="1" max="10" value={form.attitudeToRisk} onChange={(e) => update('attitudeToRisk', Number(e.target.value))} className="w-full accent-navy-800" />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>1 — Very Cautious</span>
                <span>5 — Balanced</span>
                <span>10 — Adventurous</span>
              </div>
            </Field>
            <Field
              label="Capacity for loss"
              hint="Capacity for loss is the client's ability to absorb falls in capital without materially affecting their lifestyle or objectives."
            >
              <select className="input" value={form.capacityForLoss} onChange={(e) => update('capacityForLoss', e.target.value)}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </Field>
          </FormSection>

          <FormSection title="Recommendation">
            <Field label="Product type">
              <select className="input" value={form.productType} onChange={(e) => update('productType', e.target.value)}>
                {['Pension', 'ISA', 'Investment Bond', 'Protection', 'Mortgage', 'Other'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Specific product name" hint='e.g. "SJP Retirement Account"'>
              <input className="input" value={form.productName} onChange={(e) => update('productName', e.target.value)} />
            </Field>
            <Field full label="Recommended fund(s)">
              <textarea className="input min-h-[60px]" value={form.recommendedFunds} onChange={(e) => update('recommendedFunds', e.target.value)} />
            </Field>
            <Field label="Total amount to be invested/advised (£)">
              <input className="input" type="number" min="0" value={form.totalAmount} onChange={(e) => update('totalAmount', e.target.value)} />
            </Field>
            <Field label="Ongoing adviser charge" hint="e.g. 0.75% or £1,200/year">
              <input className="input" value={form.ongoingCharge} onChange={(e) => update('ongoingCharge', e.target.value)} />
            </Field>
            <Field label="Initial adviser charge" hint="e.g. 3% or £2,500">
              <input className="input" value={form.initialCharge} onChange={(e) => update('initialCharge', e.target.value)} />
            </Field>
            <Field label="Transfer from an existing plan?">
              <select className="input" value={form.isTransfer} onChange={(e) => update('isTransfer', e.target.value)}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </Field>
            {form.isTransfer === 'yes' && (
              <Field label="Ceding provider name">
                <input className="input" value={form.cedingProvider} onChange={(e) => update('cedingProvider', e.target.value)} />
              </Field>
            )}
          </FormSection>

          <FormSection title="Vulnerability Assessment">
            <Field label="Any vulnerability factors identified?">
              <select className="input" value={form.vulnerabilityIdentified} onChange={(e) => update('vulnerabilityIdentified', e.target.value)}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </Field>
            {form.vulnerabilityIdentified === 'yes' && (
              <Field full label="Describe the vulnerability factor(s)">
                <textarea className="input min-h-[80px]" value={form.vulnerabilityDescription} onChange={(e) => update('vulnerabilityDescription', e.target.value)} />
              </Field>
            )}
          </FormSection>

          <FormSection title="Key Risks Discussed" description="Tick every risk you covered with the client.">
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {RISK_OPTIONS.map((risk) => {
                const checked = form.risksDiscussed.includes(risk);
                return (
                  <label key={risk} className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition ${checked ? 'border-navy-800 bg-navy-800/5' : 'border-slate-200 hover:border-slate-300'}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleRisk(risk)} className="accent-navy-800" />
                    <span className="text-sm">{risk}</span>
                  </label>
                );
              })}
            </div>
          </FormSection>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={() => navigate('/dashboard')} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={isStreaming} className="btn-gold">
              {isStreaming ? 'Generating…' : 'Generate letter'}
            </button>
          </div>
        </form>
      )}

      {(letterText || isStreaming) && !showForm && (
        <LetterPanel
          text={letterText}
          isStreaming={isStreaming}
          clientName={form.clientName}
          onRegenerate={() => submit()}
          onEdit={() => setShowForm(true)}
        />
      )}

      {savedId && !isStreaming && (
        <p className="text-xs text-slate-500">Saved to your letter history.</p>
      )}
    </div>
  );
}
