"use server";

import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/admin";

const contactSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(254),
  message: z.string().min(8).max(4000),
});

export type ContactResult = { ok: true } | { ok: false; error: string };

export async function sendContactMessage(input: unknown): Promise<ContactResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the form and try again." };
  }

  let supabase;
  try {
    supabase = getAdminClient();
  } catch (err) {
    console.error("Supabase admin client unavailable", err);
    return {
      ok: false,
      error: "We can't send that right now. Please try again shortly, or email hello@bornbare.co.uk.",
    };
  }

  const { error } = await supabase.from("contact_submissions").insert({
    name: parsed.data.name.trim(),
    email: parsed.data.email.trim().toLowerCase(),
    message: parsed.data.message.trim(),
  });

  if (error) {
    console.error("contact_submissions insert failed", error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }

  return { ok: true };
}
