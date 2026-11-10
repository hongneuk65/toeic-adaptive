import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { TutorContext } from './useTutorContext';

export interface TutorQuestionContext {
  questionId: number;
  attemptId?: number;
  selectedAnswer?: string;
  label: string;
  skillCode?: string;
}
export interface TutorScreenContext {
  kind: 'vocabulary' | 'theory' | 'reading' | 'listening' | 'curriculum';
  resourceId: string;
  index?: number;
  mode?: string;
  response?: string;
  label: string;
}

export function TutorContextProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [question, setQuestion] = useState<TutorQuestionContext | null>(null);
  const [screen, setScreen] = useState<TutorScreenContext | null>(null);
  const screenOwner = useRef<symbol | null>(null);
  const updateScreenDraft = useCallback((resourceId: string, response: string) => {
    setScreen(current => current?.kind === 'vocabulary' && current.resourceId === resourceId && current.response !== response
      ? { ...current, response: response.slice(0, 3000) } : current);
  }, []);
  const registerScreen = useCallback((next: TutorScreenContext) => {
    const token = Symbol(); screenOwner.current = token; setScreen(next);
    return () => { if (screenOwner.current === token) { screenOwner.current = null; setScreen(null); } };
  }, []);
  const owner = useRef<symbol | null>(null);
  const currentQuestion = useRef<TutorQuestionContext | null>(null);
  const clear = useCallback(() => {
    currentQuestion.current = null;
    setQuestion(null);
    screenOwner.current = null;
    setScreen(null);
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
  const value = useMemo(() => ({ isOpen, question, screen, open, close, clear, register, registerScreen, updateScreenDraft }),
    [isOpen, question, screen, open, close, clear, register, registerScreen, updateScreenDraft]);
  return <TutorContext.Provider value={value}>{children}</TutorContext.Provider>;
}
