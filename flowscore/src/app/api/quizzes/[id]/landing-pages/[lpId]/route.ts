import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const putSchema = z.object({
  name: z.string().min(1).max(80),
  headline: z.string().max(200).optional().default(""),
  subheadline: z.string().max(2000).optional().default(""),
  ctaLabel: z.string().max(80).optional().default(""),
  brandColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/i, "Use a 6-digit hex like #345ff2")
    .optional()
    .or(z.literal("")),
  logoUrl: z.string().url().optional().or(z.literal("")),
  heroImageUrl: z.string().url().optional().or(z.literal("")),
  videoUrl: z.string().url().optional().or(z.literal("")),
  highlights: z.array(z.string().max(140)).max(8).optional().default([]),
});

async function authOwned(quizId: string, lpId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" as const, status: 401 };
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz || quiz.userId !== user.id)
    return { error: "Not found" as const, status: 404 };
  const lp = await prisma.landingPage.findUnique({ where: { id: lpId } });
  if (!lp || lp.quizId !== quiz.id)
    return { error: "Landing page not found" as const, status: 404 };
  return { quiz, lp };
}

export async function DELETE(
  _: Request,
  { params }: { params: { id: string; lpId: string } },
) {
  const r = await authOwned(params.id, params.lpId);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });
  if (r.lp.isPrimary) {
    return NextResponse.json(
      { error: "The primary landing page can't be deleted." },
      { status: 400 },
    );
  }
  await prisma.landingPage.delete({ where: { id: r.lp.id } });
  return NextResponse.json({ ok: true });
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string; lpId: string } },
) {
  const r = await authOwned(params.id, params.lpId);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });

  const body = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue ? `${issue.path.join(".") || "field"}: ${issue.message}` : "Invalid" },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const cleanHighlights = (data.highlights ?? [])
    .map((s) => s.trim())
    .filter(Boolean);

  await prisma.landingPage.update({
    where: { id: r.lp.id },
    data: {
      name: data.name,
      headline: data.headline || null,
      subheadline: data.subheadline || null,
      ctaLabel: data.ctaLabel || null,
      brandColor: data.brandColor || null,
      logoUrl: data.logoUrl || null,
      heroImageUrl: data.heroImageUrl || null,
      videoUrl: data.videoUrl || null,
      highlights: cleanHighlights.length > 0 ? JSON.stringify(cleanHighlights) : null,
    },
  });

  return NextResponse.json({ ok: true });
}
