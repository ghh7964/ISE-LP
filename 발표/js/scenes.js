// 장면 설정. 단계(step)마다 바뀌는 상태만 적으면 앞 단계의 상태 위에 누적된다.
// action 은 앞으로 넘어올 때 실행하고, restore 는 뒤로 돌아오거나 해시로 바로 열 때 그 결과를 즉시 보여 준다.
// 당일 고칠 곳: 아래 SPEAKERS (발표자 이름), TEAM, 각 단계의 doc(지도안 하이라이트 대상).
(function () {
  // ── 당일 채우기 ───────────────────────────────
  const SPEAKERS = { 사회: '사회 ○○○', 수학: '수학 ○○○', 정보: '정보 ○○○', 특수: '정보(특수교사 역할) ○○○' };
  D.TEAM_NAME = '특수교육론 ○조';
  D.TEAM_LINE = '정보 ○○○ · 정보 ○○○ · 수학 ○○○ · 사회 ○○○';

  // 카드를 고르면 교실에서 바뀌는 것 (영역 문구와 근거는 지도안 Ⅹ.1 표에서 읽는다)
  D.supportCards = [
    { change: '그림 단서 카드와 스티커 그래프판이 모든 모둠에서 쓰입니다' },
    { change: '개별 일과표가 빛나고, 교실 뒤에 접이식 책상 칸막이를 세운 조용한 자리가 생깁니다. 헤드폰은 책상에 두고 필요할 때 스스로 골라 씁니다' },
    { change: '수학 책상에 계산기, 모든 책상에 읽어 주기 펜과 이어폰이 놓입니다(소리가 교실에 퍼지지 않게)' },
    { change: '기대행동 3가지 게시물이 붙고, 휴식 카드를 들고 가서 3분 쉬는 쉼 자리가 생깁니다' },
    { change: '캡슐을 연 뒤 토큰의 촉각 점을 범례판에 대 보고 색을 압니다. 활동지는 고대비로 바뀝니다', cam: 'math' },
    { change: '모둠 책상에 자막 태블릿, 마이크 2개(교사용, 돌려 쓰는 발언용), 깜빡이는 빛 타이머가 놓입니다. 모둠이 옮길 때 함께 들고 갑니다', cam: 'math' },
    { change: '책상 사이가 넓어지고 휠체어 동선이 바닥에 표시됩니다. 모둠 책상은 휠체어가 들어가는 높이로 둡니다', cam: 'top' },
    { change: '모둠 노트북이 화상으로 연결되어, 원격으로 참여하는 친구가 기록을 맡습니다' },
    { change: '칠판 옆에 핵심 어휘 이중언어 카드가 붙습니다', cam: 'boardNear' },
    { change: '정보 책상에 심화 과제 카드가 놓이고 노트북 화면이 코드 편집기로 바뀝니다', cam: 'lensB' },
  ];

  D.DEFAULT = {
    night: true, letterbox: false, panel: false, cam: 'idle', spin: true,
    overlay: null, board: 'lesson', students: 'rows', zones: false, teachers: false, arrows: false,
    pins: [], layers: 0, lens: null, card: null, doc: [], speaker: '',
  };

  const tr = (text) => ({ sel: 'tr', text });
  D.STEPS = [
    // s0 대기
    { scene: 's0', label: '대기 화면', set: { overlay: 'title' } },

    // s1 1막 · 질문 (레터박스, 가챠 UI)
    { scene: 's1', label: '질문: 금색 5배, 이득일까?', set: { overlay: 'gacha:ask', letterbox: true, cam: 'machine', spin: false, speaker: SPEAKERS.사회 } },
    { scene: 's1', label: '10회 뽑기 (실제 난수)', set: { overlay: 'gacha:res' }, action: ['gacha', 'pull'] },
    { scene: 's1', label: '정답은 마지막에', set: { overlay: 'gacha:later' } },

    // s2 2막 · 교실
    { scene: 's2', label: '카메라가 뒤로: 교실 디오라마', set: { overlay: null, night: false, letterbox: false, panel: true, cam: 'wide',
        doc: [tr('단원명'), tr('특수교육대상학생 2명')] },
      fx: { camDur: 3.4, camEase: 'power2.inOut', dayAt: 0.5, dayDur: 2.2, lbAt: 1.2, panelAt: 2.2 } },
    { scene: 's2', label: '학생 A · 학생 B 소개', set: { cam: 'class', overlay: 'intro', pins: ['tag-A', 'tag-B'],
        doc: [{ sel: 'h3', text: '2. 특수교육대상학생', section: true }] } },
    { scene: 's2', label: '모둠 구성 · 스테이션 · 교사 4명', set: { overlay: null, students: 'groups', zones: true, teachers: true, cam: 'top',
        pins: ['tag-A', 'tag-B', 'st0', 'st1', 'st2', 't1', 't2', 't3', 't4'], doc: [tr('수업 형태'), tr('수업자')] } },
    { scene: 's2', label: '스테이션 순환', set: { students: 'rotated', arrows: true,
        doc: [{ sel: 'li', text: '6모둠을 2모둠씩' }] } },
    { scene: 's2', label: '사회 스테이션: 기회비용', set: { cam: 'social', overlay: 'social', arrows: false, pins: [],
        doc: [tr('전개 ①')] } },

    // s3 수학 스테이션
    { scene: 's3', label: '20번 뽑기 기록표', set: { cam: 'math', overlay: 'tally', speaker: SPEAKERS.수학, doc: [tr('전개 ②')] },
      action: ['tally', 'run'], restore: ['tally', 'show'] },
    { scene: 's3', label: 'Bruner 3층', set: { cam: 'layers', overlay: null, layers: 3, doc: [tr('Bruner의 표상 양식')] } },
    { scene: 's3', label: '모두 · 대부분 · 일부 목표', set: { pins: ['goal-all', 'goal-most', 'goal-some'],
        doc: [{ sel: 'h3', text: '1. 다수준 목표', section: true }] } },

    // s4 정보 스테이션
    { scene: 's4', label: '정보 스테이션 (B는 미리 정한 발표 역할)', set: { cam: 'info', layers: 0, pins: ['tag-B'], speaker: SPEAKERS.정보,
        doc: [tr('전개 ③')] }, fx: { camDur: 2.2 } },
    { scene: 's4', label: '노트북 화면 속으로: 블록 조립', set: { cam: 'laptop', overlay: 'sim:build', pins: [],
        doc: [{ sel: 'h3', text: '5. 시뮬레이터 설계', section: true }] }, action: ['sim', 'build'], restore: ['sim', 'build'], fx: { camDur: 1.8, ovAt: -0.35 } },
    { scene: 's4', label: '실행: 10번', set: { overlay: 'sim:run', doc: [tr('전개 ③')] }, action: ['sim', 'to10'], restore: ['sim', 'to10'] },
    { scene: 's4', label: '100번', set: {}, action: ['sim', 'to100'], restore: ['sim', 'to100'] },
    { scene: 's4', label: '1,000번', set: {}, action: ['sim', 'to1000'], restore: ['sim', 'to1000'] },

    // s5 통합교육 장치
    { scene: 's5', label: '교실 전체 · T4는 수학 스테이션 공동 교수', set: { overlay: null, cam: 'room', pins: ['t4'], speaker: SPEAKERS.특수,
        doc: [{ col: '개별 지원' }] } },
    { scene: 's5', label: '학생 A를 위한 지원', set: { lens: 'A', cam: 'lensA', pins: [], overlay: 'lens:A',
        doc: [{ col: '개별 지원', strong: 'A' }] } },
    { scene: 's5', label: '학생 B를 위한 지원', set: { lens: 'B', cam: 'lensB', overlay: 'lens:B',
        doc: [{ col: '개별 지원', strong: 'B' }] } },
    { scene: 's5', label: '모두를 위한 지원', set: { lens: 'all', cam: 'room', overlay: 'lens:all',
        doc: [{ sel: 'p', text: '모두에게 주는 기본 설계' }] } },
    { scene: 's5', label: '벽 게시판: 지원 카드 10장', set: { lens: null, cam: 'wall', overlay: null,
        doc: [{ sel: 'h3', text: '1. 지원 카드', section: true }] }, action: ['room', 'shimmer'] },
    { scene: 's5', label: '카드: 시각장애', set: { card: 4, overlay: 'card:4', cam: 'math', doc: [{ sel: 'tr', first: '시각장애' }] } },
    { scene: 's5', label: '카드: 청각장애', set: { card: 5, overlay: 'card:5', cam: 'math', doc: [{ sel: 'tr', first: '청각장애' }] } },
    { scene: 's5', label: '카드: 지체장애', set: { card: 6, overlay: 'card:6', cam: 'top', doc: [{ sel: 'tr', first: '지체장애' }] } },

    // s6 3막 · 답
    { scene: 's6', label: '다시 밤: 처음 질문으로', set: { card: null, overlay: 'crowd:intro', night: true, letterbox: true, panel: false, cam: 'machine',
        speaker: SPEAKERS.사회 }, fx: { camDur: 2.4, dayAt: 0.3, dayDur: 1.6, lbAt: 1.0, ovAt: 0.4 } },
    { scene: 's6', label: '1,000명 × 10번', set: { overlay: 'crowd:run' }, action: ['crowd', 'run'] },
    { scene: 's6', label: '결과: 약 68%가 손해', set: { overlay: 'crowd:verdict' } },
    { scene: 's6', label: '칠판: 지원은 모두에게 열려 있다', set: { overlay: null, night: false, letterbox: false, panel: true, cam: 'board', board: 'final',
        doc: [{ sel: 'li', text: '세 교과가 하나의 질문' }, { sel: 'li', text: '통합교육에 적합한 구조다' }] },
      fx: { camDur: 2.6, dayDur: 2.0, lbAt: 0.4, panelAt: 1.4 } },

    // s7 마무리
    { scene: 's7', label: '감사합니다', set: { cam: 'thanks', board: 'thanks', panel: false, speaker: '' }, fx: { camDur: 4.0, camEase: 'power2.inOut' } },
  ];

  // 숫자 키로 카드를 고를 때 쓰는 기준 단계 (지체장애 카드 단계)
  D.CARD_STEP = D.STEPS.findIndex((s) => s.set.card === 6);

  // 장면별 목표 시간 (발표_시나리오.md 표와 같다, 초 단위로 장면이 끝나야 하는 시각)
  D.SCENE_END = { s1: 40, s2: 90, s3: 135, s4: 185, s5: 245, s6: 285, s7: 300 };
})();
