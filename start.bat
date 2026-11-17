@echo off
rem Double-click to start Thrive. Keep this window open while you use the app.
cd /d "%~dp0"
start "" http://localhost:5173
node server.mjs %*
