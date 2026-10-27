// 교실 디오라마 (1 = 1m, 일반교실 표준 7.5m × 9m: 칠판 쪽 벽 7.5m, 앞뒤 9m): 교실, 모둠 책상과 교구, 학생·교사 말, 스테이션, 순환 화살표,
// 칠판(판서), 벽 게시판의 핵심 어휘 풀이 카드, Bruner 3층, 렌즈(학생 A의 역할 · 학생 A를 위한 지원 · 모두를 위한 지원)
(function () {
  const T = THREE, W = D.world;
  const R = D.room = {};
  const { mat, rbox, mesh } = W;

  const SX = [-2.5, 0, 2.5];              // 사회 · 수학 · 정보 스테이션
  const TZ = [-0.5, 2.3];                 // 스테이션마다 책상 두 개
  const SEATS = [[-0.45, -0.78], [0.45, -0.78], [-0.45, 0.78], [0.45, 0.78]];
  const STATION = ['사회', '수학', '정보'];
  R.A = 9;                                // 학생 A: 3모둠 (수학 → 정보 → 사회). 두 스테이션 모두 k = 0 책상, 같은 자리

  const C = {
    floor: 0xD9CBB2, slab: 0xBFAE92, wall: 0xEEE7DA, wall2: 0xE6DDCC,
    wood: 0xC6A47A, woodDark: 0x8E7154, board: 0x2E3C35, frame: 0x7E6043,
    ink: 0x1B1A18, navy: 0x213A63, paper: 0xF7F2E8,
  };
  const STUDENT_COLORS = [0xD98C6B, 0xE2B677, 0x9DB58A, 0x7FA7B5, 0xC9A3C4, 0xD9C3A0, 0xA9A18A, 0xD99E9E, 0x8FA0C9, 0xB7C98E];
  const SKIN = 0xF1DCC4;
  const GLOW = new T.Color(0xFFC861);
  const GOLD = new T.Color(0xF2B232);

  const tablePos = (s, k) => ({ x: SX[s], z: TZ[k] });

  // ── 빛나는 교구 ───────────────────────────────
  const glowing = new Set();
  function glowMat(color, o) {
    const m = mat(color, o);
    m.emissive = GLOW.clone();
    m.emissiveIntensity = 0;
    m.userData = { g: 0, base: m.color.clone() };
    return m;
  }
  R.glow = function (tl, mats, on, at = 0) {
    mats = [].concat(mats).filter(Boolean);
    if (!mats.length) return;
    mats.forEach((m) => glowing.add(m));
    tl.to(mats.map((m) => m.userData), { g: on ? 1 : 0, duration: on ? 0.6 : 0.4, ease: 'sine.inOut', stagger: on ? 0.02 : 0 }, at);
  };
  W.onFrame((dt, t) => {
    const k = 0.78 + 0.22 * Math.sin(t * 3.1);
    glowing.forEach((m) => {
      const g = m.userData.g;
      m.emissiveIntensity = g * 0.55 * k;
      m.color.copy(m.userData.base).lerp(GOLD, g * 0.8);
    });
  });

  // 보였다 숨기기 (크기로). 사라질 때도 애니메이션으로.
  function pop(tl, objs, on, at = 0, stagger = 0.03) {
    objs = [].concat(objs).filter(Boolean);
    if (!objs.length) return;
    if (on) {
      tl.call(() => objs.forEach((o) => { o.visible = true; }), null, at);
      tl.to(objs.map((o) => o.scale), { x: 1, y: 1, z: 1, duration: 0.55, ease: 'back.out(1.6)', stagger }, at);
    } else {
      tl.to(objs.map((o) => o.scale), { x: 0.001, y: 0.001, z: 0.001, duration: 0.32, ease: 'power2.in', stagger: stagger / 2 }, at);
      tl.call(() => objs.forEach((o) => { o.visible = false; }), null, '>');
    }
  }
  function hidden(o) { o.scale.setScalar(0.001); o.visible = false; return o; }

  // ── 교실 ─────────────────────────────────────
  function buildRoom(s) {
    s.add(mesh(rbox(7.9, 0.4, 9.4, 0.08), mat(C.slab), 0, -0.2, 0));
    const floor = mesh(new T.BoxGeometry(7.5, 0.02, 9.0), mat(C.floor), 0, 0.0, 0.0, false);
    s.add(floor);
    s.add(mesh(rbox(7.9, 3.0, 0.2, 0.04), mat(C.wall), 0, 1.5, -4.6));
    s.add(mesh(rbox(0.2, 3.0, 9.4, 0.04), mat(C.wall2), -3.85, 1.5, 0));
    // 걸레받이
    s.add(mesh(new T.BoxGeometry(7.5, 0.12, 0.03), mat(0xCDBFA8), 0, 0.06, -4.49, false));
    s.add(mesh(new T.BoxGeometry(0.03, 0.12, 9.0), mat(0xCDBFA8), -3.74, 0.06, 0, false));

    // 칠판
    s.add(mesh(rbox(4.64, 1.82, 0.06, 0.03), mat(C.frame), 0, 1.75, -4.48));
    s.add(mesh(new T.PlaneGeometry(4.4, 1.6), mat(C.board, { roughness: 0.95 }), 0, 1.75, -4.445, false));
    s.add(mesh(rbox(4.5, 0.04, 0.12, 0.02), mat(C.frame), 0, 0.93, -4.42));

    // 교사용 책상 (뽑기 기계가 그 위에 있다)
    s.add(mesh(rbox(1.3, 0.08, 0.66, 0.02), mat(0xB48C62), 2.5, 0.86, -3.55));
    s.add(mesh(rbox(1.24, 0.82, 0.58, 0.03), mat(0xA27D57), 2.5, 0.41, -3.55));
  }

  // ── 칠판 판서 (지도안 Ⅺ.3 판서 계획) ───────────
  const CHALK = '#EDEBE2', CHALK_Y = '#F3D37C', CHALK_DIM = 'rgba(237,235,226,.55)';
  const hand = (px, w = 700) => W.font(px, w, 'Gaegu');
  function chalkLines(name) {
    const L = [];
    if (name === 'lesson') {
      L.push({ t: '오늘의 일과표', x: 70, y: 110, f: hand(52), c: CHALK_Y });
      ['1. 도입', "2. 사회 ⏱10'", "3. 수학 ⏱10'", "4. 정보 ⏱10'", '5. 정리'].forEach((t, i) =>
        L.push({ t, x: 80, y: 190 + i * 70, f: hand(44, 400), c: CHALK }));
      L.push({ t: '기대행동 3가지', x: 80, y: 560, f: hand(40, 400), c: CHALK_DIM });
      L.push({ t: '뽑기, 정말 이득일까?', x: 1024, y: 130, f: hand(86), c: CHALK_Y, a: 'center' });
      L.push({ t: '금 5,000원 · 은 1,000원 · 동 꽝', x: 760, y: 250, f: hand(48), c: CHALK });
      ['금색 확률 = 1/10', '우리 모둠 한 번 평균 = ___원', '학급 전체(120번) 평균 = ___원', '1,000번 한 번 평균 = ___원', '기회비용 = ___'].forEach((t, i) =>
        L.push({ t, x: 760, y: 336 + i * 66, f: hand(46, 400), c: CHALK }));
      L.push({ t: '결론 투표판', x: 1610, y: 110, f: hand(52), c: CHALK_Y });
      ['한다  ○○○', '안 한다  ○○○', '이유:'].forEach((t, i) => L.push({ t, x: 1620, y: 200 + i * 76, f: hand(44, 400), c: CHALK }));
      L.push({ rule: [[560, 50], [560, 700]] }, { rule: [[1560, 50], [1560, 700]] });
    } else if (name === 'final') {
      const c = D.data.crowd;
      L.push({ t: '1,000원을 내면, 한 번에 평균 800원', x: 1024, y: 120, f: hand(56, 400), c: CHALK, a: 'center' });
      L.push({ t: '10번 뽑으면 약 68%가 손해', x: 1024, y: 225, f: hand(84), c: CHALK, a: 'center' });
      if (c) L.push({ t: `우리 1,000명: 손해 ${D.fmt(c.lose)}명 · 이득 ${D.fmt(c.ahead)}명`, x: 1024, y: 305, f: hand(46, 400), c: CHALK_DIM, a: 'center' });
      L.push({ rule: [[520, 360], [1528, 360]] });
      L.push({ t: '지원은 모두에게 열려 있다', x: 1024, y: 500, f: hand(124), c: CHALK_Y, a: 'center' });
      L.push({ t: '총론 Ⅰ.1.마 교과 간 연계와 통합  ·  통합교육 4대 원리 ② 자연스러운 비가시적 지원', x: 1024, y: 625, f: hand(38, 400), c: CHALK_DIM, a: 'center' });
    } else if (name === 'thanks') {
      L.push({ t: '감사합니다', x: 1024, y: 395, f: hand(230), c: CHALK_Y, a: 'center' });
      L.push({ t: D.TEAM_LINE || '', x: 1024, y: 560, f: hand(50, 400), c: CHALK_DIM, a: 'center' });
    }
    return L;
  }
  function drawChalk(ctx, w, h, lines, p = 1) {
    const n = lines.length;
    lines.forEach((l, i) => {
      const a = D.clamp((p * (n + 1) - i) / 1.4, 0, 1);
      if (a <= 0) return;
      ctx.globalAlpha = a;
      if (l.rule) {
        ctx.strokeStyle = 'rgba(237,235,226,.35)';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(...l.rule[0]); ctx.lineTo(...l.rule[1]); ctx.stroke();
      } else {
        ctx.font = l.f;
        ctx.fillStyle = l.c;
        ctx.textAlign = l.a || 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(l.t, l.x, l.y);
      }
    });
    ctx.globalAlpha = 1;
  }
  const chalk = [];
  let chalkFront = 0;
  R.boardName = null;
  function buildBoard(s) {
    for (let i = 0; i < 2; i++) {
      const ct = W.canvasTex(2048, 751, null);
      const m = new T.MeshBasicMaterial({ map: ct.tex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
      const pl = new T.Mesh(new T.PlaneGeometry(4.36, 1.6), m);
      pl.position.set(0, 1.75, -4.44 + i * 0.002);
      s.add(pl);
      chalk.push({ ct, m, pl });
    }
    // 밤(1막·3막)에는 판서가 어둠에 묻힌다
    W.onFrame(() => chalk.forEach((c) => { const d = W.light.day; c.m.color.setScalar(d * d); c.pl.visible = d > 0.02; }));
  }
  // 이전 판서가 먼저 지워지고, 그다음 새 판서가 한 줄씩 써진다
  R.board = function (tl, name, at = 0) {
    if (name === R.boardName) return;
    R.boardName = name;
    const old = chalk[chalkFront], nu = chalk[1 - chalkFront];
    chalkFront = 1 - chalkFront;
    let t = at;
    if (old.m.opacity > 0) { tl.to(old.m, { opacity: 0, duration: 0.5, ease: 'power1.in' }, t); t += 0.5; }
    if (!name) return;
    const st = { p: 0 };
    tl.call(() => { nu.lines = chalkLines(name); nu.ct.draw(drawChalk, nu.lines, 0); nu.m.opacity = 1; }, null, t);
    tl.to(st, { p: 1, duration: name === 'lesson' ? 0.8 : 1.8, ease: 'none',
      onUpdate: () => nu.lines && nu.ct.draw(drawChalk, nu.lines, st.p) }, t);
  };

  // ── 학생 · 교사 말 ───────────────────────────
  const bodyGeo = new T.CapsuleGeometry(0.17, 0.3, 4, 14);
  const headGeo = new T.SphereGeometry(0.14, 20, 14);
  const tBodyGeo = new T.CapsuleGeometry(0.18, 0.56, 4, 14);
  function pawn(color, teacher = false) {
    const g = new T.Group();
    const m = mat(color, { roughness: 0.78 });
    const b = mesh(teacher ? tBodyGeo : bodyGeo, m, 0, teacher ? 0.46 : 0.32, 0);
    const h = mesh(headGeo, mat(SKIN, { roughness: 0.7 }), 0, teacher ? 1.08 : 0.79, 0);
    g.add(b, h);
    g.userData.headY = teacher ? 1.08 : 0.79;
    return g;
  }
  R.students = [];
  R.teachers = [];
  const rowPos = (i) => ({ x: -3.0 + (i % 6) * 1.2, z: -1.5 + Math.floor(i / 6) * 1.4 });
  function seatPos(i, mode) {
    if (mode === 'rows' || mode === 'hidden') return rowPos(i);
    const g = Math.floor(i / 4), j = i % 4;
    const s = mode === 'rotated' ? (Math.floor(g / 2) + 1) % 3 : Math.floor(g / 2);
    const tp = tablePos(s, g % 2);
    return { x: tp.x + SEATS[j][0], z: tp.z + SEATS[j][1] };
  }
  R.studentMode = 'rows';

  function buildPeople(s) {
    for (let i = 0; i < 24; i++) {
      const p = pawn(STUDENT_COLORS[(i * 7) % STUDENT_COLORS.length]);
      const pos = rowPos(i);
      p.position.set(pos.x, 0, pos.z);
      s.add(p);
      R.students.push(p);
    }
    const TPOS = [[-2.5, 0.9], [-0.42, 0.9], [2.5, 0.9], [0.42, 0.9]];   // T2 · T4 는 수학 스테이션 공동 교수
    const TCOL = [C.navy, C.navy, C.navy, 0x2F5E8C];
    TPOS.forEach(([x, z], i) => {
      const t = hidden(pawn(TCOL[i], true));
      t.position.set(x, 0, z);
      t.userData.home = { x, z };
      s.add(t);
      R.teachers.push(t);
    });
  }

  // 말이 통통 뛰어 자리를 옮긴다
  function hop(tl, obj, to, at, dur = 0.9, h = 0.55) {
    const st = { t: 0 }, from = { x: obj.position.x, z: obj.position.z };
    tl.to(st, { t: 1, duration: dur, ease: 'power1.inOut', onStart() { from.x = obj.position.x; from.z = obj.position.z; },
      onUpdate() {
        obj.position.x = from.x + (to.x - from.x) * st.t;
        obj.position.z = from.z + (to.z - from.z) * st.t;
        obj.position.y = Math.sin(Math.PI * st.t) * h;
      } }, at);
  }

  R.setStudents = function (tl, mode, prev, at = 0) {
    if (mode === prev) return;
    R.studentMode = mode;
    const toRows = mode === 'rows';
    // 모둠으로: 일렬 책상이 내려가고 모둠 책상이 올라온 뒤 학생이 이동한다. 되돌아갈 때는 그 반대 순서.
    if (prev === 'rows' || toRows) {
      pop(tl, R.rowDesks, toRows, toRows ? at + 0.7 : at, 0.015);
      pop(tl, R.tables.map((t) => t.g), !toRows, toRows ? at + 1.3 : at + 0.25, 0.06);
    }
    const base = at + (prev === 'rows' ? 0.45 : 0);
    R.students.forEach((p, i) => {
      const dest = seatPos(i, mode);
      const far = Math.abs(dest.x - p.position.x) > 5;
      hop(tl, p, dest, base + (i % 24) * 0.03, far ? 1.3 : 0.9, far ? 0.9 : 0.5);
    });
  };
  R.setTeachers = (tl, on, at = 0) => pop(tl, R.teachers, on, at, 0.08);

  // ── 책상과 교구 ──────────────────────────────
  R.tables = [];
  R.rowDesks = [];
  R.props = { picture: [], schedule: [], role: [], sticker: [], sheet: [], bins: [], laptops: [], tokens: [], tablets: [], counters: [] };
  const sheetTex = {};
  function makeSheetTex() {
    sheetTex.normal = W.canvasTex(256, 184, (c, w, h) => {
      c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#B9B2A6';
      for (let i = 0; i < 6; i++) c.fillRect(22, 26 + i * 25, i % 2 ? 150 : 210, 6);
    }).tex;
  }
  // 엔트리 화면: 왼쪽 블록, 오른쪽 실행 결과
  function screenTex() {
    return W.canvasTex(512, 320, (c, w, h) => {
      c.fillStyle = '#FBFAF7'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#EEF1F4'; c.fillRect(0, 0, 250, h);
      c.fillStyle = '#1B1A18'; c.fillRect(0, 0, w, 30);
      [['#00B400', 0, 150], ['#19BAEA', 0, 170], ['#E457DC', 1, 190], ['#19BAEA', 1, 150], ['#E457DC', 2, 140], ['#E457DC', 2, 160], ['#19BAEA', 1, 70], ['#E457DC', 0, 180]]
        .forEach(([col, ind, len], i) => { c.fillStyle = col; c.fillRect(18 + ind * 18, 46 + i * 32, len, 22); });
      [[0.1, '#E3B341'], [0.3, '#C9CED6'], [0.6, '#B0703F']].forEach(([v, col], i) => {
        c.fillStyle = col; c.fillRect(290 + i * 72, 290 - v * 300, 50, v * 300);
      });
      c.strokeStyle = '#213A63'; c.lineWidth = 3; c.setLineDash([8, 6]);
      c.beginPath(); c.moveTo(270, 260); c.lineTo(w - 20, 260); c.stroke();
    }).tex;
  }
  function laptop() {
    const g = new T.Group();
    const dark = mat(0x3A3D44, { roughness: 0.5, metalness: 0.3 });
    g.add(mesh(rbox(0.34, 0.018, 0.24, 0.008), dark, 0, 0.009, 0));
    const hinge = new T.Group();
    hinge.position.set(0, 0.018, -0.12);
    hinge.rotation.x = -0.22;
    hinge.add(mesh(rbox(0.34, 0.22, 0.012, 0.008), dark, 0, 0.11, 0));
    const scr = new T.MeshBasicMaterial({ map: screenTex(), toneMapped: false });
    const disp = new T.Mesh(new T.PlaneGeometry(0.31, 0.19), scr);
    disp.position.set(0, 0.11, 0.0065);
    hinge.add(disp);
    g.add(hinge);
    g.userData.screen = scr;
    return g;
  }
  // 뽑기통 캡슐 10개: 겉모양이 모두 같다. 금·은·동 토큰은 캡슐 안에 있어 열어야 보인다 (만져서 골라 뽑을 수 없게)
  function capsules(n = 10, r = 0.028) {
    const g = new T.Group();
    const top = new T.SphereGeometry(r, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    const bot = new T.SphereGeometry(r, 14, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    const topM = mat(0xF2EEE6, { roughness: 0.35 }), botM = mat(0x7F9BAE, { roughness: 0.35 });
    for (let i = 0; i < n; i++) {
      const c = new T.Group();
      c.add(mesh(top, topM, 0, 0, 0), mesh(bot, botM, 0, 0, 0));
      c.position.set(Math.cos(i * 2.4) * 0.07, r + (i > 5 ? r * 1.6 : 0), Math.sin(i * 2.4) * 0.07);
      c.rotation.set(i * 1.3, i * 0.7, i * 2.1);
      g.add(c);
    }
    return g;
  }

  // 절차 영상 태블릿: 스테이션마다 1대. 화면은 절차 영상의 한 장면 (모든 모둠은 교사 시범, 학생 A는 자기 모습)
  let tabletTex = null, counterTex = null;   // 글꼴이 준비된 뒤(R.build) 그린다
  const drawTablet = (c, w, h) => {
    c.fillStyle = '#1D2128'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#9AA3B2'; c.font = W.font(22, 700); c.textAlign = 'left'; c.fillText('절차 영상', 16, 30);
    c.fillStyle = '#F1DCC4'; c.beginPath(); c.arc(112, 88, 26, 0, 7); c.fill();
    c.fillStyle = '#E2B677'; c.beginPath(); c.ellipse(112, 168, 42, 52, 0, 0, 7); c.fill();
    c.fillStyle = '#F2EEE6'; c.beginPath(); c.arc(196, 140, 20, Math.PI, 0); c.fill();
    c.fillStyle = '#7F9BAE'; c.beginPath(); c.arc(196, 140, 20, 0, Math.PI); c.fill();
    c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.moveTo(262, 70); c.lineTo(262, 110); c.lineTo(294, 90); c.fill();
    for (let i = 0; i < 5; i++) { c.fillStyle = i < 2 ? '#F3D37C' : 'rgba(255,255,255,.3)'; c.beginPath(); c.arc(120 + i * 22, 210, 6, 0, 7); c.fill(); }
  };
  function tablet() {
    tabletTex = tabletTex || W.canvasTex(320, 224, drawTablet).tex;
    const g = new T.Group();
    const frame = glowMat(0x2C2F36, { roughness: 0.5 });
    const body = new T.Group();
    body.add(mesh(rbox(0.21, 0.15, 0.012, 0.008), frame, 0, 0, 0));
    const scr = plane(tabletTex, 0.19, 0.133, true);
    scr.position.z = 0.0065;
    body.add(scr);
    body.position.y = 0.07;
    body.rotation.x = -0.35;
    g.add(body, mesh(rbox(0.08, 0.012, 0.06, 0.004), mat(0x8C8984), 0, 0.006, -0.03, false));
    g.userData.frame = frame;
    return g;
  }
  // 횟수판: 진행자가 20번의 차례를 센다
  const drawCounter = (c, w, h) => {
    c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#213A63'; c.font = W.font(26, 900); c.textAlign = 'left'; c.fillText('횟수 20', 14, 32);
    for (let i = 0; i < 20; i++) {
      const x = 30 + (i % 5) * 48, y = 70 + Math.floor(i / 5) * 32;
      c.strokeStyle = '#6F695F'; c.lineWidth = 3; c.beginPath(); c.arc(x, y, 11, 0, 7); c.stroke();
      if (i < 13) { c.fillStyle = '#3C3A40'; c.beginPath(); c.arc(x, y, 7, 0, 7); c.fill(); }
    }
  };
  function counter() {
    counterTex = counterTex || W.canvasTex(256, 192, drawCounter).tex;
    const g = new T.Group();
    const m = glowMat(0xE9E4DA);
    g.add(mesh(rbox(0.19, 0.012, 0.145, 0.005), m, 0, 0.006, 0));
    const face = plane(counterTex, 0.17, 0.128);
    face.rotation.x = -Math.PI / 2;
    face.position.y = 0.0135;
    g.add(face);
    g.userData.frame = m;
    return g;
  }

  function buildTables(s) {
    const top = mat(C.wood), leg = mat(C.woodDark);
    const legG = new T.CylinderGeometry(0.035, 0.035, 0.7, 10);
    makeSheetTex();
    // 일렬 책상 (모둠 전): 상판 · 서랍칸 · 양쪽 철제 다리
    const metal = mat(0x8C8984, { roughness: 0.5, metalness: 0.4 });
    const deskTop = rbox(0.62, 0.04, 0.44, 0.015), deskBox = rbox(0.56, 0.1, 0.38, 0.01), deskLeg = new T.BoxGeometry(0.03, 0.64, 0.36);
    for (let i = 0; i < 24; i++) {
      const p = rowPos(i);
      const g = new T.Group();
      g.position.set(p.x, 0, p.z - 0.45);
      g.add(mesh(deskTop, top, 0, 0.66, 0), mesh(deskBox, mat(C.woodDark), 0, 0.59, 0));
      [-0.28, 0.28].forEach((x) => g.add(mesh(deskLeg, metal, x, 0.32, 0)));
      s.add(g);
      R.rowDesks.push(g);
    }
    for (let st = 0; st < 3; st++) for (let k = 0; k < 2; k++) {
      const g = hidden(new T.Group());
      const tp = tablePos(st, k);
      g.position.set(tp.x, 0, tp.z);
      g.add(mesh(rbox(1.6, 0.07, 1.0, 0.025), top, 0, 0.715, 0));
      [[-0.7, -0.4], [0.7, -0.4], [-0.7, 0.4], [0.7, 0.4]].forEach(([x, z]) => g.add(mesh(legG, leg, x, 0.35, z)));
      const P = { s: st, k, g };
      // 모든 책상: 그림 카드 · 일과표 · 역할 카드 · 활동지 (처음부터 모두에게)
      const pic = glowMat(0xF7F1E4);
      const picG = new T.Group();
      for (let n = 0; n < 3; n++) picG.add(mesh(rbox(0.2, 0.012, 0.15, 0.005), pic, n * 0.012, 0.757 + n * 0.013, n * 0.01));
      picG.position.set(-0.62, 0, -0.22);
      g.add(picG);
      const sch = glowMat(0xFFFFFF);
      const schG = new T.Group();
      schG.add(mesh(rbox(0.2, 0.26, 0.015, 0.006), sch, 0, 0.13, 0));
      schG.add(mesh(new T.BoxGeometry(0.2, 0.05, 0.017), glowMat(C.navy), 0, 0.235, 0));
      schG.position.set(-0.62, 0.75, 0.24);
      schG.rotation.set(-0.2, 0.5, 0);
      g.add(schG);
      const roleMeshes = [];
      const roles = SEATS.map(([x, z]) => {
        const m = glowMat(0xE7D3A2);
        const rm = mesh(rbox(0.11, 0.014, 0.07, 0.004), m, x * 0.85, 0.758, z * 0.52, false);
        g.add(rm);
        roleMeshes.push(rm);
        return m;
      });
      const sheetM = new T.MeshStandardMaterial({ map: sheetTex.normal, roughness: 0.9 });
      const sheet = mesh(new T.PlaneGeometry(0.34, 0.24), sheetM, 0.05, 0.753, 0.12, false);
      sheet.rotation.x = -Math.PI / 2;
      sheet.rotation.z = 0.12;
      g.add(sheet);
      P.picture = pic; P.schedule = [sch]; P.role = roles; P.sheet = sheet;
      P.picG = picG; P.schG = schG; P.roleMesh = roleMeshes;
      R.props.picture.push(pic); R.props.schedule.push(sch); R.props.role.push(...roles); R.props.sheet.push(sheet);

      if (st === 0) {   // 사회: 선택 카드
        ['#E58C6A', '#8FB3A0', '#E8C76A', '#9AA7D0'].forEach((c, n) =>
          g.add(mesh(rbox(0.12, 0.01, 0.16, 0.004), mat(c), -0.2 + n * 0.15, 0.756, -0.22, false)));
      }
      if (st === 1) {   // 수학: 뽑기통 · 스티커 그래프판
        const bin = new T.Group();
        bin.position.set(0.42, 0.75, -0.18);
        const glass = new T.MeshPhysicalMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.22, roughness: 0.05, depthWrite: false });
        const cyl = new T.Mesh(new T.CylinderGeometry(0.13, 0.13, 0.22, 24, 1, true), glass);
        cyl.position.y = 0.11;
        bin.add(cyl);
        bin.add(mesh(new T.CylinderGeometry(0.135, 0.135, 0.012, 24), mat(0xD6D0C4), 0, 0.006, 0));
        bin.add(capsules());
        g.add(bin);
        R.props.bins.push(bin);
        const stk = glowMat(0xFFFFFF);
        const sb = new T.Group();
        sb.add(mesh(rbox(0.42, 0.3, 0.02, 0.008), stk, 0, 0.15, 0));
        [[1, D.RARITY.g.hex], [3, D.RARITY.s.hex], [6, D.RARITY.b.hex]].forEach(([n, c], i) => {
          const hgt = (n / 6) * 0.22;
          sb.add(mesh(new T.BoxGeometry(0.08, hgt, 0.01), mat(c), -0.12 + i * 0.12, 0.03 + hgt / 2, 0.015, false));
        });
        sb.position.set(-0.2, 0.75, -0.36);
        sb.rotation.x = -0.18;
        g.add(sb);
        P.sticker = stk; P.sb = sb;
        R.props.sticker.push(stk);
        // 토큰 탑: 낸 토큰(10)과 돌려받은 토큰을 나란히 쌓아 높이로 비교한다
        const tok = glowMat(0xD9B25A, { roughness: 0.45, metalness: 0.25 });
        const coin = new T.CylinderGeometry(0.03, 0.03, 0.009, 16);
        const tg = new T.Group();
        [10, 8].forEach((n, c) => { for (let j = 0; j < n; j++) tg.add(mesh(coin, tok, c * 0.075, 0.0045 + j * 0.0095, 0, false)); });
        tg.position.set(0.1, 0.75, -0.32);
        g.add(tg);
        P.token = tok; P.tokG = tg;
        R.props.tokens.push(tok);
        const cnt = counter();
        cnt.position.set(0.62, 0.75, -0.4);
        cnt.rotation.y = 0.15;
        g.add(cnt);
        P.counter = cnt;
        R.props.counters.push(cnt.userData.frame);
      }
      if (k === 0) {   // 절차 영상 태블릿 (스테이션마다 1대, 학생 A의 모둠 쪽 책상)
        const tb = tablet();
        tb.position.set(st === 2 ? 0.3 : 0.6, 0.75, st === 2 ? -0.12 : 0.04);
        tb.rotation.y = Math.PI - 0.35;   // 화면이 학생 A 쪽(−z)을 본다
        g.add(tb);
        P.tablet = tb;
        R.props.tablets.push(tb.userData.frame);
      }
      if (st === 2) {   // 정보: 노트북
        const l1 = laptop(); l1.position.set(-0.2, 0.75, -0.3); g.add(l1);
        const l2 = laptop(); l2.position.set(0.25, 0.75, 0.3); l2.rotation.y = Math.PI; g.add(l2);
        R.props.laptops.push(l1, l2);
        if (k === 0) {  // 시연용 노트북 (카메라가 이 화면 속으로 들어간다)
          const l3 = laptop(); l3.position.set(0.6, 0.75, 0); l3.rotation.y = Math.PI / 2; g.add(l3);
          R.props.laptops.push(l3);
          R.demoLaptop = l3;
        }
      }
      s.add(g);
      R.tables.push(P);
    }
    R.tableAt = (st, k) => R.tables.find((t) => t.s === st && t.k === k);
    // 시연용 노트북 화면 정면으로 들어가는 카메라 자세
    const a = 0.22, tp = tablePos(2, 0, 0);
    const cx = tp.x + 0.6 - 0.12 - 0.11 * Math.sin(a), cy = 0.75 + 0.018 + 0.11 * Math.cos(a);
    W.POSES.laptopNear = { p: [cx + Math.cos(a) * 1.3, cy + Math.sin(a) * 1.3 + 0.35, tp.z + 0.5], t: [cx, cy, tp.z], fov: 30, tilt: 0.3 };
    W.POSES.laptop = { p: [cx + Math.cos(a) * 0.4, cy + Math.sin(a) * 0.4, tp.z], t: [cx, cy, tp.z], fov: 30, tilt: 0 };
  }

  // ── 스테이션 바닥 · 순환 화살표 ─────────────────
  R.zones = [];
  R.arrows = [];
  function buildZones(s) {
    const cols = [0xE3D2B8, 0xD7DBC6, 0xCFD9DF];
    SX.forEach((x, i) => {
      const z = hidden(mesh(rbox(2.3, 0.03, 5.5, 0.012), mat(cols[i], { roughness: 0.95 }), x, 0.016, 0.9, false));
      s.add(z);
      R.zones.push(z);
    });
    const navy = mat(C.navy, { roughness: 0.6 });
    const paths = [
      [[-2.4, 3.95], [-1.25, 4.3], [-0.15, 3.95]],
      [[0.15, 3.95], [1.25, 4.3], [2.4, 3.95]],
      [[2.9, -2.2], [0, -2.7], [-2.9, -2.2]],
    ];
    paths.forEach((pts) => {
      const curve = new T.CatmullRomCurve3(pts.map(([x, z]) => new T.Vector3(x, 0.06, z)));
      const geo = new T.TubeGeometry(curve, 48, 0.045, 8, false);
      const tube = mesh(geo, navy, 0, 0, 0, false);
      geo.setDrawRange(0, 0);
      const end = curve.getPoint(1), dir = curve.getTangent(1);
      const head = mesh(new T.ConeGeometry(0.1, 0.26, 14), navy, end.x, 0.06, end.z, false);
      head.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir);
      hidden(head);
      s.add(tube, head);
      R.arrows.push({ tube, head, count: geo.index.count, st: { p: 0 } });
    });
  }
  R.setZones = (tl, on, at = 0) => pop(tl, R.zones, on, at, 0.1);
  R.setArrows = function (tl, on, at = 0) {
    R.arrows.forEach((a, i) => {
      tl.to(a.st, { p: on ? 1 : 0, duration: on ? 0.8 : 0.4, ease: 'power2.inOut',
        onUpdate: () => a.tube.geometry.setDrawRange(0, Math.floor(a.count * a.st.p / 3) * 3) }, at + (on ? i * 0.25 : 0));
      pop(tl, a.head, on, at + (on ? i * 0.25 + 0.7 : 0));
    });
  };

  // ── 벽 게시판: 핵심 어휘 풀이 카드 (문구는 지도안 Ⅺ.6 표에서 읽는다) ──
  R.cards = [];
  function wrap(ctx, text, maxW) {
    const out = [];
    let line = '';
    for (const word of text.split(' ')) {
      const t = line ? line + ' ' + word : word;
      if (ctx.measureText(t).width > maxW && line) { out.push(line); line = word; } else line = t;
    }
    if (line) out.push(line);
    return out;
  }
  function drawCard(ctx, w, h, row, sel) {
    ctx.fillStyle = '#FBF8F1';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = sel ? '#F3D37C' : '#213A63';
    ctx.fillRect(0, 0, w, 16);
    ctx.strokeStyle = sel ? '#C8952A' : 'rgba(27,26,24,.25)';
    ctx.lineWidth = sel ? 10 : 3;
    ctx.strokeRect(5, 5, w - 10, h - 10);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#213A63';
    ctx.font = W.font(row.word.length > 4 ? 58 : 66, 900);
    ctx.fillText(row.word, 34, 98);
    ctx.fillStyle = '#1B1A18';
    ctx.font = W.font(36, 700);
    wrap(ctx, row.easy, w - 68).slice(0, 2).forEach((l, i) => ctx.fillText(l, 34, 168 + i * 48));
    ctx.fillStyle = '#6F695F';
    ctx.font = W.font(28, 500);
    wrap(ctx, row.ex, w - 68).slice(0, 2).forEach((l, i) => ctx.fillText(l, 34, 288 + i * 38));
  }
  function buildWall(s, rows) {
    s.add(mesh(rbox(0.05, 1.32, 3.95, 0.02), mat(0xC4A57A, { roughness: 1 }), -3.725, 1.75, 0));
    rows.slice(0, 8).forEach((r, i) => {
      const top = i < 4, n = top ? Math.min(4, rows.length) : Math.min(4, rows.length - 4), k = top ? i : i - 4;
      const ct = W.canvasTex(512, 360, (c, w, h) => drawCard(c, w, h, r, false));
      const m = new T.MeshStandardMaterial({ map: ct.tex, roughness: 0.9 });
      const pl = mesh(new T.PlaneGeometry(0.82, 0.577), m, -3.695, top ? 2.06 : 1.44, ((n - 1) / 2 - k) * 0.92, false);
      pl.rotation.y = Math.PI / 2;
      s.add(pl);
      R.cards.push({ pl, ct, row: r, home: pl.position.clone() });
    });
  }
  // 하나를 골라 앞으로 꺼낸다 (발표에서는 '상대도수')
  function selectCard(tl, c, on, at) {
    if (!c) return;
    tl.call(() => c.ct.draw((cx, w, h) => drawCard(cx, w, h, c.row, on)), null, at);
    tl.to(c.pl.position, { x: c.home.x + (on ? 0.16 : 0), duration: 0.45, ease: 'back.out(2)' }, at);
    tl.to(c.pl.scale, { x: on ? 1.14 : 1, y: on ? 1.14 : 1, duration: 0.45, ease: 'back.out(2)' }, at);
  }
  const focusCard = () => R.cards.find((c) => c.row.word === '상대도수') || R.cards[0];

  // ── Bruner 3층: 같은 20번의 결과를 세 가지 표상으로 ─────
  R.layerPlanes = [];
  const LAYER_TITLES = [['작동적 표상', '캡슐을 직접 뽑아 토큰 보기'], ['영상적 표상', '스티커 그래프'], ['상징적 표상', '수와 식']];
  function tallyData() {
    if (!D.data.tally) {
      const seq = Array.from({ length: 20 }, D.draw);
      D.data.tally = { seq, g: seq.filter((x) => x === 'g').length, s: seq.filter((x) => x === 's').length, b: seq.filter((x) => x === 'b').length, sample: true };
    }
    return D.data.tally;
  }
  function drawLayer(ctx, w, h, i) {
    const d = tallyData();
    ctx.fillStyle = '#FBF8F1'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(27,26,24,.22)'; ctx.lineWidth = 3; ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
    ctx.fillStyle = '#213A63'; ctx.font = W.font(40, 900); ctx.textAlign = 'left';
    ctx.fillText(LAYER_TITLES[i][0], 36, 60);
    ctx.fillStyle = '#6E685E'; ctx.font = W.font(34, 500);
    ctx.fillText(LAYER_TITLES[i][1], 36 + ctx.measureText(LAYER_TITLES[i][0]).width * 1.15 + 18, 56);
    if (i === 0) {
      d.seq.forEach((r, n) => {
        const x = 70 + (n % 10) * 92, y = 150 + Math.floor(n / 10) * 110;
        ctx.fillStyle = D.RARITY[r].color;
        ctx.beginPath(); ctx.arc(x, y, 34, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.45)';
        ctx.beginPath(); ctx.arc(x - 10, y - 11, 9, 0, 7); ctx.fill();
      });
    } else if (i === 1) {
      ['g', 's', 'b'].forEach((r, row) => {
        const y = 108 + row * 82;
        ctx.fillStyle = '#1B1A18'; ctx.font = W.font(32, 700);
        ctx.fillText(D.RARITY[r].name, 36, y + 44);
        for (let n = 0; n < d[r]; n++) {
          ctx.fillStyle = D.RARITY[r].color;
          ctx.fillRect(110 + n * 52, y + 8, 44, 44);
        }
      });
    } else {
      const avg = d.seq.reduce((a, r) => a + D.PAY[r], 0) / 20;
      ctx.fillStyle = '#1B1A18'; ctx.font = W.font(54, 700, 'Noto Serif KR');
      ctx.fillText(`금 ${d.g}/20 = ${(d.g / 20).toFixed(2)}`, 50, 148);
      ctx.fillStyle = '#C8952A';
      ctx.fillText('확률 1/10 = 0.10', 50, 238);
      ctx.fillStyle = '#1B1A18';
      ctx.fillText(`한 번 평균 ${D.fmt(avg)}원`, 50, 328);
      ctx.fillStyle = '#4B4740'; ctx.font = W.font(40, 700);
      ctx.textAlign = 'right';
      ctx.fillText('왜 다를까?', w - 50, 238);
      ctx.fillText('1,000원보다?', w - 50, 328);
    }
  }
  function buildLayers(s) {
    const camP = new T.Vector3(...W.POSES.layers.p);
    const base = tablePos(1, 0, 0);
    for (let i = 0; i < 3; i++) {
      const ct = W.canvasTex(1024, 380, (c, w, h) => drawLayer(c, w, h, i));
      const m = new T.MeshBasicMaterial({ map: ct.tex, transparent: true, opacity: 0, side: T.DoubleSide, toneMapped: false });
      const pl = new T.Mesh(new T.PlaneGeometry(1.5, 0.557), m);
      const y = 1.14 + i * 0.64;
      pl.position.set(base.x, y, base.z);
      pl.lookAt(camP.x, y, camP.z);
      pl.userData = { y, ct };
      pl.visible = false;
      s.add(pl);
      R.layerPlanes.push(pl);
    }
    // 목표는 층판 옆에 붙은 견출지(인덱스 탭): 모두 = 작동적·영상적 두 층, 대부분 = 상징적 층, 일부 = 맨 위로 삐져나온 탭
    const HALF = 0.2785;
    const at = (i, x, y) => (v) => R.layerPlanes[i].localToWorld(v.set(x, y, 0));
    const tabs = [
      { id: 'goal-all', html: '<b>모두</b>뽑아 보고 표·그래프로 나타낸다', pos: at(0, 0.75, 0.32), span: [at(1, 0.75, HALF), at(0, 0.75, -HALF)], cls: 'pin-goal g-all' },
      { id: 'goal-most', html: '<b>대부분</b>상대도수·평균으로 이득을 따진다', pos: at(2, 0.75, 0), span: [at(2, 0.75, HALF), at(2, 0.75, -HALF)], cls: 'pin-goal g-most' },
      { id: 'goal-some', html: '<b>일부</b>상금을 바꿔 본전 상금을 추론한다', pos: at(2, 0.42, HALF), cls: 'pin-goal pin-up g-some' },
    ];
    const pa = new T.Vector3(), pb = new T.Vector3();
    tabs.forEach((t) => {
      const pin = W.addPin(t.id, t.html, t.pos, t.cls);
      if (!t.span) return;
      // 탭 높이 = 덮는 층들의 화면 높이
      W.onFrame(() => {
        if (!pin.on && +pin.el.style.opacity === 0) return;
        t.span[0](pa).project(W.camera);
        t.span[1](pb).project(W.camera);
        pin.el.style.setProperty('--h', (Math.abs(pa.y - pb.y) * 0.5 * D.H).toFixed(1) + 'px');
      });
    });
  }
  R.layerCount = 0;
  R.refreshLayers = () => R.layerPlanes.forEach((p) => p.userData.ct.draw());
  R.setLayers = function (tl, n, at = 0) {
    const prev = R.layerCount;
    if (n === prev) return;
    R.layerCount = n;
    R.layerPlanes.forEach((pl, i) => {
      const show = i < n, was = i < prev;
      if (show && !was) {
        tl.call(() => { pl.visible = true; R.refreshLayers(); }, null, at);
        tl.fromTo(pl.position, { y: 0.85 }, { y: pl.userData.y, duration: 0.9, ease: 'power3.out' }, at + i * 0.18);
        tl.fromTo(pl.material, { opacity: 0 }, { opacity: 1, duration: 0.6 }, at + i * 0.18);
      } else if (!show && was) {
        tl.to(pl.material, { opacity: 0, duration: 0.35 }, at);
        tl.to(pl.position, { y: 0.85, duration: 0.45, ease: 'power2.in' }, at);
        tl.call(() => { pl.visible = false; }, null, at + 0.46);
      }
    });
  };

  function plane(tex, w, h, basic = false) {
    const m = basic ? new T.MeshBasicMaterial({ map: tex, toneMapped: false }) : new T.MeshStandardMaterial({ map: tex, roughness: 0.9 });
    return new T.Mesh(new T.PlaneGeometry(w, h), m);
  }

  // ── 렌즈: 지원 도구만 빛나게 하고 교실은 낮춘다 ─────────
  //   lead  수학 스테이션에서 학생 A의 역할 (진행자 + 절차 영상)
  //   A     정보 스테이션에서 학생 A를 위한 지원
  //   all   같은 도구가 처음부터 모든 모둠에 있었다
  //   vocab 벽의 어휘 카드 하나를 꺼낸다 (교실은 낮추지 않는다)
  function lensMats(l) {
    const m = R.tableAt(1, 0), f = R.tableAt(2, 0);   // 학생 A: 수학(모둠 시작) → 정보(순환 뒤), 둘 다 k = 0 책상
    if (l === 'lead') return [m.tablet.userData.frame, m.counter.userData.frame, m.role[1]];
    if (l === 'A') return [f.tablet.userData.frame, f.role[1], f.schedule[0]];
    if (l === 'all') return [...R.props.picture, ...R.props.schedule, ...R.props.role, ...R.props.sticker, ...R.props.tokens, ...R.props.tablets, ...R.props.counters];
    return [];
  }
  const LENS_PINS = { lead: ['tag-A', 'lp-tab1', 'lp-cnt'], A: ['tag-A', 'lp-tab2', 'lp-scr', 'lp-sch'], all: [], vocab: [] };
  R.lens = null;
  R.setLens = function (tl, l, prev, atA = 0, atC = 0) {
    if (l === prev) return;
    if (prev) {
      R.glow(tl, lensMats(prev), false, atA);
      LENS_PINS[prev].forEach((id) => W.pinTo(tl, id, false, atA));
      if (prev === 'vocab') selectCard(tl, focusCard(), false, atA);
    }
    R.lens = l;
    const dim = l && l !== 'vocab';
    W.dimTo(tl, dim ? 1 : 0, { at: dim ? atC : atA });
    if (l) {
      R.glow(tl, lensMats(l), true, atC + 0.2);
      LENS_PINS[l].forEach((id, i) => W.pinTo(tl, id, true, atC + 0.3 + i * 0.12));
      if (l === 'vocab') selectCard(tl, focusCard(), true, atC);
    }
  };

  // ── 라벨 ─────────────────────────────────────
  function buildPins() {
    const head = (p, dy = 0.32) => (v) => v.set(p.position.x, p.position.y + p.userData.headY + dy, p.position.z);
    W.addPin('tag-A', '학생 A', head(R.students[R.A]), 'pin-tag');
    ['T1 사회', 'T2 수학', 'T3 정보', 'T4 특수교사'].forEach((t, i) =>
      W.addPin('t' + (i + 1), t, head(R.teachers[i], 0.3), i === 3 ? 'pin-teacher pin-t4' : 'pin-teacher'));
    STATION.forEach((n, i) => W.addPin('st' + i, `${n} 스테이션`, (v) => v.set(SX[i], 0.05, 3.62), 'pin-station'));
    // 렌즈에서 빛나는 지원 도구의 이름 (색만으로 구분하지 않게)
    const m = R.tableAt(1, 0), f = R.tableAt(2, 0);
    const on = (o, dy = 0.08) => (v) => { o.getWorldPosition(v); v.y += dy; return v; };
    W.addPin('lp-tab1', '절차 영상 (자기 모습)', on(m.tablet, 0.24), 'pin-prop');
    W.addPin('lp-cnt', '횟수판 20칸', on(m.counter, 0.06), 'pin-prop pin-side');
    W.addPin('lp-tab2', '절차 영상 (4단계)', on(f.tablet, 0.24), 'pin-prop');
    W.addPin('lp-scr', '스크립트 카드', on(f.roleMesh[1], 0.06), 'pin-prop pin-side');
    W.addPin('lp-sch', '개별 일과표', on(f.schG, 0.3), 'pin-prop');
  }

  R.build = function (vocabRows) {
    const s = W.scene;
    buildRoom(s);
    buildBoard(s);
    buildTables(s);
    buildPeople(s);
    buildZones(s);
    buildWall(s, vocabRows);
    buildLayers(s);
    buildPins();
  };
})();
