import { redirect } from "next/navigation";

// The standalone Emails page has been split into Settings → Notifications and
// Settings → Result Email. Bounce visitors to the new home.
export default function EmailsPage({ params }: { params: { id: string } }) {
  redirect(`/dashboard/quizzes/${params.id}/settings/result-email`);
}
