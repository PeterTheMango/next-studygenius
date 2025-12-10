import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import CourseList from '@/components/courses/CourseList';

export const dynamic = 'force-dynamic';

export default async function CoursesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch courses for the user
  const { data: courses, error } = await supabase
    .from('courses')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching courses:', error);
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Courses</h1>
          <p className="text-muted-foreground mt-1">
            Organize your study materials by course
          </p>
        </div>
      </div>

      <CourseList initialCourses={courses || []} />
    </div>
  );
}
