import { createContext, useContext, useEffect } from 'react';
import { type TutorQuestionContext } from './TutorContextProvider';
interface TutorState { isOpen: boolean; question: TutorQuestionContext | null; open: (question?: TutorQuestionContext) => void; close: () => void; clear: () => void; register: (question: TutorQuestionContext) => () => void }
export const TutorContext = createContext<TutorState | null>(null);
export function useTutorContext() {
  const context = useContext(TutorContext);
  if (!context) throw new Error('TutorContextProvider is required');
  return context;
}
export function useQuestionTutorContext(question: TutorQuestionContext | null) {
  const { register } = useTutorContext();
  const questionId = question?.questionId;
  const attemptId = question?.attemptId;
  const selectedAnswer = question?.selectedAnswer;
  const label = question?.label;
  const skillCode = question?.skillCode;
  useEffect(() => {
    if (!questionId || !label) return;
    return register({ questionId, attemptId, selectedAnswer, label, skillCode });
  }, [register, questionId, attemptId, selectedAnswer, label, skillCode]);
}
