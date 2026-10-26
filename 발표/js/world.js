// three.js 무대: 렌더러, 빛(밤↔낮), 카메라 자세, 틸트시프트, 화면 고정 라벨(pin), 품질 단계
(function () {
  const T = THREE;
  const W = D.world = {};

  const NIGHT = new T.Color('#0A0A0F');
  const PAPER = new T.Color('#E6DFD1');

  // 카메라 자세. sx/sy 는 화면에서 장면을 밀어 두는 양(px)이다. 종이 카드가 덮는 쪽을 비워 둔다.
  W.POSES = {
    idle:      { p: [2.5, 2.1, 0.9], t: [2.5, 1.25, -3.55], fov: 26, tilt: 0 },
    machine:   { p: [2.5, 1.66, -0.1], t: [2.5, 1.38, -3.55], fov: 26, tilt: 0 },
    wide:      { p: [10.5, 9.6, 12.5], t: [0, 0.3, 0.2], fov: 28, tilt: 1 },
    class:     { p: [5.6, 6.4, -4.4], t: [0.2, 0.2, 0.4], fov: 34, sy: -170, tilt: 0.7 },
    top:       { p: [0, 11.8, 8.4], t: [0, 0, 0.9], fov: 28, tilt: 0.8 },
    info:      { p: [5.6, 2.7, 1.3], t: [2.6, 0.75, -0.7], fov: 34, tilt: 0.5 },
    social:    { p: [0.9, 5.0, 6.2], t: [-2.6, 0.5, 0.9], fov: 30, sx: -300, tilt: 0.7 },
    math:      { p: [2.6, 4.2, 3.4], t: [0, 0.7, -0.5], fov: 28, sx: -300, tilt: 0.6 },
    layers:    { p: [2.2, 3.0, -4.15], t: [0.2, 1.7, -0.5], fov: 40, sx: -150, tilt: 0.1 },
    room:      { p: [8.2, 7.8, 10.2], t: [0, 0.3, 0.5], fov: 30, sy: -80, tilt: 1 },
    lensA:     { p: [2.0, 5.8, 4.3], t: [0, 0.5, -0.4], fov: 30, sy: -80, tilt: 0.8 },
    lensB:     { p: [5.4, 5.6, 3.5], t: [2.5, 0.5, -0.5], fov: 30, sy: -80, tilt: 0.8 },
    wall:      { p: [3.3, 1.95, 0.0], t: [-3.75, 1.75, 0.0], fov: 30, sy: -70, tilt: 0.3 },
    board:     { p: [0, 1.95, 3.6], t: [0, 1.75, -4.45], fov: 28, tilt: 0.3 },
    boardNear: { p: [0.7, 2.2, 3.0], t: [0.4, 1.75, -4.45], fov: 32, sy: -90, tilt: 0.4 },
    thanks:    { p: [1.9, 3.5, 5.6], t: [0, 1.4, -3.2], fov: 32, tilt: 1 },
    // laptop 은 classroom.js 가 노트북 위치를 보고 채운다
  };

  const Q = W.QUALITY = [
    { name: '높음', shadow: true, tilt: true, pr: 2 },
    { name: '중간', shadow: true, tilt: false, pr: 1.25 },
    { name: '낮음', shadow: false, tilt: false, pr: 0.85 },
  ];
  W.q = 0;

  const frameHooks = [];
  W.onFrame = (fn) => frameHooks.push(fn);

  W.init = function (canvas) {
    W.canvas = canvas;
    // WebGL 을 못 쓰는 PC: 장면·카메라·빛 계산은 그대로 두고 그리기만 건너뛴다 (지도안·평면 화면은 정상)
    let r = null;
    try { r = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
    catch (e) { console.warn('WebGL 없음, 3D 없이 진행:', e.message); }
    W.renderer = r;
    W.noGL = !r;
    document.documentElement.classList.toggle('nogl', W.noGL);
    if (r) initRenderer(r);
    buildScene();
    W.setPose('idle');
    W.applyLight();
    W.setQuality(0, true);
    loop();
  };
  function initRenderer(r) {
    r.setSize(D.W, D.H, false);
    r.shadowMap.enabled = true;
    r.shadowMap.type = T.PCFSoftShadowMap;
    r.toneMapping = T.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
  }
  function buildScene() {
    const s = W.scene = new T.Scene();
    s.background = NIGHT.clone();

    const cam = W.camera = new T.PerspectiveCamera(26, D.W / D.H, 0.05, 200);

    // 낮: 하늘빛 + 해. 밤: 기계만 비추는 스포트라이트
    W.hemi = new T.HemisphereLight(0xFFF6E8, 0xB3A68E, 0);
    s.add(W.hemi);
    const sun = W.sun = new T.DirectionalLight(0xFFF1DC, 0);
    sun.position.set(7, 14, 9);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 9, bottom: -9, near: 1, far: 40 });
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.02;
    s.add(sun);
    const spot = W.spot = new T.SpotLight(0xFFE7B8, 0, 9, 0.42, 0.65, 1.4);
    spot.position.set(2.5, 3.9, -1.85);
    spot.target.position.set(2.5, 1.15, -3.55);
    spot.castShadow = true;
    spot.shadow.mapSize.set(1024, 1024);
    s.add(spot, spot.target);
    const rim = W.rim = new T.PointLight(0xF4C552, 0, 2.2, 1.6);   // 돔 안쪽의 금빛
    rim.position.set(2.5, 1.5, -3.5);
    s.add(rim);

    // 틸트시프트: 교실을 미니어처처럼 보이게 하는 얕은 심도
    if (!W.renderer) return;
    const comp = W.composer = new T.EffectComposer(W.renderer);
    comp.addPass(new T.RenderPass(s, cam));
    W.hPass = new T.ShaderPass(T.HorizontalTiltShiftShader);
    W.vPass = new T.ShaderPass(T.VerticalTiltShiftShader);
    comp.addPass(W.hPass);
    comp.addPass(W.vPass);
    comp.addPass(new T.OutputPass());
  }

  // ── 카메라 ──────────────────────────────────
  const C = W.cam = { px: 0, py: 0, pz: 0, tx: 0, ty: 0, tz: 0, fov: 26, sx: 0, sy: 0, tilt: 0 };
  function poseVals(name) {
    const p = W.POSES[name];
    if (!p) throw new Error('카메라 자세 없음: ' + name);
    return { px: p.p[0], py: p.p[1], pz: p.p[2], tx: p.t[0], ty: p.t[1], tz: p.t[2],
      fov: p.fov || 26, sx: p.sx || 0, sy: p.sy || 0, tilt: p.tilt ?? 0.5 };
  }
  W.setPose = (name) => Object.assign(C, poseVals(name));
  W.camTo = function (tl, name, { dur = 1.7, at = 0, ease = 'power3.inOut' } = {}) {
    tl.to(C, Object.assign(poseVals(name), { duration: dur, ease }), at);
  };

  const tmpT = new T.Vector3();
  function updateCamera() {
    const cam = W.camera;
    cam.position.set(C.px, C.py, C.pz);
    tmpT.set(C.tx, C.ty, C.tz);
    cam.lookAt(tmpT);
    cam.fov = C.fov;
    // 패널이 열린 만큼 장면 중심을 오른쪽으로 옮기고, 자세별 sx/sy 만큼 더 민다
    cam.setViewOffset(D.W, D.H, -(D.view.panel / 2 + C.sx), -C.sy, D.W, D.H);
    cam.updateProjectionMatrix();
  }

  // ── 빛: day 0(밤) ~ 1(낮), dim 은 렌즈를 켤 때 교실을 낮추는 양 ──
  const L = W.light = { day: 0, dim: 0, rimPulse: 0 };
  W.applyLight = function () {
    const d = L.day, k = 1 - 0.6 * L.dim;
    W.scene.background.copy(NIGHT).lerp(PAPER, d);
    W.hemi.intensity = (0.03 + d * 1.75) * k;
    W.sun.intensity = d * 2.3 * k;
    W.spot.intensity = (1 - d) * 26;
    W.rim.intensity = (1 - d) * (0.6 + 0.35 * L.rimPulse);
  };
  W.dayTo = function (tl, v, { at = 0, dur = 1.6 } = {}) {
    tl.to(L, { day: v, duration: dur, ease: 'sine.inOut', onUpdate: W.applyLight }, at);
  };
  W.dimTo = function (tl, v, { at = 0, dur = 0.7 } = {}) {
    tl.to(L, { dim: v, duration: dur, ease: 'sine.inOut', onUpdate: W.applyLight }, at);
  };

  // ── 화면 고정 라벨: 3D 위치를 따라다니는 HTML (글자가 선명하다) ──
  const pins = W.pins = {};
  W.addPin = function (id, html, getPos, cls = '') {
    const el = D.el(`<div class="pin ${cls}" data-pin="${id}"><div class="pin-in">${html}</div></div>`);
    D.$('#pins').appendChild(el);
    pins[id] = { el, getPos, on: false };
    gsap.set(el, { opacity: 0 });
    return pins[id];
  };
  W.pinTo = function (tl, id, on, at = 0) {
    const p = pins[id];
    if (!p || p.on === on) return;
    p.on = on;
    if (on) tl.fromTo(p.el, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }, at);
    else tl.to(p.el, { opacity: 0, y: 4, duration: 0.3, ease: 'power1.in' }, at);
  };
  const v3 = new T.Vector3();
  function updatePins() {
    for (const id in pins) {
      const p = pins[id];
      if (!p.on && +p.el.style.opacity === 0) continue;
      p.getPos(v3);
      v3.project(W.camera);
      const behind = v3.z > 1;
      const x = (v3.x * 0.5 + 0.5) * D.W - D.view.panel;
      const y = (-v3.y * 0.5 + 0.5) * D.H;
      p.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      p.el.style.visibility = behind ? 'hidden' : 'visible';
    }
  }

  // ── 품질 ────────────────────────────────────
  W.setQuality = function (i, silent) {
    W.q = i;
    const q = Q[i], r = W.renderer;
    if (!r) { if (!silent) D.toast('3D를 쓸 수 없는 PC라 품질 단계가 없습니다'); return; }
    const pr = Math.min(q.pr, (window.devicePixelRatio || 1) * D.view.scale);
    r.setPixelRatio(pr);
    r.setSize(D.W, D.H, false);
    W.composer.setPixelRatio(pr);
    W.composer.setSize(D.W, D.H);
    if (r.shadowMap.enabled !== q.shadow) {
      r.shadowMap.enabled = q.shadow;
      W.scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => { m.needsUpdate = true; }); });
    }
    if (!silent) D.toast(`그래픽 품질: ${q.name}`);
  };
  W.refit = () => W.setQuality(W.q, true);

  // ── 반복 ────────────────────────────────────
  const clock = new T.Clock();
  W.time = 0;
  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    W.time += dt;
    for (const fn of frameHooks) fn(dt, W.time);
    updateCamera();
    updatePins();
    if (W.covered && W.covered()) return;
    if (!W.renderer) {   // 3D 대신 밤↔낮 배경색만 따라간다
      const bg = W.scene.background.getStyle();
      if (W.canvas.style.background !== bg) W.canvas.style.background = bg;
      return;
    }
    const tilt = Q[W.q].tilt ? C.tilt * L.day : 0;
    if (tilt > 0.01) {
      W.hPass.uniforms.h.value = (3.4 * tilt) / D.W;
      W.vPass.uniforms.v.value = (3.4 * tilt) / D.H;
      W.hPass.uniforms.r.value = W.vPass.uniforms.r.value = 0.5 + C.sy / D.H;
      W.composer.render(dt);
    } else {
      W.renderer.render(W.scene, W.camera);
    }
  }

  // ── 공용 재료 · 도형 ─────────────────────────
  W.mat = (c, o = {}) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.86, metalness: 0 }, o));
  W.rbox = (w, h, d, r = 0.03, seg = 3) => new T.RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2));
  W.mesh = (geo, m, x = 0, y = 0, z = 0, cast = true) => {
    const o = new T.Mesh(geo, m);
    o.position.set(x, y, z);
    o.castShadow = cast;
    o.receiveShadow = true;
    return o;
  };
  // 캔버스로 그린 그림을 텍스처로. draw(ctx, w, h) 를 다시 부르면 갱신된다.
  W.canvasTex = function (w, h, draw) {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    const tex = new T.CanvasTexture(cv);
    tex.colorSpace = T.SRGBColorSpace;
    tex.anisotropy = 8;
    const api = { cv, ctx, tex, draw: (fn = draw, ...a) => { ctx.clearRect(0, 0, w, h); fn(ctx, w, h, ...a); tex.needsUpdate = true; } };
    if (draw) api.draw(draw);
    return api;
  };
  W.font = (px, weight = 700, fam = 'Noto Sans KR') => `${weight} ${px}px "${fam}", sans-serif`;
})();
