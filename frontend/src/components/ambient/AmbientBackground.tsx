import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const preferenceKey = 'toeic:ambient-paused';
const motionQuery = '(prefers-reduced-motion: reduce)';

/** Decorative only: pause for focused tests, reduced motion, hidden tabs or a user preference. */
export function AmbientBackground() {
  const { pathname } = useLocation();
  const [paused, setPaused] = useState(() => {
    try { return localStorage.getItem(preferenceKey) === 'true'; } catch { return false; }
  });
  const [reduced, setReduced] = useState(() => window.matchMedia(motionQuery).matches);
  const [hidden, setHidden] = useState(() => document.hidden);
  const focused = /^\/exam\/\d+(?:\/review)?\/?$/.test(pathname) || /^\/placement\/?$/.test(pathname);
  useEffect(() => {
    const media = window.matchMedia(motionQuery);
    const changeMotion = () => setReduced(media.matches);
    const changeVisibility = () => setHidden(document.hidden);
    media.addEventListener('change', changeMotion);
    document.addEventListener('visibilitychange', changeVisibility);
    return () => {
      media.removeEventListener('change', changeMotion);
      document.removeEventListener('visibilitychange', changeVisibility);
    };
  }, []);
  const toggle = () => {
    const next = !paused;
    setPaused(next);
    try { localStorage.setItem(preferenceKey, String(next)); } catch { /* The current-tab choice still works. */ }
  };
  return <>
    <div className="ambient-background" data-paused={paused || reduced || hidden || focused} aria-hidden="true">
      <div className="ambient-background-photo" />
      <div className="ambient-background-light" />
    </div>
    {!focused && <button type="button" className="ambient-motion-toggle" onClick={toggle} disabled={reduced}
      aria-pressed={!paused && !reduced} aria-label={reduced ? 'Chuyển động nền đang tắt theo cài đặt thiết bị' : paused ? 'Bật chuyển động nền' : 'Tạm dừng nền'}>
      {reduced ? 'Nền tĩnh' : paused ? 'Bật chuyển động nền' : 'Tạm dừng nền'}
    </button>}
  </>;
}
