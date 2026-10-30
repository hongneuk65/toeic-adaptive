import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../../lib/api';
import { useLearningStatus, type OnboardingChoice } from './useLearningStatus';
import '../../styles/onboarding.css';

export function OnboardingPrompt() {
  const { status, saving, choose } = useLearningStatus();
  const location = useLocation(); const navigate = useNavigate();
  const dialog = useRef<HTMLDialogElement>(null);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState('');
  const focusedWorkspace = /^\/(?:placement|exam)(?:\/|$)/.test(location.pathname);
  const open = status?.onboardingRequired === true && !dismissed && !focusedWorkspace;
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    else if (!open && element.open) element.close();
    return () => { if (element.open) element.close(); };
  }, [open]);
  const start = async (choice: OnboardingChoice) => {
    setError('');
    try { await choose(choice); navigate(choice === 'ASSESSMENT' ? '/placement' : '/recommendations'); }
    catch (cause) { setError(getErrorMessage(cause, 'Chưa lưu được lựa chọn. Bạn có thể thử lại.')); }
  };
  return <dialog ref={dialog} className="onboarding-dialog" aria-labelledby="onboarding-title" aria-describedby="onboarding-description" onCancel={event => { event.preventDefault(); if (!saving) setDismissed(true); }}>
    <div className="onboarding-content">
      <p className="onboarding-eyebrow">CHÀO MỪNG BẠN ĐẾN VỚI TOEIC ADAPTIVE</p>
      <h2 id="onboarding-title">Bắt đầu theo cách của bạn</h2>
      <p id="onboarding-description">Một bài đánh giá ngắn giúp hệ thống hiểu điểm xuất phát và gợi ý nội dung phù hợp. Bạn cũng có thể tự chọn bài học ngay.</p>
      <div className="onboarding-options">
        <section><span className="onboarding-option-number" aria-hidden="true">01</span><h3>Đánh giá đầu vào</h3><p>Câu hỏi nghe và đọc điều chỉnh theo câu trả lời. Kết quả giúp định hướng học, không phải điểm TOEIC chính thức.</p><button autoFocus className="primary-button" disabled={saving} onClick={() => void start('ASSESSMENT')}>{saving ? 'Đang lưu lựa chọn…' : 'Làm test đầu vào'}</button></section>
        <section><span className="onboarding-option-number" aria-hidden="true">02</span><h3>Tự khám phá bài học</h3><p>Chọn kiến thức, từ vựng, nghe hoặc đọc. Gợi ý sẽ rõ hơn khi bạn có thêm kết quả luyện tập.</p><button className="secondary-button" disabled={saving} onClick={() => void start('SELF_STUDY')}>Tự học trước</button></section>
      </div>
      {error && <p className="onboarding-error" role="alert">{error}</p>}
      <p className="onboarding-note">Không bắt buộc làm ngay. Bạn luôn có thể mở đánh giá đầu vào từ trang Gợi ý học.</p>
      <button className="onboarding-dismiss" disabled={saving} onClick={() => setDismissed(true)}>Để mình xem trang chủ trước</button>
    </div>
  </dialog>;
}
