import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const schema = z.object({
  adminNotifyEmail: z.string().email().optional().or(z.literal("")),
  adminNotifyEnabled: z.boolean().optional(),
  emailSubject: z.string().max(200).optional().or(z.literal("")),
  emailGreeting: z.string().max(200).optional().or(z.literal("")),
  emailIntro: z.string().max(4000).optional().or(z.literal("")),
  emailBullets: z.string().max(4000).optional().or(z.literal("")),
  emailBookingLine: z.string().max(1000).optional().or(z.literal("")),
  emailSignoff: z.string().max(500).optional().or(z.literal("")),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quiz = await prisma.quiz.findUnique({ where: { id: params.id } });
  if (!quiz || quiz.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue ? `${issue.path.join(".") || "field"}: ${issue.message}` : "Invalid" },
      { status: 400 },
    );
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.adminNotifyEmail !== undefined)
    data.adminNotifyEmail = parsed.data.adminNotifyEmail || null;
  if (parsed.data.adminNotifyEnabled !== undefined)
    data.adminNotifyEnabled = parsed.data.adminNotifyEnabled;
  if (parsed.data.emailSubject !== undefined)
    data.emailSubject = parsed.data.emailSubject || null;
  if (parsed.data.emailGreeting !== undefined)
    data.emailGreeting = parsed.data.emailGreeting || null;
  if (parsed.data.emailIntro !== undefined)
    data.emailIntro = parsed.data.emailIntro || null;
  if (parsed.data.emailBullets !== undefined)
    data.emailBullets = parsed.data.emailBullets || null;
  if (parsed.data.emailBookingLine !== undefined)
    data.emailBookingLine = parsed.data.emailBookingLine || null;
  if (parsed.data.emailSignoff !== undefined)
    data.emailSignoff = parsed.data.emailSignoff || null;

  await prisma.quiz.update({ where: { id: quiz.id }, data });
  return NextResponse.json({ ok: true });
}
