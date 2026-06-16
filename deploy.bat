@echo off
chcp 65001 >nul
title Deploy Website to Firebase
color 0A

set "PATH=%PATH%;%APPDATA%\npm;%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs"

echo.
echo  === Step 1: Login with Google ===
echo  Browser will open - choose your account
echo.
node "%APPDATA%\npm\node_modules\firebase-tools\bin\firebase.js" login
echo.

echo  === Step 2: Uploading website ===
echo.
node "%APPDATA%\npm\node_modules\firebase-tools\bin\firebase.js" deploy --only hosting --project aoshaban-59f07
echo.
echo  === Done! Copy the link above ===
pause
