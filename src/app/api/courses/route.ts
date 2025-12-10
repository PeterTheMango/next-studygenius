import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCourseSchema } from '@/types/course';

export const dynamic = 'force-dynamic';

// GET /api/courses - List all courses
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status'); // 'active', 'archived', or null for all

    let query = supabase
      .from('courses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (status && (status === 'active' || status === 'archived')) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching courses:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in GET /api/courses:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// POST /api/courses - Create new course
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = createCourseSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('courses')
      .insert({
        ...validation.data,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating course:', error);

      // Handle unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A course with this code already exists' },
          { status: 409 }
        );
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/courses:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
