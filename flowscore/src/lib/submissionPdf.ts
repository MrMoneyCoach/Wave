import type { PdfData } from "./pdf";

type PrismaAnswer = {
  questionId: string;
  optionIds: string[];
  scaleValue?: number;
  text?: string;
};

type PrismaOption = { id: string; text: string };
type PrismaQuestion = { id: string; text: string; type: string; options: PrismaOption[] };

export type BuildInput = {
  quiz: {
    title: string;
    ownerName?: string | null;
    bookingUrl?: string | null;
    bookingLabel?: string | null;
    brandColor?: string | null;
    logoUrl?: string | null;
    questions: PrismaQuestion[];
    outcomes: { id: string; title: string; description: string }[];
  };
  submission: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    company: string | null;
    jobTitle: string | null;
    score: number;
    maxScore: number;
    percent: number;
    outcomeId: string | null;
    answers: string;
    createdAt: Date;
    completedAt: Date | null;
  };
};

export function buildPdfData({ quiz, submission }: BuildInput): PdfData {
  let answers: PrismaAnswer[] = [];
  try {
    answers = JSON.parse(submission.answers);
  } catch {
    answers = [];
  }
  const byQuestion = new Map(answers.map((a) => [a.questionId, a]));
  const optionMap = new Map<string, string>();
  for (const q of quiz.questions) for (const o of q.options) optionMap.set(o.id, o.text);

  const outcome = submission.outcomeId
    ? quiz.outcomes.find((o) => o.id === submission.outcomeId)
    : undefined;

  const renderedAnswers = quiz.questions.map((q) => {
    const a = byQuestion.get(q.id);
    if (!a) return { question: q.text, answer: "" };
    if (q.type === "scale") {
      return {
        question: q.text,
        answer: typeof a.scaleValue === "number" ? `${a.scaleValue}/10` : "",
      };
    }
    if (q.type === "text") {
      return { question: q.text, answer: a.text ?? "" };
    }
    const picked = a.optionIds.map((id) => optionMap.get(id) ?? "").filter(Boolean);
    return { question: q.text, answer: picked.join("; ") };
  });

  return {
    quizTitle: quiz.title,
    ownerName: quiz.ownerName ?? null,
    bookingUrl: quiz.bookingUrl ?? null,
    bookingLabel: quiz.bookingLabel ?? null,
    brandColor: quiz.brandColor ?? null,
    logoUrl: quiz.logoUrl ?? null,
    respondent: {
      firstName: submission.firstName ?? "",
      lastName: submission.lastName ?? "",
      email: submission.email ?? "",
      phone: submission.phone ?? "",
      company: submission.company ?? "",
      jobTitle: submission.jobTitle ?? "",
    },
    scorePercent: submission.percent,
    score: submission.score,
    maxScore: submission.maxScore,
    outcomeTitle: outcome?.title,
    outcomeDescription: outcome?.description,
    answers: renderedAnswers,
    completedAt: submission.completedAt ?? submission.createdAt,
  };
}
