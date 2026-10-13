@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo   VetApp — сборка RELEASE APK
echo ========================================
echo.

echo [1/3] npx cap copy...
call npx cap copy
if errorlevel 1 goto error

echo.
echo [2/3] Сборка release APK (подпись автоматическая)...
cd android
call gradlew.bat assembleRelease
if errorlevel 1 goto error
cd ..

echo.
echo [3/3] Готово!
echo.
echo APK: %~dp0android\app\build\outputs\apk\release\
echo.
explorer "%~dp0android\app\build\outputs\apk\release"
pause
exit /b 0

:error
echo.
echo ОШИБКА при сборке! Смотри выше.
pause
exit /b 1