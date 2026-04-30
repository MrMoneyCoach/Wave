import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import LandingDesigner, {
  type Block,
  type ThemeState,
  type SettingsState,
} from "@/components/LandingDesigner";

export const dynamic = "force-dynamic";

function parseBlocks(raw: string | null): Block[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((b: unknown): b is Block => {
      if (!b || typeof b !== "object" || !("type" in b) || !("id" in b)) return false;
      const t = (b as { type: string }).type;
      return ["heading", "paragraph", "image", "list", "button", "divider"].includes(t);
    });
  } catch {
    return [];
  }
}

function coerceFont(v: string | null): ThemeState["fontFamily"] {
  return v === "sans" || v === "serif" || v === "mono" ? v : "";
}

export default async function PrimaryDesignerPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireUser();
  const quiz = await prisma.quiz.findUnique({ where: { id: params.id } });
  if (!quiz || quiz.userId !== user.id) return notFound();

  const initialBlocks = parseBlocks(quiz.landingBlocks);
  const initialTheme: ThemeState = {
    brandColor: quiz.brandColor ?? "",
    secondaryColor: quiz.secondaryColor ?? "",
    logoUrl: quiz.logoUrl ?? "",
    secondaryLogoUrl: quiz.secondaryLogoUrl ?? "",
    squareIconUrl: quiz.squareIconUrl ?? "",
    fontFamily: coerceFont(quiz.fontFamily),
  };
  const initialSettings: SettingsState = {
    metaTitle: quiz.metaTitle ?? "",
    metaDescription: quiz.metaDescription ?? "",
    customCss: quiz.customCss ?? "",
  };

  return (
    <LandingDesigner
      quizId={quiz.id}
      quizTitle={quiz.title}
      quizSlug={quiz.slug}
      published={quiz.published}
      initialBlocks={initialBlocks}
      initialTheme={initialTheme}
      initialSettings={initialSettings}
    />
  );
}
