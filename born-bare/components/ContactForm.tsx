"use client";

import { useState, useTransition } from "react";
import Button from "./Button";
import { sendContactMessage } from "@/app/actions/contact";

type State =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "sent" }
  | { status: "error"; message: string };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });
  const [, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    const em = email.trim();
    const m = message.trim();

    if (n.length < 2) return setState({ status: "error", message: "Please tell us your name." });
    if (!emailPattern.test(em)) return setState({ status: "error", message: "Please enter a valid email." });
    if (m.length < 8) return setState({ status: "error", message: "Could you write a sentence or two more?" });

    setState({ status: "submitting" });

    startTransition(async () => {
      const result = await sendContactMessage({ name: n, email: em, message: m });
      if (!result.ok) return setState({ status: "error", message: result.error });
      setState({ status: "sent" });
      setName("");
      setEmail("");
      setMessage("");
    });
  }

  if (state.status === "sent") {
    return (
      <div role="status" aria-live="polite">
        <p className="font-sans text-caption uppercase tracking-[0.28em] text-stone mb-4">Sent</p>
        <p className="font-serif italic text-[clamp(1.4rem,2vw,1.8rem)] text-earth leading-snug">
          Thank you. We&rsquo;ll be in touch.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      <Field label="Your name" id="c-name">
        <input
          id="c-name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (state.status === "error") setState({ status: "idle" });
          }}
          className="w-full bg-transparent border-b border-earth/40 focus:border-earth py-3 text-body text-earth focus:outline-none transition-colors"
        />
      </Field>

      <Field label="Your email" id="c-email">
        <input
          id="c-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state.status === "error") setState({ status: "idle" });
          }}
          className="w-full bg-transparent border-b border-earth/40 focus:border-earth py-3 text-body text-earth focus:outline-none transition-colors"
        />
      </Field>

      <Field label="Your message" id="c-message">
        <textarea
          id="c-message"
          required
          rows={5}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            if (state.status === "error") setState({ status: "idle" });
          }}
          className="w-full bg-transparent border-b border-earth/40 focus:border-earth py-3 text-body text-earth focus:outline-none transition-colors resize-none"
        />
      </Field>

      {state.status === "error" && (
        <p role="alert" className="text-caption text-earth">
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={state.status === "submitting"}>
        {state.status === "submitting" ? "Sending…" : "Send"}
      </Button>
    </form>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-caption uppercase tracking-[0.24em] text-stone mb-2"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
