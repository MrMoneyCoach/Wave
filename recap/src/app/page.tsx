import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <div className="text-xs uppercase tracking-widest text-ink/60">Recap</div>
      <h1 className="mt-3 text-4xl font-semibold leading-tight md:text-5xl">
        Meeting transcripts with speaker labels — and the summary your team will actually read.
      </h1>
      <p className="mt-5 text-lg text-ink/70">
        Upload a recording, join a call, or record from your desktop. Recap transcribes,
        separates speakers, and turns the conversation into the exact write-up your team
        needs — sales follow-up, standup notes, customer discovery, board minutes.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/preview"
          className="rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:opacity-90"
        >
          See an interactive preview
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-ink/15 px-5 py-3 text-sm font-medium hover:bg-ink/5"
        >
          Sign in / sign up
        </Link>
      </div>
      <p className="mt-2 text-xs text-ink/50">
        The preview is a no-login tour with demo data — click through the whole UI before you set
        anything up.
      </p>

      <section className="mt-16 grid gap-8 md:grid-cols-3">
        <Feature
          title="Upload anything"
          body="mp3, mp4, m4a, wav. Drop it in and you'll have a searchable transcript and template summary in minutes."
        />
        <Feature
          title="Speaker labels"
          body="Speakers are separated automatically using Deepgram diarization — rename them once and we'll remember."
        />
        <Feature
          title="Templates"
          body="Eight built-in templates for sales, 1:1s, standups, interviews, board meetings and more. Custom templates on the Pro plan."
        />
      </section>

      <section className="mt-16 border-t border-ink/10 pt-10">
        <h2 className="text-xl font-semibold">Capture options</h2>
        <ul className="mt-4 space-y-2 text-ink/70">
          <li>Upload a recording (mp3, m4a, mp4, wav)</li>
          <li>Record system audio + mic directly from your browser</li>
          <li>Send a bot to join your Zoom, Google Meet or Microsoft Teams call</li>
          <li>Download the desktop recorder (macOS / Windows) for higher-quality local capture</li>
          <li>Use the iOS / Android app for in-person meetings on the go</li>
        </ul>
      </section>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-ink/70">{body}</p>
    </div>
  );
}
