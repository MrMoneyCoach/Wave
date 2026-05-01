import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { computeUsage, findTier } from "@/lib/tiers";
import LimitBanner from "@/components/LimitBanner";
import NewQuizForm from "@/components/NewQuizForm";

export const dynamic = "force-dynamic";

export default async function NewQuizPage() {
  const user = await requireUser();
  const count = await prisma.quiz.count({ where: { userId: user.id } });
  const tier = findTier(user.tier);
  const usage = computeUsage(tier, count);

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold">New scorecard</h1>
      <p className="mt-2 text-slate-600">
        Give it a name. You can change everything later.
      </p>

      {usage.atLimit ? (
        <div className="mt-6">
          <LimitBanner
            tierName={tier.name}
            scorecardLimit={tier.scorecardLimit}
            currentCount={count}
          />
        </div>
      ) : (
        <NewQuizForm />
      )}
    </div>
  );
}
