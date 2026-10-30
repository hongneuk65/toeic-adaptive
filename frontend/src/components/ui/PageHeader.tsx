import type { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  variant?: 'feature' | 'compact';
}

export function PageHeader({ eyebrow, title, description, actions, variant = 'feature' }: PageHeaderProps) {
  return (
    <header className={`page-header page-header-${variant}`}>
      <div className="page-header-copy min-w-0">
        {eyebrow && (
          <p className="page-header-eyebrow mb-2 text-xs font-semibold text-ink-medium">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-2xl font-semibold tracking-tight leading-tight text-ink-dark sm:text-3xl">
          {title}
        </h1>
        {description && <p className="page-header-description mt-2 max-w-2xl text-sm leading-relaxed text-ink-medium">{description}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </header>
  );
}
