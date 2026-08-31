@echo off
cd /d %~dp0apps\server
echo ===== D1 Migration =====
wrangler d1 execute oln --remote --file=migrations/0000_init.sql
echo.
echo ===== Deploy Server (Hono Worker) =====
wrangler deploy
echo.
echo ===== Web =====
echo Web is auto-deployed via Cloudflare Pages Git integration (push to master).
echo See docs/deploy-web.md
pause
