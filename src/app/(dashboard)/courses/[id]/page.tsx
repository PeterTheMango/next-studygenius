import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import CourseDashboard from '@/components/courses/dashboard/CourseDashboard';

export const dynamic = 'force-dynamic';

export default async function CoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch course with statistics
  const { data: courseStats, error } = await supabase
    .from('course_statistics')
    .select('*')
    .eq('course_id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !courseStats) {
    console.error('Error fetching course:', error);
    notFound();
  }

  return <CourseDashboard course={courseStats} />;
}
