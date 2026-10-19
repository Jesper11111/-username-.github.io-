@echo off
rem Double-click: start the local game server + open the game in the browser + start OpenAI Codex CLI in this folder.
rem Codex reads AGENTS.md automatically. Rules: AGENTS.md section 4. First run: sign in with your ChatGPT account.
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%APPDATA%\npm;%PATH%"
for /d %%d in ("%LOCALAPPDATA%\GitHubDesktop\app-*") do set "PATH=%%d\resources\app\git\cmd;%PATH%"
start "dragon server 8790" /min powershell -NoProfile -ExecutionPolicy Bypass -File "..\tools\serve.ps1" -Root . -Port 8790
timeout /t 2 /nobreak >nul
start "" "http://localhost:8790/"
call codex
pause
