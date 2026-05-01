import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import LeadFormSettings from "@/components/settings/LeadFormSettings";

export const dynamic = "force-dynamic";

type Field = {
  key: string;
  label: string;
  type: "text" | "email" | "tel" | "company" | "url";
  required: boolean;
};

function parseFields(raw: string | null): Field[] {
  if (!raw) return [];
  try {
    const p = JSON.parse(raw);
    if (!Array.isArray(p)) return [];
    return p.filter(
      (f): f is Field =>
        !!f &&
        typeof f === "object" &&
        typeof f.key === "string" &&
        typeof f.label === "string" &&
        ["text", "email", "tel", "company", "url"].includes(f.type) &&
        typeof f.required === "boolean",
    );
  } catch {
    return [];
  }
}

export default async function LeadFormPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireUser();
  const quiz = await prisma.quiz.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      userId: true,
      privacyPolicyUrl: true,
      optinConsent: true,
      optinWording: true,
      privacyStatement: true,
      formBehaviour: true,
      emailValidation: true,
      leadFormFields: true,
    },
  });
  if (!quiz || quiz.userId !== user.id) return notFound();

  return (
    <LeadFormSettings
      quizId={quiz.id}
      initial={{
        privacyPolicyUrl: quiz.privacyPolicyUrl ?? "",
        optinConsent: (quiz.optinConsent as "implied" | "optional" | "required") ?? "optional",
        optinWording:
          quiz.optinWording ??
          "Check this box so that we can send you your free report",
        privacyStatement:
          quiz.privacyStatement ??
          "Your personal information will only be used to contact you regarding your report.",
        formBehaviour: (quiz.formBehaviour as "before" | "after") ?? "before",
        emailValidation:
          (quiz.emailValidation as "none" | "basic" | "strict") ?? "basic",
        extraFields: parseFields(quiz.leadFormFields),
      }}
    />
  );
}
