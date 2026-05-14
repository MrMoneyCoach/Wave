"use client";

import { useState } from "react";
import type { Comment } from "@/lib/types";
import { formatDate } from "@/lib/format";

type Props = {
  meetingId: string;
  currentUserId: string;
  initial: Comment[];
};

export default function Comments({ meetingId, currentUserId, initial }: Props) {
  const [comments, setComments] = useState<Comment[]>(initial);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to post comment");
      setComments((c) => [...c, json as Comment]);
      setBody("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setError(null);
    const prev = comments;
    setComments((c) => c.filter((x) => x.id !== id));
    const res = await fetch(`/api/meetings/${meetingId}/comments/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setComments(prev);
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Failed to delete comment");
    }
  }

  return (
    <section className="mt-10 border-t border-ink/10 pt-6">
      <h2 className="text-sm font-semibold">
        Comments {comments.length > 0 && <span className="text-ink/40">({comments.length})</span>}
      </h2>

      <div className="mt-3 space-y-3">
        {comments.length === 0 && (
          <p className="text-sm text-ink/60">No comments yet. Start the thread below.</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="rounded-md border border-ink/10 bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium">{c.author_email}</span>
              <span className="text-xs text-ink/40">{formatDate(c.created_at)}</span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{c.body}</p>
            {c.author_id === currentUserId && (
              <button
                onClick={() => remove(c.id)}
                className="mt-1 text-xs text-red-700 hover:underline"
              >
                Delete
              </button>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="mt-4 space-y-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment…"
          rows={3}
          maxLength={4000}
          className="block w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-ink"
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={busy || !body.trim()}
            className="rounded-md bg-ink px-4 py-1.5 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Posting…" : "Comment"}
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </form>
    </section>
  );
}
