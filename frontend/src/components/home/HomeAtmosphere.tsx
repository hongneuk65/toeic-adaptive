import { useEffect, useRef } from 'react';
import './home-atmosphere.css';

/** Optional decorative layer: the hero's CSS remains the WebGL fallback. */
export function HomeAtmosphere({ paused = false }: { paused?: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const hero = host?.parentElement;
    if (!host || !hero) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const ship = host.querySelector<HTMLElement>('.galaxy-cursor-ship');
    let lightFrame = 0;
    const lightPointer = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || !finePointer.matches) return;
      cancelAnimationFrame(lightFrame);
      lightFrame = requestAnimationFrame(() => {
        const rect = hero.getBoundingClientRect();
        ship?.style.setProperty('--ship-x', `${event.clientX - rect.left}px`);
        ship?.style.setProperty('--ship-y', `${event.clientY - rect.top}px`);
        host.classList.add('galaxy-cursor-visible');
        if (preference.matches || paused) return;
        host.style.setProperty('--galaxy-light-x', `${(event.clientX - rect.left) / rect.width * 100}%`);
        host.style.setProperty('--galaxy-light-y', `${(event.clientY - rect.top) / rect.height * 100}%`);
        host.classList.add('galaxy-light-visible');
      });
    };
    const lightLeave = () => {
      cancelAnimationFrame(lightFrame);
      host.classList.remove('galaxy-light-visible');
      host.classList.remove('galaxy-cursor-visible');
    };
    hero.addEventListener('pointermove', lightPointer, { passive: true });
    hero.addEventListener('pointerleave', lightLeave);
    window.addEventListener('blur', lightLeave);
    preference.addEventListener('change', lightLeave);
    let stopScene = () => {};
    let generation = 0;

    const configure = () => {
      const current = ++generation;
      stopScene();
      stopScene = () => {};
      if (preference.matches || paused) return;

      void import('three').then(THREE => {
        if (generation !== current) return;
        let renderer: InstanceType<typeof THREE.WebGLRenderer>;
        try {
          renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
        } catch {
          return;
        }
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-10, 10, 6, -6, .1, 100);
        camera.position.z = 20;
        const orbit = new THREE.Group();
        scene.add(orbit);
        const sparkGeometry = new THREE.BufferGeometry();
        const starCount = window.innerWidth < 640 ? 280 : 900;
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);
        for (let index = 0; index < starCount; index++) {
          // A deterministic spiral galaxy with a quiet centre for the heading.
          const radius = 2.8 + Math.sqrt(index / starCount) * 10;
          const angle = index * 2.399963 + radius * .22;
          positions[index * 3] = Math.cos(angle) * radius;
          positions[index * 3 + 1] = Math.sin(angle) * radius * .65;
          positions[index * 3 + 2] = Math.sin(index * 13.37) * 5;
          const color = new THREE.Color(index % 5 === 0 ? 0xc4a7ff : index % 3 === 0 ? 0x61dcff : 0xe3eeff);
          colors.set([color.r, color.g, color.b], index * 3);
        }
        sparkGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        sparkGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        const sparkMaterial = new THREE.PointsMaterial({ vertexColors: true, size: .035, transparent: true, opacity: .75, depthWrite: false, blending: THREE.AdditiveBlending });
        const sparks = new THREE.Points(sparkGeometry, sparkMaterial);
        scene.add(sparks);
        scene.add(new THREE.AmbientLight(0x8aa8d9, 1.1));
        const sunlight = new THREE.DirectionalLight(0xffeed9, 3);
        sunlight.position.set(-8, 7, 12);
        scene.add(sunlight);
        const rim = new THREE.DirectionalLight(0x609dff, 1.5);
        rim.position.set(8, -3, -4);
        scene.add(rim);
        // Locally generated, seamless surface maps; no external texture requests.
        const textures: InstanceType<typeof THREE.CanvasTexture>[] = [];
        const surface = (kind: number) => {
          const image = document.createElement('canvas');
          image.width = 512; image.height = 256;
          const context = image.getContext('2d')!;
          const pixels = context.createImageData(512, 256);
          for (let y = 0; y < 256; y++) for (let x = 0; x < 512; x++) {
            const u = x / 512 * Math.PI * 2;
            const v = y / 256 * Math.PI;
            const detail = Math.sin(u * 13 + Math.sin(v * 17) * 2) * Math.sin(v * 21) + Math.cos(u * 27 - v * 31) * .3;
            const band = Math.sin(v * 42 + Math.sin(u * 3) * .7 + detail * .6);
            const land = Math.sin(u * 3 + Math.sin(v * 5)) + Math.cos(u * 7 - v * 9) * .45 + detail * .2;
            const base = kind === 0 ? (land > .3 ? [58, 105, 87] : [27, 79, 134]) : kind === 1 ? [177 + band * 30, 139 + band * 25, 103 + band * 22] : [151 + detail * 22, 78 + detail * 12, 53 + detail * 9];
            const cloud = kind === 0 ? Math.max(0, Math.sin(u * 8 + v * 19 + detail) - .55) * 160 : 0;
            const offset = (y * 512 + x) * 4;
            for (let channel = 0; channel < 3; channel++) pixels.data[offset + channel] = Math.min(255, base[channel] + detail * 6 + cloud);
            pixels.data[offset + 3] = 255;
          }
          context.putImageData(pixels, 0, 0);
          const texture = new THREE.CanvasTexture(image);
          texture.colorSpace = THREE.SRGBColorSpace;
          textures.push(texture);
          return texture;
        };
        const planetGeometry = new THREE.SphereGeometry(1, 48, 32);
        const planets = [1.05, 1.45, .48].map((size, index) => {
          const map = surface(index);
          const material = new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: index === 1 ? .025 : .065, roughness: .92, metalness: .02 });
          const mesh = new THREE.Mesh(planetGeometry, material);
          mesh.scale.setScalar(size);
          mesh.rotation.z = [.25, -.32, .15][index];
          orbit.add(mesh);
          return mesh;
        });
        const satellite = new THREE.Group();
        const metal = new THREE.MeshStandardMaterial({ color: 0xc6cfdb, metalness: .75, roughness: .35 });
        const solar = new THREE.MeshStandardMaterial({ color: 0x173d78, metalness: .5, roughness: .4 });
        const bodyGeometry = new THREE.BoxGeometry(.45, .55, .4);
        satellite.add(new THREE.Mesh(bodyGeometry, metal));
        const panelGeometry = new THREE.BoxGeometry(.85, .48, .035);
        const strutGeometry = new THREE.BoxGeometry(2.4, .025, .025);
        satellite.add(new THREE.Mesh(strutGeometry, metal));
        [-1, 1].forEach(side => {
          const panel = new THREE.Mesh(panelGeometry, solar);
          panel.position.x = side * .82;
          satellite.add(panel);
          for (let cell = -2; cell <= 2; cell++) {
            const strip = new THREE.Mesh(new THREE.BoxGeometry(.012, .47, .012), metal);
            strip.position.set(side * .82 + cell * .16, 0, .025);
            satellite.add(strip);
          }
        });
        const dishGeometry = new THREE.SphereGeometry(.22, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2);
        const dish = new THREE.Mesh(dishGeometry, metal);
        dish.position.y = .37;
        satellite.add(dish);
        satellite.rotation.set(.4, .3, -.5);
        orbit.add(satellite);
        const debrisGeometry = new THREE.DodecahedronGeometry(1, 0);
        const debrisMaterial = new THREE.MeshStandardMaterial({ color: 0x7f899a, roughness: 1 });
        const debris = Array.from({ length: 12 }, (_, index) => {
          const fragment = new THREE.Mesh(debrisGeometry, debrisMaterial);
          fragment.scale.set(.035 + index % 3 * .018, .05 + index % 4 * .012, .03);
          orbit.add(fragment);
          return fragment;
        });
        const canvas = renderer.domElement;
        canvas.setAttribute('aria-hidden', 'true');
        host.append(canvas);
        let frame = 0;
        let lastFrame = 0;
        let elapsed = 0;
        let visible = false;
        let lost = false;
        let disposed = false;
        const target = { x: 0, y: 0 };
        const eased = { x: 0, y: 0 };
        const resize = () => {
          const width = host.clientWidth;
          const height = host.clientHeight;
          if (!width || !height) return;
          const extent = 6 * width / height;
          camera.left = -extent;
          camera.right = extent;
          camera.updateProjectionMatrix();
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 640 ? 1 : 1.5));
          renderer.setSize(width, height);
          sparks.scale.x = extent / 10;
          planets[0].position.set(-extent * .82, -2.2, 1);
          planets[1].position.set(extent * .87, 1.1, -1);
          planets[2].position.set(-extent * .65, 3.8, -2);
          satellite.position.set(-extent * .76, 1.6, 2);
          satellite.scale.setScalar(width < 640 ? .5 : .8);
          debris.forEach((fragment, index) => fragment.position.set((index % 2 ? 1 : -1) * extent * (.72 + index % 3 * .07), -4.2 + index * .72, -1));
        };
        const tick = (now: number) => {
          if (disposed || lost || !visible || document.hidden) { frame = 0; return; }
          frame = requestAnimationFrame(tick);
          if (now - lastFrame < 1000 / 30) return;
          const delta = lastFrame ? Math.min((now - lastFrame) / 1000, .05) : 0;
          lastFrame = now;
          elapsed += delta;
          eased.x += (target.x - eased.x) * .08;
          eased.y += (target.y - eased.y) * .08;
          orbit.rotation.y = eased.x * .12;
          orbit.rotation.x = eased.y * .08;
          sparks.position.y = Math.sin(elapsed * .35) * .12;
          sparks.rotation.z = elapsed * .012;
          sparks.rotation.y = eased.x * .055;
          sparks.rotation.x = eased.y * .04;
          planets.forEach((planet, index) => {
            planet.rotation.y = elapsed * (.055 + index * .015);
            planet.position.y = [-2.2, 1.1, 3.8][index] + Math.sin(elapsed * .24 + index * 2) * .18;
          });
          satellite.rotation.y = .3 + elapsed * .08;
          satellite.rotation.z = -.5 + Math.sin(elapsed * .3) * .12;
          satellite.position.y = 1.6 + Math.sin(elapsed * .35) * .22;
          debris.forEach((fragment, index) => {
            fragment.rotation.set(elapsed * .09 + index, elapsed * .12 + index, index);
            fragment.position.y = -4.2 + index * .72 + Math.sin(elapsed * .2 + index) * .12;
          });
          renderer.render(scene, camera);
        };
        const resume = () => {
          if (visible && !document.hidden && !lost && !disposed && !frame) {
            lastFrame = 0;
            frame = requestAnimationFrame(tick);
          } else if ((!visible || document.hidden) && frame) {
            cancelAnimationFrame(frame);
            frame = 0;
          }
        };
        const pointer = (event: PointerEvent) => {
          if (event.pointerType !== 'mouse') return;
          const rect = hero.getBoundingClientRect();
          target.x = (event.clientX - rect.left) / rect.width * 2 - 1;
          target.y = (event.clientY - rect.top) / rect.height * 2 - 1;
        };
        const leave = () => { target.x = 0; target.y = 0; };
        const contextLost = (event: Event) => {
          event.preventDefault();
          lost = true;
          host.dataset.unavailable = 'true';
          cancelAnimationFrame(frame);
          frame = 0;
        };
        const observer = new IntersectionObserver(entries => {
          visible = entries[0]?.isIntersecting ?? false;
          resume();
        });
        const resizeObserver = new ResizeObserver(resize);
        observer.observe(hero);
        resizeObserver.observe(host);
        document.addEventListener('visibilitychange', resume);
        hero.addEventListener('pointermove', pointer, { passive: true });
        hero.addEventListener('pointerleave', leave);
        canvas.addEventListener('webglcontextlost', contextLost);
        delete host.dataset.unavailable;
        stopScene = () => {
          disposed = true;
          cancelAnimationFrame(frame);
          observer.disconnect();
          resizeObserver.disconnect();
          document.removeEventListener('visibilitychange', resume);
          hero.removeEventListener('pointermove', pointer);
          hero.removeEventListener('pointerleave', leave);
          canvas.removeEventListener('webglcontextlost', contextLost);
          sparkGeometry.dispose();
          sparkMaterial.dispose();
          planetGeometry.dispose();
          planets.forEach(planet => planet.material.dispose());
          textures.forEach(texture => texture.dispose());
          satellite.traverse(object => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
          metal.dispose(); solar.dispose();
          debrisGeometry.dispose(); debrisMaterial.dispose();
          renderer.dispose();
          renderer.forceContextLoss();
          canvas.remove();
        };
        resize();
      }).catch(() => {
        if (generation === current) stopScene();
        // Keep the CSS hero when the optional chunk or WebGL setup cannot load.
      });
    };
    configure();
    preference.addEventListener('change', configure);
    return () => {
      lightLeave();
      hero.removeEventListener('pointermove', lightPointer);
      hero.removeEventListener('pointerleave', lightLeave);
      window.removeEventListener('blur', lightLeave);
      preference.removeEventListener('change', lightLeave);
      generation++;
      preference.removeEventListener('change', configure);
      stopScene();
    };
  }, [paused]);

  return <div ref={hostRef} className="home-atmosphere" aria-hidden="true"><div className="galaxy-cursor-ship"><svg viewBox="0 0 48 64" fill="none"><g className="galaxy-ship-exhaust"><path d="M18 42Q24 74 30 42" fill="#FF9C43" /><path d="M21 42Q24 61 27 42" fill="#BEF7FF" /></g><path d="M17 26 7 43l12-3m12-14 10 17-12-3" fill="#719DDC" stroke="#D0E9FF" strokeWidth="1.5" /><path d="M24 3c-9 9-12 23-7 38h14c5-15 2-29-7-38Z" fill="#E7F3FF" stroke="#90B9EA" strokeWidth="1.5" /><circle cx="24" cy="23" r="5" fill="#39B8E5" stroke="#37629D" strokeWidth="2" /><path d="M20 41h8" stroke="#416595" strokeWidth="4" strokeLinecap="round" /></svg></div></div>;
}
