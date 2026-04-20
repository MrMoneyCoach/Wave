import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiDelete } from '../lib/api.js';

export default function History() {
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    apiGet('/api/letters')
      .then((d) => setLetters(d.letters))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this letter? This cannot be undone.')) return;
    await apiDelete(`/api/letters/${id}`);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy-900">Letter history</h1>
          <p className="text-sm text-slate-500 mt-1">All letters you've generated. Click any to view or download again.</p>
        </div>
        <Link to="/generate" className="btn-gold">+ New letter</Link>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-slate-500">Loading…</p>
        ) : letters.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">No letters yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-widest text-slate-500">
              <tr>
                <th className="text-left px-4 py-3">Client</th>
                <th className="text-left px-4 py-3">Product</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {letters.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3">
                    <Link to={`/history/${l.id}`} className="font-medium text-navy-800 hover:underline">{l.client_name}</Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{l.product_type || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{new Date(l.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(l.id)} className="text-sm text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
