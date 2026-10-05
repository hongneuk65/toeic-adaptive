import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface AuthShellProps {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <main className="study-desk page-enter flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <Link to="/login" className="mb-8 flex items-center gap-3 text-lg font-semibold tracking-tight text-ink-dark">
        <span className="study-stamp flex h-10 w-10 items-center justify-center text-sm font-bold">TA</span>
        TOEIC Adaptive
      </Link>
      <section className="notebook-sheet w-full max-w-[440px] px-10 py-8 sm:px-12">
        <div className="mb-7 flex items-center justify-between gap-3 border-b border-paper-kraft pb-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-medium">Sổ tay luyện TOEIC</span>
          <span aria-hidden="true" className="notebook-tab">Bắt đầu</span>
        </div>
        <header className="mb-7">
          <h1 className="notebook-title text-3xl font-semibold tracking-tight text-ink-dark">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-ink-medium">{description}</p>
        </header>
        {children}
        <div className="mt-7 border-t border-paper-kraft pt-5 text-center text-sm text-ink-medium">{footer}</div>
      </section>
      <p className="mt-6 text-xs text-ink-light">Học theo nhịp của bạn. Tiến bộ mỗi ngày.</p>
    </main>
  );
}
