import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { TIERS } from "@/lib/tiers";

const tierIds = TIERS.map((t) => t.id) as [string, ...string[]];

const schema = z.object({
  tier: z.enum(tierIds).optional(),
  isAdmin: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!me.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      {
        error: issue
          ? `${issue.path.join(".") || "field"}: ${issue.message}`
          : "Invalid",
      },
      { status: 400 },
    );
  }
  const d = parsed.data;

  // Safety: an admin cannot revoke their own admin from this endpoint. Use a
  // different admin account to do that.
  if (target.id === me.id && d.isAdmin === false) {
    return NextResponse.json(
      { error: "You can't revoke your own admin access." },
      { status: 400 },
    );
  }

  const data: Record<string, unknown> = {};
  if (d.tier !== undefined && d.tier !== target.tier) {
    data.tier = d.tier;
    data.tierUpdatedAt = new Date();
  }
  if (d.isAdmin !== undefined) data.isAdmin = d.isAdmin;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: true, noop: true });
  }

  await prisma.user.update({ where: { id: target.id }, data });
  return NextResponse.json({ ok: true });
}
