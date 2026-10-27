// 장면 설정. 단계(step)마다 바뀌는 상태만 적으면 앞 단계의 상태 위에 누적된다.
// action 은 앞으로 넘어올 때 실행하고, restore 는 뒤로 돌아오거나 해시로 바로 열 때 그 결과를 즉시 보여 준다.
// 당일 고칠 곳: 아래 SPEAKERS (발표자 이름), TEAM, 각 단계의 doc(지도안 하이라이트 대상).
(function () {
  // ── 당일 채우기 ───────────────────────────────
  const SPEAKERS = { 사회: '사회 정유진', 수학: '수학 이동규', 정보: '정보 구현호', 특수: '정보(특수교사 역할) 유정민' };
  D.TEAM_NAME = '특수교육론 1조';
  D.TEAM_LINE = '구현호 · 유정민 (컴퓨터공학과) · 이동규 (수학교육과) · 정유진 (경제학부)';

  D.DEFAULT = {
    night: true, letterbox: false, panel: false, cam: 'idle', spin: true,
    overlay: null, board: 'lesson', students: 'rows', zones: false, teachers: false, arrows: false,
    pins: [], layers: 0, lens: null, doc: [], speaker: '',
  };

  const tr = (text) => ({ sel: 'tr', text });
  const sec = (sel, text) => ({ sel, text, section: true });
  D.STEPS = [
    // s0 대기
    { scene: 's0', label: '대기 화면', set: { overlay: 'title' } },

    // s1 1막 · 질문 (레터박스, 가챠 UI)
    { scene: 's1', label: '질문: 금색 5배, 이득일까?', set: { overlay: 'gacha:ask', letterbox: true, cam: 'machine', spin: false, speaker: SPEAKERS.사회 } },
    { scene: 's1', label: '10회 뽑기 (실제 난수)', set: { overlay: 'gacha:res' }, action: ['gacha', 'pull'] },
    { scene: 's1', label: '정답은 마지막에', set: { overlay: 'gacha:later' } },

    // s2 2막 · 교실과 수업 설계
    { scene: 's2', label: '카메라가 뒤로: 교실 디오라마', set: { overlay: null, night: false, letterbox: false, panel: true, cam: 'wide',
        doc: [tr('단원명'), tr('특수교육대상학생 1명')] },
      fx: { camDur: 3.4, camEase: 'power2.inOut', dayAt: 0.5, dayDur: 2.2, lbAt: 1.2, panelAt: 2.2 } },
    { scene: 's2', label: '모둠 구성 · 스테이션 · 교사 4명', set: { students: 'groups', zones: true, teachers: true, cam: 'top',
        pins: ['tag-A', 'st0', 'st1', 'st2', 't1', 't2', 't3', 't4'], doc: [tr('수업 형태'), tr('수업자')] } },
    { scene: 's2', label: '스테이션 순환', set: { students: 'rotated', arrows: true,
        doc: [{ sel: 'li', text: '6모둠을 2모둠씩' }] } },
    { scene: 's2', label: '이 수업이 기르는 역량', set: { overlay: 'comp', arrows: false, pins: [], cam: 'roomL',
        doc: [sec('h3', '3. 본시에서 기르는 역량')] } },
    { scene: 's2', label: '사회 스테이션: 기회비용', set: { cam: 'social', overlay: 'social', doc: [tr('전개 ①')] } },

    // s3 학생 A (자폐성장애, 지적장애 동반)
    { scene: 's3', label: '학생 A: 학년 · 성별 · 특성', set: { overlay: 'profile:who', students: 'groups', cam: 'mathL', pins: ['tag-A'], speaker: SPEAKERS.특수,
        doc: [sec('h3', '2. 특수교육대상학생')] } },
    { scene: 's3', label: '현행수준', set: { overlay: 'profile:level', doc: [tr('100 이하의 수를 세고'), tr('시범을 직접 보거나')] } },
    { scene: 's3', label: 'IEP 목표', set: { overlay: 'profile:iep', doc: [tr('절차 영상을 보고 뽑기 결과 10회'), tr('스크립트 카드를 보고 모둠 결과를')] } },
    { scene: 's3', label: '강점: 도움만 받는 친구가 아니다', set: { overlay: 'profile:strength', doc: [{ sel: 'li', text: '또래의 시선' }] } },

    // s4 관련 논문 분석 → 교수 방법
    { scene: 's4', label: '논문: 대상과 설계', set: { overlay: 'paper:info', pins: [], speaker: SPEAKERS.정보, doc: [sec('h3', '1. 분석 논문')] } },
    { scene: 's4', label: '결과: 기초선 0% → 영상을 줄여도 유지', set: { overlay: 'paper:result', doc: [{ sel: 'tr', first: '결과' }] } },
    { scene: 's4', label: '방법: 비디오 자기 모델링과 용암', set: { overlay: 'paper:how', doc: [{ sel: 'tr', first: '독립변인' }, { sel: 'tr', first: '용암' }] } },
    { scene: 's4', label: '우리 수업에 적용', set: { overlay: 'paper:apply', doc: [sec('h3', '3. 본시 적용')] } },

    // s5 수학 스테이션
    { scene: 's5', label: '20번 뽑기 기록표', set: { cam: 'math', overlay: 'tally', speaker: SPEAKERS.수학, doc: [tr('전개 ②')] },
      action: ['tally', 'run'], restore: ['tally', 'show'] },
    { scene: 's5', label: '학생 A: 진행자 + 절차 영상', set: { overlay: 'note:lead', cam: 'mathA', lens: 'lead',
        doc: [{ sel: 'li', text: '강점으로 기여하는 역할' }] } },
    { scene: 's5', label: '어휘 풀이 카드', set: { overlay: 'note:vocab', cam: 'wall', lens: 'vocab', doc: [sec('h3', '6. 핵심 어휘 풀이 카드')] } },
    { scene: 's5', label: 'Bruner 3층', set: { overlay: null, cam: 'layers', layers: 3, lens: null, doc: [tr('Bruner의 표상 양식')] } },
    { scene: 's5', label: '모두 · 대부분 · 일부 목표', set: { pins: ['goal-all', 'goal-most', 'goal-some'],
        doc: [sec('h3', '1. 다수준 목표')] } },

    // s6 정보 스테이션
    { scene: 's6', label: '정보 스테이션: A는 발표자, 절차 영상도 줄여 간다', set: { cam: 'lensA', layers: 0, students: 'rotated', lens: 'A', overlay: 'note:info', pins: [], speaker: SPEAKERS.정보,
        doc: [tr('전개 ③')] }, fx: { camDur: 2.2 } },
    { scene: 's6', label: '노트북 화면 속으로: 블록 조립', set: { cam: 'laptop', overlay: 'sim:build', lens: null,
        doc: [sec('h3', '5. 시뮬레이터 설계')] }, action: ['sim', 'build'], restore: ['sim', 'build'], fx: { camDur: 1.8, ovAt: -0.35 } },
    { scene: 's6', label: '실행: 10번', set: { overlay: 'sim:run', doc: [tr('전개 ③')] }, action: ['sim', 'to10'], restore: ['sim', 'to10'] },
    { scene: 's6', label: '100번', set: {}, action: ['sim', 'to100'], restore: ['sim', 'to100'] },
    { scene: 's6', label: '1,000번', set: {}, action: ['sim', 'to1000'], restore: ['sim', 'to1000'] },

    // s7 통합교육 장치
    { scene: 's7', label: '교실 전체 · 개별 지원은 A 한 명, T4는 수학 공동 교수', set: { overlay: null, cam: 'room', pins: ['t4'], speaker: SPEAKERS.특수,
        doc: [{ col: '개별 지원', strong: 'A' }] } },
    { scene: 's7', label: '모두를 위한 지원', set: { lens: 'all', pins: [], overlay: 'note:all',
        doc: [{ sel: 'p', text: '모두에게 주는 기본 설계' }] } },
    { scene: 's7', label: '다른 학생이 오면: 같은 책상에 하나만 더한다', set: { overlay: 'ext', cam: 'roomL',
        doc: [{ sel: 'p', text: '같은 설계 위에 지원을 더하면' }] } },

    // s8 3막 · 답
    { scene: 's8', label: '다시 밤: 처음 질문으로', set: { lens: null, overlay: 'crowd:intro', night: true, letterbox: true, panel: false, cam: 'machine',
        speaker: SPEAKERS.사회 }, fx: { camDur: 2.4, dayAt: 0.3, dayDur: 1.6, lbAt: 1.0, ovAt: 0.4 } },
    { scene: 's8', label: '1,000명 × 10번', set: { overlay: 'crowd:run' }, action: ['crowd', 'run'] },
    { scene: 's8', label: '결과: 약 68%가 손해', set: { overlay: 'crowd:verdict' } },
    { scene: 's8', label: '칠판: 지원은 모두에게 열려 있다', set: { overlay: null, night: false, letterbox: false, panel: true, cam: 'board', board: 'final',
        doc: [{ sel: 'li', text: '세 교과가 하나의 질문' }, { sel: 'li', text: '통합교육에 적합한 구조다' }] },
      fx: { camDur: 2.6, dayDur: 2.0, lbAt: 0.4, panelAt: 1.4 } },

    // s9 마무리
    { scene: 's9', label: '감사합니다', set: { cam: 'thanks', board: 'thanks', panel: false, speaker: '' }, fx: { camDur: 4.0, camEase: 'power2.inOut' } },
  ];

  // 장면별 목표 시간 (발표_시나리오.md 표와 같다, 초 단위로 장면이 끝나야 하는 시각)
  D.SCENE_END = { s1: 45, s2: 135, s3: 220, s4: 310, s5: 395, s6: 465, s7: 525, s8: 585, s9: 600 };
})();
