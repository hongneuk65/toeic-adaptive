import { createContext, useContext } from 'react';
export type OnboardingChoice = 'ASSESSMENT' | 'SELF_STUDY';
export interface LearningStatus { hasLearningActivity: boolean; onboardingChoice: OnboardingChoice | null; onboardingRequired: boolean }
export interface LearningStatusContextValue {
  status: LearningStatus | null; loading: boolean; error: string; saving: boolean;
  refresh: () => void; choose: (choice: OnboardingChoice) => Promise<void>;
}
export const LearningStatusContext = createContext<LearningStatusContextValue | null>(null);
export function useLearningStatus() {
  const value = useContext(LearningStatusContext);
  if (!value) throw new Error('LearningStatusProvider is required');
  return value;
}
export const learningActionLabel = (status: LearningStatus | null) => status ? status.hasLearningActivity ? 'Học tiếp' : 'Bắt đầu học' : 'Chọn bài học';
