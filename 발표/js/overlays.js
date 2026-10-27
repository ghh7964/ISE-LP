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
  // 점토 인형 그림: 3D 교실의 학생 말과 같은 색 (학생 A는 겉모습이 다른 학생과 같다)
  const SKIN = '#F1DCC4';
  const pawn = (body, x = 30, hp = false) => `<g transform="translate(${x - 30} 0)">
    <ellipse cx="30" cy="77" rx="17" ry="3" fill="rgba(0,0,0,.12)"/>
    <rect x="15" y="34" width="30" height="43" rx="15" fill="${body}"/>
    <circle cx="30" cy="21" r="14" fill="${SKIN}"/>
    ${hp ? '<path d="M15.5 22 A14.5 14.5 0 0 1 44.5 22" stroke="#2C2F36" stroke-width="3.2" fill="none"/><rect x="11" y="17" width="7" height="11" rx="2.5" fill="#2C2F36"/><rect x="42" y="17" width="7" height="11" rx="2.5" fill="#2C2F36"/>' : ''}</g>`;
  const PAWN = {
    A: `<svg viewBox="0 0 60 82">${pawn('#E2B677')}</svg>`,
    all: `<svg viewBox="0 0 110 82">${pawn('#D98C6B', 22)}${pawn('#E2B677', 55)}${pawn('#7FA7B5', 88, true)}</svg>`,   // 헤드폰은 필요한 사람 누구나
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

  // ── 탭이 달린 종이: 같은 자리의 본문만 바뀌고, 탭이 지금 위치를 알려 준다 (학생 기록 카드 · 연구 노트) ──
  // 본문은 탭마다 미리 그려 두고 보이는 것만 바꾼다 (본문 안의 그래프도 처음부터 애니메이션 대상이 된다)
  const tabs = (list) => `<div class="tabs">${list.map(([k, t]) => `<span data-k="${k}">${t}</span>`).join('')}</div>`;
  const panes = (BODY) => `<div class="tab-body">${Object.entries(BODY).map(([k, h]) => `<div class="pane" data-k="${k}">${h}</div>`).join('')}</div>`;
  function tabMode(s, tl, m, prev, at) {
    const nu = s.q(`.pane[data-k="${m}"]`), old = prev != null && s.q(`.pane[data-k="${prev}"]`);
    let t = at;
    if (prev === undefined) tl.set(s.qa('.pane'), { display: 'none', opacity: 0 }, at);
    if (old) {
      tl.to(old, { opacity: 0, y: -6, duration: 0.25, ease: 'power1.in' }, at);
      tl.set(old, { display: 'none' }, at + 0.26);
      t = at + 0.28;
    }
    tl.call(() => s.qa('.tabs span').forEach((e) => e.classList.toggle('on', e.dataset.k === m)), null, t);
    tl.set(nu, { display: 'block' }, t);
    tl.fromTo(nu, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }, t);
    if (s.after) s.after(tl, m, t + 0.2);
  }
  const li = (arr) => `<ul class="bul">${arr.map((x) => `<li>${x}</li>`).join('')}</ul>`;
  const chip = (t, c = '') => `<i class="chip ${c}">${t}</i>`;

  // ── 이 수업이 기르는 역량 (지도안 Ⅲ.3) ─────────────
  const COMP = [
    ['지식정보처리', '직접 뽑은 결과와 1,000번 데이터로 "5배면 이득"을 검증한다', '수학 · 정보'],
    ['창의적 사고', '확률 · 시뮬레이션 · 기회비용을 묶어 "할까, 말까"를 판단한다', '융합'],
    ['협력적 소통', '역할 카드로 모둠 데이터를 함께 만들고 근거를 들어 말한다', '모둠'],
    ['공동체', '서로의 강점으로 기여한다. 학생 A는 진행자로 모둠 데이터를 지킨다', '통합'],
    ['자기관리', '자기 소비를 스스로 결정하고 자기점검표로 돌아본다', '정리'],
  ];
  const SUBJ = [['수학', '정보처리 · 추론 · 연결'], ['정보', '컴퓨팅 사고력 · 디지털 문화 소양'], ['사회', '의사 결정력 · 비판적 사고력']];
  def('comp', {
    html: () => `<div><div class="sheet ws-comp">
      <div class="sh-top"><span>지도안 Ⅲ.3</span><span>총론 Ⅰ.2 · 교과 역량</span></div>
      <h3>이 수업이 기르는 역량</h3>
      <div class="cp-grp">핵심역량</div>
      ${COMP.map(([k, d, w]) => `<div class="cp-row"><b>${k}</b><span>${d}</span>${chip(w)}</div>`).join('')}
      <div class="cp-grp">교과 역량</div>
      <div class="cp-subj">${SUBJ.map(([k, d]) => `<div><b>${k}</b><span>${d}</span></div>`).join('')}</div>
      <div class="cp-foot"><div><b>기초소양</b> 수리 · 디지털 · 언어 (어휘 풀이 카드)</div>
        <div class="cp-a"><b>학생 A</b> <mark>기본교육과정: 자율생활 · 대인관계 · 정보처리 · 연결</mark></div></div></div></div>`,
    enter(tl, at) {
      tl.fromTo(this.q('.sheet'), { x: 50, rotation: 2, opacity: 0 }, { x: 0, rotation: 0.5, opacity: 1, duration: 0.7, ease: 'power3.out' }, at);
      tl.fromTo(this.qa('.cp-row, .cp-subj > div, .cp-foot > div'), { opacity: 0, x: 14 }, { opacity: 1, x: 0, duration: 0.4, stagger: 0.09 }, at + 0.5);
      write(tl, this.qa('.cp-row .chip'), at + 1.1, 0.1);
    },
  });

  // ── 학생 A: 학생 기록 카드 (지도안 Ⅳ.2) ──────────────
  const PF_BODY = {
    who: `<div class="tb-h">특성</div>${li([
      '그림 · 영상 같은 <mark>시각 정보는 빨리 이해</mark>한다',
      '말로 된 <mark>여러 단계 지시는 놓친다</mark>',
      '같은 순서와 규칙을 좋아하고, <mark>정해진 절차가 있으면 끝까지 해낸다</mark>',
      '예고 없는 전환과 큰 소리에 불안해한다',
    ])}<div class="tb-note"><b>지원 요구</b> 제한적 지원: 그림 단서 · 영상 시범 · 전환 예고 · 할 말을 적은 역할 카드 · 소음 조절</div>`,
    level: `<div class="tb-h">현행수준</div><dl class="lv">
      <dt>수학</dt><dd>100 이하의 수를 세고 한 자리 수를 더하고 뺀다. 두 수량 중 많은 쪽을 고른다. 분수 · 비율(1/10)은 모른다</dd>
      <dt>화폐</dt><dd>매점에서 1,000원 이하 물건을 혼자 산다. 거스름돈은 도움이 필요하다</dd>
      <dt>의사소통</dt><dd>2~3어절로 답한다. 할 말 카드가 있으면 또래에게 말한다</dd>
      <dt>행동·감각</dt><dd>큰 소리에 귀를 막는다. 헤드폰에 익숙하다. 15분이 넘으면 집중이 흐트러진다</dd>
      <dt>기기</dt><dd>태블릿 영상을 스스로 재생 · 정지 · 되감기한다</dd>
      <dt>학습 방식</dt><dd>시범을 직접 보거나 <mark>영상으로 볼 때 가장 잘 따라 한다</mark></dd></dl>
      <div class="pn pn-lv">↳ 그래서 영상 시범으로 가르친다</div>`,
    iep: `<div class="tb-h">IEP 목표 <small>2학기 단기 목표</small></div><div class="iep">
      <div><b>수학(자료)</b><span>절차 영상을 보고 뽑기 결과 10회를 스티커 막대그래프로 나타내고 가장 긴 막대를 찾는다 <em>3회기 연속 80% 이상</em></span>${chip('수학 · 정보')}</div>
      <div><b>수학(화폐)</b><span>낸 토큰과 받은 토큰을 쌓아 많은 쪽을 고른다</span>${chip('수학')}</div>
      <div><b>사회(자기 결정)</b><span>그림 카드 두 장 중 하나를 고르고 이유 한 가지를 말한다</span>${chip('사회')}</div>
      <div><b>의사소통</b><span>스크립트 카드를 보고 모둠 결과를 1문장 이상 또래에게 말한다</span>${chip('정보')}</div>
      <div><b>행동(전환)</b><span>1분 전 예고를 받고 2분 안에 다음 스테이션으로 이동한다 <em>5회 중 4회</em></span>${chip('전환')}</div></div>`,
    strength: `<div class="tb-h">강점: 도움만 받는 친구가 아니다</div>
      <div class="st-chips"><span class="lbl">관찰 메모</span>${['집중력', '절차 기억', '규칙을 정직하게', '자기만의 관점'].map((t) => `<span class="hw">${t}</span>`).join('')}</div>
      <div class="st-role"><div class="role-card"><b>진행자</b><i>수학 스테이션</i>20번의 차례를 세고, 토큰이 캡슐에 다시 들어갔는지 확인한다 → 모둠 데이터가 정확해진다</div>
        <div class="role-card"><b>발표자</b><i>정보 스테이션</i>그래프에서 가장 긴 막대를 찾아 모둠에 알려 준다</div></div>
      <div class="st-say">“A가 20번 모두 다시 넣었는지 확인해서<br>우리 모둠 기록을 믿을 수 있어요”</div>
      <div class="tb-note">자폐성장애의 일반 특성이 아니라, 관찰로 확인한 <b>A 개인의 강점</b>으로 다룬다</div>`,
  };
  def('profile', {
    html: () => `<div><div class="rc pf-card"><i class="clip"></i>
      <div class="rc-top"><span>학생 기록 카드</span><span>지도안 Ⅳ.2 · 가상 설정</span></div>
      <div class="rc-main"><div class="rc-photo">${PAWN.A}</div>
        <div class="rc-f"><div class="nm"><b>학생 A</b><span>자폐성장애 <small>경도 지적장애 동반</small></span></div>
          <dl><dt>학년·성별</dt><dd>중학교 2학년 · 남학생 (만 14세)</dd>
            <dt>배치</dt><dd>특수학급 소속 · 이 시간 통합학급으로 시간제 통합</dd>
            <dt>검사</dt><dd>K-WISC-V 62 · CARS-2 35 · KISE-BAAT(수학) 68</dd></dl></div></div>
      ${tabs([['who', '특성'], ['level', '현행수준'], ['iep', 'IEP 목표'], ['strength', '강점']])}
      ${panes(PF_BODY)}</div></div>`,
    enter(tl, at) { tl.fromTo(this.q('.pf-card'), { y: 60, rotation: 2, opacity: 0 }, { y: 0, rotation: 0.4, opacity: 1, duration: 0.7, ease: 'power3.out' }, at); },
    mode(tl, m, prev, at) { tabMode(this, tl, m, prev, at); },
    after(tl, m, at) {
      if (m === 'strength') { write(tl, this.qa('.st-chips .hw'), at, 0.16); tl.fromTo(this.qa('.role-card'), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.12 }, at + 0.5); }
      if (m === 'level') write(tl, this.q('.pn-lv'), at + 0.4);
    },
  });

  // ── 관련 연구 분석: 연구 노트 (지도안 Ⅴ) ──────────────
  // 결과 그래프: 논문이 보고한 단계별 평균 정반응률 (회기별 자료가 아니다)
  const PHASES = ['기초선', '중재 1', '중재 2', '중재 3', '유지'];
  const SERIES = [
    { k: '덧셈', v: [0, 100, 100, 100, 96.7], c: '#213A63' },
    { k: '뺄셈', v: [0, 86.7, 90, 100, 96.7], c: '#C8952A' },
    { k: '곱셈', v: [0, 83.3, 96.7, 100, 96.7], c: '#8A5A3B' },
  ];
  function resultSVG() {
    const W0 = 600, H0 = 400, L = 64, R0 = 570, T0 = 54, B0 = 340;
    const x = (i) => L + i * ((R0 - L) / 4), y = (v) => B0 - (v / 100) * (B0 - T0);
    let g = '';
    [0, 50, 100].forEach((v) => { g += `<line x1="${L}" x2="${R0}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${L - 12}" y="${y(v) + 7}" text-anchor="end" class="ax">${v}%</text>`; });
    g += `<line x1="${(x(0) + x(1)) / 2}" x2="${(x(0) + x(1)) / 2}" y1="${T0 - 8}" y2="${B0}" class="ph"/>`;
    PHASES.forEach((p, i) => { g += `<text x="${x(i)}" y="${B0 + 36}" text-anchor="middle" class="ax">${p}</text>`; });
    // 세 선이 끝에서 겹치므로 이름은 위쪽 범례로. 기초선과 중재 사이는 잇지 않는다 (단일대상연구 그래프의 관례)
    SERIES.forEach((s, n) => {
      g += `<polyline pathLength="1" class="ln" stroke="${s.c}" points="${s.v.slice(1).map((v, i) => `${x(i + 1)},${y(v)}`).join(' ')}"/>`;
      g += s.v.map((v, i) => `<circle class="pt" cx="${x(i)}" cy="${y(v)}" r="6" fill="${s.c}"/>`).join('');
      g += `<g class="lb"><line x1="${L + n * 120}" x2="${L + n * 120 + 30}" y1="14" y2="14" stroke="${s.c}" stroke-width="4"/><text x="${L + n * 120 + 38}" y="21" fill="${s.c}">${s.k}</text></g>`;
    });
    return `<svg class="res" viewBox="0 0 ${W0} ${H0}">${g}</svg><div class="fig">그림. 단계별 평균 정반응률 (논문 보고값을 다시 그림)</div>`;
  }
  const PP_BODY = {
    info: `<div class="pp3">
      <div class="pp-c"><div class="tb-h">대상</div>${li(['중학교 1학년 남학생 1명 (14세)', '<mark>자폐성장애</mark> · CARS 35', '<mark>특수학급 소속, 시간제 통합</mark>', '수학 문제해결 백분위 3%'])}
        <div class="pn pn-same">↳ 학생 A와 같은 조건!</div></div>
      <div class="pp-c"><div class="tb-h">설계</div><p>행동 간 지연된 중다기초선설계</p>
        <svg class="mb" viewBox="0 0 260 120">${['덧셈', '뺄셈', '곱셈'].map((t, i) => `<text x="0" y="${24 + i * 38}">${t}</text><line x1="56" x2="${92 + i * 50}" y1="${18 + i * 38}" y2="${18 + i * 38}" class="base"/><line x1="${92 + i * 50}" x2="252" y1="${18 + i * 38}" y2="${18 + i * 38}" class="trt"/>`).join('')}</svg>
        <p class="cap">세 행동에 차례로 중재를 시작한다 (구조도)</p></div>
      <div class="pp-c"><div class="tb-h">중재</div>${li(['태블릿 PC <b>비디오 자기 모델링</b> (피드포워드)', '문항: 기본교육과정 <b>화폐의 계산</b> (물건값, 거스름돈)', '영상: 태블릿 내장 카메라 + 기본 편집 프로그램'])}</div></div>`,
    result: `<div class="pp-res"><div><div class="tb-h">문장제 정반응률</div>${resultSVG()}</div>
      <div class="pp-big"><div class="big hw">0% → 96.7%</div><p>기초선에서 유지기까지, 세 행동 모두</p>
        <p class="sub">영상을 <b>10개 → 5개 → 0개</b>로 줄여도<br>2주 뒤까지 유지됐다</p>
        <p class="qual">채점자 간 신뢰도 100% · 중재충실도 94% · 사회적 타당도 63.6점(기준 52.5)</p>
        <p class="lim">한계: 대상 1명, 비슷한 문항 반복에 따른 학습 효과</p></div></div>`,
    how: `<div class="tb-h">영상 만들기: 과제분석 → 촉구하며 녹화 → 촉구 장면 삭제</div>
      <div class="flow">
        <div><b>① 소리 내어 읽기</b><span>${chip('말하기 · 듣기')}${chip('국어', 'k')}</span></div>
        <div><b>② 단서에 동그라미</b><span>${chip('보기 · 쓰기')}${chip('국어 독해', 'k')}</span></div>
        <div><b>③ 식 세우기</b><span>${chip('수학', 'm')}</span></div>
        <div><b>④ 계산</b><span>${chip('수학', 'm')}</span></div></div>
      <p class="flow-note">혼자 해내는 모습만 남긴 약 1분 30초 영상 30개. 아직 못 하는 것을 <mark>“해내는 나”</mark>로 먼저 본다.</p>
      <div class="pn pn-flow">↳ 우리 분석: 절차 자체가 여러 감각과 교과를 오간다 → 융합수업에 옮기기 자연스럽다</div>
      <div class="tb-h">용암: 영상을 줄여 간다</div>
      <div class="fade">${[[10, '1단계'], [5, '2단계'], [0, '3단계']].map(([n, t]) => `<div><b>${t}</b><span class="film">${Array.from({ length: 10 }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span><em>영상 ${n}개</em></div>`).join('<i class="arr">→</i>')}</div>
      <p class="fade-rule">연속 3회기 평균 80% 이상이면 다음 단계로</p>`,
    apply: `<div class="pp-apply"><div><div class="tb-h">왜 이 방법인가</div><div class="why">
        <div><b>대상이 같다</b>특수학급 소속, 시간제 통합, 자폐성장애 중학생</div>
        <div><b>지적장애 동반에도 맞다</b>여러 단계 말 지시 대신 한 단계씩 보이는 시범</div>
        <div><b>내용이 이어진다</b>화폐의 계산 ↔ 1,000원 내고 얼마를 돌려받나</div>
        <div><b>통합학급에서 혼자 참여</b>용암으로 교사 촉구 없이 모둠 안에서</div>
        <div><b>모두에게 열린 도구</b>모든 모둠이 같은 태블릿으로 교사 시범을 본다</div>
        <div><b>저자의 제언을 잇는다</b>다교과 접근 → 수학 · 사회 · 정보 융합</div></div></div>
      <div><div class="tb-h">수학 스테이션 과제분석 5단계</div><ol class="steps5">
        <li>통에서 캡슐 1개 뽑기</li><li>캡슐 열어 토큰 색 보기</li><li>같은 색 칸에 스티커 붙이기</li><li>토큰을 넣어 닫고 통에 돌려놓기</li><li>통을 짝에게 넘기기</li></ol>
        <div class="now"><b>본시 = 중재 2단계</b>시작할 때 영상 1번 (이어폰) · 처음 5번은 필요할 때 다시 · 이후 영상 없이</div>
        <div class="now info"><b>정보 스테이션 4단계</b>소리 내어 읽기 → '횟수'에 동그라미 → 가장 긴 막대 → 말하기 · 10번 영상, 100번 필요할 때, 1,000번 없이</div></div></div>`,
  };
  def('paper', {
    html: () => `<div><div class="sheet ws-paper">
      <div class="sh-top"><span>관련 연구 분석 · 지도안 Ⅴ</span><span>특수교육재활과학연구 54(4), 2015</span></div>
      <h3>스마트기기를 활용한 비디오 자기 모델링이 자폐스펙트럼장애 학생의 수학 문장제 문제해결에 미치는 효과</h3>
      <div class="sh-sub">최진혁 · 김일수 · 박재국</div>
      ${tabs([['info', '대상과 설계'], ['result', '결과'], ['how', '방법'], ['apply', '우리 수업에 적용']])}
      ${panes(PP_BODY)}</div></div>`,
    enter(tl, at) { tl.fromTo(this.q('.sheet'), { y: 50, rotation: -1.5, opacity: 0 }, { y: 0, rotation: -0.3, opacity: 1, duration: 0.7, ease: 'power3.out' }, at); },
    mode(tl, m, prev, at) { tabMode(this, tl, m, prev, at); },
    after(tl, m, at) {
      if (m === 'result') {
        tl.fromTo(this.qa('.res .ln'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.1, stagger: 0.25, ease: 'power1.inOut' }, at);
        tl.fromTo(this.qa('.res .pt, .res .lb'), { opacity: 0 }, { opacity: 1, duration: 0.3, stagger: 0.02 }, at + 0.2);
      }
      if (m === 'how') { tl.fromTo(this.qa('.film i.on'), { opacity: 0 }, { opacity: 1, duration: 0.15, stagger: 0.04 }, at + 0.3); write(tl, this.qa('.flow .chip'), at + 0.2, 0.08); write(tl, this.q('.pn-flow'), at + 1.0); }
      if (m === 'info') write(tl, this.q('.pn-same'), at + 0.5);
      if (m === 'result') write(tl, this.q('.big'), at + 1.0);
    },
  });

  // ── 지원 메모: 3D 교실에서 빛나는 것의 설명 (학생 기록 카드와 같은 물건) ──
  const VOCAB_ICON = `<svg viewBox="0 0 60 44"><rect x="2" y="2" width="56" height="40" fill="#FBF8F1" stroke="#213A63" stroke-width="2"/><rect x="2" y="2" width="56" height="6" fill="#213A63"/><rect x="8" y="14" width="30" height="7" fill="#213A63"/><rect x="8" y="26" width="44" height="4" fill="#8A847A"/><rect x="8" y="34" width="34" height="4" fill="#8A847A"/></svg>`;
  const NOTE = {
    lead: { pic: PAWN.A, who: '학생 A: 수학 스테이션 진행자', what: '태블릿에서 자기 모습이 담긴 절차 영상(5단계)을 이어폰으로 한 번 보고 시작합니다. 20번의 차례를 횟수판에 세고, 토큰이 캡슐에 다시 들어갔는지 확인합니다. 이 규칙이 지켜져야 모둠의 데이터가 정확해집니다', std: '강점으로 기여하는 역할 · 지도안 Ⅷ.1' },
    vocab: { pic: VOCAB_ICON, who: '어려운 말은 쉬운 말로 먼저', what: '"상대도수"는 먼저 <b>전체 중에서 그 색이 나온 비율</b>이라고 말하고, 식(나온 횟수 ÷ 전체 횟수)은 그다음에 보입니다. 카드는 스테이션마다 두고 누구나 봅니다', std: '지도안 Ⅺ.6 핵심 어휘 풀이 카드 · 기초소양(언어)' },
    info: { pic: PAWN.A, who: '학생 A: 정보 스테이션 발표자', what: '논문의 절차를 블록 코드에 옮긴 4단계 영상: <b>소리 내어 읽기 → \'횟수\'에 동그라미하고 버튼 → 가장 긴 막대 찾기 → 스크립트로 말하기</b>. 10번 실행은 영상을 보고, 100번은 필요할 때, 1,000번은 영상 없이 합니다', std: '비디오 자기 모델링 · 용암 · 지도안 Ⅴ.3, 전개 ③' },
    all: { pic: PAWN.all, who: '모두를 위한 지원', what: '같은 태블릿, 일과표, 역할 카드, 어휘 카드가 처음부터 모든 모둠의 책상에 놓여 있었습니다. 다른 모둠은 교사 시범 영상을, A는 자기 모습 영상을 볼 뿐입니다. 그래서 눈에 띄지 않습니다', std: 'UDL · 통합교육 4대 원리 ② 자연스러운 비가시적 지원' },
  };
  def('note', {
    html: () => `<div><div class="cap-strip rc"><i class="clip"></i><div class="cap-in"></div></div></div>`,
    enter(tl, at) { tl.fromTo(this.q('.cap-strip'), { y: 40, rotation: -1, opacity: 0 }, { y: 0, rotation: -0.3, opacity: 1, duration: 0.6, ease: 'power3.out' }, at); },
    mode(tl, m, prev, at) {
      const L = NOTE[m];
      swap(tl, this.q('.cap-in'), `<div class="rc-photo${m === 'all' ? ' wide' : ''}">${L.pic}</div>
        <div><div class="who">${L.who}</div><div class="what">${L.what}</div>${L.more ? `<div class="more">${L.more}</div>` : ''}<div class="std">근거 · ${L.std}</div></div>`, at, prev === undefined);
    },
  });

  // ── 다른 학생이 오면 (지도안 Ⅺ.1): 같은 책상(흐린 기본 설계) 위에 지원 하나만 더한다 ──
  const loop = (x, y, w, h) => `<path class="loop" pathLength="1" d="M${x + w * 0.12} ${y + h * 0.1} C ${x + w * 0.4} ${y - h * 0.12}, ${x + w * 1.02} ${y - h * 0.05}, ${x + w} ${y + h * 0.45} C ${x + w * 0.98} ${y + h * 1.05}, ${x + w * 0.2} ${y + h * 1.12}, ${x} ${y + h * 0.6} C ${x - w * 0.02} ${y + h * 0.3}, ${x + w * 0.1} ${y + h * 0.08}, ${x + w * 0.3} ${y + h * 0.02}"/>`;
  const DESK = `<rect x="10" y="18" width="280" height="114" rx="4" fill="#E6CFA2" stroke="rgba(27,26,24,.35)"/>
    <g class="base"><rect x="24" y="32" width="76" height="52" rx="5" fill="#2B2A2E"/><rect x="29" y="37" width="66" height="42" fill="#9DB6CF"/>
    <rect x="114" y="30" width="44" height="60" fill="#FBF8F1" stroke="#8A847A"/>${[42, 54, 66, 78].map((y) => `<rect x="120" y="${y}" width="32" height="4" fill="#8A847A"/>`).join('')}
    <rect x="170" y="40" width="50" height="32" fill="#EFDDB0" stroke="#8A847A"/>
    <rect x="232" y="32" width="46" height="36" fill="#FBF8F1" stroke="#213A63"/><rect x="232" y="32" width="46" height="6" fill="#213A63"/><rect x="238" y="44" width="24" height="6" fill="#213A63"/></g>`;
  const dots = (cx, cy, n) => [...Array(n)].map((_, i) => `<circle cx="${cx + (i - (n - 1) / 2) * 7}" cy="${cy}" r="2.4" fill="#1B1A18"/>`).join('');
  const EXT = [
    ['시각장애', '캡슐 속 토큰에 촉각 점 (금 1 · 은 2 · 동 3)',
      `<g class="add">${[['#E2B43E', 1, 150], ['#C9CED4', 2, 194], ['#C08A5A', 3, 238]].map(([c, n, x]) => `<circle cx="${x}" cy="108" r="15" fill="${c}" stroke="rgba(27,26,24,.4)"/>${dots(x, 108, n)}`).join('')}</g>${loop(126, 88, 138, 40)}`],
    ['청각장애', '자막이 나오는 태블릿 · 소리 대신 빛 타이머',
      `<g class="add"><rect x="31" y="66" width="62" height="10" fill="#FBF8F1"/><rect x="35" y="69" width="40" height="4" fill="#1B1A18"/>
        <circle cx="236" cy="104" r="15" fill="#F6D04D" stroke="#C99A1E" stroke-width="2"/>${[0, 60, 120, 180, 240, 300].map((a) => { const r = a * Math.PI / 180; return `<line x1="${236 + Math.cos(r) * 19}" y1="${104 + Math.sin(r) * 19}" x2="${236 + Math.cos(r) * 25}" y2="${104 + Math.sin(r) * 25}" stroke="#C99A1E" stroke-width="2.4" stroke-linecap="round"/>`; }).join('')}</g>
        ${loop(20, 58, 84, 26)}${loop(206, 76, 60, 56)}`],
    ['지체장애', '휠체어가 지나는 넓힌 동선 · 큰 버튼 대체 입력',
      `<g class="add"><circle cx="150" cy="108" r="16" fill="#C8553D" stroke="#8E3424" stroke-width="3"/>
        <path d="M14 144 H286 M14 144 l9 -5 M14 144 l9 5 M286 144 l-9 -5 M286 144 l-9 5" stroke="#1B1A18" stroke-width="2.4" fill="none" stroke-linecap="round"/></g>
        ${loop(126, 86, 48, 44)}`],
    ['한국어를 배우는 학생', '핵심 어휘 이중언어 카드',
      `<g class="add"><rect x="232" y="78" width="46" height="40" fill="#FBF8F1" stroke="#213A63"/><rect x="238" y="86" width="26" height="6" fill="#213A63"/><rect x="238" y="98" width="32" height="5" fill="#2F7F7A"/><rect x="238" y="108" width="22" height="5" fill="#2F7F7A"/></g>
        ${loop(222, 70, 66, 56)}`],
  ];
  def('ext', {
    html: () => `<div><div class="sheet ws-ext">
      <div class="sh-top"><span>지도안 Ⅺ.1</span><span>UDL · 같은 설계 위에 더하기</span></div>
      <h3>다른 학생이 오면</h3>
      <div class="sh-sub">흐린 것은 이미 모든 책상에 있는 기본 설계, 진한 것이 더한 지원</div>
      <div class="ex-grid">${EXT.map(([k, d, add]) => `<div class="ex-card"><svg class="desk" viewBox="0 0 300 152">${DESK}${add}</svg><b>${k}</b><span>${d}</span></div>`).join('')}</div>
      <div class="pn pn-ext">↳ 활동과 목표는 그대로, 책상 위에 하나만 더한다</div></div></div>`,
    enter(tl, at) {
      tl.fromTo(this.q('.sheet'), { x: 50, rotation: 2, opacity: 0 }, { x: 0, rotation: 0.4, opacity: 1, duration: 0.7, ease: 'power3.out' }, at);
      tl.fromTo(this.qa('.ex-card'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.1 }, at + 0.4);
      this.qa('.ex-card').forEach((c, i) => {
        const t = at + 1.0 + i * 0.45;
        tl.fromTo(D.$$('.add', c), { opacity: 0, scale: 0.6, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2)' }, t);
        tl.fromTo(D.$$('.loop', c), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.5, ease: 'power1.inOut' }, t + 0.25);
      });
      write(tl, this.q('.pn-ext'), at + 3.0);
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
