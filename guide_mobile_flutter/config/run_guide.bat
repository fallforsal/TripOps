
@echo off
setlocal

cd /d "%~dp0"

if "%~1"=="" (
    echo Vui long nhap Device ID.
    echo.
    flutter devices
    exit /b 1
)

set "DEVICE=%~1"

echo Connecting device: %DEVICE%

adb -s "%DEVICE%" reverse tcp:5080 tcp:5080

if errorlevel 1 (
    echo Khong the ket noi ADB.
    exit /b 1
)

flutter run -d "%DEVICE%" --dart-define-from-file=config/dev.local.json
