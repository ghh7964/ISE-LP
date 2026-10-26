@echo off
chcp 65001 >nul
rem Windows: 파이썬이 있으면 로컬 서버를 먼저 띄운 뒤 브라우저를 열고, 없으면 index.html 을 바로 연다.
rem (where python 은 Microsoft Store 바로가기도 찾아내므로, 실제로 실행되는지 python --version 으로 확인한다)
cd /d "%~dp0"
python --version >nul 2>nul
if errorlevel 1 (
  start "" "%~dp0index.html"
  exit /b
)
python sync.py
cd ..
start "발표 서버" /min python -m http.server 8765
timeout /t 2 /nobreak >nul
start "" "http://localhost:8765/%%EB%%B0%%9C%%ED%%91%%9C/index.html"
echo 발표 서버가 최소화된 창에서 실행 중입니다. 발표가 끝나면 그 창을 닫으세요.
pause
