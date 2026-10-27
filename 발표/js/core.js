// 공용 도구: 네임스페이스, DOM 헬퍼, 난수 뽑기, 알림, 효과음
(function () {
  const D = window.D = {};

  D.W = 1920;
  D.H = 1080;
  D.PANEL = 653;            // 지도안 패널 폭
  D.LB = 132;               // 레터박스 높이 (2.35:1)

  D.$ = (s, r = document) => r.querySelector(s);
  D.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  D.el = (html) => {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };
  D.fmt = (n) => Number(n).toLocaleString('ko-KR');
  D.clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  // 화면 상태 (패널 폭은 JS 가 트윈하고, CSS 변수와 three.js 카메라가 함께 따라간다)
  D.view = { panel: 0, scale: 1 };
  D.data = {};              // 라이브 결과: gacha, tally, crowd

  // 금 10% · 은 30% · 동 60% (지도안 Ⅺ.5 시뮬레이터 설계와 같은 비율)
  D.P = { g: 0.1, s: 0.3, b: 0.6 };
  D.draw = () => {
    const r = Math.random();
    return r < D.P.g ? 'g' : r < D.P.g + D.P.s ? 's' : 'b';
  };
  D.RARITY = {
    g: { name: '금', color: '#E3B341', hex: 0xE3B341 },
    s: { name: '은', color: '#C9CED6', hex: 0xC9CED6 },
    b: { name: '동', color: '#B0703F', hex: 0xB0703F },
  };
  // 상금표 (지도안 Ⅶ 도입 발문과 같다): 1회 1,000원, 금 5배 · 은 본전 · 동 꽝.
  // 확률대로라면 한 번에 평균 800원을 돌려받는다 (교사용 참고, 학생에게는 시뮬레이션 평균으로만)
  D.COST = 1000;
  D.PAY = { g: 5000, s: 1000, b: 0 };
  D.PAY_LABEL = { g: '5,000원', s: '1,000원', b: '꽝' };
  D.MEAN = Object.keys(D.P).reduce((a, r) => a + D.P[r] * D.PAY[r], 0);   // 800

  let toastTimer = 0;
  D.toast = (msg, ms = 2600) => {
    const t = D.$('#toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('on'), ms);
  };

  // ── 효과음: 파일 없이 WebAudio 로 합성한다. 1막·3막에서만 쓴다 ──
  const A = D.audio = { muted: false, ctx: null, noise: null };
  A.unlock = () => {
    try {
      if (!A.ctx) {
        A.ctx = new (window.AudioContext || window.webkitAudioContext)();
        const len = A.ctx.sampleRate * 0.25;
        A.noise = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
        const d = A.noise.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      } else if (A.ctx.state === 'suspended') A.ctx.resume();
    } catch (e) { /* 소리 없이 진행 */ }
  };

  function tone(freq, at, dur, { type = 'sine', gain = 0.16, to = null } = {}) {
    const c = A.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, at);
    if (to) o.frequency.exponentialRampToValueAtTime(to, at + dur);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain, at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(c.destination);
    o.start(at);
    o.stop(at + dur + 0.05);
  }
  function hiss(at, dur, gain = 0.12, freq = 1800) {
    const c = A.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = A.noise;
    f.type = 'bandpass';
    f.frequency.value = freq;
    g.gain.setValueAtTime(gain, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    s.connect(f).connect(g).connect(c.destination);
    s.start(at);
    s.stop(at + dur);
  }

  A.play = (name, v = 1) => {
    if (A.muted || !A.ctx) return;
    const t = A.ctx.currentTime;
    switch (name) {
      case 'crank': hiss(t, 0.09, 0.10 * v, 2600); tone(150, t, 0.08, { type: 'square', gain: 0.03 * v }); break;
      case 'b': tone(392, t, 0.16, { type: 'triangle', gain: 0.10 * v }); break;
      case 's': tone(587, t, 0.12, { type: 'triangle', gain: 0.10 * v }); tone(880, t + 0.07, 0.2, { gain: 0.08 * v }); break;
      case 'g':
        [784, 988, 1175, 1568].forEach((f, i) => tone(f, t + i * 0.06, 0.5, { type: 'triangle', gain: 0.10 * v }));
        hiss(t, 0.6, 0.05 * v, 6000);
        break;
      case 'tick': tone(1200, t, 0.05, { type: 'square', gain: 0.025 * v }); break;
      case 'chime': tone(1318, t, 0.35, { gain: 0.05 * v }); tone(1760, t + 0.04, 0.35, { gain: 0.035 * v }); break;
      case 'drop': tone(220, t, 0.5, { gain: 0.08 * v, to: 70 }); break;
    }
  };
})();
