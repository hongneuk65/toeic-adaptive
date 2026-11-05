import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { TutorContext } from './useTutorContext';

export interface TutorQuestionContext {
  questionId: number;
  attemptId?: number;
  selectedAnswer?: string;
  label: string;
  skillCode?: string;
}

export function TutorContextProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [question, setQuestion] = useState<TutorQuestionContext | null>(null);
  const owner = useRef<symbol | null>(null);
  const currentQuestion = useRef<TutorQuestionContext | null>(null);
  const clear = useCallback(() => {
    currentQuestion.current = null;
    setQuestion(null);
  }, []);
  const close = useCallback(() => setOpen(false), []);
  const open = useCallback((next?: TutorQuestionContext) => {
    if (next) {
      currentQuestion.current = next;
      setQuestion(next);
    }
    setOpen(true);
  }, []);
  const register = useCallback((next: TutorQuestionContext) => {
    const token = Symbol();
    owner.current = token;
    currentQuestion.current = next;
    setQuestion(next);
    return () => {
      // An old question's cleanup cannot erase an explicit handoff to a newer one.
      // Keep the token on clear/reopen so leaving the same question still releases it.
      if (owner.current === token
        && currentQuestion.current?.questionId === next.questionId
        && currentQuestion.current?.attemptId === next.attemptId) {
        owner.current = null;
        currentQuestion.current = null;
        setQuestion(null);
        setOpen(false);
      }
    };
  }, []);
  const value = useMemo(() => ({ isOpen, question, open, close, clear, register }),
    [isOpen, question, open, close, clear, register]);
  return <TutorContext.Provider value={value}>{children}</TutorContext.Provider>;
}
