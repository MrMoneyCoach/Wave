import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { slugify } from "@/lib/slug";

const schema = z.object({
  title: z.string().min(1).max(200),
  intro: z.string().max(2000).optional().default(""),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid quiz data" }, { status: 400 });
  }
  const quiz = await prisma.quiz.create({
    data: {
      userId: user.id,
      title: parsed.data.title,
      intro: parsed.data.intro,
      slug: slugify(parsed.data.title),
    },
  });
  return NextResponse.json({ id: quiz.id, slug: quiz.slug });
}
