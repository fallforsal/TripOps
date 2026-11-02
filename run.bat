@echo off
setlocal
cd /d "%~dp0"

if /i "%~1"=="backend" goto backend
if /i "%~1"=="frontend" goto frontend

where dotnet >nul 2>&1
if errorlevel 1 (
    echo [ERROR] .NET SDK was not found. Install it and reopen this script.
    goto failed
)
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js was not found. Install it and reopen this script.
    goto failed
)
where npm.cmd >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm.cmd was not found. Check your Node.js installation.
    goto failed
)

start "TripOps Backend" /D "%~dp0" "%ComSpec%" /d /k ""%~f0" backend"
start "TripOps Frontend" /D "%~dp0" "%ComSpec%" /d /k ""%~f0" frontend"

echo Backend:  http://localhost:5080
echo Swagger:  http://localhost:5080/swagger
echo Frontend: http://localhost:5174
echo Startup logs appear in the two new windows.
echo To stop, press Ctrl+C in each window.
exit /b 0

:backend
echo Starting TripOps Backend...
dotnet run --project "backend\src\TripOps.Api\TripOps.Api.csproj" -p:UseAppHost=false --launch-profile http
if errorlevel 1 goto failed
exit /b 0

:frontend
cd /d "%~dp0frontend"
if not exist "node_modules\" (
    echo Installing frontend dependencies...
    call npm.cmd ci
    if errorlevel 1 goto failed
)
echo Starting TripOps Frontend...
call npm.cmd run dev
if errorlevel 1 goto failed
exit /b 0

:failed
echo [ERROR] Could not complete startup. Review the messages above.
pause
exit /b 1
