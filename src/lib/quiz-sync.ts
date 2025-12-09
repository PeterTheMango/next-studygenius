/**
 * Quiz Answer Sync Utility
 *
 * Provides local-first answer persistence with background sync to the server.
 * Handles offline scenarios by queueing failed requests and retrying when online.
 */

export interface QuizResponse {
  attemptId: string;
  questionId: string;
  answer: any;
  isCorrect: boolean | null; // null = pending evaluation
  score?: number | null; // null = pending evaluation
  timeSpent: number;
  timestamp: number; // When it was created locally
  evaluationStatus: 'pending' | 'evaluated' | 'failed'; // Track evaluation state
}

export interface SavedResponse {
  id: string;
  questionId: string;
  answer: any;
  isCorrect: boolean | null; // null = pending evaluation
  score: number | null;
  timeSpent: number;
  answeredAt: string;
  evaluationStatus: 'pending' | 'evaluated' | 'failed';
}

interface PendingSave {
  quizId: string;
  response: QuizResponse;
  retryCount: number;
  lastAttempt: number;
}

const STORAGE_KEY_PREFIX = 'quiz_responses_';
const PENDING_SAVES_KEY = 'quiz_pending_saves';
const MAX_RETRIES = 5;
const RETRY_DELAY = 2000; // 2 seconds

/**
 * Save a quiz response locally to localStorage
 */
export function saveResponseLocally(attemptId: string, response: QuizResponse): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${attemptId}`;
    const existingData = localStorage.getItem(key);
    const responses: Record<string, QuizResponse> = existingData ? JSON.parse(existingData) : {};

    // Upsert: overwrite if exists, add if new
    responses[response.questionId] = response;

    localStorage.setItem(key, JSON.stringify(responses));
  } catch (error) {
    console.error('Failed to save response locally:', error);
  }
}

/**
 * Get all locally saved responses for an attempt
 */
export function getLocalResponses(attemptId: string): QuizResponse[] {
  try {
    const key = `${STORAGE_KEY_PREFIX}${attemptId}`;
    const data = localStorage.getItem(key);
    if (!data) return [];

    const responses: Record<string, QuizResponse> = JSON.parse(data);
    return Object.values(responses);
  } catch (error) {
    console.error('Failed to get local responses:', error);
    return [];
  }
}

/**
 * Get a specific locally saved response
 */
export function getLocalResponse(attemptId: string, questionId: string): QuizResponse | null {
  try {
    const key = `${STORAGE_KEY_PREFIX}${attemptId}`;
    const data = localStorage.getItem(key);
    if (!data) return null;

    const responses: Record<string, QuizResponse> = JSON.parse(data);
    return responses[questionId] || null;
  } catch (error) {
    console.error('Failed to get local response:', error);
    return null;
  }
}

/**
 * Clear local responses for an attempt (after successful completion)
 */
export function clearLocalResponses(attemptId: string): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${attemptId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear local responses:', error);
  }
}

/**
 * Add a failed save to the pending queue
 */
function addToPendingQueue(quizId: string, response: QuizResponse): void {
  try {
    const data = localStorage.getItem(PENDING_SAVES_KEY);
    const pending: PendingSave[] = data ? JSON.parse(data) : [];

    // Check if this response is already pending (by attemptId + questionId)
    const existingIndex = pending.findIndex(
      p => p.response.attemptId === response.attemptId && p.response.questionId === response.questionId
    );

    if (existingIndex >= 0) {
      // Update existing pending save with new data
      pending[existingIndex] = {
        quizId,
        response,
        retryCount: pending[existingIndex].retryCount + 1,
        lastAttempt: Date.now(),
      };
    } else {
      // Add new pending save
      pending.push({
        quizId,
        response,
        retryCount: 0,
        lastAttempt: Date.now(),
      });
    }

    localStorage.setItem(PENDING_SAVES_KEY, JSON.stringify(pending));
  } catch (error) {
    console.error('Failed to add to pending queue:', error);
  }
}

/**
 * Remove a response from the pending queue
 */
function removeFromPendingQueue(attemptId: string, questionId: string): void {
  try {
    const data = localStorage.getItem(PENDING_SAVES_KEY);
    if (!data) return;

    const pending: PendingSave[] = JSON.parse(data);
    const filtered = pending.filter(
      p => !(p.response.attemptId === attemptId && p.response.questionId === questionId)
    );

    localStorage.setItem(PENDING_SAVES_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove from pending queue:', error);
  }
}

/**
 * Get all pending saves
 */
export function getPendingSaves(): PendingSave[] {
  try {
    const data = localStorage.getItem(PENDING_SAVES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to get pending saves:', error);
    return [];
  }
}

/**
 * Save a response to the server
 */
export async function saveResponseToServer(
  quizId: string,
  response: QuizResponse
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const res = await fetch(`/api/quizzes/${quizId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attemptId: response.attemptId,
        questionId: response.questionId,
        answer: response.answer,
        isCorrect: response.isCorrect,
        score: response.score,
        timeSpent: response.timeSpent,
        evaluationStatus: response.evaluationStatus,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to save answer');
    }

    const data = await res.json();

    // Remove from pending queue on success
    removeFromPendingQueue(response.attemptId, response.questionId);

    return { success: true, data };
  } catch (error: any) {
    console.error('Failed to save response to server:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Save a response with local-first approach and background sync
 */
export async function saveResponse(
  quizId: string,
  response: QuizResponse
): Promise<{ savedLocally: boolean; savedToServer: boolean; error?: string }> {
  // 1. Save locally first (always succeeds)
  saveResponseLocally(response.attemptId, response);

  // 2. Try to save to server in background
  const result = await saveResponseToServer(quizId, response);

  if (!result.success) {
    // 3. If server save fails, add to pending queue for retry
    addToPendingQueue(quizId, response);
    return {
      savedLocally: true,
      savedToServer: false,
      error: result.error,
    };
  }

  return {
    savedLocally: true,
    savedToServer: true,
  };
}

/**
 * Retry all pending saves
 */
export async function retryPendingSaves(): Promise<{
  attempted: number;
  succeeded: number;
  failed: number;
}> {
  const pending = getPendingSaves();

  if (pending.length === 0) {
    return { attempted: 0, succeeded: 0, failed: 0 };
  }

  let succeeded = 0;
  let failed = 0;

  for (const save of pending) {
    // Skip if max retries exceeded
    if (save.retryCount >= MAX_RETRIES) {
      console.warn('Max retries exceeded for response:', save.response.questionId);
      continue;
    }

    // Skip if last attempt was too recent
    if (Date.now() - save.lastAttempt < RETRY_DELAY) {
      continue;
    }

    const result = await saveResponseToServer(save.quizId, save.response);

    if (result.success) {
      succeeded++;
    } else {
      failed++;
      // Update retry count
      addToPendingQueue(save.quizId, save.response);
    }
  }

  return {
    attempted: pending.length,
    succeeded,
    failed,
  };
}

/**
 * Check if there are any pending saves for an attempt
 */
export function hasPendingSaves(attemptId: string): boolean {
  const pending = getPendingSaves();
  return pending.some(p => p.response.attemptId === attemptId);
}

/**
 * Get count of pending saves for an attempt
 */
export function getPendingSaveCount(attemptId: string): number {
  const pending = getPendingSaves();
  return pending.filter(p => p.response.attemptId === attemptId).length;
}

/**
 * Setup online/offline listeners to auto-retry when connection is restored
 */
export function setupSyncListeners(): () => void {
  const handleOnline = async () => {
    console.log('Connection restored, retrying pending saves...');
    const result = await retryPendingSaves();
    console.log(`Retry result: ${result.succeeded} succeeded, ${result.failed} failed`);
  };

  window.addEventListener('online', handleOnline);

  // Also try to sync periodically when online
  const intervalId = setInterval(async () => {
    if (navigator.onLine) {
      await retryPendingSaves();
    }
  }, 30000); // Every 30 seconds

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    clearInterval(intervalId);
  };
}

/**
 * Get count of pending evaluations for an attempt
 */
export function getPendingEvaluationCount(attemptId: string): number {
  const responses = getLocalResponses(attemptId);
  return responses.filter(r => r.evaluationStatus === 'pending').length;
}

/**
 * Check if there are any pending evaluations for an attempt
 */
export function hasPendingEvaluations(attemptId: string): boolean {
  return getPendingEvaluationCount(attemptId) > 0;
}

/**
 * Merge local and database responses, using the most recent version
 *
 * @param localResponses - Responses from localStorage
 * @param dbResponses - Responses from database
 * @returns Merged responses with most recent data
 */
export function mergeResponses(
  localResponses: QuizResponse[],
  dbResponses: SavedResponse[]
): Map<string, { answer: any; isCorrect: boolean | null; score?: number | null; timeSpent: number; evaluationStatus: 'pending' | 'evaluated' | 'failed' }> {
  const merged = new Map<string, { answer: any; isCorrect: boolean | null; score?: number | null; timeSpent: number; evaluationStatus: 'pending' | 'evaluated' | 'failed' }>();

  // First, add all database responses
  for (const dbResp of dbResponses) {
    merged.set(dbResp.questionId, {
      answer: typeof dbResp.answer === 'string' && (dbResp.answer.startsWith('{') || dbResp.answer.startsWith('['))
        ? JSON.parse(dbResp.answer)
        : dbResp.answer,
      isCorrect: dbResp.isCorrect,
      score: dbResp.score ?? undefined,
      timeSpent: dbResp.timeSpent,
      evaluationStatus: dbResp.evaluationStatus,
    });
  }

  // Then, overlay local responses if they're newer
  for (const localResp of localResponses) {
    const existing = merged.get(localResp.questionId);
    const dbResp = dbResponses.find(r => r.questionId === localResp.questionId);

    // If no DB response exists, or local is newer, use local
    if (!dbResp) {
      // Local only, use it
      merged.set(localResp.questionId, {
        answer: localResp.answer,
        isCorrect: localResp.isCorrect,
        score: localResp.score,
        timeSpent: localResp.timeSpent,
        evaluationStatus: localResp.evaluationStatus,
      });
    } else {
      // Compare timestamps: local.timestamp vs dbResp.answeredAt
      const localTime = localResp.timestamp;
      const dbTime = new Date(dbResp.answeredAt).getTime();

      // If local is newer (within 1 second tolerance for sync timing), use local
      if (localTime > dbTime + 1000) {
        merged.set(localResp.questionId, {
          answer: localResp.answer,
          isCorrect: localResp.isCorrect,
          score: localResp.score,
          timeSpent: localResp.timeSpent,
          evaluationStatus: localResp.evaluationStatus,
        });
      }
      // Otherwise, keep the DB version (already in merged)
    }
  }

  return merged;
}

/**
 * Calculate the starting question index based on answered questions
 * Returns the index of the first unanswered question
 *
 * @param questions - All questions in the quiz
 * @param answeredQuestionIds - Set of question IDs that have been answered
 * @returns Index of first unanswered question, or 0 if none answered
 */
export function getStartingQuestionIndex(
  questions: { id: string }[],
  answeredQuestionIds: Set<string>
): number {
  for (let i = 0; i < questions.length; i++) {
    if (!answeredQuestionIds.has(questions[i].id)) {
      return i;
    }
  }
  // All questions answered, return last question
  return Math.max(0, questions.length - 1);
}
