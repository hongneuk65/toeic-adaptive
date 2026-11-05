import { useEffect } from 'react';

/** Add continuity to newly mounted learning panels without remounting a task. */
export function useLearningMotion(pathname: string) {
  useEffect(() => {
    const main = document.getElementById('learning-main');
    if (!main || !/^\/(reading|listening|flashcards)(?:\/|$)/.test(pathname)) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const active = new Set<Animation>();
    const seen = new WeakSet<Element>();
    const scope = '.practice-studio,.vocabulary-studio';
    const panels = '.prep-question-surface,.vocabulary-recall,.vocabulary-study-controls';
    const cancel = () => { active.forEach(animation => animation.cancel()); active.clear(); };
    const syncPreference = () => {
      main.dataset.learningMotion = preference.matches ? 'reduced' : 'full';
      if (preference.matches) cancel();
    };
    const reveal = (element: Element) => {
      if (seen.has(element)) return;
      seen.add(element);
      if (preference.matches || !(element instanceof HTMLElement) || typeof element.animate !== 'function') return;
      // Do not transform page roots: a transformed ancestor changes fixed dialogs.
      const root = element.matches(scope);
      const animation = element.animate(root
        ? [{ opacity: .65 }, { opacity: 1 }]
        : [{ opacity: .5, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }],
      { duration: root ? 180 : 220, easing: 'cubic-bezier(.16,1,.3,1)' });
      animation.id = root ? 'learning-route-enter' : 'learning-task-enter';
      active.add(animation);
      animation.addEventListener('finish', () => active.delete(animation), { once: true });
      animation.addEventListener('cancel', () => active.delete(animation), { once: true });
    };
    const scan = (node: Element) => {
      if (node.matches(scope)) reveal(node);
      else if (node.matches(panels) && node.closest(scope)) reveal(node);
      node.querySelectorAll(`${scope},${panels}`).forEach(element => {
        if (element.matches(scope) || element.closest(scope)) reveal(element);
      });
    };
    syncPreference();
    scan(main);
    // Child mounts only: typing, selected answers and streamed text never replay a task.
    const observer = new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(node => { if (node instanceof Element) scan(node); }));
    });
    observer.observe(main, { childList: true, subtree: true });
    preference.addEventListener('change', syncPreference);
    return () => {
      observer.disconnect();
      preference.removeEventListener('change', syncPreference);
      cancel();
      delete main.dataset.learningMotion;
    };
  }, [pathname]);
}
