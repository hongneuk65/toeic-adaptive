import { createContext, useContext, useEffect } from 'react';
import { type TutorQuestionContext, type TutorScreenContext } from './TutorContextProvider';
interface TutorState { isOpen: boolean; question: TutorQuestionContext | null; screen: TutorScreenContext | null; open: (question?: TutorQuestionContext) => void; close: () => void; clear: () => void; register: (question: TutorQuestionContext) => () => void; registerScreen: (screen: TutorScreenContext) => () => void; updateScreenDraft: (resourceId: string, response: string) => void }
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
export function useScreenTutorContext(screen: TutorScreenContext | null) {
  const { registerScreen } = useTutorContext();
  const serialized = screen ? JSON.stringify(screen) : '';
  useEffect(() => { if (serialized) return registerScreen(JSON.parse(serialized) as TutorScreenContext); }, [registerScreen, serialized]);
}

export function useVocabularyTutorDraft(cardId: number, response: string) {
  const context = useContext(TutorContext);
  const update = context?.updateScreenDraft;
  const resourceId = context?.screen?.resourceId;
  const mode = context?.screen?.mode;
  useEffect(() => { update?.(String(cardId), response); }, [update, cardId, response, resourceId, mode]);
}
