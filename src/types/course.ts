import { z } from 'zod';
import { Database } from './database';

// Base Course type from database
export type Course = Database['public']['Tables']['courses']['Row'];
export type InsertCourse = Database['public']['Tables']['courses']['Insert'];
export type UpdateCourse = Database['public']['Tables']['courses']['Update'];

// Extended course with statistics
export interface CourseWithStats {
  course_id: string;
  user_id: string;
  title: string;
  description: string | null;
  course_code: string;
  color: string;
  icon: string;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
  total_documents: number;
  total_quizzes: number;
  total_attempts: number;
  avg_quiz_score: number | null;
  completed_quizzes: number;
  total_time_spent: number;
  recent_attempts: number;
  unique_topics: number;
}

// Helper to convert CourseWithStats to Course
export function courseWithStatsToCourse(stats: CourseWithStats): Course {
  return {
    id: stats.course_id,
    user_id: stats.user_id,
    title: stats.title,
    description: stats.description,
    course_code: stats.course_code,
    color: stats.color,
    icon: stats.icon,
    status: stats.status,
    created_at: stats.created_at,
    updated_at: stats.updated_at,
  };
}

// Course creation schema
export const createCourseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title is too long'),
  description: z.string().max(500, 'Description is too long').optional().or(z.literal('')),
  course_code: z.string()
    .min(1, 'Course code is required')
    .max(20, 'Course code is too long')
    .regex(/^[A-Z0-9]+$/, 'Course code must be uppercase letters and numbers only'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').default('#3b82f6'),
  icon: z.string().default('book-open'),
  status: z.enum(['active', 'archived']).default('active'),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;

// Course update schema (all fields optional)
export const updateCourseSchema = createCourseSchema.partial();
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;

// Color palette for course customization
export const COURSE_COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Slate', value: '#64748b' },
] as const;

// Available icons (Lucide icons)
export const COURSE_ICONS = [
  { name: 'book-open', label: 'Book' },
  { name: 'graduation-cap', label: 'Graduation' },
  { name: 'flask-conical', label: 'Science' },
  { name: 'calculator', label: 'Math' },
  { name: 'palette', label: 'Art' },
  { name: 'music', label: 'Music' },
  { name: 'globe', label: 'Geography' },
  { name: 'languages', label: 'Languages' },
  { name: 'microscope', label: 'Biology' },
  { name: 'atom', label: 'Physics' },
  { name: 'dna', label: 'Genetics' },
  { name: 'brain', label: 'Psychology' },
] as const;

// View mode for course list
export type CourseViewMode = 'card' | 'list';

// Course status filter
export type CourseStatusFilter = 'all' | 'active' | 'archived';
