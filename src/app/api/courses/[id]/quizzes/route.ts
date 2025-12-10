import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/courses/[id]/quizzes - Get all quizzes in course
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify course exists and belongs to user
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Get quizzes through documents that belong to this course
    // We need to get documents first, then quizzes for those documents
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('id')
      .eq('course_id', id)
      .eq('user_id', user.id);

    if (docsError) {
      console.error('Error fetching course documents:', docsError);
      return NextResponse.json({ error: docsError.message }, { status: 500 });
    }

    if (!documents || documents.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const documentIds = documents.map(doc => doc.id);

    // Get quizzes for these documents
    const { data, error } = await supabase
      .from('quizzes')
      .select(`
        *,
        document:documents!inner(
          id,
          file_name,
          course_id
        )
      `)
      .in('document_id', documentIds)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching course quizzes:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in GET /api/courses/[id]/quizzes:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
