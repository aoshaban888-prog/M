@echo off
title Deploy Website to Firebase
color 0A
echo.
echo  ========================================
echo   رفع الموقع على الإنترنت
echo  ========================================
echo.

set PATH=%PATH%;%APPDATA%\npm;%ProgramFiles%\nodejs

echo  الخطوة 1: تسجيل الدخول بحساب Google...
echo  سيفتح المتصفح - اختر حسابك ثم عد هنا
echo.
firebase login
echo.

echo  الخطوة 2: جارٍ رفع الموقع...
echo.
cd /d "c:\vccode\m"
firebase deploy --only hosting
echo.
echo  ========================================
echo   تم! انسخ الرابط اعلاه وشاركه
echo  ========================================
pause
