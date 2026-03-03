@echo off
title Pontaj Manager v2.1 (SQLite)
cd /d "%~dp0"

echo.
echo  ========================================
echo   PONTAJ MANAGER v2.1 - Pornire server...
echo   Backend: SQLite (pontaj.db)
echo  ========================================
echo.

:: Cauta Node.js portabil in folderul parinte (relativ la START.bat)
set NODE_EXE=%~dp0..\node-v25.7.0-win-x64\node.exe

:: Daca nu gaseste node portabil, incearca node instalat in sistem
if not exist "%NODE_EXE%" (
    set NODE_EXE=node
)

:: ── Migrare automata (prima rulare sau dupa update) ──────────
:: Daca baza de date SQLite nu exista inca, ruleaza migrarea din JSON
if not exist "%~dp0data\pontaj.db" (
    echo  Prima rulare detectata - migrare date JSON -> SQLite...
    "%NODE_EXE%" "%~dp0src\db\migrate.js"
    echo  Migrare finalizata!
    echo.
)

:: ── Activare mod SQLite ──────────────────────────────────────
set USE_SQLITE=true

:: Porneste serverul Node.js cu SQLite activ (minimizat in taskbar)
start "Pontaj Manager - Server" /min cmd /c "set USE_SQLITE=true && "%NODE_EXE%" "%~dp0src\server.js""

:: Asteapta 2 secunde sa porneasca serverul
timeout /t 2 /nobreak > nul

:: Detecteaza IP-ul local pentru a afisa linkul corect
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set LOCAL_IP=%%a
    goto :found_ip
)
:found_ip
set LOCAL_IP=%LOCAL_IP: =%

echo  Server pornit cu succes! (SQLite activ)
echo.
echo  Acces LOCAL (doar tu):   http://localhost:3000
echo  Acces RETEA (colegii):   http://%LOCAL_IP%:3000
echo.
echo  Trimite linkul de retea colegilor tai!
echo  ========================================
echo.

:: Deschide browserul la localhost
start "" "http://localhost:3000"

pause
