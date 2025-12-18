/**
 * Utility functions for managing localStorage related to quiz responses
 */

export function clearQuestionAnswered(questionId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`answered_${questionId}`);
}

export function clearAllAnsweredQuestions(): void {
  if (typeof window === 'undefined') return;
  // Clear all localStorage entries that start with "answered_"
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('answered_')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

export function isQuestionAnswered(questionId: string): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(`answered_${questionId}`) === 'true';
}

export function markQuestionAnswered(questionId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`answered_${questionId}`, 'true');
}

