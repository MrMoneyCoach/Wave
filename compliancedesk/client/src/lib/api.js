import { supabase } from './supabase.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet(path) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `GET ${path} failed`);
  return res.json();
}

export async function apiPost(path, body) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    const err = new Error(payload.error || `POST ${path} failed`);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }
  return res.json();
}

export async function apiDelete(path) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE', headers });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `DELETE ${path} failed`);
  return res.json();
}

export async function streamGenerate(formData, handlers) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(formData),
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    const err = new Error(payload.error || 'Generation failed');
    err.status = res.status;
    err.payload = payload;
    throw err;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const block of events) {
      const lines = block.split('\n');
      let eventName = 'message';
      let dataLine = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) eventName = line.slice(7).trim();
        else if (line.startsWith('data: ')) dataLine += line.slice(6);
      }
      if (!dataLine) continue;
      let parsed;
      try { parsed = JSON.parse(dataLine); } catch { continue; }
      handlers[eventName]?.(parsed);
    }
  }
}
