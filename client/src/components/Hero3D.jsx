import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../lib/useAsync.js';

// Signature 3D object. Three.js is imported lazily; static fallback for reduced motion / no WebGL.
export default function Hero3D() {
  const mount = useRef(null);
  const reduced = useReducedMotion();
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    if (reduced) { setFallback(true); return undefined; }
    let disposed = false; let cleanup = () => {};
    (async () => {
      try {
        const THREE = await import('three');
        if (disposed || !mount.current) return;
        const el = mount.current;
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
        const mobile = window.matchMedia('(max-width: 700px)').matches;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.25 : 2));
        el.appendChild(renderer.domElement);
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
        camera.position.z = 6;
        const geo = new THREE.TorusKnotGeometry(1.15, 0.38, mobile ? 120 : 220, mobile ? 16 : 32);
        const mat = new THREE.MeshStandardMaterial({ color: 0x28c37b, metalness: 0.55, roughness: 0.25 });
        const mesh = new THREE.Mesh(geo, mat);
        scene.add(mesh);
        scene.add(new THREE.AmbientLight(0xffffff, 0.7));
        const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(3, 4, 5); scene.add(key);

        const size = () => {
          const { clientWidth: w, clientHeight: h } = el;
          renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
        };
        size();
        const ro = new ResizeObserver(size); ro.observe(el);

        const target = { x: 0, y: 0 };
        const onMove = (e) => {
          const r = el.getBoundingClientRect();
          target.x = ((e.clientX - r.left) / r.width - 0.5) * 0.9;
          target.y = ((e.clientY - r.top) / r.height - 0.5) * 0.9;
        };
        const canHover = window.matchMedia('(hover: hover)').matches;
        if (canHover) window.addEventListener('pointermove', onMove);

        let visible = true; let raf = 0;
        const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) loop(); });
        io.observe(el);
        const loop = () => {
          if (!visible || disposed) return;
          mesh.rotation.y += 0.004;
          mesh.rotation.x += (target.y - mesh.rotation.x) * 0.04;
          mesh.position.x += (target.x - mesh.position.x) * 0.04;
          renderer.render(scene, camera);
          raf = requestAnimationFrame(loop);
        };
        loop();
        cleanup = () => {
          cancelAnimationFrame(raf); io.disconnect(); ro.disconnect();
          window.removeEventListener('pointermove', onMove);
          geo.dispose(); mat.dispose(); renderer.dispose(); renderer.domElement.remove();
        };
      } catch { setFallback(true); }
    })();
    return () => { disposed = true; cleanup(); };
  }, [reduced]);

  if (fallback) return <div className="hero3d fallback" aria-hidden="true"><div className="blob" /></div>;
  return <div className="hero3d" ref={mount} aria-hidden="true" />;
}
