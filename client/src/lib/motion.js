import { useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from './useAsync.js';

gsap.registerPlugin(ScrollTrigger);

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
