# Quiz Feature - TODO

## Features to Implement

### 1. Retry Incorrect Questions in Learning Mode

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

## Implementation Dependencies

**✅ Completed:**

- None

**Remaining features:**

1. Feature #1 (retry incorrect questions) requires tracking answer history and correctness

**Recommended Implementation Order:**

1. Implement Feature #1 (retry logic for learning mode) - **Most complex, benefits from other features**

**Still Needed:**

- For Feature #1 (retry incorrect questions): Track attempt number per question (1st attempt, 2nd attempt, etc.)
- Consider adding `retry_count` or `attempt_number` field in the responses table
- May need separate table for retry history to preserve original attempt data
