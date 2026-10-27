// 진행 엔진: 단계 이동, 상태 전환(빠짐 → 이동 → 등장), 키 조작, 화면 맞춤, 발표자 화면 동기화, 시작
(function () {
  const E = D.engine = {};
  const W = D.world, R = D.room;
  let idx = 0, cur = null, tl = null, actTl = null;
  E.docHidden = false;
  // 막 시작한 타임라인은 첫 틱 전까지 isActive() 가 false 라서, 진행도로 판단한다
  const running = (t) => !!(t && !t.paused() && t.progress() < 1);

  E.stateAt = (k) => {
    const s = Object.assign({}, D.DEFAULT);
    for (let i = 0; i <= k; i++) Object.assign(s, D.STEPS[i].set);
    return s;
  };
  const split = (o) => {
    if (!o) return [null, null];
    const [n, m] = o.split(':');
    return [n, m === undefined ? null : isNaN(+m) ? m : +m];
  };
  const app = () => D.$('#app');

  function panelTo(tl, on, at) {
    tl.to(D.view, { panel: on ? D.PANEL : 0, duration: 1.0, ease: 'power3.inOut',
      onUpdate: () => app().style.setProperty('--panel', D.view.panel.toFixed(1) + 'px') }, at);
  }

  // a(지금) → b(다음). A: 나갈 것이 먼저 빠지고, B: 카메라·빛·레터박스·패널·학생이 움직이고, C: 새 정보가 들어온다.
  function build(a, b, fx = {}) {
    const t = gsap.timeline({ paused: true });
    const [an, am] = split(a.overlay), [bn, bm] = split(b.overlay);
    const pinsOut = a.pins.filter((p) => !b.pins.includes(p));
    const pinsIn = b.pins.filter((p) => !a.pins.includes(p));
    const panelA = a.panel && !E.docHidden, panelB = b.panel && !E.docHidden;

    const leaving = (an && an !== bn) || pinsOut.length || b.layers < a.layers ||
      (a.lens && a.lens !== b.lens) || (a.arrows && !b.arrows);
    const tA = 0, tB = leaving ? 0.42 : 0;

    // A
    if (an && an !== bn) D.ov.leave(t, an, tA);
    pinsOut.forEach((p) => W.pinTo(t, p, false, tA));
    if (b.layers < a.layers) R.setLayers(t, b.layers, tA);
    if (a.arrows && !b.arrows) R.setArrows(t, false, tA);
    if (panelA && !panelB) panelTo(t, false, tA);

    // B
    let bEnd = tB;
    if (a.cam !== b.cam) {
      const d = fx.camDur ?? 1.7;
      W.camTo(t, b.cam, { dur: d, at: tB, ease: fx.camEase || 'power3.inOut' });
      bEnd = Math.max(bEnd, tB + d);
    }
    if (a.night !== b.night) {
      const at = tB + (fx.dayAt ?? 0), d = fx.dayDur ?? 1.4;
      W.dayTo(t, b.night ? 0 : 1, { at, dur: d });
      bEnd = Math.max(bEnd, at + d * 0.75);
    }
    if (a.letterbox !== b.letterbox) {
      t.to('.lb', { height: b.letterbox ? D.LB : 0, duration: 0.9, ease: 'power3.inOut' }, tB + (fx.lbAt ?? 0));
    }
    if (!panelA && panelB) {
      const at = tB + (fx.panelAt ?? 0);
      panelTo(t, true, at);
      bEnd = Math.max(bEnd, at + 0.8);
    }
    if (a.spin !== b.spin) D.machine.spin(t, b.spin, tB);
    if (a.students !== b.students) { R.setStudents(t, b.students, a.students, tB); bEnd = Math.max(bEnd, tB + 1.9); }
    if (a.zones !== b.zones) R.setZones(t, b.zones, tB + 0.1);
    if (a.teachers !== b.teachers) R.setTeachers(t, b.teachers, tB + (b.teachers ? 1.1 : 0));

    // C
    const tC = Math.max(tB, bEnd - 0.25) + (fx.ovAt ?? 0);
    if (a.board !== b.board) R.board(t, b.board, Math.max(tB, bEnd - 0.4));
    if (bn && bn !== an) D.ov.enter(t, bn, bm, tC);
    else if (bn && bm !== am) D.ov.mode(t, bn, bm, tC);
    if (!a.arrows && b.arrows) R.setArrows(t, true, tC);
    if (b.layers > a.layers) R.setLayers(t, b.layers, tC);
    pinsIn.forEach((p, i) => W.pinTo(t, p, true, tC + 0.15 + i * 0.06));
    R.setLens(t, b.lens, a.lens, tA, tC);

    // 지도안: 패널이 들어오는 동안 해당 부분으로 내려간다
    t.call(() => D.doc.highlight(b.doc), null, panelB && !panelA ? tB + (fx.panelAt ?? 0) : tB);
    t.call(() => D.doc.setSpeaker(b.speaker), null, 0);
    if (t.duration() === 0) t.set({}, {}, 0.01);
    return t;
  }

  function transition(target, fx) {
    const t = build(cur, target, fx);
    cur = target;
    tl = t;
    t.play();
    return t;
  }

  function runAction(step) {
    if (!step.action) return null;
    const [mod, act] = step.action;
    actTl = D.ov.action(mod, act);
    return actTl;
  }

  // 진행 중인 전환을 끝까지 보낸다. 끝나면 실행하려던 동작은 버린다 (다른 단계로 떠나는 중이므로)
  function settle() {
    if (!running(tl)) return;
    tl.eventCallback('onComplete', null);
    tl.progress(1);
  }
  E.go = function (k, { instant = false } = {}) {
    k = D.clamp(k, 0, D.STEPS.length - 1);
    if (k === idx && cur) return;
    const fwd = k === idx + 1;
    const step = D.STEPS[k];
    if (running(actTl)) actTl.progress(1);
    settle();
    if (k === 0) { D.machine.clearNow(); D.data = {}; E.t0 = null; }   // 처음으로: 리허설 흔적을 지운다
    const t = transition(E.stateAt(k), fwd ? step.fx : { camDur: 1.4 });
    idx = k;
    if (fwd && step.action) t.eventCallback('onComplete', () => runAction(step));
    else if (!fwd && step.restore) t.eventCallback('onComplete', () => D.ov.action(...step.restore).progress(1));
    if (instant) t.progress(1);
    if (k >= 1 && !E.t0) E.t0 = Date.now();
    try { history.replaceState(null, '', '#' + k); } catch (e) { /* file:// 에서 막힐 수 있다 */ }
    E.broadcast();
  };

  E.next = function () {
    if (running(actTl)) { actTl.progress(1); return; }      // 실행 중이면 결과까지 바로 보여 주고 멈춘다
    if (running(tl)) {
      tl.progress(1);
      if (running(actTl)) return;                          // 방금 실행이 시작됐다면 그 단계에 머문다
    }
    E.go(idx + 1);
  };
  E.prev = () => E.go(idx - 1);
  E.busy = () => running(tl) || running(actTl);
  E.index = () => idx;

  E.rerun = function () {
    const step = D.STEPS[idx];
    if (!step.action) { D.toast('이 단계에는 다시 실행할 것이 없습니다'); return; }
    if (actTl) actTl.progress(1);
    settle();
    if (step.action[0] === 'sim') D.ov.reg.sim.reset();
    runAction(step);
  };

  E.toggleDoc = function () {
    E.docHidden = !E.docHidden;
    const on = cur.panel && !E.docHidden;
    const t = gsap.timeline();
    panelTo(t, on, 0);
  };

  // ── 발표자 화면 동기화 ─────────────────────────
  let bc = null, pwin = null;
  try { bc = new BroadcastChannel('gacha-deck'); } catch (e) { /* 미지원 */ }
  E.stateMsg = () => {
    const s = D.STEPS[idx], n = D.STEPS[idx + 1];
    const inScene = D.STEPS.slice(0, idx + 1).filter((x) => x.scene === s.scene).length - 1;
    return { type: 'state', idx, total: D.STEPS.length, scene: s.scene, sub: inScene, label: s.label,
      next: n ? n.label : '(끝)', speaker: cur ? cur.speaker : '', t0: E.t0 || null, sceneEnd: D.SCENE_END };
  };
  E.broadcast = function () {
    const m = E.stateMsg();
    if (bc) bc.postMessage(m);
    if (pwin && !pwin.closed) pwin.postMessage(m, '*');
    try { localStorage.setItem('gacha-deck-state', JSON.stringify(Object.assign({ at: Date.now() }, m))); } catch (e) { /* 저장 불가 */ }
  };
  const seen = new Set();   // 발표자 창은 같은 명령을 세 경로로 보낸다
  function onCmd(m) {
    if (!m || typeof m !== 'object') return;
    if (m.id) { if (seen.has(m.id)) return; seen.add(m.id); }
    if (m.type === 'hello') E.broadcast();
    if (m.type !== 'nav') return;
    if (m.cmd === 'next') E.next();
    else if (m.cmd === 'prev') E.prev();
    else if (m.cmd === 'goto') E.go(m.idx);
    else if (m.cmd === 'resetTimer') { E.t0 = Date.now(); E.broadcast(); }
  }
  if (bc) bc.onmessage = (e) => onCmd(e.data);
  window.addEventListener('message', (e) => onCmd(e.data));
  window.addEventListener('storage', (e) => {
    if (e.key === 'gacha-deck-cmd' && e.newValue) { try { onCmd(JSON.parse(e.newValue)); } catch (err) { /* 무시 */ } }
  });
  E.openPresenter = () => {
    pwin = window.open('presenter.html', 'gacha-presenter', 'width=1180,height=780');
    if (!pwin) D.toast('팝업이 막혔습니다. 브라우저에서 팝업을 허용해 주세요');
  };

  // ── 키 ───────────────────────────────────────
  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    D.audio.unlock();
    const k = e.key;
    if (['ArrowRight', 'PageDown', ' ', 'Enter', 'ArrowDown'].includes(k)) { e.preventDefault(); E.next(); return; }
    if (['ArrowLeft', 'PageUp', 'Backspace', 'ArrowUp'].includes(k)) { e.preventDefault(); E.prev(); return; }
    if (k === 'Home') { E.go(0); return; }
    if (k === 'End') { E.go(D.STEPS.length - 1); return; }
    switch (k.toLowerCase()) {
      case 'f':
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen().catch(() => D.toast('전체화면을 열 수 없습니다'));
        break;
      case 'd': E.toggleDoc(); break;
      case 'r': E.rerun(); break;
      case 'm': D.audio.muted = !D.audio.muted; D.toast(D.audio.muted ? '소리 끔' : '소리 켬'); break;
      case 'q': W.setQuality((W.q + 1) % W.QUALITY.length); break;
      case 'b': D.$('#blackout').classList.toggle('on'); break;
      case 'p': E.openPresenter(); break;
    }
  }

  function fit() {
    const iw = window.innerWidth, ih = window.innerHeight;
    const s = Math.min(iw / D.W, ih / D.H);
    D.view.scale = s;
    app().style.transform = `translate(${((iw - D.W * s) / 2).toFixed(1)}px, ${((ih - D.H * s) / 2).toFixed(1)}px) scale(${s})`;
    if (W.renderer) W.refit();
  }

  async function fontsReady() {
    if (!document.fonts) return;
    const want = ['700 40px "Gaegu"', '400 40px "Gaegu"', '700 40px "Noto Sans KR"', '500 40px "Noto Sans KR"', '900 40px "Noto Sans KR"', '700 40px "Noto Serif KR"'];
    await Promise.race([
      Promise.all(want.map((f) => document.fonts.load(f, '가나다'))),
      new Promise((r) => setTimeout(r, 3000)),
    ]).catch(() => {});
  }

  D.boot = async function () {
    await D.content.load();
    D.doc.render(D.content.jidoan);
    D.vocab = D.doc.vocabRows();
    D.doc.check(D.STEPS);
    if (!D.vocab.length) D.toast('지도안 Ⅺ.6 핵심 어휘 풀이 카드 표를 찾지 못했습니다. 벽 게시판이 비어 있습니다', 5000);
    await fontsReady();
    fit();
    window.addEventListener('resize', fit);
    W.init(D.$('#gl'));
    D.machine.build();
    R.build(D.vocab);
    D.ov.init();
    W.covered = () => D.ov.reg.sim.el.style.visibility === 'visible' && +getComputedStyle(D.ov.reg.sim.el).opacity === 1 && D.view.panel >= D.PANEL - 0.5;

    cur = Object.assign({}, D.DEFAULT, { overlay: null, board: null });
    const start = D.clamp(parseInt(location.hash.slice(1), 10) || 0, 0, D.STEPS.length - 1);
    idx = start;
    transition(E.stateAt(start), {}).progress(1);
    if (D.STEPS[start].restore) D.ov.action(...D.STEPS[start].restore).progress(1);
    if (start >= 1) E.t0 = Date.now();
    E.broadcast();

    window.addEventListener('keydown', onKey);
    document.addEventListener('click', (e) => { D.audio.unlock(); if (e.target.tagName === 'BUTTON') e.target.blur(); });
    gsap.to('#boot', { opacity: 0, duration: 0.6, delay: 0.2, onComplete: () => D.$('#boot').remove() });
    if (!D.content.live && location.protocol.startsWith('http')) D.toast('마크다운을 직접 읽지 못해 스냅숏을 썼습니다');
    if (W.noGL) D.toast('이 PC에서 3D(WebGL)를 켤 수 없어 3D 교실 없이 진행합니다. Chrome 설정 → 시스템 → 그래픽 가속을 확인하세요', 8000);
    E.ready = true;
  };
})();
