// 교실 디오라마 (1 = 1m, 일반교실 표준 7.5m × 9m: 칠판 쪽 벽 7.5m, 앞뒤 9m): 교실, 모둠 책상과 교구, 학생·교사 말, 스테이션, 순환 화살표,
// 칠판(판서), 벽 게시판의 지원 카드 10장, Bruner 3층, 렌즈와 카드별 교실 변화
(function () {
  const T = THREE, W = D.world;
  const R = D.room = {};
  const { mat, rbox, mesh } = W;

  const SX = [-2.5, 0, 2.5];              // 사회 · 수학 · 정보 스테이션
  const TZ = [-0.5, 2.3];                 // 스테이션마다 책상 두 개
  const SEATS = [[-0.45, -0.78], [0.45, -0.78], [-0.45, 0.78], [0.45, 0.78]];
  const STATION = ['사회', '수학', '정보'];
  R.A = 3;                                // 학생 A: 1모둠 (사회 → 수학)
  R.B = 9;                                // 학생 B: 3모둠 (수학 → 정보)
  R.spread = 0;                           // 지체장애 카드: 책상 사이를 넓힌다

  const C = {
    floor: 0xD9CBB2, slab: 0xBFAE92, wall: 0xEEE7DA, wall2: 0xE6DDCC,
    wood: 0xC6A47A, woodDark: 0x8E7154, board: 0x2E3C35, frame: 0x7E6043,
    ink: 0x1B1A18, navy: 0x213A63, paper: 0xF7F2E8,
  };
  const STUDENT_COLORS = [0xD98C6B, 0xE2B677, 0x9DB58A, 0x7FA7B5, 0xC9A3C4, 0xD9C3A0, 0xA9A18A, 0xD99E9E, 0x8FA0C9, 0xB7C98E];
  const SKIN = 0xF1DCC4;
  const GLOW = new T.Color(0xFFC861);
  const GOLD = new T.Color(0xF2B232);

  const tablePos = (s, k, sp = R.spread) => ({ x: SX[s] * (1 + 0.12 * sp), z: TZ[k] + (k ? 0.5 : -0.5) * sp });

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

  // ── 칠판 판서 (지도안 Ⅹ.3 판서 계획) ───────────
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
      ['금색 확률 = 1/10', '우리 모둠 한 번 평균 = ___원', '1,000번 한 번 평균 = ___원', '기회비용 = ___'].forEach((t, i) =>
        L.push({ t, x: 760, y: 340 + i * 82, f: hand(48, 400), c: CHALK }));
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
  // 헤드폰: 반원 호는 +x → 위 → −x 로 그려지므로 회전 없이 양쪽 귀(컵)를 잇는다
  function headphones(m, r) {
    const g = new T.Group();
    g.add(mesh(new T.TorusGeometry(r, r * 0.12, 8, 24, Math.PI), m, 0, 0, 0));
    const cupG = new T.CylinderGeometry(r * 0.37, r * 0.37, r * 0.27, 16);
    [-1, 1].forEach((sgn) => { const c = mesh(cupG, m, sgn * r, 0, 0); c.rotation.z = Math.PI / 2; g.add(c); });
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
    return { x: tp.x + SEATS[j][0] * (1 + 0.15 * R.spread), z: tp.z + SEATS[j][1] * (1 + 0.15 * R.spread) };
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
    // 학생 B 의 헤드폰: 늘 쓰고 있지 않고, 시끄러울 때 스스로 골라 쓴다 (렌즈 B 에서만 머리에 씌운다)
    const b = R.students[R.B];
    const hp = R.hpB = hidden(headphones(R.mat_hp = glowMat(0x2C2F36, { roughness: 0.5 }), 0.15));
    hp.position.y = b.userData.headY;
    b.add(hp);

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
  R.relayout = function () {
    R.students.forEach((p, i) => { const d = seatPos(i, R.studentMode); p.position.x = d.x; p.position.z = d.z; });
    R.tables.forEach((t) => { const tp = tablePos(t.s, t.k); t.g.position.x = tp.x; t.g.position.z = tp.z; });
  };
  R.setTeachers = (tl, on, at = 0) => pop(tl, R.teachers, on, at, 0.08);

  // ── 책상과 교구 ──────────────────────────────
  R.tables = [];
  R.rowDesks = [];
  R.props = { picture: [], schedule: [], role: [], sticker: [], sheet: [], bins: [], laptops: [], choice: [], hp: [], tokens: [] };
  const sheetTex = {};
  function makeSheetTex() {
    sheetTex.normal = W.canvasTex(256, 184, (c, w, h) => {
      c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#B9B2A6';
      for (let i = 0; i < 6; i++) c.fillRect(22, 26 + i * 25, i % 2 ? 150 : 210, 6);
    }).tex;
    sheetTex.contrast = W.canvasTex(256, 184, (c, w, h) => {
      c.fillStyle = '#111111'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#FFE14D';
      for (let i = 0; i < 4; i++) c.fillRect(18, 22 + i * 40, i % 2 ? 160 : 220, 16);
    }).tex;
  }
  function screenTex(kind) {
    return W.canvasTex(512, 320, (c, w, h) => {
      if (kind === 'code') {
        c.fillStyle = '#1E2230'; c.fillRect(0, 0, w, h);
        const rows = [['#E3B341', 150], ['#8FB3FF', 260], ['#C9CED6', 210], ['#8FB3FF', 300], ['#E3B341', 180], ['#C9CED6', 240], ['#8FB3FF', 120]];
        rows.forEach(([col, len], i) => { c.fillStyle = col; c.fillRect(30 + (i % 3) * 22, 30 + i * 38, len, 14); });
      } else if (kind === 'call') {
        c.fillStyle = '#2B3442'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#F1DCC4'; c.beginPath(); c.arc(w / 2, 130, 52, 0, 7); c.fill();
        c.fillStyle = '#7FA7B5'; c.beginPath(); c.ellipse(w / 2, 290, 110, 90, 0, 0, 7); c.fill();
        c.fillStyle = '#E25B4B'; c.beginPath(); c.arc(w - 40, 34, 10, 0, 7); c.fill();
      } else {   // 엔트리 화면: 왼쪽 블록, 오른쪽 실행 결과
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
      }
    }).tex;
  }
  function laptop(kind = 'sim') {
    const g = new T.Group();
    const dark = mat(0x3A3D44, { roughness: 0.5, metalness: 0.3 });
    g.add(mesh(rbox(0.34, 0.018, 0.24, 0.008), dark, 0, 0.009, 0));
    const hinge = new T.Group();
    hinge.position.set(0, 0.018, -0.12);
    hinge.rotation.x = -0.22;
    hinge.add(mesh(rbox(0.34, 0.22, 0.012, 0.008), dark, 0, 0.11, 0));
    const scr = new T.MeshBasicMaterial({ map: screenTex(kind), toneMapped: false });
    const disp = new T.Mesh(new T.PlaneGeometry(0.31, 0.19), scr);
    disp.position.set(0, 0.11, 0.0065);
    hinge.add(disp);
    g.add(hinge);
    g.userData.screen = scr;
    return g;
  }
  function sphereBalls(n = 10, r = 0.028, geo = null, flat = false) {
    const g = new T.Group();
    const colors = [D.RARITY.g.hex].concat(Array(3).fill(D.RARITY.s.hex), Array(6).fill(D.RARITY.b.hex));
    const ge = geo || new T.SphereGeometry(r, 14, 10);
    colors.slice(0, n).forEach((c, i) => {
      const b = mesh(ge, mat(c, { roughness: flat ? 0.9 : 0.4, metalness: flat ? 0 : 0.3, flatShading: flat }),
        Math.cos(i * 2.4) * 0.07, r + (i > 5 ? r * 1.6 : 0), Math.sin(i * 2.4) * 0.07);
      g.add(b);
    });
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
      const hpm = glowMat(0x2C2F36, { roughness: 0.5 });
      const hpT = headphones(hpm, 0.085);
      hpT.position.set(0, 0.77, 0.42);
      hpT.rotation.x = -Math.PI / 2;   // 책상 위에 눕혀 둔다
      g.add(hpT);
      P.picture = pic; P.schedule = [sch]; P.role = roles; P.sheet = sheet; P.hp = hpm;
      P.picG = picG; P.schG = schG; P.roleMesh = roleMeshes;
      R.props.picture.push(pic); R.props.schedule.push(sch); R.props.role.push(...roles); R.props.sheet.push(sheet); R.props.hp.push(hpm);

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
        bin.add(sphereBalls());
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

  // ── 벽 게시판: 지원 카드 10장 ──────────────────
  R.cards = [];
  function drawCard(ctx, w, h, i, area, sel) {
    ctx.fillStyle = sel ? '#213A63' : '#FBF8F1';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = sel ? '#F3D37C' : 'rgba(27,26,24,.25)';
    ctx.lineWidth = sel ? 10 : 3;
    ctx.strokeRect(5, 5, w - 10, h - 10);
    ctx.fillStyle = sel ? '#F3D37C' : '#8A847A';
    ctx.font = W.font(30, 700);
    ctx.textAlign = 'left';
    ctx.fillText(String((i + 1) % 10), 22, 48);
    ctx.fillStyle = sel ? '#FFFFFF' : '#1B1A18';
    ctx.font = W.font(area.length > 5 ? 34 : 42, 900);
    ctx.textAlign = 'center';
    ctx.fillText(area, w / 2, h / 2 + 28);
  }
  function buildWall(s, rows) {
    s.add(mesh(rbox(0.05, 1.32, 3.95, 0.02), mat(0xC4A57A, { roughness: 1 }), -3.725, 1.75, 0));
    rows.slice(0, 10).forEach((r, i) => {
      const area = r.area.replace(/\(.*\)/, '').trim();
      const ct = W.canvasTex(320, 220, (c, w, h) => drawCard(c, w, h, i, area, false));
      const m = new T.MeshStandardMaterial({ map: ct.tex, roughness: 0.9 });
      const pl = mesh(new T.PlaneGeometry(0.66, 0.454), m, -3.695, i < 5 ? 2.03 : 1.47, 1.52 - (i % 5) * 0.76, false);
      pl.rotation.y = Math.PI / 2;
      s.add(pl);
      R.cards.push({ pl, ct, area, i, home: pl.position.clone() });
    });
  }
  R.wallShimmer = function (tl, at = 0) {
    tl.to(R.cards.map((c) => c.pl.position), { x: '+=0.06', duration: 0.18, yoyo: true, repeat: 1, stagger: 0.05, ease: 'sine.inOut' }, at);
  };
  function selectCard(tl, i, on, at) {
    const c = R.cards[i];
    if (!c) return;
    tl.call(() => c.ct.draw((cx, w, h) => drawCard(cx, w, h, i, c.area, on)), null, at);
    tl.to(c.pl.position, { x: c.home.x + (on ? 0.14 : 0), duration: 0.45, ease: 'back.out(2)' }, at);
    tl.to(c.pl.scale, { x: on ? 1.12 : 1, y: on ? 1.12 : 1, duration: 0.45, ease: 'back.out(2)' }, at);
  }

  // ── Bruner 3층: 같은 20번의 결과를 세 가지 표상으로 ─────
  R.layerPlanes = [];
  const LAYER_TITLES = [['작동적 표상', '실물 공으로 직접 뽑기'], ['영상적 표상', '스티커 그래프'], ['상징적 표상', '수와 식']];
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
      { id: 'goal-some', html: '<b>일부</b>상금을 바꿔 코드로 논증한다', pos: at(2, 0.42, HALF), cls: 'pin-goal pin-up g-some' },
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

  // ── 카드를 바꾸면 교실이 바뀐다 ────────────────
  const MOD = R.MOD = [];
  function poster(lines, w = 512, h = 384, bg = '#FBF8F1', ink = '#1B1A18') {
    return W.canvasTex(w, h, (c) => {
      c.fillStyle = bg; c.fillRect(0, 0, w, h);
      lines.forEach((l, i) => {
        c.fillStyle = i === 0 ? '#213A63' : ink;
        c.font = W.font(i === 0 ? 44 : 38, i === 0 ? 900 : 500);
        c.fillText(l, 34, 70 + i * 72);
      });
    }).tex;
  }
  function plane(tex, w, h, basic = false) {
    const m = basic ? new T.MeshBasicMaterial({ map: tex, toneMapped: false }) : new T.MeshStandardMaterial({ map: tex, roughness: 0.9 });
    return new T.Mesh(new T.PlaneGeometry(w, h), m);
  }
  function buildMods(s) {
    const add = (o) => { s.add(hidden(o)); return o; };
    const onTables = (st, make) => R.tables.filter((t) => st === null || t.s === st).map((t) => { const o = make(t); t.g.add(hidden(o)); return o; });

    // 0 지적장애: 그림 단서와 스티커 그래프가 빛난다
    MOD[0] = { glow: () => [...R.props.picture, ...R.props.sticker] };
    // 1 자폐성장애: 일과표 · 헤드폰 · 조용한 자리 (교실 뒤 책상 하나에 접이식 칸막이를 세운다. 공사 없이 꺼내 쓰는 물건)
    const quiet = new T.Group();
    const part = mat(0xC9D3DA);
    quiet.add(mesh(rbox(0.62, 0.04, 0.44, 0.015), mat(C.wood), 0, 0.66, 0), mesh(rbox(0.56, 0.1, 0.38, 0.01), mat(C.woodDark), 0, 0.59, 0));
    [-0.28, 0.28].forEach((x) => quiet.add(mesh(new T.BoxGeometry(0.03, 0.64, 0.36), mat(0x8C8984, { roughness: 0.5, metalness: 0.4 }), x, 0.32, 0)));
    quiet.add(mesh(rbox(0.6, 0.4, 0.015, 0.006), part, 0, 0.88, -0.21));
    [-1, 1].forEach((k) => { const w = mesh(rbox(0.015, 0.4, 0.4, 0.006), part, k * 0.3, 0.88, -0.02); w.rotation.y = k * 0.25; quiet.add(w); });
    quiet.add(mesh(rbox(0.4, 0.04, 0.36, 0.02), mat(0x9DB0C4), 0, 0.42, 0.42), mesh(rbox(0.4, 0.4, 0.04, 0.02), mat(0x9DB0C4), 0, 0.62, 0.6));
    quiet.position.set(-3.0, 0, -3.8);
    MOD[1] = { objs: [add(quiet)], glow: () => [...R.props.schedule, ...R.props.hp] };
    // 2 학습장애: 계산기 · 읽어 주기 스피커
    const calcs = onTables(1, () => {
      const g = new T.Group();
      g.add(mesh(rbox(0.11, 0.018, 0.16, 0.006), glowMat(0x2C2F36), 0, 0.009, 0));
      g.add(mesh(new T.BoxGeometry(0.08, 0.004, 0.04), mat(0xB8D8C0), 0, 0.02, -0.045, false));
      g.position.set(0.68, 0.75, 0.25);
      return g;
    });
    // 읽어 주기 펜 + 이어폰 (스피커는 교실에 소리를 퍼뜨리므로 쓰지 않는다)
    const spk = onTables(null, () => {
      const g = new T.Group();
      const pen = mesh(new T.CylinderGeometry(0.012, 0.008, 0.15, 12), glowMat(0x2C2F36), 0, 0.012, 0);
      pen.rotation.z = Math.PI / 2;
      g.add(pen);
      const bud = mat(0xF3F1EC, { roughness: 0.4 });
      g.add(mesh(new T.SphereGeometry(0.012, 10, 8), bud, -0.03, 0.012, 0.05), mesh(new T.SphereGeometry(0.012, 10, 8), bud, 0.0, 0.012, 0.06));
      g.position.set(-0.36, 0.75, 0.1);
      return g;
    });
    MOD[2] = { objs: [...calcs, ...spk], glow: () => [...calcs, ...spk].map((g) => g.children[0].material) };
    // 3 정서·행동장애: 기대행동 게시물 · 쉼 자리 (교실 뒤 의자 하나와 깔개. 휴식 카드를 들고 와서 3분 쉰다)
    const calm = new T.Group();
    calm.add(mesh(new T.CylinderGeometry(0.62, 0.62, 0.02, 40), mat(0xB9C7B0, { roughness: 1 }), 0, 0.034, 0, false));
    const seat = mat(0x8FA58A, { roughness: 0.9 });
    calm.add(mesh(rbox(0.42, 0.05, 0.4, 0.02), seat, 0.05, 0.44, 0.05), mesh(rbox(0.42, 0.42, 0.05, 0.02), seat, 0.05, 0.66, 0.26));
    [[-0.13, -0.12], [0.23, -0.12], [-0.13, 0.22], [0.23, 0.22]].forEach(([x, z]) => calm.add(mesh(new T.CylinderGeometry(0.018, 0.018, 0.42, 8), mat(0x8C8984), x, 0.21, z)));
    calm.add(mesh(rbox(0.12, 0.012, 0.08, 0.004), glowMat(0xE58C6A), 0.05, 0.475, 0.0, false));   // 휴식 카드
    calm.position.set(-3.0, 0, -3.75);   // 교실 뒤 모퉁이 (조용한 자리와 같은 곳: 두 카드는 동시에 켜지지 않는다)
    const rules = plane(poster(['기대행동 3가지', '1  차례 지키기', '2  역할 지키기', '3  도움 카드 들기']), 1.0, 0.75);
    rules.position.set(-3.73, 1.75, -2.85);
    rules.rotation.y = Math.PI / 2;
    MOD[3] = { objs: [add(calm), add(rules)] };
    // 4 시각장애: 공은 크기·모양이 모두 같다 (손으로 골라 뽑을 수 없게). 뽑은 뒤 공의 촉각 스티커를 범례판에 대 보고 색을 안다. 활동지는 고대비로.
    const legends = onTables(1, () => {
      const g = new T.Group();
      g.add(mesh(rbox(0.17, 0.014, 0.24, 0.005), glowMat(0x1B1A18), 0, 0.007, 0));
      const dot = new T.SphereGeometry(0.011, 10, 8);
      [[D.RARITY.g.hex, 1], [D.RARITY.s.hex, 2], [D.RARITY.b.hex, 3]].forEach(([c, n], row) => {
        const m = mat(c, { roughness: 0.5 });
        for (let j = 0; j < n; j++) g.add(mesh(dot, m, -0.045 + j * 0.035, 0.016, -0.07 + row * 0.07, false));
      });
      g.position.set(0.66, 0.75, 0.22);
      return g;
    });
    MOD[4] = {
      objs: legends,
      glow: () => legends.map((g) => g.children[0].material),
      on(tl, at) { flipSheets(tl, 'contrast', at); },
      off(tl, at) { flipSheets(tl, 'normal', at); },
    };
    // 5 청각장애: 설치 공사 없이 모둠이 들고 다니는 한 세트. 자막 태블릿 · 마이크 2개(교사용, 돌려 쓰는 발언용) · 빛 타이머
    const kit = new T.Group();
    const capT = W.canvasTex(320, 200, (c, w, h) => {
      c.fillStyle = '#16181D'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#9AA3B2'; c.font = W.font(20, 700); c.fillText('실시간 자막', 18, 32);
      c.fillStyle = '#FFFFFF'; c.font = W.font(26, 500);
      ['스무 번 중에 금색은', '몇 번 나왔나요?', '두 번 나왔어요'].forEach((t, i) => c.fillText(t, 18, 84 + i * 40));
    }).tex;
    const tab = new T.Group();
    tab.add(mesh(rbox(0.21, 0.15, 0.012, 0.008), mat(0x2C2F36, { roughness: 0.5 }), 0, 0, 0));
    const scr = plane(capT, 0.19, 0.13, true);
    scr.position.z = 0.0065;
    tab.add(scr);
    tab.position.set(0.05, 0.75 + 0.07, -0.06);
    tab.rotation.x = -0.35;
    kit.add(tab);
    const micM = glowMat(0x2C2F36, { roughness: 0.4, metalness: 0.3 });
    [[-0.3, 0.02, 0.4], [-0.3, -0.06, -0.3]].forEach(([x, z, ry]) => {   // 손에 드는 발언 마이크 · 교사용 핀 마이크(작은 것)
      const m = new T.Group();
      m.add(mesh(new T.CylinderGeometry(0.012, 0.009, 0.1, 12), micM, 0, 0, 0));
      m.add(mesh(new T.SphereGeometry(0.019, 12, 10), mat(0x8C8984, { roughness: 0.6 }), 0, 0.058, 0));
      m.rotation.set(0, ry, Math.PI / 2);
      m.position.set(x, 0.765, z);
      kit.add(m);
    });
    const lampM = mat(0x5A4A20, { emissive: new T.Color(0xFFD45A), emissiveIntensity: 0 });
    const timer = new T.Group();
    timer.add(mesh(rbox(0.09, 0.07, 0.07, 0.015), mat(0xE9E4DA), 0, 0.035, 0), mesh(rbox(0.07, 0.05, 0.01, 0.01), lampM, 0, 0.038, 0.036, false));
    timer.position.set(-0.3, 0.75, -0.2);
    kit.add(timer);
    R.tableAt(1, 0).g.add(hidden(kit));
    MOD[5] = { objs: [kit], glow: () => [micM], lamp: lampM };
    W.onFrame((dt, t) => { lampM.emissiveIntensity = R.card === 5 ? (Math.sin(t * 5) > 0 ? 2.2 : 0.2) : 0; });
    // 6 지체장애: 넓어진 동선 · 바닥의 휠체어 동선 표시
    const tape = new T.Group();
    const tm = mat(C.navy, { roughness: 0.8 });
    const seg = (x1, z1, x2, z2) => {
      const len = Math.hypot(x2 - x1, z2 - z1), n = Math.floor(len / 0.5);
      for (let i = 0; i < n; i++) {
        const t0 = (i + 0.25) / n;
        const m = mesh(new T.BoxGeometry(0.28, 0.012, 0.09), tm, x1 + (x2 - x1) * t0, 0.03, z1 + (z2 - z1) * t0, false);
        m.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
        tape.add(m);
      }
    };
    seg(-3.5, 4.2, 3.5, 4.2); seg(-1.25, 4.2, -1.25, -2.35); seg(1.25, 4.2, 1.25, -2.35); seg(-3.5, -2.35, 3.5, -2.35);
    MOD[6] = {
      objs: [add(tape)],
      on(tl, at) { tl.to(R, { spread: 1, duration: 1.2, ease: 'power2.inOut', onUpdate: R.relayout }, at); },
      off(tl, at) { tl.to(R, { spread: 0, duration: 0.9, ease: 'power2.inOut', onUpdate: R.relayout }, at); },
    };
    // 7 건강장애: 모둠 노트북 화상 연결 (원격으로 참여하는 친구가 기록을 맡는다)
    const call = laptop('call');
    call.position.set(0.62, 0.75, 0.05);
    call.rotation.y = Math.PI / 2;
    R.tableAt(0, 0).g.add(hidden(call));
    MOD[7] = { objs: [call] };
    // 8 다문화: 핵심 어휘 이중언어 카드
    const words = [
      ['기회비용', 'opportunity cost', '机会成本'],
      ['확률', 'probability', 'xác suất'],
      ['상대도수', 'relative frequency', '相对频率'],
    ].map((w, i) => {
      const p = plane(poster(w, 512, 256), 0.66, 0.33);
      p.position.set(2.95, 2.35 - i * 0.42, -4.48);
      return add(p);
    });
    MOD[8] = { objs: words, glow: () => R.props.picture };
    // 9 영재: 심화 과제 카드 · 코드 화면
    const chal = onTables(2, () => mesh(rbox(0.2, 0.012, 0.14, 0.004), glowMat(0xE3B341, { metalness: 0.3, roughness: 0.4 }), -0.62, 0.757, 0.0, false));
    const codeTex = screenTex('code');
    MOD[9] = {
      objs: chal,
      glow: () => chal.map((m) => m.material),
      on(tl, at) { tl.call(() => R.props.laptops.forEach((l) => { l.userData.prev = l.userData.screen.map; l.userData.screen.map = codeTex; }), null, at + 0.2); },
      off(tl, at) { tl.call(() => R.props.laptops.forEach((l) => { if (l.userData.prev) l.userData.screen.map = l.userData.prev; }), null, at); },
    };
  }
  function flipSheets(tl, kind, at) {
    const sh = R.props.sheet;
    tl.to(sh.map((s) => s.scale), { x: 0.001, duration: 0.2, ease: 'power1.in' }, at);
    tl.call(() => sh.forEach((s) => { s.material.map = sheetTex[kind]; s.material.needsUpdate = true; }), null, at + 0.2);
    tl.to(sh.map((s) => s.scale), { x: 1, duration: 0.25, ease: 'power1.out' }, at + 0.2);
  }

  R.card = null;
  R.setCard = function (tl, idx, prev, atA = 0, atC = 0) {
    if (idx === prev) return;
    if (prev != null && MOD[prev]) {
      const m = MOD[prev];
      if (m.objs) pop(tl, m.objs, false, atA);
      if (m.glow) R.glow(tl, m.glow(), false, atA);
      if (m.off) m.off(tl, atA);
      selectCard(tl, prev, false, atA);
    }
    R.card = idx;
    if (idx != null && MOD[idx]) {
      const m = MOD[idx];
      selectCard(tl, idx, true, atC);
      if (m.objs) pop(tl, m.objs, true, atC + 0.2, 0.04);
      if (m.glow) R.glow(tl, m.glow(), true, atC + 0.2);
      if (m.on) m.on(tl, atC + 0.2);
    }
  };

  // ── 세 개의 렌즈: A → B → 모두 ────────────────
  function lensMats(l) {
    const a = R.tableAt(1, 0), b = R.tableAt(2, 0);   // 순환 뒤 A 는 수학, B 는 정보 책상
    if (l === 'A') return [a.picture, a.sticker, a.token];
    if (l === 'B') return [b.schedule[0], R.mat_hp, b.role[1]];
    if (l === 'all') return [...R.props.picture, ...R.props.schedule, ...R.props.role, ...R.props.sticker, ...R.props.tokens, ...R.props.hp];
    return [];
  }
  const LENS_PINS = { A: ['lp-pic', 'lp-stk', 'lp-tok'], B: ['lp-sch', 'lp-hp', 'lp-role'], all: [] };
  R.lens = null;
  R.setLens = function (tl, l, prev, atA = 0, atC = 0) {
    if (l === prev) return;
    if (prev) {
      R.glow(tl, lensMats(prev), false, atA);
      W.pinTo(tl, 'tag-' + prev, false, atA);
      LENS_PINS[prev].forEach((id) => W.pinTo(tl, id, false, atA));
      if (prev === 'B') pop(tl, R.hpB, false, atA);
    }
    R.lens = l;
    W.dimTo(tl, l ? 1 : 0, { at: l ? atC : atA });
    if (l) {
      if (l === 'B') pop(tl, R.hpB, true, atC);
      R.glow(tl, lensMats(l), true, atC + 0.2);
      if (l !== 'all') W.pinTo(tl, 'tag-' + l, true, atC + 0.3);
      LENS_PINS[l].forEach((id, i) => W.pinTo(tl, id, true, atC + 0.5 + i * 0.12));
    }
  };

  // ── 라벨 ─────────────────────────────────────
  function buildPins() {
    const head = (p, dy = 0.32) => (v) => v.set(p.position.x, p.position.y + p.userData.headY + dy, p.position.z);
    W.addPin('tag-A', '학생 A', head(R.students[R.A]), 'pin-tag');
    W.addPin('tag-B', '학생 B', head(R.students[R.B]), 'pin-tag');
    ['T1 사회', 'T2 수학', 'T3 정보', 'T4 특수교사'].forEach((t, i) =>
      W.addPin('t' + (i + 1), t, head(R.teachers[i], 0.3), i === 3 ? 'pin-teacher pin-t4' : 'pin-teacher'));
    STATION.forEach((n, i) => W.addPin('st' + i, `${n} 스테이션`, (v) => v.set(SX[i] * (1 + 0.12 * R.spread), 0.05, 3.62), 'pin-station'));
    // 렌즈 A · B 에서 빛나는 지원 도구의 이름 (색만으로 구분하지 않게)
    const a = R.tableAt(1, 0), b = R.tableAt(2, 0);
    const on = (o, dy = 0.08) => (v) => { o.getWorldPosition(v); v.y += dy; return v; };
    W.addPin('lp-pic', '그림 카드', on(a.picG, 0.06), 'pin-prop');
    W.addPin('lp-stk', '스티커 그래프', on(a.sb, 0.36), 'pin-prop');
    W.addPin('lp-tok', '토큰 쌓기', on(a.tokG, 0.14), 'pin-prop');
    W.addPin('lp-sch', '개별 일과표', on(b.schG, 0.3), 'pin-prop');
    W.addPin('lp-hp', '헤드폰 (필요할 때)', on(R.hpB, 0), 'pin-prop pin-side');   // 머리 위 이름표와 겹치지 않게 머리 옆에
    W.addPin('lp-role', '역할 카드', on(b.roleMesh[1], 0.06), 'pin-prop');
  }

  R.build = function (cardRows) {
    const s = W.scene;
    buildRoom(s);
    buildBoard(s);
    buildTables(s);
    buildPeople(s);
    buildZones(s);
    buildWall(s, cardRows);
    buildLayers(s);
    buildMods(s);
    buildPins();
  };
})();
