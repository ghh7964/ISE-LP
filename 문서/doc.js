// 마크다운 지도안을 A4 문서로 조판한다.
// 로컬 서버로 열면 최신 마크다운을 직접 읽고, 파일을 더블클릭(file://)하면 발표/sync.py 가 구운 스냅숏을 쓴다.
(async function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  async function source() {
    if (location.protocol.startsWith('http')) {
      try {
        const r = await fetch(encodeURI('../수업지도안_중학교_세안.md') + '?t=' + Date.now(), { cache: 'no-store' });
        if (r.ok) return r.text();
      } catch (e) { /* 스냅숏으로 넘어간다 */ }
    }
    if (typeof window.JIDOAN_MD === 'string') return window.JIDOAN_MD;
    throw new Error('지도안을 읽을 수 없습니다. python3 발표/sync.py 를 실행해 스냅숏을 만들어 주세요');
  }

  const body = el('div', null, marked.parse(await source()));

  // 제목: "수업지도안(세안): 뽑기, 정말 이득일까?" → 종류 + 제목, 바로 아래 문단은 작성자, 첫 인용은 개요
  const h1 = $('h1', body);
  const [kind, title] = h1.textContent.split(/:\s*/);
  const head = el('header', 'title', `<div class="kind">${kind}</div><h1>${title || kind}</h1>`);
  const by = h1.nextElementSibling;
  if (by && by.tagName === 'P') { by.className = 'byline'; head.appendChild(by); }
  const abs = head.nextElementSibling || $('blockquote', body);
  h1.replaceWith(head);
  if (abs && abs.tagName === 'BLOCKQUOTE') abs.className = 'abstract';

  // 구분선은 장 제목이 대신한다
  $$('hr', body).forEach((e) => e.remove());

  // 장 번호: "Ⅰ. 기본 정보" → 번호 칸 + 제목
  $$('h2', body).forEach((h) => {
    const m = h.textContent.match(/^([ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫ]+)\.\s*(.*)$/);
    if (m) h.innerHTML = `<span class="no">${m[1]}</span><span>${m[2]}</span>`;
  });

  // 표: 두 칸짜리 "항목 | 내용" 표는 왼쪽 칸을 좁게, 과정안 표는 칸 너비를 정한다
  $$('table', body).forEach((t) => {
    const ths = $$('thead th', t).map((th) => th.textContent.trim());
    if (ths.length === 2) t.classList.add('kv');
    if (ths[0] === '단계' && ths.includes('개별 지원')) {
      t.classList.add('lp');
      t.insertAdjacentHTML('afterbegin', '<colgroup>' + [7, 4, 25, 14, 23, 27].map((w) => `<col style="width:${w}%">`).join('') + '</colgroup>');
    }
  });

  // 판서 계획: 상자 그림(┌│└)을 칠판 세 칸으로
  $$('pre code', body).forEach((c) => {
    if (!c.textContent.includes('│')) return;
    const cols = [[], [], []];
    c.textContent.split('\n').filter((l) => l.startsWith('│')).forEach((l) =>
      l.split('│').slice(1, -1).forEach((s, i) => { s = s.trim(); if (s && cols[i]) cols[i].push(s); }));
    const board = el('div', 'board', cols.map((col, i) =>
      `<div class="${i === 1 ? 'mid' : ''}"><b>${col[0] || ''}</b>${col.slice(1).map((s) => `<span>${s}</span>`).join('')}</div>`).join(''));
    c.parentElement.replaceWith(board);
  });

  // 쪽 나누기: 과정안(Ⅷ.2)만 가로 A4. 그 h3 부터 다음 제목 전까지를 가로 종이로 뗀다
  const sheets = [el('section', 'sheet')];
  const kids = Array.from(body.childNodes);
  let wide = false;
  for (const n of kids) {
    if (n.nodeType === 1 && /^H[23]$/.test(n.tagName)) {
      const isLP = n.tagName === 'H3' && /과정안/.test(n.textContent) && !/참고/.test(n.textContent);
      if (isLP && !wide) { wide = true; sheets.push(el('section', 'sheet wide')); }
      else if (!isLP && wide) { wide = false; sheets.push(el('section', 'sheet')); }
    }
    sheets[sheets.length - 1].appendChild(n);
  }
  const doc = $('#doc');
  doc.innerHTML = '';
  sheets.forEach((s) => doc.appendChild(s));

  await document.fonts.ready;
  document.documentElement.classList.add('ready');
})().catch((e) => {
  document.getElementById('doc').innerHTML = `<p class="loading">${e.message}</p>`;
  document.documentElement.classList.add('ready', 'failed');
});
