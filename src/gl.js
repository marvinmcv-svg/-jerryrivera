import * as THREE from 'three';

// Floating "stage dust": gold + crimson bokeh particles lit like a spotlight.
export function initGL(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.z = 10;

  const isMobile = window.matchMedia('(max-width: 720px)').matches;
  const COUNT = isMobile ? 900 : 2200;
  const pos = new Float32Array(COUNT * 3);
  const seed = new Float32Array(COUNT);
  const size = new Float32Array(COUNT);
  const tint = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 30;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 30;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 16;
    seed[i] = Math.random() * 100;
    size[i] = Math.pow(Math.random(), 3) * 26 + 3; // mostly fine dust, few big bokeh
    tint[i] = Math.random() < 0.18 ? 1 : 0; // ~18% crimson
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aTint', new THREE.BufferAttribute(tint, 1));

  const uniforms = {
    uTime: { value: 0 },
    uScroll: { value: 0 },
    uMouse: { value: new THREE.Vector2() },
    uPixel: { value: renderer.getPixelRatio() },
    uIntensity: { value: 1 },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uTime, uScroll, uPixel;
      uniform vec2 uMouse;
      attribute float aSeed, aSize, aTint;
      varying float vAlpha, vTint;
      void main() {
        vec3 p = position;
        // slow upward drift, wrapping vertically
        p.y = mod(p.y + uTime * (0.15 + fract(aSeed) * 0.25) + uScroll * 6.0 + 15.0, 30.0) - 15.0;
        p.x += sin(uTime * 0.3 + aSeed) * 0.6;
        p.z += cos(uTime * 0.2 + aSeed * 1.3) * 0.5;
        // parallax: nearer particles move more with the mouse
        p.xy += uMouse * (p.z + 8.0) * 0.06;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float twinkle = 0.55 + 0.45 * sin(uTime * 1.6 + aSeed * 7.0);
        vAlpha = twinkle * smoothstep(-20.0, -3.0, mv.z);
        vTint = aTint;
        gl_PointSize = aSize * uPixel * (8.0 / -mv.z);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uIntensity;
      varying float vAlpha, vTint;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        a *= a;
        vec3 gold = vec3(0.98, 0.80, 0.48);
        vec3 crimson = vec3(1.0, 0.16, 0.24);
        vec3 col = mix(gold, crimson, vTint);
        gl_FragColor = vec4(col, a * vAlpha * 0.55 * uIntensity);
      }`,
  });
  const points = new THREE.Points(geo, mat);
  scene.add(points);

  const mouse = new THREE.Vector2();
  const target = new THREE.Vector2();
  window.addEventListener('pointermove', (e) => {
    target.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  });

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  let running = true;
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) loop(); });

  const t0 = performance.now();
  function loop() {
    if (!running) return;
    uniforms.uTime.value = (performance.now() - t0) / 1000;
    mouse.lerp(target, 0.05);
    uniforms.uMouse.value.copy(mouse);
    points.rotation.z = mouse.x * 0.05;
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  loop();

  return {
    setScroll(v) { uniforms.uScroll.value = v; },
    setIntensity(v) { uniforms.uIntensity.value = v; },
  };
}
