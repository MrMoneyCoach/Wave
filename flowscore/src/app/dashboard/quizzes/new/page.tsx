import NewQuizForm from "@/components/NewQuizForm";

export const dynamic = "force-dynamic";

export default function NewQuizPage() {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold">New scorecard</h1>
      <p className="mt-2 text-slate-600">
        Give it a name. You can change everything later, and you can keep as
        many drafts as you like — only published scorecards count against your
        plan.
      </p>
      <NewQuizForm />
    </div>
  );
}
