export default function FormSection({ title, description, children }) {
  return (
    <section className="card">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-navy-900">{title}</h2>
        {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {children}
      </div>
    </section>
  );
}

export function Field({ label, hint, full, children }) {
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}
