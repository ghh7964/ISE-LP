#!/usr/bin/env python3
"""지도안과 대본 마크다운을 발표 자료용 JS 스냅숏으로 굽는다.

index.html 을 파일로 더블클릭(file://)해서 열면 브라우저가 마크다운을 직접 읽지 못한다.
그래서 마크다운을 고친 뒤에는 이 스크립트를 한 번 실행한다:  python3 sync.py
(로컬 서버로 열 때는 최신 마크다운을 직접 읽으므로 실행하지 않아도 된다)
"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
SOURCES = {
    'jidoan.snapshot.js': ('JIDOAN_MD', HERE.parent / '수업지도안_중학교_세안.md'),
    'script.snapshot.js': ('SCRIPT_MD', HERE.parent / '발표_시나리오.md'),
}

def main():
    out_dir = HERE / 'content'
    out_dir.mkdir(exist_ok=True)
    for name, (var, src) in SOURCES.items():
        text = src.read_text(encoding='utf-8')
        body = json.dumps(text, ensure_ascii=False).replace('</', '<\\/')
        (out_dir / name).write_text(
            f'// {src.name} 의 스냅숏. sync.py 가 만든 파일이니 직접 고치지 마세요.\n'
            f'window.{var} = {body};\n', encoding='utf-8')
        print(f'{src.name} → content/{name} ({len(text):,}자)')

if __name__ == '__main__':
    main()
