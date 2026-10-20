import { useEffect } from 'react';
import '../../styles/interactive-motion.css';

const cards = '.prep-home-program-card, .prep-learning-card, .prep-folder-tile, .prep-exam-mode, .interactive-card:has(a, button)';
const actions = '.primary-button, .secondary-button, .app-start-action, .prep-home-hero-cta, .prep-home-white-button, .prep-home-blue-button, .prep-home-program-card > a';
const study = '.prep-learning-study, .prep-exam-room, .prep-flashcard-focus, .prep-quiz-page';

/** Delegated feedback: no React renders or document-wide frame loop. */
export function useInteractiveMotion() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    let active: HTMLElement | null = null;
    let overlay: HTMLSpanElement | null = null;
    let frame = 0;
    let point = { x: 0, y: 0 };
    const ripples = new Map<HTMLSpanElement, number>();
    const paused = () => !!document.querySelector('.home-motion-toggle[aria-pressed="true"]');
    const reset = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      active?.classList.remove('pointer-motion-active');
      active?.style.removeProperty('--pointer-rotate');
      active?.style.removeProperty('--pointer-x');
      active?.style.removeProperty('--pointer-y');
      overlay?.remove();
      overlay = null;
      active = null;
    };
    const clearRipples = () => {
      ripples.forEach((timer, element) => { window.clearTimeout(timer); element.remove(); });
      ripples.clear();
    };
    const move = (event: PointerEvent) => {
      if (reduced.matches || !fine.matches || event.pointerType !== 'mouse') { reset(); return; }
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>(cards) : null;
      if (!target || target.closest(study) || target.matches(':disabled, [aria-disabled="true"]') || paused()) { reset(); return; }
      if (target !== active) {
        reset();
        active = target;
        active.classList.add('pointer-motion-active');
        overlay = document.createElement('span');
        overlay.className = 'pointer-motion-light';
        overlay.setAttribute('aria-hidden', 'true');
        active.append(overlay);
      }
      point = { x: event.clientX, y: event.clientY };
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!active?.isConnected) { reset(); return; }
        const rect = active.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (point.x - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (point.y - rect.top) / rect.height));
        active.style.setProperty('--pointer-x', `${x * 100}%`);
        active.style.setProperty('--pointer-y', `${y * 100}%`);
        active.style.setProperty('--pointer-rotate', `${(.5 - y).toFixed(3)} ${((x - .5) * 1.2).toFixed(3)} 0 2.5deg`);
      });
    };
    const leave = (event: PointerEvent) => {
      if (!active || (event.relatedTarget instanceof Node && active.contains(event.relatedTarget))) return;
      reset();
    };
    const press = (event: PointerEvent) => {
      if (reduced.matches || event.button !== 0) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>(actions) : null;
      if (!target || target.closest(study) || target.matches(':disabled, [aria-disabled="true"]') || paused()) return;
      // A separate clipped layer leaves focus outlines and existing pseudo-elements intact.
      const layer = document.createElement('span');
      layer.className = 'interaction-ripple-layer';
      layer.setAttribute('aria-hidden', 'true');
      const bubble = document.createElement('span');
      bubble.className = 'interaction-ripple';
      const rect = target.getBoundingClientRect();
      const diameter = Math.max(rect.width, rect.height) * 2;
      bubble.style.width = bubble.style.height = `${diameter}px`;
      bubble.style.left = `${event.clientX - rect.left - diameter / 2}px`;
      bubble.style.top = `${event.clientY - rect.top - diameter / 2}px`;
      layer.append(bubble);
      target.append(layer);
      const remove = () => {
        window.clearTimeout(ripples.get(layer));
        ripples.delete(layer);
        layer.remove();
      };
      bubble.addEventListener('animationend', remove, { once: true });
      ripples.set(layer, window.setTimeout(remove, 650));
    };
    const preference = () => { reset(); clearRipples(); };
    const navigate = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest('a[href], .home-motion-toggle')) preference();
    };
    document.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerout', leave, { passive: true });
    document.addEventListener('pointerdown', press, { passive: true });
    document.addEventListener('click', navigate);
    window.addEventListener('popstate', preference);
    window.addEventListener('blur', reset);
    document.addEventListener('scroll', reset, { passive: true, capture: true });
    reduced.addEventListener('change', preference);
    fine.addEventListener('change', preference);
    return () => {
      reset(); clearRipples();
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerout', leave);
      document.removeEventListener('pointerdown', press);
      document.removeEventListener('click', navigate);
      window.removeEventListener('popstate', preference);
      document.removeEventListener('scroll', reset, true);
      window.removeEventListener('blur', reset);
      reduced.removeEventListener('change', preference);
      fine.removeEventListener('change', preference);
    };
  }, []);
}
