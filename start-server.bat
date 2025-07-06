@echo off
echo.
echo ================================
echo   SocialConnect Platform
echo ================================
echo.
echo Starting the server...
echo.
cd /d "%~dp0"
node server.js
echo.
echo Server stopped.
pause