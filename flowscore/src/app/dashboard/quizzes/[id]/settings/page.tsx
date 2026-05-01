import { redirect } from "next/navigation";

export default function SettingsIndex({ params }: { params: { id: string } }) {
  redirect(`/dashboard/quizzes/${params.id}/settings/general`);
}
