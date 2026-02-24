import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import CourseList from '@/components/courses/CourseList';
import { GraduationCap, BookOpen, Archive, FolderOpen } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CoursesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: courses, error } = await supabase
    .from('courses')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching courses:', error);
  }

  const courseList = courses || [];
  const activeCourses = courseList.filter((c) => c.status === 'active').length;
  const archivedCourses = courseList.filter((c) => c.status === 'archived').length;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Courses
            </h1>
            <p className="text-sm text-muted-foreground">
              Organize your study materials by course
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      {courseList.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div
            className="bg-card border border-border rounded-xl p-3.5 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
            style={{ animationDelay: '50ms', animationFillMode: 'backwards' }}
          >
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
              <FolderOpen className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium">Total</p>
              <p className="text-lg font-bold text-foreground leading-tight">
                {courseList.length}
              </p>
            </div>
          </div>
          <div
            className="bg-card border border-border rounded-xl p-3.5 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
            style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}
          >
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
              <BookOpen className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium">Active</p>
              <p className="text-lg font-bold text-foreground leading-tight">
                {activeCourses}
              </p>
            </div>
          </div>
          <div
            className="hidden sm:flex bg-card border border-border rounded-xl p-3.5 items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
            style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}
          >
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
              <Archive className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium">Archived</p>
              <p className="text-lg font-bold text-foreground leading-tight">
                {archivedCourses}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Course List */}
      <CourseList initialCourses={courseList} />
    </div>
  );
}
