#!/bin/bash
# Mac: 더블클릭하면 스냅숏을 새로 굽고, 로컬 서버를 띄워 발표 화면을 연다. 이 창을 닫으면 서버도 꺼진다.
cd "$(dirname "$0")"
python3 sync.py
cd ..
PORT=8765
python3 -m http.server "$PORT" >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT
sleep 1
URL="http://localhost:$PORT/$(python3 -c 'import urllib.parse;print(urllib.parse.quote("발표"))')/index.html"
open "$URL"
echo "발표 서버 실행 중: $URL"
echo "끝내려면 이 창을 닫으세요."
wait $SERVER
