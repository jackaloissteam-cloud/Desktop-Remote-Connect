@echo off
setlocal EnableExtensions
title RemoteLink - Lokaler Start

REM Immer aus dem Ordner des Skripts starten, auch bei einem Doppelklick.
cd /d "%~dp0"

echo ========================================
echo   RemoteLink - Lokaler Start
echo ========================================
echo.

REM Node.js pruefen.
where node >nul 2>&1
if errorlevel 1 (
  echo FEHLER: Node.js ist nicht installiert.
  echo Bitte die LTS-Version von https://nodejs.org installieren.
  echo Danach dieses Skript erneut starten.
  echo.
  pause
  exit /b 1
)

for /f "tokens=*" %%v in ('node --version') do echo Node.js: %%v

REM pnpm pruefen und wenn moeglich ueber Corepack aktivieren.
where pnpm >nul 2>&1
if errorlevel 1 (
  echo pnpm wurde nicht gefunden. Versuche die Aktivierung ueber Corepack...
  where corepack >nul 2>&1
  if not errorlevel 1 call corepack enable >nul 2>&1
)

where pnpm >nul 2>&1
if errorlevel 1 (
  echo pnpm wurde nicht gefunden. Versuche die Installation ueber npm...
  call npm install --global pnpm
)

where pnpm >nul 2>&1
if errorlevel 1 (
  echo FEHLER: pnpm konnte nicht installiert werden.
  echo Bitte PowerShell als Administrator oeffnen und ausfuehren:
  echo npm install --global pnpm
  echo.
  pause
  exit /b 1
)

for /f "tokens=*" %%v in ('pnpm --version') do echo pnpm: %%v

REM Nach einem frischen Git-Download einmalig alle Pakete installieren.
if not exist "node_modules\.pnpm" (
  echo.
  echo Abhaengigkeiten werden installiert. Das kann einige Minuten dauern...
  call pnpm install --frozen-lockfile
  if errorlevel 1 (
    echo.
    echo FEHLER: Die Abhaengigkeiten konnten nicht installiert werden.
    echo Pruefe deine Internetverbindung und starte das Skript erneut.
    echo.
    pause
    exit /b 1
  )
)

echo.
echo Starte API-Server auf Port 8080...
start "RemoteLink API" cmd /k "cd /d ""%~dp0"" && set PORT=8080&& set NODE_ENV=development&& pnpm --filter @workspace/api-server run dev"

echo Warte kurz auf den API-Server...
timeout /t 3 /nobreak >nul

echo Starte Frontend auf Port 18282...
start "RemoteLink Frontend" cmd /k "cd /d ""%~dp0"" && set PORT=18282&& set BASE_PATH=/&& pnpm --filter @workspace/remote-desktop run dev"

echo Warte kurz auf das Frontend...
timeout /t 3 /nobreak >nul

REM Erste passende lokale IPv4-Adresse fuer das iPhone anzeigen.
set "IP="
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "169.254"') do (
  if not defined IP set "IP=%%a"
)
set "IP=%IP: =%"

echo.
echo ========================================
echo   RemoteLink wurde gestartet
echo ========================================
echo.
echo PC:     http://localhost:18282
if defined IP (
  echo iPhone: http://%IP%:18282
) else (
  echo iPhone: IP-Adresse konnte nicht automatisch ermittelt werden.
  echo        Nutze die IPv4-Adresse dieses PCs mit Port 18282.
)
echo.
echo Die API- und Frontend-Fenster muessen offen bleiben.
echo Wenn Windows nach der Firewall fragt, erlaube den Zugriff fuer private Netzwerke.
echo.
start "" "http://localhost:18282"
pause
