# Quiz Resume Feature - TODO

## Features to Implement

### 1. Save Answers During Quiz Progress
**Current Issue:** Answers are only stored in local React state and session storage. If the user refreshes the page or closes the tab, all progress is lost.

**What needs to be done:**
- Save each answer to the database as soon as the user submits it
- Store answers in a `quiz_responses` or similar table linked to the `attemptId`
- Update the `QuizPlayer` component to call an API endpoint after each answer submission
- Ensure answers are persisted before moving to the next question

**Affected Files:**
- `src/components/quiz/quiz-player.tsx` (lines 234-343 - `handleAnswerWrapper` function)
- Create new API endpoint: `src/app/api/quizzes/[id]/answer/route.ts` (or similar)
- Database: May need a new table or use existing structure for storing individual responses

---

### 2. Resume In-Progress Quiz on Page Load
**Current Issue:** The take quiz page always creates a new attempt, even if an in-progress attempt already exists for the user.

**What needs to be done:**
- Check for existing `in_progress` attempts before creating a new one
- If an in-progress attempt exists:
  - Reuse that attempt ID
  - Fetch all previously submitted answers from the database
  - Pass those answers to the `QuizPlayer` component to restore state
  - Position the user at the correct question (first unanswered question or allow navigation)
- Only create a new attempt if no in-progress attempt exists

**Affected Files:**
- `src/app/(dashboard)/quizzes/[id]/take/page.tsx` (lines 42-52 - attempt creation logic)
- `src/components/quiz/quiz-player.tsx` (needs to accept and hydrate with previous answers)
- May need new props: `initialResponses`, `startingQuestionIndex`, etc.

---

### 3. Retry Incorrect Questions in Learning Mode
**Current Issue:** In learning mode, users move forward through questions linearly. If they answer incorrectly, they cannot retry that specific question until they restart the entire quiz.

**What needs to be done:**
- Track which questions were answered incorrectly during the quiz
- After the user completes all questions in learning mode, create a "retry round" with only the incorrect questions
- Allow users to retry incorrect questions until they answer them correctly
- Option 1: Re-ask all incorrect questions at the end of the quiz
- Option 2: Allow immediate retry of a question before moving to the next one (configurable)
- Update progress tracking to show original attempts vs. retry attempts
- Consider mastery threshold: e.g., user must answer correctly 2 times in a row

**Affected Files:**
- `src/components/quiz/quiz-player.tsx` (needs retry logic in learning mode)
- Quiz flow logic: decide when to trigger retry round
- May need to track attempt history per question (first attempt, second attempt, etc.)
- Results page: show which questions required retries

**Design Considerations:**
- Should users retry immediately after wrong answer, or at the end?
- How many retry attempts allowed per question?
- Does retry round continue until all questions are correct, or limited attempts?
- Should retries affect the final score differently than first attempts?

---

### 4. Question Navigation in Test Mode
**Current Issue:** In test mode, users can only move forward through questions. Once they submit an answer and move to the next question, they cannot go back to review or change previous answers.

**What needs to be done:**
- Add navigation controls to allow users to jump to any question in test mode
- Display a question navigator/overview (e.g., numbered buttons, progress bar with clickable segments)
- Allow users to change their answers before final submission
- Mark questions as "answered" vs "unanswered" in the navigator
- Add a "Review All Answers" screen before final submission (optional)
- Ensure saved answers (from Feature #1) are updated when users change them

**Affected Files:**
- `src/components/quiz/quiz-player.tsx` (add navigation UI and logic)
- Current flow prevents going back - need to allow bi-directional navigation in test mode
- May need a new component: `QuestionNavigator` or `QuizOverview`

**Design Considerations:**
- Should there be a visual indicator for answered vs unanswered questions?
- Should there be a "flagging" system to mark questions for review?
- Should there be a warning when user tries to submit with unanswered questions?

---

### 5. Question Shuffling for Learning and Revision Modes
**Current Issue:** Questions are always presented in the same order (sorted by `order_index`). When users resume or retake quizzes, they can memorize the question order rather than truly learning the material.

**What needs to be done:**
- Implement random shuffling of question order for learning and revision modes
- Generate a shuffled order when the quiz attempt is created (Feature #2)
- Store the shuffled order with the attempt so it remains consistent across page refreshes
- Option 1: Shuffle once at the start of each attempt
- Option 2: Re-shuffle on each new attempt/retry
- Ensure the shuffled order is used consistently throughout the attempt

**Affected Files:**
- `src/app/(dashboard)/quizzes/[id]/take/page.tsx` (lines 58-59 - question sorting logic)
- Database: Store shuffled question order in quiz_attempts table (e.g., `question_order` JSON field)
- `src/components/quiz/quiz-player.tsx` (use shuffled order instead of default order)

**Design Considerations:**
- Should test mode also have shuffling, or keep original order?
- Should option/answer choices also be shuffled for multiple choice questions?
- Should shuffling be a configurable setting per quiz?
- How to handle shuffling when resuming (Feature #2) - use saved order or re-shuffle?

**Recommendation:**
- For learning/revision: shuffle questions and optionally shuffle answer choices
- For test mode: optionally allow shuffling as a quiz setting, but keep navigation (Feature #4)
- Store shuffle seed or order with the attempt to maintain consistency

---

## Implementation Dependencies
These features work together:
1. Feature #1 enables answers to be saved incrementally
2. Feature #2 retrieves those saved answers to restore quiz state
3. Feature #3 requires tracking answer history and question retry logic (depends on #1)
4. Feature #4 requires saved answers (Feature #1) to enable answer editing in test mode
5. Feature #5 requires stored attempt data (Feature #2) to maintain consistent question order across sessions

**Recommended Implementation Order:**
1. Implement Feature #1 first (save answers incrementally) - **Foundation for all other features**
2. Implement Feature #2 second (resume quiz progress) - **Enables session persistence**
3. Implement Feature #4 third (question navigation in test mode) - **Simpler, doesn't depend on #3**
4. Implement Feature #5 fourth (question shuffling) - **Works with or without retry logic**
5. Implement Feature #3 fifth (retry logic for learning mode) - **Most complex, benefits from other features**

---

## Database Considerations
- Verify schema supports storing individual question responses linked to an attempt
- Consider indexing on `(attempt_id, question_id)` for fast lookups
- Handle edge cases: user changes answer before completing quiz, multiple submissions for same question
- For Feature #3: Track attempt number per question (1st attempt, 2nd attempt, etc.)
- Consider a `retry_count` or `attempt_number` field in the responses table
- For Feature #5: Add `question_order` field to `quiz_attempts` table to store shuffled order (JSON array of question IDs)
