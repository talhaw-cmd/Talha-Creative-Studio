import { useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from './useAsync.js';

gsap.registerPlugin(ScrollTrigger);
export { gsap, ScrollTrigger };

// Reveal children matching `selector` as they scroll in. Content is never hidden
// when reduced motion is on, and always cleaned up on unmount.
export function useReveal(rootRef, selector = '[data-reveal]', deps = []) {
  const reduced = useReducedMotion();
  useLayoutEffect(() => {
    if (reduced || !rootRef.current) return undefined;
    const ctx = gsap.context(() => {
      gsap.utils.toArray(selector).forEach((el, i) => {
        gsap.from(el, {
          y: 28, opacity: 0, duration: 0.7, ease: 'power3.out', delay: (i % 4) * 0.05,
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        });
      });
    }, rootRef);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, ...deps]);
}

// Masked headline lines slide up once as they enter the viewport.
export function useSplitHeadings(rootRef, deps = []) {
  const reduced = useReducedMotion();
  useLayoutEffect(() => {
    if (reduced || !rootRef.current) return undefined;
    const ctx = gsap.context(() => {
      gsap.utils.toArray('[data-split]').forEach((el) => {
        gsap.from(el.querySelectorAll('.hl-inner'), {
          yPercent: 115, duration: 1, ease: 'power4.out', stagger: 0.1,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        });
      });
    }, rootRef);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, ...deps]);
}

// Cards rise in together, in batches, as they scroll into view.
export function useBatchIn(rootRef, selector, deps = []) {
  const reduced = useReducedMotion();
  useLayoutEffect(() => {
    if (reduced || !rootRef.current) return undefined;
    const ctx = gsap.context(() => {
      const els = gsap.utils.toArray(selector);
      if (!els.length) return;
      gsap.set(els, { y: 56, opacity: 0 });
      ScrollTrigger.batch(els, {
        start: 'top 92%', once: true,
        onEnter: (b) => gsap.to(b, { y: 0, opacity: 1, duration: 0.85, ease: 'power3.out', stagger: 0.09, overwrite: true }),
      });
    }, rootRef);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, ...deps]);
}
