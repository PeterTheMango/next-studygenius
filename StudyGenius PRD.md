# Technical PRD: StudyGenius AI Quiz Platform

## Implementation Guide for AI-Assisted Development

---

## 🎯 Project Overview

**Build an AI-powered study platform that:**

1. Accepts PDF uploads from users
2. Uses Google Gemini 2.5 Pro to extract content and generate questions
3. Creates quizzes with multiple question types
4. Supports three modes: Learn, Revision, Test
5. Tracks progress and performance

**Critical Constraint:** Questions must be generated ONLY from uploaded document content. No external knowledge.

---

## 📋 Tech Stack (Required)

| Technology    | Version | Purpose                   |
| ------------- | ------- | ------------------------- |
| Bun           | Latest  | Runtime & Package Manager |
| Next.js       | 16.x    | Framework (App Router)    |
| TypeScript    | 5.x     | Language                  |
| Tailwind CSS  | 4.x     | Styling                   |
| shadcn/ui     | Latest  | UI Components             |
| Supabase      | Latest  | Database, Auth, Storage   |
| Google Gemini | 2.5 Pro | AI Question Generation    |
| Zod           | Latest  | Validation                |
| Zustand       | Latest  | State Management          |

---

## 🚀 Step 1: Project Initialization

### 1.1 Create Next.js Project with Bun

```bash
# Create new Next.js app
bun create next-app@latest studygenius --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

cd studygenius

# Install dependencies
bun add @supabase/supabase-js @supabase/ssr @google/genai zod zustand lucide-react

# Install dev dependencies
bun add -d @types/bun
```

### 1.2 Install shadcn/ui

```bash
bunx --bun shadcn@latest init

# When prompted, select:
# - Style: Default
# - Base color: Slate
# - CSS variables: Yes

# Add required components
bunx --bun shadcn@latest add button card input label progress dialog dropdown-menu avatar tabs badge alert toast sonner
```

### 1.3 Configure tsconfig.json

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    },
    "target": "ES2017"
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 1.4 Configure package.json Scripts

```json
{
  "name": "studygenius",
  "version": "0.1.0",
  "scripts": {
    "dev": "bun --bun next dev",
    "build": "bun --bun next build",
    "start": "bun --bun next start",
    "lint": "next lint",
    "db:types": "bunx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts"
  }
}
```

### 1.5 Environment Variables (.env.local)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Gemini
GEMINI_API_KEY=your-gemini-api-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🗄️ Step 2: Database Setup (Supabase)

### 2.1 Run This SQL in Supabase SQL Editor

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE (extends auth.users)
-- ============================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'plus', 'pro')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- DOCUMENTS TABLE
-- ============================================
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  page_count INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
  extracted_text TEXT,
  topics JSONB DEFAULT '[]',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_user_id ON public.documents(user_id);
CREATE INDEX idx_documents_status ON public.documents(status);

-- ============================================
-- QUIZZES TABLE
-- ============================================
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  mode TEXT NOT NULL CHECK (mode IN ('learn', 'revision', 'test')),
  settings JSONB DEFAULT '{
    "questionCount": 10,
    "questionTypes": ["multiple_choice", "true_false"],
    "difficulty": "mixed",
    "timeLimit": null,
    "timeLimitPerQuestion": null
  }',
  question_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'ready', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quizzes_user_id ON public.quizzes(user_id);
CREATE INDEX idx_quizzes_document_id ON public.quizzes(document_id);

-- ============================================
-- QUESTIONS TABLE
-- ============================================
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('multiple_choice', 'true_false', 'fill_blank', 'short_answer', 'matching', 'ordering')),
  topic TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  question_text TEXT NOT NULL,
  options JSONB, -- Array of options for multiple choice
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  hint TEXT,
  source_reference TEXT,
  time_estimate INTEGER DEFAULT 30,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_questions_quiz_id ON public.questions(quiz_id);

-- ============================================
-- QUIZ ATTEMPTS TABLE
-- ============================================
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('learn', 'revision', 'test')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  time_spent INTEGER, -- total seconds
  score DECIMAL(5,2),
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER DEFAULT 0,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned'))
);

CREATE INDEX idx_attempts_user_id ON public.quiz_attempts(user_id);
CREATE INDEX idx_attempts_quiz_id ON public.quiz_attempts(quiz_id);

-- ============================================
-- QUESTION RESPONSES TABLE
-- ============================================
CREATE TABLE public.question_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id UUID REFERENCES public.quiz_attempts(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  user_answer TEXT,
  is_correct BOOLEAN,
  time_spent INTEGER, -- seconds for this question
  answered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(attempt_id, question_id)
);

CREATE INDEX idx_responses_attempt_id ON public.question_responses(attempt_id);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_responses ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Documents policies
CREATE POLICY "Users can view own documents" ON public.documents
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own documents" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own documents" ON public.documents
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own documents" ON public.documents
  FOR DELETE USING (auth.uid() = user_id);

-- Quizzes policies
CREATE POLICY "Users can view own quizzes" ON public.quizzes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own quizzes" ON public.quizzes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own quizzes" ON public.quizzes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own quizzes" ON public.quizzes
  FOR DELETE USING (auth.uid() = user_id);

-- Questions policies (via quiz ownership)
CREATE POLICY "Users can view questions in own quizzes" ON public.questions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = questions.quiz_id AND quizzes.user_id = auth.uid())
  );
CREATE POLICY "Users can insert questions in own quizzes" ON public.questions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = questions.quiz_id AND quizzes.user_id = auth.uid())
  );

-- Quiz attempts policies
CREATE POLICY "Users can view own attempts" ON public.quiz_attempts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own attempts" ON public.quiz_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own attempts" ON public.quiz_attempts
  FOR UPDATE USING (auth.uid() = user_id);

-- Question responses policies
CREATE POLICY "Users can view own responses" ON public.question_responses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.quiz_attempts WHERE quiz_attempts.id = question_responses.attempt_id AND quiz_attempts.user_id = auth.uid())
  );
CREATE POLICY "Users can insert own responses" ON public.question_responses
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.quiz_attempts WHERE quiz_attempts.id = question_responses.attempt_id AND quiz_attempts.user_id = auth.uid())
  );

-- ============================================
-- STORAGE BUCKET
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Storage policies
CREATE POLICY "Users can upload own documents" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own documents" ON storage.objects
  FOR DELETE USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
```

---

## 📁 Step 3: Project File Structure

Create this exact file structure:

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── signup/
│   │   │   └── page.tsx
│   │   ├── layout.tsx
│   │   └── actions.ts
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── documents/
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── quizzes/
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── take/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── results/
│   │   │   │       └── page.tsx
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   ├── documents/
│   │   │   ├── upload/
│   │   │   │   └── route.ts
│   │   │   ├── process/
│   │   │   │   └── route.ts
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   ├── quizzes/
│   │   │   ├── generate/
│   │   │   │   └── route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       ├── start/
│   │   │       │   └── route.ts
│   │   │       └── submit/
│   │   │           └── route.ts
│   │   └── auth/
│   │       └── callback/
│   │           └── route.ts
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── ui/           # shadcn components (auto-generated)
│   ├── auth/
│   │   ├── login-form.tsx
│   │   └── signup-form.tsx
│   ├── documents/
│   │   ├── upload-zone.tsx
│   │   ├── document-card.tsx
│   │   └── document-list.tsx
│   ├── quiz/
│   │   ├── quiz-builder.tsx
│   │   ├── quiz-player.tsx
│   │   ├── question-card.tsx
│   │   ├── mode-selector.tsx
│   │   ├── timer.tsx
│   │   └── results-summary.tsx
│   └── layout/
│       ├── navbar.tsx
│       ├── sidebar.tsx
│       └── dashboard-shell.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── session.ts    # Session helper for Proxy
│   ├── gemini/
│   │   ├── client.ts
│   │   ├── prompts.ts
│   │   └── question-generator.ts
│   ├── utils.ts
│   └── validations.ts
├── stores/
│   ├── quiz-store.ts
│   └── document-store.ts
├── types/
│   ├── database.ts
│   ├── quiz.ts
│   └── index.ts
└── proxy.ts              # Next.js 16 Proxy (replaces middleware.ts)
```

---

## 🔐 Step 4: Supabase Client Setup

### 4.1 Browser Client (src/lib/supabase/client.ts)

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### 4.2 Server Client (src/lib/supabase/server.ts)

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore - called from Server Component
          }
        },
      },
    }
  );
}
```

### 4.3 Supabase Session Helper (src/lib/supabase/session.ts)

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do not add code between createServerClient and supabase.auth.getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { user, supabaseResponse };
}
```

### 4.4 Root Proxy (src/proxy.ts) - Next.js 16 Convention

> **Note:** Next.js 16 renamed `middleware.ts` to `proxy.ts` and the exported function from `middleware` to `proxy`. This new convention clarifies the network boundary and routing focus.

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

// Define protected and public routes
const protectedRoutes = ["/dashboard", "/documents", "/quizzes", "/analytics"];
const publicRoutes = ["/login", "/signup", "/"];

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Check if the current route is protected or public
  const isProtectedRoute = protectedRoutes.some(
    (route) => path === route || path.startsWith(`${route}/`)
  );
  const isPublicRoute = publicRoutes.includes(path);

  // Update Supabase session and get user
  const { user, supabaseResponse } = await updateSession(request);

  // Redirect to /login if user is not authenticated and trying to access protected route
  if (isProtectedRoute && !user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectTo", path);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect to /dashboard if user is authenticated and trying to access auth pages
  if (isPublicRoute && user && (path === "/login" || path === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

// Routes Proxy should NOT run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - Public assets (images, etc.)
     */
    {
      source:
        "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
```

#### Migration Note (middleware.ts → proxy.ts)

If upgrading from Next.js 15, run this codemod:

```bash
npx @next/codemod@latest middleware-to-proxy .
```

Or manually:

```bash
mv middleware.ts proxy.ts
# Then rename the exported function from 'middleware' to 'proxy'
```

---

## 🤖 Step 5: Gemini AI Integration

### 5.1 Gemini Client (src/lib/gemini/client.ts)

```typescript
import { GoogleGenAI } from "@google/genai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set");
}

export const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const GEMINI_MODEL = "gemini-2.5-pro";
```

### 5.2 Prompts (src/lib/gemini/prompts.ts)

```typescript
export const SYSTEM_PROMPT = `You are an expert educational content creator specializing in quiz generation.

CRITICAL RULES - YOU MUST FOLLOW THESE EXACTLY:
1. Generate questions ONLY from the provided document content
2. Do NOT use any external knowledge, web sources, or your training data
3. Do NOT make assumptions beyond what's explicitly stated in the document
4. Every question MUST be directly answerable from the document text
5. Include exact page/section references when possible
6. If the document lacks sufficient content for a topic, skip that topic

You will receive the document content and must generate questions based SOLELY on that content.`;

export const MODE_INSTRUCTIONS = {
  learn: `
LEARN MODE - Help users understand concepts for the first time:
- Include explanatory context with each question
- Focus on foundational concepts and definitions
- Provide helpful hints for difficult questions
- Use simpler question formats (multiple choice, true/false preferred)
- Include "why" and "how" questions for deeper understanding
- Explanations should teach, not just confirm
- Difficulty distribution: 50% easy, 35% medium, 15% hard`,

  revision: `
REVISION MODE - Test memory through active recall:
- No hints provided - pure recall testing
- Mix all question types to challenge different recall patterns
- Include questions that connect multiple concepts
- Focus on key facts, definitions, formulas, and relationships
- Vary difficulty to identify weak areas
- Difficulty distribution: 30% easy, 45% medium, 25% hard`,

  test: `
TEST MODE - Simulate exam conditions:
- No hints or context provided
- Include application-based and analysis questions
- Mix difficulty levels realistically
- Questions should be time-appropriate (30-90 seconds each)
- Test critical thinking, not just memorization
- Difficulty distribution: 20% easy, 50% medium, 30% hard`,
};

export const OUTPUT_FORMAT = `
OUTPUT FORMAT - Return ONLY valid JSON matching this exact structure:
{
  "questions": [
    {
      "type": "multiple_choice" | "true_false" | "fill_blank" | "short_answer",
      "topic": "Topic name extracted from document",
      "difficulty": "easy" | "medium" | "hard",
      "questionText": "The question text",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correctAnswer": "The correct answer (e.g., 'A' for multiple choice, 'true'/'false' for true_false)",
      "explanation": "Why this answer is correct, referencing the document",
      "hint": "Optional hint for learn mode",
      "sourceReference": "Page X or Section Y where this information appears",
      "timeEstimate": 30
    }
  ]
}

QUESTION TYPE RULES:
- multiple_choice: Always provide exactly 4 options labeled A, B, C, D. correctAnswer should be the letter.
- true_false: options should be ["True", "False"]. correctAnswer should be "True" or "False".
- fill_blank: questionText should contain "___" for the blank. correctAnswer is the word/phrase.
- short_answer: No options needed. correctAnswer should be a brief expected response.`;

export function buildPrompt(
  documentContent: string,
  mode: "learn" | "revision" | "test",
  questionCount: number,
  questionTypes: string[]
): string {
  return `${SYSTEM_PROMPT}

${MODE_INSTRUCTIONS[mode]}

ALLOWED QUESTION TYPES: ${questionTypes.join(", ")}
NUMBER OF QUESTIONS TO GENERATE: ${questionCount}

${OUTPUT_FORMAT}

---
DOCUMENT CONTENT TO GENERATE QUESTIONS FROM:
---
${documentContent}
---

Generate exactly ${questionCount} questions using only the allowed question types. Ensure variety in topics covered.`;
}
```

### 5.3 Question Generator (src/lib/gemini/question-generator.ts)

```typescript
import { genAI, GEMINI_MODEL } from "./client";
import { buildPrompt } from "./prompts";
import { z } from "zod";

// Validation schema for generated questions
const QuestionSchema = z.object({
  type: z.enum(["multiple_choice", "true_false", "fill_blank", "short_answer"]),
  topic: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  questionText: z.string(),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string(),
  explanation: z.string(),
  hint: z.string().optional(),
  sourceReference: z.string().optional(),
  timeEstimate: z.number().default(30),
});

const GeneratedQuestionsSchema = z.object({
  questions: z.array(QuestionSchema),
});

export type GeneratedQuestion = z.infer<typeof QuestionSchema>;

interface GenerateQuestionsParams {
  documentContent: string;
  mode: "learn" | "revision" | "test";
  questionCount: number;
  questionTypes: string[];
}

export async function generateQuestions({
  documentContent,
  mode,
  questionCount,
  questionTypes,
}: GenerateQuestionsParams): Promise<GeneratedQuestion[]> {
  const prompt = buildPrompt(
    documentContent,
    mode,
    questionCount,
    questionTypes
  );

  try {
    const response = await genAI.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ text: prompt }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3, // Lower for consistency
        maxOutputTokens: 8192,
      },
    });

    const responseText = response.text;

    // Parse and validate the response
    const parsed = JSON.parse(responseText);
    const validated = GeneratedQuestionsSchema.parse(parsed);

    // Add hints only for learn mode
    if (mode !== "learn") {
      validated.questions.forEach((q) => {
        delete q.hint;
      });
    }

    return validated.questions;
  } catch (error) {
    console.error("Question generation error:", error);
    throw new Error("Failed to generate questions. Please try again.");
  }
}

// Extract topics from document for preview
export async function extractTopics(
  documentContent: string
): Promise<string[]> {
  const prompt = `Analyze the following document and extract the main topics/sections covered.
Return ONLY a JSON array of topic strings, nothing else.
Example: ["Introduction to Cells", "Cell Membrane", "Mitochondria"]

DOCUMENT:
${documentContent.slice(0, 10000)} // Limit for topic extraction

Return the topics array:`;

  try {
    const response = await genAI.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ text: prompt }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    return JSON.parse(response.text);
  } catch {
    return ["General"];
  }
}
```

---

## 🔌 Step 6: API Routes

### 6.1 Document Upload (src/app/api/documents/upload/route.ts)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    // Validate file
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 }
      );
    }

    if (file.size > 50 * 1024 * 1024) {
      // 50MB limit
      return NextResponse.json(
        { error: "File size exceeds 50MB limit" },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage
    const fileName = `${user.id}/${Date.now()}-${file.name.replace(
      /[^a-zA-Z0-9.-]/g,
      "_"
    )}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("documents")
      .upload(fileName, file, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 }
      );
    }

    // Create document record
    const { data: document, error: dbError } = await supabase
      .from("documents")
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_path: uploadData.path,
        file_size: file.size,
        status: "pending",
      })
      .select()
      .single();

    if (dbError) {
      // Cleanup uploaded file on DB error
      await supabase.storage.from("documents").remove([uploadData.path]);
      console.error("DB error:", dbError);
      return NextResponse.json(
        { error: "Failed to save document" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        document,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Upload handler error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### 6.2 Document Processing (src/app/api/documents/process/route.ts)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractTopics } from "@/lib/gemini/question-generator";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documentId } = await request.json();

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID required" },
        { status: 400 }
      );
    }

    // Get document
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Update status to processing
    await supabase
      .from("documents")
      .update({ status: "processing" })
      .eq("id", documentId);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("documents")
      .download(document.file_path);

    if (downloadError || !fileData) {
      await supabase
        .from("documents")
        .update({ status: "failed", error_message: "Failed to download file" })
        .eq("id", documentId);
      return NextResponse.json(
        { error: "Failed to download file" },
        { status: 500 }
      );
    }

    // Extract text from PDF using Gemini
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const { genAI, GEMINI_MODEL } = await import("@/lib/gemini/client");

    const extractionResponse = await genAI.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          inlineData: {
            mimeType: "application/pdf",
            data: base64,
          },
        },
        {
          text: "Extract all text content from this PDF document. Return only the extracted text, preserving the structure and formatting as much as possible.",
        },
      ],
    });

    const extractedText = extractionResponse.text;

    if (!extractedText || extractedText.length < 100) {
      await supabase
        .from("documents")
        .update({
          status: "failed",
          error_message: "Could not extract text from PDF",
        })
        .eq("id", documentId);
      return NextResponse.json(
        { error: "Failed to extract text" },
        { status: 500 }
      );
    }

    // Extract topics
    const topics = await extractTopics(extractedText);

    // Update document with extracted content
    const { error: updateError } = await supabase
      .from("documents")
      .update({
        status: "ready",
        extracted_text: extractedText,
        topics: topics,
        page_count: Math.ceil(extractedText.length / 3000), // Rough estimate
      })
      .eq("id", documentId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update document" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      topics,
      textLength: extractedText.length,
    });
  } catch (error) {
    console.error("Process handler error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### 6.3 Quiz Generation (src/app/api/quizzes/generate/route.ts)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateQuestions } from "@/lib/gemini/question-generator";
import { z } from "zod";

const GenerateQuizSchema = z.object({
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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate input
    const validationResult = GenerateQuizSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { documentId, title, mode, settings } = validationResult.data;

    // Get document with extracted text
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .eq("status", "ready")
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: "Document not found or not ready" },
        { status: 404 }
      );
    }

    if (!document.extracted_text) {
      return NextResponse.json(
        { error: "Document has no extracted text" },
        { status: 400 }
      );
    }

    // Create quiz record
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .insert({
        document_id: documentId,
        user_id: user.id,
        title,
        mode,
        settings,
        status: "generating",
      })
      .select()
      .single();

    if (quizError) {
      console.error("Quiz creation error:", quizError);
      return NextResponse.json(
        { error: "Failed to create quiz" },
        { status: 500 }
      );
    }

    try {
      // Generate questions using Gemini
      const questions = await generateQuestions({
        documentContent: document.extracted_text,
        mode,
        questionCount: settings.questionCount,
        questionTypes: settings.questionTypes,
      });

      // Insert questions
      const questionRecords = questions.map((q, index) => ({
        quiz_id: quiz.id,
        type: q.type,
        topic: q.topic,
        difficulty: q.difficulty,
        question_text: q.questionText,
        options: q.options || null,
        correct_answer: q.correctAnswer,
        explanation: q.explanation,
        hint: q.hint || null,
        source_reference: q.sourceReference || null,
        time_estimate: q.timeEstimate,
        order_index: index,
      }));

      const { error: insertError } = await supabase
        .from("questions")
        .insert(questionRecords);

      if (insertError) {
        throw insertError;
      }

      // Update quiz status
      await supabase
        .from("quizzes")
        .update({
          status: "ready",
          question_count: questions.length,
        })
        .eq("id", quiz.id);

      return NextResponse.json(
        {
          success: true,
          quiz: {
            ...quiz,
            status: "ready",
            question_count: questions.length,
          },
        },
        { status: 201 }
      );
    } catch (genError) {
      // Mark quiz as failed if generation fails
      await supabase
        .from("quizzes")
        .update({ status: "draft" })
        .eq("id", quiz.id);

      console.error("Question generation error:", genError);
      return NextResponse.json(
        {
          error: "Failed to generate questions",
          quizId: quiz.id, // Return quiz ID so user can retry
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Generate handler error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### 6.4 Start Quiz (src/app/api/quizzes/[id]/start/route.ts)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: quizId } = await params;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get quiz with questions
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .select(
        `
        *,
        questions (
          id,
          type,
          topic,
          difficulty,
          question_text,
          options,
          hint,
          time_estimate,
          order_index
        )
      `
      )
      .eq("id", quizId)
      .eq("user_id", user.id)
      .eq("status", "ready")
      .single();

    if (quizError || !quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Create attempt
    const { data: attempt, error: attemptError } = await supabase
      .from("quiz_attempts")
      .insert({
        quiz_id: quizId,
        user_id: user.id,
        mode: quiz.mode,
        total_questions: quiz.questions.length,
        status: "in_progress",
      })
      .select()
      .single();

    if (attemptError) {
      return NextResponse.json(
        { error: "Failed to start quiz" },
        { status: 500 }
      );
    }

    // Sort questions by order_index
    const sortedQuestions = quiz.questions.sort(
      (a: any, b: any) => a.order_index - b.order_index
    );

    // Remove hints for non-learn modes
    const questions = sortedQuestions.map((q: any) => ({
      id: q.id,
      type: q.type,
      topic: q.topic,
      difficulty: q.difficulty,
      questionText: q.question_text,
      options: q.options,
      timeEstimate: q.time_estimate,
      ...(quiz.mode === "learn" && q.hint ? { hint: q.hint } : {}),
    }));

    return NextResponse.json({
      success: true,
      attempt: {
        id: attempt.id,
        quizId,
        mode: quiz.mode,
        startedAt: attempt.started_at,
        timeLimit: quiz.settings?.timeLimit || null,
        totalQuestions: questions.length,
      },
      questions,
    });
  } catch (error) {
    console.error("Start quiz error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### 6.5 Submit Answer (src/app/api/quizzes/[id]/submit/route.ts)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: quizId } = await params;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { attemptId, questionId, answer, timeSpent } = await request.json();

    // Validate attempt belongs to user
    const { data: attempt, error: attemptError } = await supabase
      .from("quiz_attempts")
      .select("*, quizzes!inner(mode)")
      .eq("id", attemptId)
      .eq("user_id", user.id)
      .eq("status", "in_progress")
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json({ error: "Invalid attempt" }, { status: 400 });
    }

    // Get question with correct answer
    const { data: question, error: questionError } = await supabase
      .from("questions")
      .select("*")
      .eq("id", questionId)
      .eq("quiz_id", quizId)
      .single();

    if (questionError || !question) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    // Check if correct
    const isCorrect =
      answer?.toLowerCase().trim() ===
      question.correct_answer?.toLowerCase().trim();

    // Save response
    const { error: responseError } = await supabase
      .from("question_responses")
      .upsert(
        {
          attempt_id: attemptId,
          question_id: questionId,
          user_answer: answer,
          is_correct: isCorrect,
          time_spent: timeSpent,
        },
        {
          onConflict: "attempt_id,question_id",
        }
      );

    if (responseError) {
      console.error("Response save error:", responseError);
      return NextResponse.json(
        { error: "Failed to save response" },
        { status: 500 }
      );
    }

    // Update attempt stats
    const { data: responses } = await supabase
      .from("question_responses")
      .select("is_correct")
      .eq("attempt_id", attemptId);

    const correctCount = responses?.filter((r) => r.is_correct).length || 0;

    await supabase
      .from("quiz_attempts")
      .update({ correct_answers: correctCount })
      .eq("id", attemptId);

    const mode = attempt.quizzes.mode;

    // For test mode, don't reveal answers
    if (mode === "test") {
      return NextResponse.json({
        success: true,
        received: true,
        progress: {
          answered: responses?.length || 0,
          total: attempt.total_questions,
        },
      });
    }

    // For learn/revision modes, show feedback
    return NextResponse.json({
      success: true,
      isCorrect,
      correctAnswer: question.correct_answer,
      explanation: question.explanation,
      sourceReference: question.source_reference,
      progress: {
        answered: responses?.length || 0,
        total: attempt.total_questions,
        correctSoFar: correctCount,
      },
    });
  } catch (error) {
    console.error("Submit answer error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

---

## 🧩 Step 7: Core Components

### 7.1 Upload Zone (src/components/documents/upload-zone.tsx)

```typescript
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export function UploadZone() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === "application/pdf") {
      setFile(droppedFile);
    } else {
      toast.error("Please upload a PDF file");
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile?.type === "application/pdf") {
      setFile(selectedFile);
    } else {
      toast.error("Please upload a PDF file");
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(10);

    try {
      // Upload file
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const error = await uploadRes.json();
        throw new Error(error.error || "Upload failed");
      }

      const { document } = await uploadRes.json();
      setProgress(50);
      setUploading(false);
      setProcessing(true);

      // Process document
      const processRes = await fetch("/api/documents/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: document.id }),
      });

      setProgress(90);

      if (!processRes.ok) {
        const error = await processRes.json();
        throw new Error(error.error || "Processing failed");
      }

      setProgress(100);
      toast.success("Document uploaded and processed!");

      // Redirect to document page
      router.push(`/documents/${document.id}`);
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
      setFile(null);
    } finally {
      setUploading(false);
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center transition-colors
          ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25"
          }
          ${file ? "border-green-500 bg-green-500/5" : ""}
        `}
      >
        {!file ? (
          <>
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Drop your PDF here</h3>
            <p className="text-muted-foreground mb-4">or click to browse</p>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <Button asChild variant="outline">
              <label htmlFor="file-upload" className="cursor-pointer">
                Select PDF
              </label>
            </Button>
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <FileText className="w-10 h-10 text-green-500" />
              <div className="text-left">
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFile(null)}
                disabled={uploading || processing}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {(uploading || processing) && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-muted-foreground">
                  {uploading ? "Uploading..." : "Processing with AI..."}
                </p>
              </div>
            )}

            {!uploading && !processing && (
              <Button onClick={handleUpload} className="w-full">
                Upload & Process
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

### 7.2 Quiz Player (src/components/quiz/quiz-player.tsx)

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Timer } from "./timer";
import { QuestionCard } from "./question-card";
import { toast } from "sonner";
import { CheckCircle, XCircle, ArrowRight, Flag } from "lucide-react";

interface Question {
  id: string;
  type: string;
  topic: string;
  difficulty: string;
  questionText: string;
  options?: string[];
  hint?: string;
  timeEstimate: number;
}

interface QuizPlayerProps {
  quizId: string;
  attemptId: string;
  mode: "learn" | "revision" | "test";
  questions: Question[];
  timeLimit?: number;
}

export function QuizPlayer({
  quizId,
  attemptId,
  mode,
  questions,
  timeLimit,
}: QuizPlayerProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    correctAnswer: string;
    explanation: string;
  } | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(
    new Set()
  );
  const [correctCount, setCorrectCount] = useState(0);

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const progress =
    ((currentIndex + (submitted ? 1 : 0)) / questions.length) * 100;

  useEffect(() => {
    setQuestionStartTime(Date.now());
  }, [currentIndex]);

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer) {
      toast.error("Please select an answer");
      return;
    }

    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);

    try {
      const res = await fetch(`/api/quizzes/${quizId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          questionId: currentQuestion.id,
          answer: selectedAnswer,
          timeSpent,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setAnsweredQuestions((prev) => new Set([...prev, currentQuestion.id]));

      if (mode === "test") {
        // In test mode, just move to next question
        if (isLastQuestion) {
          router.push(`/quizzes/${quizId}/results?attempt=${attemptId}`);
        } else {
          setCurrentIndex((prev) => prev + 1);
          setSelectedAnswer(null);
        }
      } else {
        // In learn/revision mode, show feedback
        setFeedback({
          isCorrect: data.isCorrect,
          correctAnswer: data.correctAnswer,
          explanation: data.explanation,
        });
        setSubmitted(true);
        if (data.isCorrect) {
          setCorrectCount((prev) => prev + 1);
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to submit answer");
    }
  };

  const handleNext = () => {
    if (isLastQuestion) {
      router.push(`/quizzes/${quizId}/results?attempt=${attemptId}`);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setSubmitted(false);
      setFeedback(null);
    }
  };

  const handleTimeUp = () => {
    toast.warning("Time is up!");
    router.push(`/quizzes/${quizId}/results?attempt=${attemptId}`);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Question {currentIndex + 1} of {questions.length}
          </p>
          <Badge variant="outline" className="mt-1">
            {currentQuestion.topic}
          </Badge>
        </div>

        <div className="flex items-center gap-4">
          {mode !== "test" && (
            <div className="text-sm">
              <span className="text-green-500 font-medium">{correctCount}</span>
              <span className="text-muted-foreground">
                {" "}
                / {answeredQuestions.size}
              </span>
            </div>
          )}
          {timeLimit && (
            <Timer totalSeconds={timeLimit} onTimeUp={handleTimeUp} />
          )}
        </div>
      </div>

      {/* Progress */}
      <Progress value={progress} className="h-2" />

      {/* Question */}
      <QuestionCard
        question={currentQuestion}
        selectedAnswer={selectedAnswer}
        onSelectAnswer={setSelectedAnswer}
        disabled={submitted}
        showHint={mode === "learn"}
      />

      {/* Feedback (Learn/Revision modes) */}
      {feedback && (
        <Card
          className={`p-4 ${
            feedback.isCorrect
              ? "bg-green-500/10 border-green-500"
              : "bg-red-500/10 border-red-500"
          }`}
        >
          <div className="flex items-start gap-3">
            {feedback.isCorrect ? (
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
            )}
            <div>
              <p className="font-medium">
                {feedback.isCorrect ? "Correct!" : "Incorrect"}
              </p>
              {!feedback.isCorrect && (
                <p className="text-sm mt-1">
                  The correct answer is:{" "}
                  <strong>{feedback.correctAnswer}</strong>
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                {feedback.explanation}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="ghost" disabled>
          <Flag className="w-4 h-4 mr-2" />
          Flag for Review
        </Button>

        {!submitted ? (
          <Button onClick={handleSubmitAnswer} disabled={!selectedAnswer}>
            Submit Answer
          </Button>
        ) : (
          <Button onClick={handleNext}>
            {isLastQuestion ? "View Results" : "Next Question"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
```

### 7.3 Question Card (src/components/quiz/question-card.tsx)

```typescript
"use client";

import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Lightbulb } from "lucide-react";
import { useState } from "react";

interface Question {
  id: string;
  type: string;
  topic: string;
  difficulty: string;
  questionText: string;
  options?: string[];
  hint?: string;
  timeEstimate: number;
}

interface QuestionCardProps {
  question: Question;
  selectedAnswer: string | null;
  onSelectAnswer: (answer: string) => void;
  disabled?: boolean;
  showHint?: boolean;
}

export function QuestionCard({
  question,
  selectedAnswer,
  onSelectAnswer,
  disabled = false,
  showHint = false,
}: QuestionCardProps) {
  const [showingHint, setShowingHint] = useState(false);

  const difficultyColors = {
    easy: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    hard: "bg-red-100 text-red-800",
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <Badge
          className={
            difficultyColors[
              question.difficulty as keyof typeof difficultyColors
            ]
          }
        >
          {question.difficulty}
        </Badge>
        <span className="text-sm text-muted-foreground">
          ~{question.timeEstimate}s
        </span>
      </div>

      <h3 className="text-lg font-medium mb-6">{question.questionText}</h3>

      {/* Multiple Choice / True-False */}
      {(question.type === "multiple_choice" ||
        question.type === "true_false") &&
        question.options && (
          <div className="space-y-3">
            {question.options.map((option, index) => (
              <label
                key={index}
                className={`
                flex items-center p-4 border rounded-lg cursor-pointer transition-colors
                ${
                  selectedAnswer === option.charAt(0)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }
                ${disabled ? "opacity-50 cursor-not-allowed" : ""}
              `}
              >
                <input
                  type="radio"
                  name="answer"
                  value={option.charAt(0)}
                  checked={selectedAnswer === option.charAt(0)}
                  onChange={(e) => onSelectAnswer(e.target.value)}
                  disabled={disabled}
                  className="sr-only"
                />
                <span
                  className={`
                w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center
                ${
                  selectedAnswer === option.charAt(0)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground"
                }
              `}
                >
                  {selectedAnswer === option.charAt(0) && "✓"}
                </span>
                <span>{option}</span>
              </label>
            ))}
          </div>
        )}

      {/* Fill in the Blank */}
      {question.type === "fill_blank" && (
        <div className="space-y-2">
          <Label htmlFor="answer">Your Answer</Label>
          <Input
            id="answer"
            value={selectedAnswer || ""}
            onChange={(e) => onSelectAnswer(e.target.value)}
            placeholder="Type your answer..."
            disabled={disabled}
          />
        </div>
      )}

      {/* Short Answer */}
      {question.type === "short_answer" && (
        <div className="space-y-2">
          <Label htmlFor="answer">Your Answer</Label>
          <Input
            id="answer"
            value={selectedAnswer || ""}
            onChange={(e) => onSelectAnswer(e.target.value)}
            placeholder="Type your answer..."
            disabled={disabled}
          />
        </div>
      )}

      {/* Hint (Learn mode only) */}
      {showHint && question.hint && (
        <div className="mt-6">
          {!showingHint ? (
            <button
              onClick={() => setShowingHint(true)}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <Lightbulb className="w-4 h-4" />
              Show Hint
            </button>
          ) : (
            <div className="p-3 bg-primary/5 rounded-lg text-sm">
              <strong>Hint:</strong> {question.hint}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
```

### 7.4 Timer Component (src/components/quiz/timer.tsx)

```typescript
"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface TimerProps {
  totalSeconds: number;
  onTimeUp: () => void;
}

export function Timer({ totalSeconds, onTimeUp }: TimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onTimeUp();
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, onTimeUp]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  const isLow = secondsLeft < 60;

  return (
    <div
      className={`flex items-center gap-2 font-mono ${
        isLow ? "text-red-500" : ""
      }`}
    >
      <Clock className="w-4 h-4" />
      <span>
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </span>
    </div>
  );
}
```

### 7.5 Mode Selector (src/components/quiz/mode-selector.tsx)

```typescript
"use client";

import { Card } from "@/components/ui/card";
import { BookOpen, Brain, ClipboardCheck } from "lucide-react";

interface ModeSelectorProps {
  selected: "learn" | "revision" | "test";
  onSelect: (mode: "learn" | "revision" | "test") => void;
}

const modes = [
  {
    id: "learn" as const,
    name: "Learn",
    description: "Guided learning with hints and explanations",
    icon: BookOpen,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500",
  },
  {
    id: "revision" as const,
    name: "Revision",
    description: "Active recall to strengthen memory",
    icon: Brain,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500",
  },
  {
    id: "test" as const,
    name: "Test",
    description: "Exam simulation with timer",
    icon: ClipboardCheck,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500",
  },
];

export function ModeSelector({ selected, onSelect }: ModeSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isSelected = selected === mode.id;

        return (
          <Card
            key={mode.id}
            onClick={() => onSelect(mode.id)}
            className={`
              p-6 cursor-pointer transition-all
              ${
                isSelected
                  ? `${mode.bgColor} ${mode.borderColor} border-2`
                  : "hover:border-primary/50"
              }
            `}
          >
            <Icon className={`w-8 h-8 ${mode.color} mb-3`} />
            <h3 className="font-semibold mb-1">{mode.name}</h3>
            <p className="text-sm text-muted-foreground">{mode.description}</p>
          </Card>
        );
      })}
    </div>
  );
}
```

---

## 📄 Step 8: Key Pages

### 8.1 Dashboard (src/app/(dashboard)/dashboard/page.tsx)

```typescript
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, FileText, Brain, TrendingUp } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get stats
  const { count: documentCount } = await supabase
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { count: quizCount } = await supabase
    .from("quizzes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { data: recentAttempts } = await supabase
    .from("quiz_attempts")
    .select("score")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(10);

  const avgScore = recentAttempts?.length
    ? Math.round(
        recentAttempts.reduce((sum, a) => sum + (a.score || 0), 0) /
          recentAttempts.length
      )
    : 0;

  // Get recent documents
  const { data: recentDocs } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(3);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back!</p>
        </div>
        <Button asChild>
          <Link href="/documents">
            <Plus className="w-4 h-4 mr-2" />
            Upload Document
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <FileText className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{documentCount || 0}</p>
              <p className="text-sm text-muted-foreground">Documents</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <Brain className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{quizCount || 0}</p>
              <p className="text-sm text-muted-foreground">Quizzes</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgScore}%</p>
              <p className="text-sm text-muted-foreground">Avg Score</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Documents */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Documents</h2>
          <Button variant="ghost" asChild>
            <Link href="/documents">View All</Link>
          </Button>
        </div>

        {recentDocs?.length ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentDocs.map((doc) => (
              <Card key={doc.id} className="p-4">
                <Link href={`/documents/${doc.id}`}>
                  <div className="flex items-start gap-3">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{doc.file_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {doc.topics?.length || 0} topics
                      </p>
                    </div>
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">No documents yet</p>
            <Button asChild>
              <Link href="/documents">Upload your first PDF</Link>
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
```

### 8.2 Take Quiz Page (src/app/(dashboard)/quizzes/[id]/take/page.tsx)

```typescript
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { QuizPlayer } from "@/components/quiz/quiz-player";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface QuizData {
  attemptId: string;
  mode: "learn" | "revision" | "test";
  questions: any[];
  timeLimit?: number;
}

export default function TakeQuizPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;

  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function startQuiz() {
      try {
        const res = await fetch(`/api/quizzes/${quizId}/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to start quiz");
        }

        const data = await res.json();

        setQuizData({
          attemptId: data.attempt.id,
          mode: data.attempt.mode,
          questions: data.questions,
          timeLimit: data.attempt.timeLimit,
        });
      } catch (error: any) {
        toast.error(error.message);
        router.push(`/quizzes/${quizId}`);
      } finally {
        setLoading(false);
      }
    }

    startQuiz();
  }, [quizId, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!quizData) {
    return null;
  }

  return (
    <QuizPlayer
      quizId={quizId}
      attemptId={quizData.attemptId}
      mode={quizData.mode}
      questions={quizData.questions}
      timeLimit={quizData.timeLimit}
    />
  );
}
```

---

## 🎨 Step 9: Styling (src/app/globals.css)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 48%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

---

## ✅ Step 10: Testing Checklist

Before deploying, verify:

### Database

- [ ] All tables created with correct columns
- [ ] RLS policies working (test with different users)
- [ ] Storage bucket created and accessible
- [ ] Triggers functioning (profile creation)

### Authentication

- [ ] Sign up creates user and profile
- [ ] Login works correctly
- [ ] Protected routes redirect to login
- [ ] Logout clears session

### Document Flow

- [ ] PDF upload to storage works
- [ ] Document record created in database
- [ ] Text extraction via Gemini works
- [ ] Topics extracted correctly
- [ ] Status updates properly

### Quiz Flow

- [ ] Quiz generation creates questions
- [ ] All question types render correctly
- [ ] Learn mode shows hints and feedback
- [ ] Revision mode hides hints
- [ ] Test mode has timer and no feedback
- [ ] Results calculated correctly

### Edge Cases

- [ ] Large PDF handling (50MB)
- [ ] Invalid file type rejection
- [ ] Empty document handling
- [ ] Network error recovery
- [ ] Session expiration handling

---

## 🚀 Deployment Commands

```bash
# Build for production
bun run build

# Run production server
bun run start

# Or deploy to Vercel
bunx vercel
```

---

## 📝 Summary

This TechPRD provides everything needed to build the StudyGenius platform:

1. **Complete setup instructions** for all technologies
2. **Full database schema** with RLS policies
3. **All API routes** with TypeScript implementations
4. **Core components** for the quiz experience
5. **Gemini AI integration** with proper prompts
6. **Three quiz modes** (Learn, Revision, Test) fully specified

**Key Implementation Notes:**

- Questions are generated ONLY from document content (critical requirement)
- Gemini 2.5 Pro handles both PDF text extraction and question generation
- Supabase handles auth, database, and file storage in one platform
- The UI uses shadcn/ui components for consistency
- All routes are protected with proper authentication checks
