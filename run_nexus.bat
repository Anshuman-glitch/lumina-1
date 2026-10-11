@echo off
title NEXUS AI - Launching...
echo =======================================================
echo          NEXUS AI - Study & Productivity OS
echo          Dark Mode with Neon Yellow & Green Accents
echo =======================================================
echo.
echo Opening NEXUS AI in your default web browser...
start "" "%~dp0index.html"
echo.
echo If you prefer a local HTTP server:
echo Starting Python HTTP server on port 8000 (Ctrl+C to stop)...
python -m http.server 8000
pause
