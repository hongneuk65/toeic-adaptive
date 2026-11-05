import { useEffect, useState } from 'react';
const key = 'toeic:color-theme';
const eventName = 'toeic:color-theme-changed';
type Theme = 'light' | 'dark';
const systemTheme = (): Theme => window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
function preference(): Theme | null { try { const value = localStorage.getItem(key); return value === 'light' || value === 'dark' ? value : null; } catch { return null; } }
function apply(theme: Theme) { document.documentElement.dataset.theme = theme; document.documentElement.style.colorScheme = theme; }
export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>(() => preference() ?? systemTheme());
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => { const next = preference() ?? (media.matches ? 'dark' : 'light'); apply(next); setTheme(next); };
    const themed = (event: Event) => { const value = (event as CustomEvent<Theme>).detail; if (value === 'light' || value === 'dark') { apply(value); setTheme(value); } };
    const storage = (event: StorageEvent) => { if (event.key === key || event.key === null) update(); };
    update(); media.addEventListener('change', update); window.addEventListener('storage', storage); window.addEventListener(eventName, themed);
    return () => { media.removeEventListener('change', update); window.removeEventListener('storage', storage); window.removeEventListener(eventName, themed); };
  }, []);
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(key, next); } catch { /* Apply for this visit when storage is unavailable. */ }
    apply(next); setTheme(next); window.dispatchEvent(new CustomEvent(eventName, { detail: next }));
  };
  const label = theme === 'dark' ? 'Bật giao diện sáng' : 'Bật giao diện tối';
  return <button type="button" className={`theme-toggle ${className}`} onClick={toggle} aria-label={label} title={label} aria-pressed={theme === 'dark'}>
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{theme === 'dark' ? <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5"/></> : <path d="M20.8 13.4A9 9 0 0 1 10.6 3.2a9 9 0 1 0 10.2 10.2Z"/>}</svg>
  </button>;
}
