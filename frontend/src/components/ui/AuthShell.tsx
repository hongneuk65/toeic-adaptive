import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { DuckMascot } from '../mascot/DuckMascot';
import '../../styles/prep-journey.css';

interface AuthShellProps {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <main className="prep-auth">
      <section className="prep-auth-form">
        <Link to="/login" className="prep-auth-brand"><span aria-hidden="true" className="prep-auth-monogram">TA</span>TOEIC Adaptive</Link>
        <div className="prep-auth-form-content">
          <header><h1>{title}</h1><p>{description}</p></header>
          {children}
          <div className="prep-auth-footer">{footer}</div>
        </div>
      </section>
      <aside className="prep-auth-visual" aria-label="Luyện TOEIC cùng TOEIC Adaptive">
        <div><p className="prep-auth-eyebrow">Từng bước tiến bộ</p><h2>Sẵn sàng cho<br />mục tiêu TOEIC<br />của bạn.</h2><p className="prep-auth-copy">Luyện nghe, đọc và ôn lại kỹ năng cần cải thiện theo nhịp học của bạn.</p></div>
        <DuckMascot className="prep-auth-duck" motion="none" />
        <div className="prep-auth-topics" aria-hidden="true"><span>Listening</span><span>Reading</span><span>Vocabulary</span></div>
      </aside>
    </main>
  );
}
