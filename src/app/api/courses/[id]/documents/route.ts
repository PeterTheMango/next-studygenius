import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/courses/[id]/documents - Get all documents in course
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

    // Get documents for this course
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('course_id', id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching course documents:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in GET /api/courses/[id]/documents:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// POST /api/courses/[id]/documents/assign - Assign document to course
export async function POST(
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

    const body = await request.json();
    const { document_id } = body;

    if (!document_id) {
      return NextResponse.json(
        { error: 'document_id is required' },
        { status: 400 }
      );
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

    // Update document to assign it to this course
    const { data, error } = await supabase
      .from('documents')
      .update({ course_id: id })
      .eq('id', document_id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error assigning document to course:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in POST /api/courses/[id]/documents:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
