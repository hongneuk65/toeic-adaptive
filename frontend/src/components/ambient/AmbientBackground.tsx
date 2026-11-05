import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const preferenceKey = 'toeic:ambient-paused';
const motionQuery = '(prefers-reduced-motion: reduce)';

/** Decorative only: pause for focused tests, reduced motion, hidden tabs or a user preference. */
export function AmbientBackground() {
  const { pathname } = useLocation();
  const [paused] = useState(() => {
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
  return <>
    <div className="ambient-background" data-paused={paused || reduced || hidden || focused} aria-hidden="true">
      <div className="ambient-background-photo" />
      <div className="ambient-background-light" />
    </div>

  </>;
}
