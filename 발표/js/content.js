// 원문 불러오기: 로컬 서버로 열면 최신 마크다운을 직접 읽고,
// 파일을 더블클릭(file://)하면 sync.py 가 구워 둔 스냅숏을 쓴다.
(function () {
  const C = D.content = {};

  async function get(path, snapshot) {
    if (location.protocol.startsWith('http')) {
      try {
        const r = await fetch(encodeURI(path) + '?t=' + Date.now(), { cache: 'no-store' });
        if (r.ok) return { text: await r.text(), live: true };
      } catch (e) { /* 스냅숏으로 넘어간다 */ }
    }
    if (typeof snapshot === 'string') return { text: snapshot, live: false };
    throw new Error(`${path} 를 읽을 수 없습니다. sync.py 를 실행해 스냅숏을 만들어 주세요`);
  }

  C.load = async function (base = '../') {
    const [j, s] = await Promise.all([
      get(base + '수업지도안_중학교_세안.md', window.JIDOAN_MD),
      get(base + '발표_시나리오.md', window.SCRIPT_MD),
    ]);
    C.jidoan = j.text;
    C.script = s.text;
    C.live = j.live && s.live;
    C.sections = C.parseScript(s.text);
    return C;
  };

  // "## [s3] 수학 스테이션 — 수학" 제목으로 대본을 장면별로 나눈다
  C.parseScript = function (md) {
    const out = {};
    const re = /^## \[(s\d+)\]\s*(.*)$/gm;
    const hits = [];
    let m;
    while ((m = re.exec(md))) hits.push({ id: m[1], title: m[2], start: m.index, body: re.lastIndex });
    hits.forEach((h, i) => {
      const end = i + 1 < hits.length ? hits[i + 1].start : md.length;
      let body = md.slice(h.body, end);
      const cut = body.search(/^---\s*$|^## (?!\[)/m);   // 대비책·예상 질문 표는 장면 대본이 아니다
      if (cut >= 0) body = body.slice(0, cut);
      out[h.id] = { title: h.title, md: body.trim() };
    });
    return out;
  };
})();
