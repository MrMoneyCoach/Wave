import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const RESERVED_SLUGS = new Set(["result", "results"]);

const slugify = (raw: string) => {
  const base =
    raw
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "variant";
  return RESERVED_SLUGS.has(base) ? `${base}-page` : base;
};

const createSchema = z.object({
  name: z.string().min(1).max(80),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quiz = await prisma.quiz.findUnique({ where: { id: params.id } });
  if (!quiz || quiz.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid landing page data" }, { status: 400 });
  }

  // Pick a slug that doesn't collide for this quiz.
  const baseSlug = slugify(parsed.data.name);
  let slug = baseSlug;
  let n = 1;
  while (
    await prisma.landingPage.findUnique({
      where: { quizId_slug: { quizId: quiz.id, slug } },
    })
  ) {
    n += 1;
    slug = `${baseSlug}-${n}`;
  }

  const lp = await prisma.landingPage.create({
    data: {
      quizId: quiz.id,
      name: parsed.data.name,
      slug,
      isPrimary: false,
    },
  });

  return NextResponse.json({ id: lp.id, slug: lp.slug });
}
