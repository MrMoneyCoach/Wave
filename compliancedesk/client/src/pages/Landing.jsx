import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen bg-navy-900 text-white">
      <header className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block w-7 h-7 rounded bg-gold" />
          <span className="font-semibold tracking-tight text-lg">ComplianceDesk</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/login" className="btn-ghost text-slate-200 hover:text-white">Sign in</Link>
          <Link to="/signup" className="btn-gold">Start free</Link>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-gold uppercase tracking-widest text-xs font-semibold mb-4">For UK Financial Advisers</p>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-5">
            AI-drafted suitability letters that meet Consumer Duty.
          </h1>
          <p className="text-slate-300 text-lg mb-8">
            Generate fully personalised, network-compliant letters in under 60 seconds. Tailored
            for SJP Partners and FCA-direct advisers.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/signup" className="btn-gold">Generate your first letter free</Link>
            <Link to="/login" className="btn-secondary bg-transparent text-white border-white/30 hover:bg-white/10">
              Sign in
            </Link>
          </div>
          <p className="text-slate-400 text-xs mt-4">3 letters free, then £99/month for unlimited.</p>
        </div>

        <div className="bg-white text-navy-900 rounded-xl shadow-document p-6 font-serif">
          <p className="text-xs uppercase tracking-widest text-slate-400 font-sans mb-3">Sample output</p>
          <h3 className="text-lg font-semibold mb-2">Suitability Letter — Mrs J Hall</h3>
          <p className="text-sm leading-relaxed text-slate-700">
            Following our recent meetings, I am writing to confirm the advice I have provided regarding
            your retirement objectives. Having considered your circumstances, attitude to risk and capacity
            for loss, I recommend consolidating your existing personal pensions into the SJP Retirement Account…
          </p>
          <p className="text-xs text-slate-400 font-sans mt-4">Generated in 38 seconds · Consumer Duty aligned</p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-6">
        {[
          ['Network-aware', 'Templates tuned for SJP, Quilter, Openwork, Sesame and FCA-direct firms.'],
          ['COBS 9 + Consumer Duty', 'Every letter explicitly evidences good customer outcomes.'],
          ['Editable & exportable', 'Copy, regenerate, or download as .docx for your file.'],
        ].map(([title, body]) => (
          <div key={title} className="bg-navy-800 border border-navy-700 rounded-xl p-6">
            <h3 className="font-semibold text-gold mb-2">{title}</h3>
            <p className="text-sm text-slate-300">{body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
