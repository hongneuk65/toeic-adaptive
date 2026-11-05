import type { ButtonHTMLAttributes } from 'react';
import './media-controls.css';

export function MediaButton({ label, kind = 'speaker', active = false, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; kind?: 'speaker' | 'mic'; active?: boolean }) {
  return <button type="button" {...props} aria-label={label} title={label} className={`media-circle media-circle-${kind} ${className}`} data-active={active || undefined}>
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {active ? kind === 'mic' ? <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" /> : <><path d="M8 5v14M16 5v14" strokeWidth="3" /></> : kind === 'mic' ? <><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" /></> : <><path d="m11 4-6 5H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14" /></>}
    </svg>
  </button>;
}
