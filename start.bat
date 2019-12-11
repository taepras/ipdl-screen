start cmd /k nodemon app.js
sleep 15
@echo off
echo Countdown to application launch...
timeout /t 10
"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --chrome --kiosk http://localhost:3000 --disable-pinch --no-user-gesture-required
exit