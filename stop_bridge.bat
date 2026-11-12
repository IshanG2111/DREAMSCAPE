@echo off
echo Stopping Song-Node bridge processes...
taskkill /F /IM pythonw.exe /FI "WINDOWTITLE eq Song-Node*" >nul 2>&1
wmic process where "commandline like '%%bridge.py%%'" call terminate >nul 2>&1
echo Done.
pause

