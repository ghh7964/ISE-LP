// 뽑기 기계: 교사용 책상 위에 놓인다. 1막의 그 기계가 2막에서 교실의 일부였음이 드러난다.
(function () {
  const T = THREE, W = D.world;
  const M = D.machine = {};
  const DESK = new T.Vector3(2.5, 0.9, -3.55);   // 책상 윗면 위치
  const CAP_R = 0.036;

  function capsuleGeo() {
    const top = new T.SphereGeometry(CAP_R, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    const bot = new T.SphereGeometry(CAP_R, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    return { top, bot };
  }
  const CG = capsuleGeo();
  const capMats = {
    g: W.mat(D.RARITY.g.hex, { roughness: 0.32, metalness: 0.55, emissive: 0x5A3A00, emissiveIntensity: 0.35 }),
    s: W.mat(D.RARITY.s.hex, { roughness: 0.3, metalness: 0.6 }),
    b: W.mat(D.RARITY.b.hex, { roughness: 0.45, metalness: 0.35 }),
    shell: W.mat(0xF6F2EA, { roughness: 0.25, transparent: true, opacity: 0.92 }),
  };
  function capsule(r) {
    const g = new T.Group();
    const a = new T.Mesh(CG.top, capMats[r]);
    const b = new T.Mesh(CG.bot, capMats.shell);
    a.castShadow = b.castShadow = true;
    g.add(a, b);
    g.userData.r = r;
    return g;
  }

  M.build = function () {
    const g = M.group = new T.Group();
    g.position.copy(DESK);
    const red = W.mat(0xC23A2E, { roughness: 0.42 });
    const dark = W.mat(0x2A1714, { roughness: 0.7 });
    const chrome = W.mat(0xD8D4CC, { roughness: 0.22, metalness: 0.85 });

    g.add(W.mesh(W.rbox(0.44, 0.40, 0.38, 0.05), red, 0, 0.20, 0));
    g.add(W.mesh(W.rbox(0.46, 0.04, 0.40, 0.015), chrome, 0, 0.415, 0));
    // 배출구
    g.add(W.mesh(W.rbox(0.15, 0.10, 0.03, 0.02), dark, 0, 0.09, 0.185, false));
    g.add(W.mesh(W.rbox(0.17, 0.02, 0.07, 0.01), chrome, 0, 0.04, 0.215));
    // 동전 투입구
    g.add(W.mesh(W.rbox(0.07, 0.06, 0.02, 0.01), chrome, -0.11, 0.29, 0.19, false));
    g.add(W.mesh(new T.BoxGeometry(0.008, 0.035, 0.01), dark, -0.11, 0.29, 0.201, false));
    // 손잡이 (돌리면 캡슐이 나온다)
    const crank = M.crank = new T.Group();
    crank.position.set(0.085, 0.28, 0.192);
    const disc = W.mesh(new T.CylinderGeometry(0.065, 0.065, 0.025, 28), chrome);
    disc.rotation.x = Math.PI / 2;
    const bar = W.mesh(W.rbox(0.11, 0.022, 0.022, 0.01), chrome, 0, 0, 0.022);
    const knob = W.mesh(new T.SphereGeometry(0.018, 14, 10), red, 0.05, 0, 0.03);
    crank.add(disc, bar, knob);
    g.add(crank);
    // 목 · 돔 · 뚜껑
    g.add(W.mesh(new T.CylinderGeometry(0.16, 0.18, 0.05, 32), chrome, 0, 0.455, 0));
    const glass = new T.MeshPhysicalMaterial({
      color: 0xFFFFFF, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.2,
      clearcoat: 1, clearcoatRoughness: 0.05, depthWrite: false,
    });
    const dome = new T.Mesh(new T.SphereGeometry(0.215, 40, 28), glass);
    dome.position.y = 0.66;
    dome.renderOrder = 2;
    g.add(dome);
    g.add(W.mesh(new T.CylinderGeometry(0.075, 0.09, 0.05, 28), red, 0, 0.885, 0));
    g.add(W.mesh(new T.SphereGeometry(0.03, 16, 10), chrome, 0, 0.92, 0));
    // 돔 속 캡슐 30개: 금 3 · 은 9 · 동 18 (10% · 30% · 60%)
    const pool = [].concat(Array(3).fill('g'), Array(9).fill('s'), Array(18).fill('b'));
    const inside = M.inside = new T.Group();
    inside.position.y = 0.66;
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    pool.forEach((r, i) => {
      const c = capsule(r);
      const layer = Math.floor(i / 10);
      const a = (i % 10) / 10 * Math.PI * 2 + layer * 0.9 + rnd() * 0.3;
      const rad = 0.06 + rnd() * 0.1 * (1 - layer * 0.25);
      c.position.set(Math.cos(a) * rad, -0.155 + layer * 0.07 + rnd() * 0.02, Math.sin(a) * rad);
      c.rotation.set(rnd() * 6, rnd() * 6, rnd() * 6);
      inside.add(c);
    });
    g.add(inside);
    W.scene.add(g);

    // 책상 위에 줄 서는 캡슐 (뽑은 결과)
    M.row = new T.Group();
    M.row.position.copy(DESK);
    W.scene.add(M.row);

    W.onFrame((dt, t) => {
      if (M.spinning) g.rotation.y += dt * 0.32;
      W.light.rimPulse = 0.5 + 0.5 * Math.sin(t * 2.2);
      if (W.light.day < 1) W.rim.intensity = (1 - W.light.day) * (0.6 + 0.35 * W.light.rimPulse);
    });
  };

  // 대기 화면에서는 천천히 돈다. 멈출 때는 가장 가까운 정면으로 돌아간다(갑자기 튀지 않게).
  M.spin = function (tl, on, at = 0) {
    if (on === !!M.spinning) return;
    if (on) { M.spinning = true; return; }
    M.spinning = false;
    const r = M.group.rotation.y;
    const target = Math.round(r / (Math.PI * 2)) * Math.PI * 2;
    tl.to(M.group.rotation, { y: target, duration: 1.4, ease: 'power2.inOut' }, at);
  };

  // 한 번 돌리기: 손잡이가 돌고 배출구에서 캡슐이 나와 책상 앞쪽 i 번째 자리에 선다
  M.pull = function (tl, r, i, at, { total = 10 } = {}) {
    const c = capsule(r);
    const x = -0.45 + (i * 0.9) / Math.max(1, total - 1);
    c.position.set(0, 0.07, 0.2);
    c.scale.setScalar(0.001);
    tl.call(() => { M.row.add(c); D.audio.play('crank'); }, null, at);
    tl.to(M.crank.rotation, { z: `-=${Math.PI * 2}`, duration: 0.28, ease: 'power2.inOut' }, at);
    tl.to(c.scale, { x: 1, y: 1, z: 1, duration: 0.12 }, at + 0.12);
    tl.to(c.position, { x, z: 0.33, duration: 0.42, ease: 'power1.out' }, at + 0.14);
    tl.to(c.position, { y: CAP_R, duration: 0.42, ease: 'bounce.out' }, at + 0.14);
    tl.to(c.rotation, { x: -0.55 - Math.PI * 2, z: (i % 3 - 1) * 0.25, duration: 0.42, ease: 'power1.out' }, at + 0.14);   // 색 있는 쪽이 카메라를 보게
    return c;
  };

  M.clear = function (tl, at = 0) {
    const kids = M.row.children.slice();
    if (!kids.length) return;
    tl.to(kids.map((k) => k.scale), { x: 0.001, y: 0.001, z: 0.001, duration: 0.3, stagger: 0.02, ease: 'power2.in' }, at);
    tl.call(() => kids.forEach((k) => M.row.remove(k)), null, '>');
  };
  M.clearNow = () => M.row.clear();

  // 3막: 1,000명이 돌리는 동안 기계도 같이 돈다
  M.crankOnce = function (tl, at) {
    tl.to(M.crank.rotation, { z: `-=${Math.PI * 2}`, duration: 0.3, ease: 'power2.inOut' }, at);
    tl.to(M.inside.rotation, { y: `+=${0.6}`, duration: 0.3, ease: 'power2.out' }, at);
  };
})();
