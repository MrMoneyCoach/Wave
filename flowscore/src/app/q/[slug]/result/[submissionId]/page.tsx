import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ResultView from "@/components/ResultView";

export const dynamic = "force-dynamic";

export default async function ResultPage({
  params,
}: {
  params: { slug: string; submissionId: string };
}) {
  const submission = await prisma.submission.findUnique({
    where: { id: params.submissionId },
    include: { quiz: { include: { user: true } } },
  });
  if (!submission || submission.quiz.slug !== params.slug) return notFound();

  const outcome = submission.outcomeId
    ? await prisma.outcome.findUnique({ where: { id: submission.outcomeId } })
    : null;

  const ownerName =
    submission.quiz.ownerName ||
    submission.quiz.user.name ||
    submission.quiz.user.email.split("@")[0];

  return (
    <ResultView
      slug={submission.quiz.slug}
      quizTitle={submission.quiz.title}
      submission={{
        id: submission.id,
        firstName: submission.firstName,
        email: submission.email,
        phone: submission.phone,
        percent: submission.percent,
        score: submission.score,
        maxScore: submission.maxScore,
        marketingConsent: submission.marketingConsent,
        pdfSentAt: submission.pdfSentAt ? submission.pdfSentAt.toISOString() : null,
      }}
      outcome={
        outcome
          ? { title: outcome.title, description: outcome.description }
          : null
      }
      bookingUrl={submission.quiz.bookingUrl}
      bookingLabel={submission.quiz.bookingLabel || `Book a call with ${ownerName}`}
      ownerName={ownerName}
    />
  );
}
