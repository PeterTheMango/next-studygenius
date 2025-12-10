import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateCourseSchema } from '@/types/course';

export const dynamic = 'force-dynamic';

// GET /api/courses/[id] - Get single course with statistics
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

    // First, verify the course exists and belongs to user
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Get course statistics from the view
    const { data: stats, error: statsError } = await supabase
      .from('course_statistics')
      .select('*')
      .eq('course_id', id)
      .eq('user_id', user.id)
      .single();

    if (statsError) {
      console.error('Error fetching course statistics:', statsError);
      // Return course without stats if view query fails
      return NextResponse.json({ data: course });
    }

    return NextResponse.json({ data: stats });
  } catch (error) {
    console.error('Unexpected error in GET /api/courses/[id]:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// PATCH /api/courses/[id] - Update course
export async function PATCH(
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
    const validation = updateCourseSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('courses')
      .update({
        ...validation.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating course:', error);

      // Handle unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A course with this code already exists' },
          { status: 409 }
        );
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/courses/[id]:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// DELETE /api/courses/[id] - Delete course
export async function DELETE(
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

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting course:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/courses/[id]:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
