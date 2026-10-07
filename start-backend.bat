@echo off
echo Starting Network Design ^& Fault Recovery Backend...
cd /d "%~dp0backend"
python -m uvicorn main:app --reload --port 8000
