import { createClient } from "@/lib/supabase/server"
import { DashboardView } from "@/components/dashboard/dashboard-view"

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <div>Please login</div>
  }

  // Fetch quiz attempts with quiz details
  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select(`
      *,
      quizzes (
        title,
        mode
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <DashboardView attempts={attempts || []} />
  )
}