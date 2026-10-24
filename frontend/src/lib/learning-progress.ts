export const LEARNING_PROGRESS_UPDATED = 'learning-progress-updated';

/** Notify readers only after a durable learning result has been acknowledged. */
export function notifyLearningProgress() {
  window.dispatchEvent(new Event(LEARNING_PROGRESS_UPDATED));
}
