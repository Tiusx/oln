@echo off
setlocal

echo ======================================
echo   oln Local Development
echo ======================================

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo.
echo [1/4] Initializing local D1 database...
cd /d "%ROOT%\apps\server"
npx wrangler d1 migrations apply oln --local

echo.
echo [2/4] Starting server...
start "server [8787]" /D "%ROOT%\apps\server" cmd /k "npm run dev"

echo [3/4] Starting admin...
start "admin [5173]" /D "%ROOT%\apps\admin" cmd /k "npm run dev"

echo [4/4] Starting web...
start "web [4321]" /D "%ROOT%\apps\web" cmd /k "npm run dev"

echo.
echo ======================================
echo   server  http://localhost:8787
echo   admin   http://localhost:5173/admin/
echo   web     http://localhost:4321
echo ======================================
pause
