import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiGet } from '../lib/api.js';
import LetterPanel from '../components/LetterPanel.jsx';

export default function LetterView() {
  const { id } = useParams();
  const [letter, setLetter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet(`/api/letters/${id}`)
      .then((d) => setLetter(d.letter))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!letter) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link to="/history" className="text-sm text-navy-800 font-semibold">← All letters</Link>
          <h1 className="text-2xl font-semibold text-navy-900 mt-1">{letter.client_name}</h1>
          <p className="text-sm text-slate-500">{letter.product_type || '—'} · {new Date(letter.created_at).toLocaleString()}</p>
        </div>
      </div>

      <LetterPanel
        text={letter.letter_text}
        clientName={letter.client_name}
        isStreaming={false}
        onRegenerate={() => {}}
        onEdit={() => {}}
      />
    </div>
  );
}
