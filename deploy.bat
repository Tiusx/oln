@echo off
cd J:\ai\blog\oln\apps\cms
echo ===== D1 Migration =====
wrangler d1 execute oln --remote --file=migrations/0000_init.sql
echo.
echo ===== Deploy CMS =====
wrangler deploy
echo.
echo ===== Deploy Web =====
cd ..\web
wrangler deploy