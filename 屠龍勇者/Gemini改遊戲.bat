@echo off
rem Double-click: start the local game server + open the game in the browser + start Gemini CLI in this folder.
rem Gemini reads GEMINI.md -> AGENTS.md + HANDOFF.md automatically. Rules: AGENTS.md section 4.
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"
for /d %%d in ("%LOCALAPPDATA%\GitHubDesktop\app-*") do set "PATH=%%d\resources\app\git\cmd;%PATH%"
start "dragon server 8790" /min powershell -NoProfile -ExecutionPolicy Bypass -File "..\tools\serve.ps1" -Root . -Port 8790
timeout /t 2 /nobreak >nul
start "" "http://localhost:8790/"
node "%APPDATA%\npm\node_modules\@google\gemini-cli\bundle\gemini.js" -m gemini-3.8-flash --approval-mode auto_edit
pause
