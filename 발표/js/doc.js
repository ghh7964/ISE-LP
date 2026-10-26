// 지도안 원문 패널: 렌더링, 스크롤, 하이라이트.
// 하이라이트 대상은 위치가 아니라 텍스트로 찾는다. 당일 지도안을 고쳐도 핵심 단어가 남아 있으면 따라간다.
//   { sel: 'tr', text: '전개 ③' }            텍스트를 포함한 첫 요소 (tr 이면 행 강조)
//   { sel: 'tr', first: '시각장애' }          첫 칸이 정확히 일치하는 행
//   { sel: 'h3', text: '1. 다수준', section: true }  제목부터 다음 제목 전까지
//   { col: '개별 지원', strong: 'A' }         표의 열 (strong 이 있으면 그 굵은 글씨가 있는 칸만)
(function () {
  const Doc = D.doc = {};
  let body, scroll;
  const sc = { y: 0 };

  Doc.render = function (md) {
    body = D.$('#doc-body');
    scroll = D.$('#doc-scroll');
    marked.use({ renderer: { del: (text) => `~${text}~` } });
    body.innerHTML = marked.parse(md, { gfm: true });
    D.$$('a', body).forEach((a) => a.removeAttribute('href'));
    // 초안 표시 [수정 가능] 은 발표 화면에서 숨긴다
    D.$$('code', body).filter((c) => c.textContent.includes('수정 가능')).forEach((c) => c.remove());
    // 세 칸 이상인 표는 발표 화면에서 행마다 카드처럼 세로로 쌓는다 (큰 글씨로 읽히게).
    // 표 구조(tr·td)는 그대로라서 행·열 하이라이트가 그대로 동작한다.
    D.$$('table', body).forEach((table) => {
      const head = D.$$('thead th', table).map((th) => th.textContent.trim());
      if (head.length < 3) return;
      table.classList.add('stack');
      D.$$('tbody tr', table).forEach((tr) => Array.from(tr.cells).forEach((td, i) => { td.dataset.label = head[i] || ''; }));
    });
    scroll.addEventListener('wheel', (e) => {
      e.preventDefault();
      Doc.scrollTo(sc.y + e.deltaY, 0.35);
    }, { passive: false });
  };

  Doc.scrollTo = function (y, dur = 1.0) {
    const max = Math.max(0, body.offsetHeight - scroll.clientHeight);
    gsap.to(sc, {
      y: D.clamp(y, 0, max), duration: dur, ease: 'power3.inOut', overwrite: true,
      onUpdate: () => { body.style.transform = `translate3d(0, ${-sc.y}px, 0)`; },
    });
  };

  const top = (el) => { while (el && el.parentElement !== body) el = el.parentElement; return el; };
  const relTop = (el) => {
    let y = 0;
    for (let e = el; e && e !== body; e = e.offsetParent) y += e.offsetTop;
    return y;
  };
  const isHeading = (el) => /^H[1-6]$/.test(el.tagName);

  function clear() {
    body.classList.remove('focus');
    D.$$('.hl-block, .hl-row, .hl-cell, .has-hl, .rowmode, .colmode', body).forEach((e) =>
      e.classList.remove('hl-block', 'hl-row', 'hl-cell', 'has-hl', 'rowmode', 'colmode'));
  }

  function resolve(t) {
    if (t.col) {
      for (const table of D.$$('table', body)) {
        const ths = D.$$('thead th', table);
        const idx = ths.findIndex((th) => th.textContent.includes(t.col));
        if (idx < 0) continue;
        const cells = D.$$('tbody tr', table).map((r) => r.cells[idx]).filter((c) => c && c.textContent.trim() && (!t.strong ||
          D.$$('strong', c).some((s) => s.textContent.trim() === t.strong)));
        if (!cells.length) return [];
        ths[idx].classList.add('hl-cell');
        cells.forEach((c) => c.classList.add('hl-cell'));
        table.classList.add('colmode');
        top(table).classList.add('has-hl');
        return t.strong || table.classList.contains('stack') ? cells : [ths[idx]];   // 쌓은 표는 머리행이 숨어 있다
      }
      return [];
    }

    const cands = D.$$(t.sel, body).filter((e) =>
      t.first ? e.cells && e.cells[0] && e.cells[0].textContent.trim() === t.first
              : e.textContent.includes(t.text));
    if (!cands.length) return [];
    const el = cands[0];

    if (t.section) {
      const level = +el.tagName[1] || 6;
      const parts = [el];
      for (let n = top(el).nextElementSibling; n; n = n.nextElementSibling) {
        if (isHeading(n) && +n.tagName[1] <= level) break;
        if (n.tagName === 'HR') break;
        parts.push(n);
      }
      parts.forEach((p) => p.classList.add('hl-block', 'has-hl'));
      return [el];
    }

    if (el.tagName === 'TR') {
      el.classList.add('hl-row');
      el.closest('table').classList.add('rowmode');
    } else {
      el.classList.add('hl-block');
    }
    top(el).classList.add('has-hl');
    return [el];
  }

  // 시작할 때 모든 단계의 강조 대상을 한 번 찾아 본다. 못 찾는 것은 이때만 알리고, 발표 중에는 조용히 건너뛴다.
  Doc.check = function (steps) {
    const miss = [];
    steps.forEach((st, i) => (st.set.doc || []).forEach((t) => { if (!resolve(t).length) miss.push(`${i}단계 "${t.text || t.first || t.col}"`); }));
    clear();
    if (miss.length) {
      console.warn('[지도안] 하이라이트 대상을 찾지 못했습니다:', miss);
      D.toast(`지도안에서 찾지 못한 강조 대상이 있습니다: ${miss.slice(0, 3).join(', ')}${miss.length > 3 ? ' 외' : ''}`, 6000);
    }
  };

  let lastKey = '';
  Doc.highlight = function (targets = [], force = false) {
    const key = JSON.stringify(targets);
    if (key === lastKey && !force) return;
    lastKey = key;
    clear();
    void body.offsetWidth;   // 같은 칸을 다시 강조해도 형광펜이 처음부터 다시 그어지게
    if (!targets.length) return;
    const hits = [];
    for (const t of targets) {
      const r = resolve(t);
      if (!r.length) console.warn('[지도안] 하이라이트 대상을 찾지 못했습니다:', t);
      hits.push(...r);
    }
    if (!hits.length) return;
    body.classList.add('focus');
    Doc.scrollTo(Math.min(...hits.map(relTop)) - 110);
  };

  Doc.setSpeaker = function (who) {
    D.$('#doc-speaker').innerHTML = who ? `발표 <b>${who}</b>` : '';
  };

  // 부록 Ⅹ.1 지원 카드 표: [{ area, support, basis }]
  Doc.cardRows = function () {
    for (const table of D.$$('table', body)) {
      const head = D.$$('thead th', table).map((th) => th.textContent.trim());
      if (head[0] === '영역' && head.some((h) => h.includes('추가 지원'))) {
        return D.$$('tbody tr', table).map((r) => ({
          area: r.cells[0].textContent.trim(),
          support: r.cells[1].textContent.trim(),
          basis: (r.cells[2] || {}).textContent ? r.cells[2].textContent.trim() : '',
        }));
      }
    }
    return [];
  };
})();
