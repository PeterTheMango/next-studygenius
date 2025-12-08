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
