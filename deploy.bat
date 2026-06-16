@echo off
chcp 65001 >nul
title Deploy Website to Firebase
color 0A

set "FIREBASE_JS=%APPDATA%\npm\node_modules\firebase-tools\lib\bin\firebase.js"
set "PATH=%PATH%;%ProgramFiles%\nodejs"

echo.
echo  === Step 1: Login with Google ===
echo  Browser will open - choose your Google account then come back here
echo.
node "%FIREBASE_JS%" login
echo.

echo  === Step 2: Uploading website ===
echo.
cd /d "c:\vccode\m"
node "%FIREBASE_JS%" deploy --only hosting
echo.
echo  === Done! Copy the Hosting URL above ===
echo.
pause
