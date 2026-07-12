import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import QuizPlayer from "@/components/QuizPlayer";
import TrackingScripts from "@/components/TrackingScripts";
import type { Block } from "@/components/LandingDesigner";

export const dynamic = "force-dynamic";

function parseHighlights(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed))
      return parsed.filter((s): s is string => typeof s === "string");
  } catch {
    /* ignore */
  }
  return [];
}

function parseBlocks(raw: string | null): Block[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid = [
      "heading",
      "paragraph",
      "image",
      "list",
      "button",
      "divider",
      "hero-split",
      "feature-grid",
      "image-text",
      "custom-html",
    ];
    return parsed.filter(
      (b: unknown): b is Block =>
        !!b &&
        typeof b === "object" &&
        "type" in b &&
        "id" in b &&
        valid.includes((b as { type: string }).type),
    );
  } catch {
    return [];
  }
}

const FONT_STACKS: Record<string, string> = {
  sans: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Inter, sans-serif",
  serif: "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
};

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const quiz = await prisma.quiz.findUnique({
    where: { slug: params.slug },
    select: {
      title: true,
      intro: true,
      published: true,
      metaTitle: true,
      metaDescription: true,
    },
  });
  if (!quiz || !quiz.published) return {};
  return {
    title: quiz.metaTitle || quiz.title,
    description: quiz.metaDescription || quiz.intro || undefined,
  };
}

export default async function QuizPublicPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { resume?: string };
}) {
  const quiz = await prisma.quiz.findUnique({
    where: { slug: params.slug },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { options: { orderBy: { order: "asc" } } },
      },
    },
  });

  if (!quiz || !quiz.published) return notFound();

  // Resume flow: if the visitor came in via an abandon-email link, look up
  // the original submission and pre-fill the lead form. We update that
  // submission on lead-form submit instead of creating a duplicate.
  const resumeId = searchParams?.resume?.trim();
  let resume:
    | {
        submissionId: string;
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        company: string;
        jobTitle: string;
      }
    | null = null;
  if (resumeId) {
    const sub = await prisma.submission.findUnique({ where: { id: resumeId } });
    if (sub && sub.quizId === quiz.id && !sub.completedAt) {
      resume = {
        submissionId: sub.id,
        firstName: sub.firstName ?? "",
        lastName: sub.lastName ?? "",
        email: sub.email ?? "",
        phone: sub.phone ?? "",
        company: sub.company ?? "",
        jobTitle: sub.jobTitle ?? "",
      };
    }
  }

  const safe = {
    id: quiz.id,
    slug: quiz.slug,
    title: quiz.title,
    intro: quiz.intro,
    ctaLabel: quiz.ctaLabel,
    collectEmail: quiz.collectEmail,
    theme: (quiz.theme === "card" ? "card" : "minimal") as "minimal" | "card",
    brandColor: quiz.brandColor,
    logoUrl: quiz.logoUrl,
    heroImageUrl: quiz.heroImageUrl,
    videoUrl: quiz.videoUrl,
    highlights: parseHighlights(quiz.highlights),
    blocks: parseBlocks(quiz.landingBlocks),
    optinConsent:
      (quiz.optinConsent as "implied" | "optional" | "required") ?? "optional",
    optinWording: quiz.optinWording,
    privacyStatement: quiz.privacyStatement,
    privacyPolicyUrl: quiz.privacyPolicyUrl,
    questions: quiz.questions.map((q) => ({
      id: q.id,
      text: q.text,
      type: q.type as "single" | "multi" | "scale" | "text",
      required: q.required,
      options: q.options.map((o) => ({ id: o.id, text: o.text })),
    })),
  };

  const fontStack = quiz.fontFamily
    ? FONT_STACKS[quiz.fontFamily]
    : undefined;

  const wrapperStyle: React.CSSProperties & Record<"--brand-2", string | undefined> = {
    fontFamily: fontStack,
    "--brand-2": quiz.secondaryColor || undefined,
  };

  return (
    <>
      {quiz.customCss && (
        // eslint-disable-next-line react/no-danger
        <style dangerouslySetInnerHTML={{ __html: quiz.customCss }} />
      )}
      <TrackingScripts
        facebookPixelId={quiz.facebookPixelId}
        googleAnalyticsCode={quiz.googleAnalyticsCode}
        googleTagManagerId={quiz.googleTagManagerId}
        customTrackingScript={quiz.customTrackingScript}
      />
      <div style={wrapperStyle}>
        <QuizPlayer quiz={safe} resume={resume} />
      </div>
    </>
  );
}
