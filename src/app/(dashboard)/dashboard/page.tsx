import { createClient } from "@/lib/supabase/server";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { DashboardWrapper } from "./_components/dashboard-wrapper";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div>Please login</div>;
  }

  // Fetch quiz attempts with quiz details
  const { data: attempts, error } = await supabase
    .from("quiz_attempts")
    .select(
      `
      *,
      quizzes (
        title,
        mode
      )
    `
    )
    .eq("user_id", user.id)
    .order("started_at", { ascending: false });

  return (
    <DashboardWrapper>
      <DashboardView attempts={attempts || []} />
    </DashboardWrapper>
  );
}
