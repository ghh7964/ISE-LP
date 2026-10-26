// 평면 정보 레이어: 읽어야 하는 정보는 3D 대신 또렷한 HTML·Canvas 로 띄운다.
// 각 오버레이는 enter / leave / mode(같은 오버레이 안에서 단계 바꾸기) / actions(실제 난수로 실행)를 가진다.
(function () {
  const O = D.ov = {};
  const reg = O.reg = {};
  const def = (name, spec) => { reg[name] = spec; };

  O.init = function () {
    for (const [name, s] of Object.entries(reg)) {
      s.el = D.el(s.html());
      s.el.classList.add('ov', 'ov-' + name);
      D.$('#overlays').appendChild(s.el);
      s.q = (sel) => D.$(sel, s.el);
      s.qa = (sel) => D.$$(sel, s.el);
      s.cur = undefined;
      if (s.setup) s.setup();
    }
  };
  O.enter = function (tl, name, mode, at = 0) {
    const s = reg[name];
    tl.call(() => { s.el.style.visibility = 'visible'; s.el.classList.add('live'); }, null, at);
    tl.fromTo(s.el, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power1.out' }, at);
    if (s.enter) s.enter(tl, at);
    s.cur = undefined;
    O.mode(tl, name, mode, at + 0.05);
  };
  O.leave = function (tl, name, at = 0) {
    const s = reg[name];
    tl.call(() => s.el.classList.remove('live'), null, at);
    if (s.leave) s.leave(tl, at);
    tl.to(s.el, { opacity: 0, duration: 0.4, ease: 'power1.in' }, at);
    tl.call(() => { s.el.style.visibility = 'hidden'; }, null, at + 0.42);
    s.cur = undefined;
  };
  O.mode = function (tl, name, mode, at = 0) {
    const s = reg[name];
    const prev = s.cur;
    s.cur = mode;
    if (s.mode && mode !== prev) s.mode(tl, mode, prev, at);
  };
  O.action = (name, act) => (reg[name] && reg[name].actions && reg[name].actions[act]) ? reg[name].actions[act]() : null;

  // 같은 자리의 글을 바꿀 때: 먼저 빠지고, 그다음 들어온다
  function swap(tl, el, html, at, first) {
    if (first) { tl.call(() => { el.innerHTML = html; }, null, at); tl.fromTo(el, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.45 }, at); return; }
    tl.to(el, { opacity: 0, y: -6, duration: 0.25, ease: 'power1.in' }, at);
    tl.call(() => { el.innerHTML = html; }, null, at + 0.26);
    tl.fromTo(el, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }, at + 0.28);
  }
  function flash(tl, r, at) {
    const f = D.$('#flash');
    const col = r === 'g' ? '244,197,82' : '220,228,236';
    tl.call(() => { f.style.background = `radial-gradient(circle at 50% 55%, rgba(${col},.95), rgba(${col},.25) 45%, rgba(${col},0) 75%)`; }, null, at);
    tl.fromTo(f, { opacity: 0 }, { opacity: r === 'g' ? 0.9 : 0.3, duration: 0.08 }, at);
    tl.to(f, { opacity: 0, duration: r === 'g' ? 0.9 : 0.4, ease: 'power2.out' }, at + 0.08);
  }
  const capCSS = (r) => `background: linear-gradient(180deg, ${D.RARITY[r].color} 50%, #F6F2EA 50%)`;
  const won = (v) => D.fmt(Math.round(v)) + '원';
  const RS = ['g', 's', 'b'];
  const sumPay = (seq) => seq.reduce((a, r) => a + D.PAY[r], 0);

  // ── 대기 화면 ─────────────────────────────────
  def('title', {
    html: () => `<div><div class="title-logo">뽑기, 정말 이득일까?</div>
      <div class="title-sub">정보 · 수학 · 사회 융합수업 &nbsp;|&nbsp; <b>${D.TEAM_NAME || '특수교육론'}</b></div></div>`,
    enter(tl, at) { tl.fromTo(this.q('.title-logo'), { scale: 0.96, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.1, ease: 'power3.out' }, at); },
  });

  // ── 1막: 가챠 UI (확률과 상금을 함께 공개한다) ──────
  def('gacha', {
    html: () => `<div>
      <div class="g-odds"><h4>확률 · 상금</h4><div class="note">1회 1,000원 · 확률 공개 의무화(2024. 3.)</div>
        <div class="row head"><span></span><span>확률</span><span>돌려받는 돈</span></div>
        ${RS.map((r) => `<div class="row"><span><i style="${capCSS(r)}"></i>${D.RARITY[r].name}</span><span>${D.P[r] * 100}%</span><span class="pay r-${r}">${D.PAY_LABEL[r]}</span></div>`).join('')}</div>
      <div class="g-ask">금색이 나오면 <em>5배!</em><small>이 뽑기, 이득일까요?</small></div>
      <div class="g-btn" role="button">10회 뽑기<small>10,000원</small></div>
      <div class="g-results">${Array.from({ length: 10 }, (_, i) => `<div class="g-slot"><div class="cap"></div><span>${i + 1}</span></div>`).join('')}</div>
      <div class="g-sum"></div>
      <div class="g-later">정답은<br>발표 마지막에 공개합니다</div></div>`,
    setup() { this.q('.g-btn').addEventListener('click', () => D.engine.next()); },
    mode(tl, m, prev, at) {
      const q = this.q.bind(this), slots = this.qa('.g-slot');
      if (prev === undefined) {
        tl.set([q('.g-sum'), q('.g-later')], { opacity: 0 }, at);
        tl.set(slots, { opacity: 0 }, at);
        tl.set(q('.g-btn'), { opacity: m === 'ask' ? 1 : 0 }, at);
      }
      if (m === 'ask') {
        if (prev) {
          tl.to([...slots, q('.g-sum'), q('.g-later')], { opacity: 0, duration: 0.3 }, at);
          D.machine.clear(tl, at);
          tl.fromTo(q('.g-btn'), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 }, at + 0.35);
        }
      } else if (m === 'res') {
        if (prev === 'ask' || prev === undefined) tl.to(q('.g-btn'), { opacity: 0, y: 10, duration: 0.3 }, at);
        if (prev === 'later') tl.to(q('.g-later'), { opacity: 0, duration: 0.3 }, at);
        if (prev === undefined && D.data.gacha) tl.set([...slots, q('.g-sum')], { opacity: 1 }, at);
      } else if (m === 'later') {
        if (prev === undefined && D.data.gacha) tl.set([...slots, q('.g-sum')], { opacity: 1, y: 0, scale: 1 }, at);
        tl.set(q('.g-btn'), { opacity: 0 }, at);
        tl.fromTo(q('.g-later'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, at + 0.1);
      }
    },
    actions: {
      pull() {
        const s = reg.gacha, tl = gsap.timeline(), slots = s.qa('.g-slot'), sum = s.q('.g-sum');
        if (D.machine.row.children.length) D.machine.clear(tl, 0);
        tl.to([...slots, sum], { opacity: 0, duration: 0.2 }, 0);
        const seq = Array.from({ length: 10 }, D.draw);
        D.data.gacha = seq;
        seq.forEach((r, i) => {
          const at = 0.35 + i * 0.34, el = slots[i];
          D.machine.pull(tl, r, i, at);
          tl.call(() => {
            el.className = 'g-slot r-' + { g: 'gold', s: 'silver', b: 'bronze' }[r];
            el.innerHTML = `<div class="cap" style="${capCSS(r)}"></div><span>${D.PAY_LABEL[r]}</span>`;
            D.audio.play(r);
          }, null, at + 0.42);
          tl.fromTo(el, { opacity: 0, y: 16, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.32, ease: 'back.out(2.2)' }, at + 0.42);
          if (r !== 'b') flash(tl, r, at + 0.42);
        });
        const got = sumPay(seq), net = got - 10 * D.COST;
        tl.call(() => {
          const tag = net > 0 ? `<em class="up">${won(net)} 이득</em>` : net < 0 ? `<em class="down">${won(-net)} 손해</em>` : '<em>본전</em>';
          sum.innerHTML = `<div>돌려받은 돈 <b>${won(got)}</b></div><div class="paid">낸 돈 10,000원 · ${tag}</div>`;
        }, null, '>+0.2');
        tl.fromTo(sum, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5 }, '<');
        return tl;
      },
    },
  });

  // ── 교실 물건의 문법: 인쇄된 것(교사가 만든 것)과 손글씨(학생이 채운 것)를 나눈다 ──
  // 점토 인형 그림: 3D 교실의 학생 말과 같은 색 (A·B 는 겉모습이 다른 학생과 같다)
  const SKIN = '#F1DCC4';
  const pawn = (body, x = 30, hp = false) => `<g transform="translate(${x - 30} 0)">
    <ellipse cx="30" cy="77" rx="17" ry="3" fill="rgba(0,0,0,.12)"/>
    <rect x="15" y="34" width="30" height="43" rx="15" fill="${body}"/>
    <circle cx="30" cy="21" r="14" fill="${SKIN}"/>
    ${hp ? '<path d="M15.5 22 A14.5 14.5 0 0 1 44.5 22" stroke="#2C2F36" stroke-width="3.2" fill="none"/><rect x="11" y="17" width="7" height="11" rx="2.5" fill="#2C2F36"/><rect x="42" y="17" width="7" height="11" rx="2.5" fill="#2C2F36"/>' : ''}</g>`;
  const PAWN = {
    A: `<svg viewBox="0 0 60 82">${pawn('#E2B677')}</svg>`,
    B: `<svg viewBox="0 0 60 82">${pawn('#7FA7B5')}</svg>`,
    Bhp: `<svg viewBox="0 0 60 82">${pawn('#7FA7B5', 30, true)}</svg>`,   // 학생 B를 위한 지원: 필요할 때 쓰는 헤드폰
    all: `<svg viewBox="0 0 110 82">${pawn('#D98C6B', 22)}${pawn('#E2B677', 55)}${pawn('#7FA7B5', 88, true)}</svg>`,
  };
  // 손글씨가 써지는 모습: 왼쪽에서 오른쪽으로 드러난다
  const write = (tl, els, at, stagger = 0.18) =>
    tl.fromTo(els, { clipPath: 'inset(-20% 100% -20% 0%)' }, { clipPath: 'inset(-20% 0% -20% 0%)', duration: 0.45, ease: 'power1.inOut', stagger }, at);
  // 연필 동그라미
  const pencilLoop = `<svg class="pencil" viewBox="0 0 200 70" preserveAspectRatio="none"><path pathLength="1" d="M26 18 C 60 4, 176 4, 190 28 C 202 50, 128 66, 54 62 C 12 59, 4 40, 18 26 C 26 18, 44 12, 62 10"/></svg>`;
  // 바를 정(正) 자 표시: 한 획씩
  const STROKES = [[4, 5, 26, 5], [15, 5, 15, 28], [15, 16, 24, 16], [7, 14, 7, 28], [3, 28, 27, 28]];
  const tallySVG = (n) => {
    let out = '';
    for (let g = 0; g < Math.ceil(n / 5); g++) {
      const k = Math.min(5, n - g * 5);
      out += `<svg viewBox="0 0 30 32">${STROKES.slice(0, k).map(([a, b, c, d], i) => `<line x1="${a}" y1="${b + (i % 2) * 0.6}" x2="${c}" y2="${d - (i % 2) * 0.6}"/>`).join('')}</svg>`;
    }
    return out;
  };

  // ── 학생 A · B 소개: 학생 기록 카드 (지도안 Ⅳ.2) ───────
  const PROFILE = [
    { k: 'A', who: '학생 A', type: '지적장애(경도)', f: [['배치', '특수학급 소속, 이 시간만 통합'], ['강점', '그림이 있으면 이해가 빠름, 1,000원으로 매점에서 혼자 산다'], ['어려움', '여러 단계로 된 지시, 긴 글']] },
    { k: 'B', who: '학생 B', type: '자폐성장애', f: [['배치', '일반학급, 지적 기능은 평균 범위'], ['강점', '규칙·패턴 찾기, 컴퓨터 조작'], ['어려움', '예고 없는 전환, 큰 소음']] },
  ];
  def('intro', {
    html: () => `<div><div class="pf-row">${PROFILE.map((p) => `<div class="rc">
      <i class="clip"></i>
      <div class="rc-top"><span>학생 기록 카드</span><span>2학년 ○반</span></div>
      <div class="rc-main"><div class="rc-photo">${PAWN[p.k]}</div>
        <div class="rc-f"><div class="nm"><b>${p.who}</b><span>${p.type}</span></div>
          <dl>${p.f.map(([t, d]) => `<dt>${t}</dt><dd>${d}</dd>`).join('')}</dl></div></div></div>`).join('')}</div></div>`,
    enter(tl, at) {
      tl.fromTo(this.qa('.rc'), { y: 60, rotation: (i) => (i ? 2.5 : -2.5), opacity: 0 },
        { y: 0, rotation: (i) => (i ? 0.6 : -0.6), opacity: 1, duration: 0.7, stagger: 0.18, ease: 'power3.out' }, at);
    },
  });

  // ── 사회 스테이션: 비용·편익 활동지 ─────────────────
  def('social', {
    html: () => `<div><div class="sheet ws-social">
      <div class="sh-top"><span>사회 스테이션 활동지 ①</span><span>모둠 <i class="hw">3</i></span></div>
      <h3>천 원으로 무엇을 할까?</h3>
      <div class="sh-sub">용돈 1만 원 · 뽑기 1회 1,000원</div>
      <div class="sh-row sh-head"><span>선택</span><span>얻는 것</span><span>확실한가?</span></div>
      <div class="sh-row c-pick"><span class="pick-wrap">뽑기 1회${pencilLoop}</span><span>0원 ~ 5,000원</span><span class="hw">몰라!</span></div>
      <div class="sh-row"><span>컵떡볶이</span><span>떡볶이 한 컵</span><span class="hw">✓</span></div>
      <div class="sh-row"><span>음료수</span><span>음료 한 병</span><span class="hw">✓</span></div>
      <div class="sh-row"><span>저금</span><span>1,000원</span><span class="hw">✓</span></div>
      <div class="sh-oc">뽑기를 고르면 포기하는 것 = <b>기회비용</b><span class="fill"><i class="hw">컵떡볶이</i></span></div>
      <div class="sh-next">그럼 뽑기로는 <b>평균 얼마</b>를 돌려받을까? → 수학 스테이션</div>
      <div class="std">[9사(일사)08-01] · 비용·편익 표(그래픽 조직자)</div></div></div>`,
    enter(tl, at) {
      const q = this.q.bind(this);
      tl.fromTo(q('.sheet'), { x: 50, rotation: 2.5, opacity: 0 }, { x: 0, rotation: 0.8, opacity: 1, duration: 0.7, ease: 'power3.out' }, at);
      write(tl, this.qa('.sh-row:not(.sh-head) .hw'), at + 0.6, 0.16);
      tl.fromTo(q('.pencil path'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.6, ease: 'power1.inOut' }, at + 1.4);
      write(tl, q('.sh-oc .hw'), at + 2.0);
      tl.fromTo(q('.sh-next'), { opacity: 0 }, { opacity: 1, duration: 0.5 }, at + 2.4);
    },
  });

  // ── 수학 스테이션: 모눈종이 기록지 ───────────────────
  def('tally', {
    html: () => `<div><div class="sheet grid ws-tally">
      <div class="sh-top"><span>수학 스테이션 기록지</span><span>복원추출로 20번</span></div>
      <h3>우리 모둠 기록표</h3>
      <div class="t-row t-head"><span>색</span><span>기록</span><span class="n">횟수</span><span class="rf">상대도수</span></div>
      ${RS.map((r) => `<div class="t-row" data-r="${r}"><span class="lab"><i style="${capCSS(r)}"></i>${D.RARITY[r].name}</span><div class="t-marks"></div><span class="n hw">0</span><span class="rf hw"></span></div>`).join('')}
      <div class="t-cmp">
        <div><span>우리 모둠 금 상대도수</span><b class="hw v-rf">&nbsp;</b></div><div><span>경우의 수로 구한 확률</span><b class="pr">1/10 = 0.10</b></div>
        <div><span>받은 돈 ÷ 20 = 한 번 평균</span><b class="hw v-avg">&nbsp;</b></div><div><span>한 번에 낸 돈</span><b class="pr">1,000원</b></div>
      </div>
      <div class="std">[9수04-06] · 상대도수와 경우의 수로 구한 확률을 연결한다</div></div></div>`,
    enter(tl, at) { tl.fromTo(this.q('.sheet'), { x: 50, rotation: 2.5, opacity: 0 }, { x: 0, rotation: -0.7, opacity: 1, duration: 0.7, ease: 'power3.out' }, at); },
    render(d, upto) {
      const n = { g: 0, s: 0, b: 0 };
      d.seq.slice(0, upto).forEach((r) => n[r]++);
      RS.forEach((r) => {
        const row = this.q(`.t-row[data-r="${r}"]`);
        const marks = row.querySelector('.t-marks');
        if (+marks.dataset.n !== n[r]) { marks.dataset.n = n[r]; marks.innerHTML = tallySVG(n[r]); }
        row.querySelector('.n').textContent = n[r];
        row.querySelector('.rf').textContent = upto === 20 ? (n[r] / 20).toFixed(2) : '';
      });
      const done = upto === 20;
      this.q('.v-rf').innerHTML = done ? `${n.g}/20 = ${(n.g / 20).toFixed(2)}` : '&nbsp;';
      this.q('.v-avg').innerHTML = done ? won(sumPay(d.seq) / 20) : '&nbsp;';
    },
    actions: {
      run() {
        const s = reg.tally, tl = gsap.timeline();
        const seq = Array.from({ length: 20 }, D.draw);
        const d = D.data.tally = { seq, g: 0, s: 0, b: 0 };
        seq.forEach((r) => d[r]++);
        D.room.refreshLayers();
        const st = { i: 0 };
        tl.call(() => s.render(d, 0), null, 0);
        tl.to(st, { i: 20, duration: 3.4, ease: 'none', onUpdate: () => s.render(d, Math.floor(st.i)) }, 0.2);
        write(tl, s.qa('.t-row .rf, .t-cmp .hw'), '>', 0.14);
        return tl;
      },
      // 뒤로 돌아왔을 때: 이미 뽑은 20번을 그대로 다시 적어 둔다
      show() {
        const s = reg.tally, d = D.data.tally;
        if (!d || d.sample) return s.actions.run();
        s.render(d, 20);
        gsap.set(s.qa('.t-row .rf, .t-cmp .hw'), { clipPath: 'inset(-20% 0% -20% 0%)' });
        return gsap.timeline();
      },
    },
  });

  // ── 정보 스테이션: 엔트리식 블록 코드 + 실행 화면 ─────
  // 블록 문장은 지도안 Ⅹ.5 시뮬레이터 설계를 그대로 옮겼다 (0 금, 1~3 은, 4~9 동)
  const F = (t) => `<i class="f">${t}</i>`;
  const V = (t) => `<i class="v">${t} ▾</i>`;
  const Cnd = (t) => `<i class="cnd">${t}</i>`;
  const Calc = (t) => `<i class="calc">${t}</i>`;
  const leaf = (cls, html, k = '') => `<div class="u blk ${cls}"${k ? ` data-k="${k}"` : ''}>${html}</div>`;
  const add = (v, n, k) => leaf('data', `${V(v)} 에 ${F(n)} 만큼 더하기`, k);
  const CODE = `
    ${leaf('start hat', '▶ 시작하기 버튼을 클릭했을 때')}
    <div class="u cb">
      <div class="blk flow head" data-k="rep">${F('횟수')} 번 반복하기 <b class="cnt"></b></div>
      <div class="arm">
        ${leaf('data', `${V('공')} 을 ${Calc(`${F(0)} 부터 ${F(9)} 사이의 무작위 수`)} 로 정하기`)}
        <div class="u cb">
          <div class="blk flow head" data-k="g">만약 ${Cnd(`${F('공')} = ${F(0)}`)} 이라면</div>
          <div class="arm">${add('금', 1)}${add('받은 돈', '5000')}</div>
          <div class="mid">아니면</div>
          <div class="arm">
            <div class="u cb">
              <div class="blk flow head" data-k="s">만약 ${Cnd(`${F('공')} &lt; ${F(4)}`)} 이라면</div>
              <div class="arm">${add('은', 1)}${add('받은 돈', '1000')}</div>
              <div class="mid" data-k="b">아니면</div>
              <div class="arm">${add('동', 1)}</div>
              <div class="foot"></div>
            </div>
          </div>
          <div class="foot"></div>
        </div>
      </div>
      <div class="foot"></div>
    </div>
    ${leaf('data', `${V('평균')} 을 ${Calc(`${F('받은 돈')} ÷ ${F('횟수')}`)} 로 정하기`)}`;
  const CATS = [['시작', '#00B400'], ['흐름', '#19BAEA'], ['판단', '#4F80FF'], ['계산', '#F2C94C'], ['자료', '#E457DC']];

  def('sim', {
    html: () => `<div>
      <div class="sim-bar"><b>정보 스테이션 · 엔트리 뽑기 시뮬레이터</b><span class="meta">지도안 Ⅹ.5 설계 그대로</span></div>
      <div class="sim-body">
        <div class="sim-code">
          <div class="cats">${CATS.map(([n, c]) => `<div><i style="background:${c}"></i>${n}</div>`).join('')}</div>
          <div class="ws"><div class="code">${CODE}</div>
            <div class="sim-levels"><b>1단계</b> 실행하고 기록 · <b>2단계</b> 확률·상금 바꾸기 · <b>3단계</b> 반복 구조 고치기</div></div>
        </div>
        <div class="sim-main">
          <div class="mons">
            <div class="mon"><span>횟수</span><b class="m-n">0</b></div>
            <div class="mon"><span>금</span><b class="m-g">0</b></div>
            <div class="mon"><span>받은 돈</span><b class="m-sum">0</b></div>
            <div class="mon avg"><span>평균</span><b class="m-avg">0</b></div>
          </div>
          <div class="sim-btns"><button data-n="10">10번</button><button data-n="100">100번</button><button data-n="1000">1,000번</button></div>
          <div class="sim-say">&nbsp;</div>
          <canvas class="c-line"></canvas>
          <canvas class="c-bar"></canvas>
        </div>
      </div></div>`,
    setup() {
      this.units = this.qa('.u');
      this.reset();
      this.qa('.sim-btns button').forEach((b) => b.addEventListener('click', () => {
        this.showCode();
        this.tl && this.tl.progress(1);
        this.tl = this.runTo(+b.dataset.n);
      }));
    },
    reset() { this.n = 0; this.c = { g: 0, s: 0, b: 0 }; this.sum = 0; this.series = []; this.target = 0; this.hit = null; this.draw && this.draw(); },
    hideCode() { gsap.set(this.units, { opacity: 0, x: -70, y: -24, rotation: -2 }); },
    showCode() { gsap.set(this.units, { opacity: 1, x: 0, y: 0, rotation: 0 }); },
    size() {
      const W = 600, pr = 2;
      [['.c-line', 330], ['.c-bar', 230]].forEach(([sel, H]) => {
        const cv = this.q(sel);
        cv.width = W * pr; cv.height = H * pr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
      });
      this.dim = { W, pr };
    },
    draw() {
      if (!this.dim) this.size();
      const { W, pr } = this.dim, n = this.n, avg = n ? this.sum / n : 0;
      this.q('.m-n').textContent = D.fmt(n);
      this.q('.m-g').textContent = D.fmt(this.c.g);
      this.q('.m-sum').textContent = D.fmt(this.sum);
      this.q('.m-avg').textContent = D.fmt(Math.round(avg));
      this.qa('.sim-btns button').forEach((b) => b.classList.toggle('on', +b.dataset.n === this.target));
      this.q('.cnt').textContent = this.target ? `${D.fmt(n)} / ${D.fmt(this.target)}` : '';
      this.qa('[data-k="g"], [data-k="s"], [data-k="b"]').forEach((e) => e.classList.toggle('hit', this.hit === e.dataset.k));
      this.q('.hat').classList.toggle('run', !!this.target && n < this.target);
      const gap = D.COST - Math.round(avg);
      this.q('.sim-say').innerHTML = !n ? '&nbsp;'
        : `한 번 평균 <b>${won(avg)}</b> → 낸 돈 1,000원보다 ` + (gap > 0 ? `<b class="down">${won(gap)} 적다</b>` : gap < 0 ? `<b class="up">${won(-gap)} 많다</b>` : '<b>같다</b>');

      // 선: 한 번 평균 돌려받은 돈 (가로축은 로그). 낸 돈 1,000원과, 확률대로라면 나오는 800원
      let H = 330, x = this.q('.c-line').getContext('2d');
      x.setTransform(pr, 0, 0, pr, 0, 0);
      x.clearRect(0, 0, W, H);
      const L = 78, Rr = W - 16, B = H - 40, Tp = 52, MAX = 3000;
      const lx = (k) => L + (Math.log10(k) / 3) * (Rr - L), ly = (v) => B - (Math.min(v, MAX) / MAX) * (B - Tp);
      x.lineWidth = 1; x.font = fnt(20, 500); x.fillStyle = '#5E584F';
      [0, 1000, 2000, 3000].forEach((v) => { x.strokeStyle = 'rgba(27,26,24,.13)'; x.beginPath(); x.moveTo(L, ly(v)); x.lineTo(Rr, ly(v)); x.stroke(); x.textAlign = 'right'; x.fillText(D.fmt(v), L - 10, ly(v) + 6); });
      [1, 10, 100, 1000].forEach((k) => { x.textAlign = 'center'; x.fillText(D.fmt(k) + '번', lx(k), B + 28); });
      x.strokeStyle = '#1B1A18'; x.lineWidth = 2.5;
      x.beginPath(); x.moveTo(L, ly(D.COST)); x.lineTo(Rr, ly(D.COST)); x.stroke();
      x.strokeStyle = '#213A63'; x.lineWidth = 2.5; x.setLineDash([8, 7]);
      x.beginPath(); x.moveTo(L, ly(D.MEAN)); x.lineTo(Rr, ly(D.MEAN)); x.stroke(); x.setLineDash([]);
      // 범례는 위쪽에 둔다 (선이 800원 근처로 모이면 선 옆 글씨와 겹치므로)
      const key = (x0, draw, label, col) => { draw(x0); x.fillStyle = col; x.textAlign = 'left'; x.fillText(label, x0 + 36, 22); };
      x.font = fnt(20, 700);
      key(8, (x0) => { x.strokeStyle = '#C8952A'; x.lineWidth = 3.5; x.beginPath(); x.moveTo(x0, 16); x.lineTo(x0 + 28, 16); x.stroke(); }, '한 번 평균', '#9A6E14');
      key(168, (x0) => { x.strokeStyle = '#1B1A18'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(x0, 16); x.lineTo(x0 + 28, 16); x.stroke(); }, '낸 돈 1,000원', '#1B1A18');
      key(358, (x0) => { x.strokeStyle = '#213A63'; x.lineWidth = 2.5; x.setLineDash([6, 5]); x.beginPath(); x.moveTo(x0, 16); x.lineTo(x0 + 28, 16); x.stroke(); x.setLineDash([]); }, '확률대로라면 800원', '#213A63');
      if (this.series.length) {
        x.strokeStyle = '#C8952A'; x.lineWidth = 3.5; x.lineJoin = 'round';
        x.beginPath();
        this.series.forEach((v, i) => { const px = lx(i + 1), py = ly(v); i ? x.lineTo(px, py) : x.moveTo(px, py); });
        x.stroke();
        const last = this.series.length;
        x.fillStyle = '#C8952A';
        x.beginPath(); x.arc(lx(last), ly(this.series[last - 1]), 6, 0, 7); x.fill();
      }

      // 막대: 색깔별 상대도수와 확률(점선)
      H = 230; x = this.q('.c-bar').getContext('2d');
      x.setTransform(pr, 0, 0, pr, 0, 0);
      x.clearRect(0, 0, W, H);
      const base = H - 38, top = 10, sc = (v) => base - (v / 0.7) * (base - top);
      RS.forEach((r, i) => {
        const cx = 120 + i * 180, v = n ? this.c[r] / n : 0;
        x.fillStyle = D.RARITY[r].color;
        x.fillRect(cx - 50, sc(v), 100, base - sc(v));
        x.strokeStyle = '#213A63'; x.lineWidth = 2.5; x.setLineDash([6, 5]);
        x.beginPath(); x.moveTo(cx - 66, sc(D.P[r])); x.lineTo(cx + 66, sc(D.P[r])); x.stroke(); x.setLineDash([]);
        x.fillStyle = '#1B1A18'; x.textAlign = 'center'; x.font = fnt(20, 700);
        x.fillText(`${D.RARITY[r].name} ${n ? v.toFixed(2) : '–'}`, cx, base + 28);
      });
      x.fillStyle = '#213A63'; x.textAlign = 'left'; x.font = fnt(20, 700);
      x.fillText('점선 = 확률', 0, top + 14);
      x.strokeStyle = 'rgba(27,26,24,.3)'; x.lineWidth = 1;
      x.beginPath(); x.moveTo(40, base); x.lineTo(W - 6, base); x.stroke();
    },
    step1() {
      const r = D.draw();
      this.c[r]++;
      this.n++;
      this.sum += D.PAY[r];
      this.hit = r;
      this.series.push(this.sum / this.n);
    },
    // 코드대로: 실행할 때마다 변수를 0 으로 두고 '횟수'만큼 반복한다
    runTo(target) {
      this.reset();
      this.target = target;
      const st = { n: 0 }, tl = gsap.timeline();
      const dur = target <= 10 ? 2.2 : target <= 100 ? 2.0 : 2.8;
      tl.to(st, { n: target, duration: dur, ease: target <= 10 ? 'none' : 'power1.in', onUpdate: () => {
        const k = Math.floor(st.n);
        while (this.n < k) this.step1();
        this.draw();
      } });
      tl.call(() => { this.hit = null; this.draw(); });
      return tl;
    },
    mode(tl, m, prev, at) {
      // build: 블록이 비어 있다가 조립된다. run: 이미 조립된 코드 (뒤로 가거나 바로 들어온 경우)
      if (prev === undefined) {
        tl.call(() => { this.reset(); m === 'build' ? this.hideCode() : this.showCode(); }, null, at - 0.05);
      } else if (m === 'run') {
        tl.call(() => this.showCode(), null, at);
      }
    },
    enter(tl, at) {
      tl.fromTo(this.el, { scale: 0.97 }, { scale: 1, duration: 0.6, ease: 'power2.out' }, at);
    },
    actions: {
      build() {
        const s = reg.sim, tl = gsap.timeline();
        tl.call(() => { s.reset(); s.hideCode(); }, null, 0);
        s.units.forEach((u, i) => {
          tl.to(u, { opacity: 1, x: 0, y: 0, rotation: 0, duration: 0.34, ease: 'back.out(1.7)' }, 0.25 + i * 0.27);
        });
        return tl;
      },
      to10() { return reg.sim.runTo(10); },
      to100() { return reg.sim.runTo(100); },
      to1000() { return reg.sim.runTo(1000); },
    },
  });
  const fnt = (px, w) => `${w} ${px}px "Noto Sans KR", sans-serif`;

  // ── 지원 안내 띠: 학생 기록 카드에 이어 붙는 지원 메모 (학생 A → 학생 B → 모두) ──
  const SUPPORT = {
    A: { who: '학생 A를 위한 지원', what: '그림 카드, 스티커 그래프, 토큰 쌓기로 같은 활동에 참여합니다. 목표는 기본교육과정의 "놀이로 가능성을 경험한다"', std: '[9수학05-04]' },
    B: { who: '학생 B를 위한 지원', what: '개별 일과표와 할 말을 적은 역할 카드. 헤드폰은 시끄러울 때 스스로 골라 씁니다. 미리 예고한 시연 역할로 "또래에게 결과 설명하기"를 연습합니다', std: '강의록 자폐성장애' },
    all: { who: '모두를 위한 지원', what: '같은 지원이 처음부터 모든 모둠의 책상에 놓여 있었습니다. 헤드폰도 필요한 사람 누구나 씁니다. 그래서 눈에 띄지 않습니다', std: 'UDL · 통합교육 4대 원리 ②' },
  };
  def('lens', {
    html: () => `<div><div class="cap-strip rc"><i class="clip"></i><div class="cap-in"></div></div></div>`,
    enter(tl, at) { tl.fromTo(this.q('.cap-strip'), { y: 40, rotation: -1, opacity: 0 }, { y: 0, rotation: -0.3, opacity: 1, duration: 0.6, ease: 'power3.out' }, at); },
    mode(tl, m, prev, at) {
      const L = SUPPORT[m];
      swap(tl, this.q('.cap-in'), `<div class="rc-photo${m === 'all' ? ' wide' : ''}">${PAWN[m === 'B' ? 'Bhp' : m]}</div>
        <div><div class="who">${L.who}</div><div class="what">${L.what}</div><div class="std">근거 · ${L.std}</div></div>`, at, prev === undefined);
    },
  });

  // ── 지원 카드: 벽 게시판의 그 카드가 뽑혀 나와 펼쳐진다 (문구는 지도안 Ⅹ.1 표에서 읽는다) ──
  def('card', {
    html: () => `<div><div class="card-strip"><div class="card-in"></div></div></div>`,
    enter(tl, at) { tl.fromTo(this.q('.card-strip'), { x: -60, rotation: -2, opacity: 0 }, { x: 0, rotation: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }, at); },
    mode(tl, idx, prev, at) {
      const row = (D.cardRows || [])[idx] || { area: '', support: '', basis: '' };
      const sc = (D.supportCards || [])[idx] || {};
      const html = `<div class="card-face"><span class="no">${(idx + 1) % 10}</span><b class="${row.area.replace(/\(.*\)/, '').trim().length > 5 ? 'long' : ''}">${row.area.replace(/\(.*\)/, '').trim()}</b><span class="of">지원 카드 ${idx + 1} / 10</span></div>
        <div class="card-back"><div class="lbl">본시에서의 추가 지원</div><div class="c-m">${row.support}</div>
          <div class="lbl">교실에서 바뀐 것</div><div class="chg">${sc.change || ''}</div><div class="src">근거 · ${row.basis}</div></div>`;
      swap(tl, this.q('.card-in'), html, at, prev === undefined);
    },
  });

  // ── 3막: 1,000명 × 10번. 지금까지 낸 돈보다 많이 돌려받은 사람만 불이 켜진다 ──
  const COLS = 40, ROWS = 25, PITCH = 20;
  const AHEAD = 2, EVEN = 1;
  const SUB_RUN = '지금까지 낸 돈보다 많이 돌려받은 사람만 불이 켜집니다';
  const SUB_VERDICT = '이번에는 거꾸로, 손해 본 사람에게 불을 켭니다';
  // 부제는 점의 의미가 뒤집힐 때 함께 바뀐다 (빠진 뒤 새 문장)
  const subTo = (tl, el, text, at) => {
    tl.to(el, { opacity: 0, duration: 0.25 }, at);
    tl.call(() => { el.textContent = text; }, null, at + 0.25);
    tl.to(el, { opacity: 1, duration: 0.35 }, at + 0.3);
  };
  def('crowd', {
    html: () => `<div><div class="cr-back"></div>
      <div class="g-ask cr-ask">금색이 나오면 <em>5배!</em><small>이 뽑기, 이득일까요?</small></div>
      <div class="cr-head">1,000명이 각자 10번씩 뽑는다면<small>${SUB_RUN}</small></div>
      <div class="cr-round">0 / 10회</div>
      <canvas></canvas>
      <div class="cr-count"><div class="got">이득<b>0</b></div><div class="even">본전<b>0</b></div><div class="miss">손해<b>0</b></div></div>
      <div class="cr-verdict"><div class="big">–</div><div class="line"></div><div class="money"></div>
        <div class="theory">이론값: 한 번에 평균 800원 · 10번 뽑아 손해 볼 확률 약 68%</div></div></div>`,
    setup() {
      const cv = this.q('canvas');
      cv.width = COLS * PITCH * 2; cv.height = ROWS * PITCH * 2;
      cv.style.width = COLS * PITCH + 'px'; cv.style.height = ROWS * PITCH + 'px';
      this.state = new Uint8Array(1000);
      this.emph = 0;
      this.paint();
    },
    paint() {
      const x = this.q('canvas').getContext('2d');
      x.setTransform(2, 0, 0, 2, 0, 0);
      x.clearRect(0, 0, COLS * PITCH, ROWS * PITCH);
      const e = this.emph;   // 결론 단계: 빛나던 이득 쪽은 가라앉고, 손해 쪽이 하얗게 드러난다
      for (let i = 0; i < 1000; i++) {
        const cx = (i % COLS) * PITCH + PITCH / 2, cy = Math.floor(i / COLS) * PITCH + PITCH / 2;
        const s = this.state[i];
        x.beginPath();
        x.arc(cx, cy, 6, 0, 7);
        if (s === AHEAD) {
          x.shadowColor = `rgba(244,197,82,${0.9 * (1 - e)})`;
          x.shadowBlur = 10 * (1 - e);
          x.fillStyle = `rgba(244,197,82,${1 - 0.68 * e})`;
          x.fill();
          x.shadowBlur = 0;
        } else if (s === EVEN) {
          x.strokeStyle = `rgba(201,206,214,${0.75 - 0.4 * e})`;
          x.lineWidth = 2.4;
          x.stroke();
        } else {
          x.fillStyle = `rgba(255,255,255,${0.9 * e})`;
          x.fill();
          x.strokeStyle = `rgba(255,255,255,${0.24 + 0.5 * e})`;
          x.lineWidth = 1.3;
          x.stroke();
        }
      }
    },
    setCounts(a, ev) {
      this.q('.got b').textContent = D.fmt(a);
      this.q('.even b').textContent = D.fmt(ev);
      this.q('.miss b').textContent = D.fmt(1000 - a - ev);
    },
    mode(tl, m, prev, at) {
      const q = this.q.bind(this);
      const runEls = [q('canvas'), q('.cr-count'), q('.cr-round')];
      // intro: 1막의 질문이 같은 자리에 다시 뜬다. run 부터는 그 자리를 1,000명 제목이 이어받는다 (질문이 빠진 뒤)
      if (prev === undefined) {
        tl.set([q('.cr-back'), ...runEls, q('.cr-verdict'), q('.cr-ask'), q('.cr-head')], { opacity: 0 }, at);
        tl.set(q('canvas'), { x: 0 }, at);
        tl.fromTo(q(m === 'intro' ? '.cr-ask' : '.cr-head'), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6 }, at + 0.3);
      }
      if (m === 'intro' && prev) {
        tl.to([q('.cr-back'), ...runEls, q('.cr-verdict'), q('.cr-head')], { opacity: 0, duration: 0.4 }, at);
        if (prev === 'verdict') tl.call(() => { q('.cr-head small').textContent = SUB_RUN; }, null, at + 0.4);
        tl.fromTo(q('.cr-ask'), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5 }, at + 0.45);
      }
      if (m === 'run') {
        if (prev === 'intro') {
          tl.to(q('.cr-ask'), { opacity: 0, y: -8, duration: 0.3 }, at);
          tl.fromTo(q('.cr-head'), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5 }, at + 0.35);
        }
        if (prev === 'verdict') {
          tl.to(q('.cr-verdict'), { opacity: 0, duration: 0.3 }, at);
          tl.to(q('canvas'), { x: 0, duration: 0.7, ease: 'power2.inOut' }, at + 0.3);
          const e = { v: this.emph };
          tl.to(e, { v: 0, duration: 0.5, onUpdate: () => { this.emph = e.v; this.paint(); } }, at + 0.3);
          subTo(tl, q('.cr-head small'), SUB_RUN, at);
        } else {
          tl.call(() => { if (!D.data.crowd) { this.state.fill(0); this.emph = 0; this.paint(); this.setCounts(0, 0); } }, null, at);
          tl.to(q('.cr-back'), { opacity: 1, duration: 0.6 }, at);
          tl.to(runEls, { opacity: 1, duration: 0.5, stagger: 0.08 }, at + 0.4);
        }
      }
      if (m === 'verdict') {
        tl.call(() => { if (!D.data.crowd) O.action('crowd', 'run').progress(1); }, null, at);
        if (prev !== 'run') { tl.set(q('.cr-back'), { opacity: 1 }, at); tl.set(runEls, { opacity: 1 }, at); }
        if (prev === 'intro') { tl.to(q('.cr-ask'), { opacity: 0, duration: 0.3 }, at); tl.to(q('.cr-head'), { opacity: 1, duration: 0.4 }, at + 0.35); }
        // 점들이 먼저 왼쪽으로 비켜서고, 그다음 결론이 그 오른쪽 빈자리에 들어온다
        tl.to(q('canvas'), { x: -400, duration: 0.8, ease: 'power3.inOut' }, at);
        subTo(tl, q('.cr-head small'), SUB_VERDICT, at);
        const e = { v: 0 };
        tl.to(e, { v: 1, duration: 0.8, onUpdate: () => { this.emph = e.v; this.paint(); } }, at + 0.3);
        tl.call(() => {
          const c = D.data.crowd;
          q('.cr-verdict .big').textContent = (c.lose / 10).toFixed(1) + '%';
          q('.cr-verdict .line').innerHTML = `1,000명 중 <b>${D.fmt(c.lose)}명</b>은 손해를 봤습니다.<br>빛나던 ${D.fmt(c.ahead)}명이 눈에 띄었을 뿐입니다`;
          q('.cr-verdict .money').innerHTML = `1,000명이 낸 돈 <b>1,000만 원</b> → 돌려받은 돈 <b>${D.fmt(Math.round(c.total / 10000))}만 원</b>`;
        }, null, at + 0.8);
        tl.fromTo(q('.cr-verdict'), { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.7, ease: 'power2.out' }, at + 0.85);
      }
    },
    actions: {
      run() {
        const s = reg.crowd, tl = gsap.timeline();
        // 사람마다 회차별 누적 상금 → 그 회차까지 낸 돈과 비교한 상태
        const states = Array.from({ length: 10 }, () => new Uint8Array(1000));
        const ret = new Int32Array(1000);
        for (let r = 0; r < 10; r++) {
          for (let i = 0; i < 1000; i++) {
            ret[i] += D.PAY[D.draw()];
            const spent = (r + 1) * D.COST;
            states[r][i] = ret[i] > spent ? AHEAD : ret[i] === spent ? EVEN : 0;
          }
        }
        const count = (st, v) => st.reduce((a, x) => a + (x === v ? 1 : 0), 0);
        const last = states[9];
        const ahead = count(last, AHEAD), even = count(last, EVEN);
        D.data.crowd = { ahead, even, lose: 1000 - ahead - even, total: ret.reduce((a, v) => a + v, 0) };
        s.state.fill(0); s.emph = 0; s.paint(); s.setCounts(0, 0);
        s.q('.cr-round').textContent = '0 / 10회';
        for (let r = 0; r < 10; r++) {
          const at = 0.3 + r * 0.5;
          D.machine.crankOnce(tl, at);
          tl.call(() => {
            s.state.set(states[r]);
            s.paint();
            s.setCounts(count(states[r], AHEAD), count(states[r], EVEN));
            s.q('.cr-round').textContent = `${r + 1} / 10회`;
            D.audio.play('tick');
            D.audio.play('chime', 0.6);
          }, null, at);
        }
        tl.call(() => D.audio.play('drop'), null, '>+0.3');
        return tl;
      },
    },
  });
})();
