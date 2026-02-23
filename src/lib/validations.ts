import { z } from "zod";

export const GenerateQuizSchema = z.object({
  documentId: z.string().uuid(),
  title: z.string().min(1).max(200),
  mode: z.enum(["learn", "revision", "test"]),
  settings: z.object({
    questionCount: z.number().min(5).max(50).default(10),
    questionTypes: z
      .array(
        z.enum(["multiple_choice", "true_false", "fill_blank", "short_answer"])
      )
      .min(1),
    difficulty: z.enum(["mixed", "easy", "medium", "hard"]).default("mixed"),
    timeLimit: z.number().optional(),
    timeLimitPerQuestion: z.number().optional(),
  }),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2).optional(),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const UpdateQuizTitleSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
});

export const ConfirmActionSchema = z.object({
  confirmText: z.string().refine((val) => val === "confirm action", {
    message: "Please type 'confirm action' to proceed",
  }),
});

// Settings validation schemas
export const UpdateProfileSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters"),
  email: z.string().email("Invalid email address"),
});

export const UpdatePreferencesSchema = z.object({
  appearanceMode: z.enum(["light", "dark", "system"]),
  themeColor: z.string().min(1, "Please select a theme color"),
  themeCustomPrimary: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color").optional().nullable(),
  themeCustomSecondary: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color").optional().nullable(),
  themeCustomAccent: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color").optional().nullable(),
  fontFamily: z.string().min(1, "Please select a font family"),
  fontSize: z.enum(["small", "medium", "large"]),
});

export const UploadAvatarSchema = z.object({
  file: z.instanceof(File)
    .refine((file) => file.size <= 2 * 1024 * 1024, "File size must be less than 2MB")
    .refine(
      (file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type),
      "File must be a JPEG, PNG, or WebP image"
    ),
});
