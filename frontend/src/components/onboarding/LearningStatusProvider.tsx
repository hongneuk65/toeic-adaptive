import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { api, getErrorMessage } from '../../lib/api';
import { LearningStatusContext, type LearningStatus, type OnboardingChoice } from './useLearningStatus';

function validated(value: unknown): LearningStatus {
  const data = value as LearningStatus | null;
  if (!data || typeof data.hasLearningActivity !== 'boolean' || typeof data.onboardingRequired !== 'boolean'
    || ![null, 'ASSESSMENT', 'SELF_STUDY'].includes(data.onboardingChoice)) throw new Error('Chưa tải được tiến độ học.');
  return data;
}
export function LearningStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<LearningStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [revision, setRevision] = useState(0);
  const readController = useRef<AbortController | null>(null);
  const saveController = useRef<AbortController | null>(null);
  const savingRef = useRef(false);
  const mounted = useRef(true);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    const controller = new AbortController(); readController.current = controller;
    api<unknown>('/auth/learning-status', { signal: controller.signal }).then(value => {
      if (!controller.signal.aborted) { setStatus(validated(value)); setError(''); }
    }).catch(cause => { if (!controller.signal.aborted) setError(getErrorMessage(cause)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);
  useEffect(() => {
    mounted.current = true;
    const changed = () => { if (!savingRef.current) refresh(); };
    window.addEventListener('learning-progress-updated', changed);
    window.addEventListener('focus', changed);
    return () => { mounted.current = false; window.removeEventListener('learning-progress-updated', changed); window.removeEventListener('focus', changed); saveController.current?.abort(); };
  }, [refresh]);
  const choose = async (choice: OnboardingChoice) => {
    if (savingRef.current) throw new Error('Đang lưu lựa chọn.');
    savingRef.current = true; setSaving(true); readController.current?.abort(); setLoading(false);
    const controller = new AbortController(); saveController.current = controller;
    let timedOut = false;
    const timeout = window.setTimeout(() => { timedOut = true; controller.abort(); }, 10000);
    try {
      const result = validated(await api('/auth/onboarding', { method: 'POST', data: { choice }, signal: controller.signal }));
      if (controller.signal.aborted) throw new Error('Phiên học đã thay đổi.');
      setStatus(result); setError('');
    } catch (cause) {
      if (timedOut) throw new Error('Chưa nhận được phản hồi. Bạn có thể thử lại hoặc tự xem trang chủ trước.', { cause });
      throw cause;
    } finally {
      window.clearTimeout(timeout); savingRef.current = false;
      if (mounted.current) setSaving(false);
    }
  };
  return <LearningStatusContext.Provider value={{ status, loading, error, saving, refresh, choose }}>{children}</LearningStatusContext.Provider>;
}
