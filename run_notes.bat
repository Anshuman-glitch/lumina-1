@echo off
title Lumina Spatial Notes
echo ======================================================================
echo                  LUMINA • SPATIAL NOTES & CALENDAR
echo         Yellow & White Spatial UI • Calendar • Media • Focus Mode
echo ======================================================================
echo.
echo Opening Lumina in your default web browser...
start "" "%~dp0index.html"
echo.
echo If you prefer testing with a local HTTP web server:
echo Starting Python local server on port 8080 (Press Ctrl+C to stop)...
python -m http.server 8080
pause
