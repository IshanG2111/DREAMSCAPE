@echo off
title Song-Node Apple Music Bridge
cd /d "%~dp0"
echo =======================================================
echo    Song-Node: Apple Music Windows SMTC Lyrics Bridge
echo =======================================================
echo Checking Python environment...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3.10+ from python.org and check "Add to PATH".
    pause
    exit /b 1
)

echo Checking dependencies...
python -c "import winsdk" >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] winsdk not detected. Installing recommended dependencies...
    pip install winsdk websockets requests
)

echo Starting bridge on ws://127.0.0.1:8765...
python bridge.py
pause

