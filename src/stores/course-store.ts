import { create } from 'zustand';
import { Course, CourseWithStats } from '@/types/course';

interface CourseStore {
  courses: Course[];
  currentCourse: CourseWithStats | null;
  setCourses: (courses: Course[]) => void;
  setCurrentCourse: (course: CourseWithStats | null) => void;
  addCourse: (course: Course) => void;
  updateCourse: (id: string, updates: Partial<Course>) => void;
  removeCourse: (id: string) => void;
  reset: () => void;
}

export const useCourseStore = create<CourseStore>((set) => ({
  courses: [],
  currentCourse: null,

  setCourses: (courses) => set({ courses }),

  setCurrentCourse: (course) => set({ currentCourse: course }),

  addCourse: (course) =>
    set((state) => ({ courses: [course, ...state.courses] })),

  updateCourse: (id, updates) =>
    set((state) => ({
      courses: state.courses.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
      currentCourse:
        state.currentCourse?.course_id === id
          ? { ...state.currentCourse, ...updates }
          : state.currentCourse,
    })),

  removeCourse: (id) =>
    set((state) => ({
      courses: state.courses.filter((c) => c.id !== id),
      currentCourse:
        state.currentCourse?.course_id === id ? null : state.currentCourse,
    })),

  reset: () => set({ courses: [], currentCourse: null }),
}));
