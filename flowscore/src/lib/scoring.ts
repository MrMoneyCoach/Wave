export type Answer = {
  questionId: string;
  optionIds: string[];
  scaleValue?: number;
};

export type ScoredQuestion = {
  id: string;
  type: string;
  options: { id: string; score: number }[];
};

export function computeScore(questions: ScoredQuestion[], answers: Answer[]) {
  let score = 0;
  let maxScore = 0;

  for (const q of questions) {
    const maxOpt = q.options.reduce((m, o) => Math.max(m, o.score), 0);
    if (q.type === "scale") {
      maxScore += 10;
      const a = answers.find((a) => a.questionId === q.id);
      if (a && typeof a.scaleValue === "number") {
        score += Math.max(0, Math.min(10, a.scaleValue));
      }
    } else if (q.type === "multi") {
      const posSum = q.options.filter((o) => o.score > 0).reduce((s, o) => s + o.score, 0);
      maxScore += Math.max(maxOpt, posSum);
      const a = answers.find((a) => a.questionId === q.id);
      if (a) {
        for (const oid of a.optionIds) {
          const opt = q.options.find((o) => o.id === oid);
          if (opt) score += opt.score;
        }
      }
    } else {
      maxScore += maxOpt;
      const a = answers.find((a) => a.questionId === q.id);
      const oid = a?.optionIds[0];
      if (oid) {
        const opt = q.options.find((o) => o.id === oid);
        if (opt) score += opt.score;
      }
    }
  }

  const percent = maxScore > 0 ? Math.round((score / maxScore) * 1000) / 10 : 0;
  return { score, maxScore, percent };
}
