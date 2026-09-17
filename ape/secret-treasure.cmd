@echo off
REM Windows launcher for Secret Treasure APE (Cosmopolitan / redbean).
REM Prefers http://127.0.0.1:19996/ if already up; otherwise starts the APE
REM (.exe preferred, else .com - same polyglot bytes) which opens the browser.
setlocal EnableExtensions
set "PORT=19996"
set "URL=http://127.0.0.1:%PORT%/"
set "HERE=%~dp0"

call :port_bound
if not errorlevel 1 (
  echo Secret Treasure already at %URL% - opening browser
  start "" "%URL%"
  exit /b 0
)

set "APE="
if exist "%HERE%secret-treasure.exe" set "APE=%HERE%secret-treasure.exe"
if not defined APE if exist "%HERE%secret-treasure.com" set "APE=%HERE%secret-treasure.com"
if not defined APE (
  echo missing %HERE%secret-treasure.exe / secret-treasure.com >&2
  echo Ship both extensions ^(same bytes^) or rename .com to .exe. >&2
  exit /b 1
)

echo Starting %APE%
echo Secret Treasure at %URL%  ^(Ctrl+C to stop^)
"%APE%" %*
exit /b %ERRORLEVEL%

:port_bound
REM Return 0 if something accepts TCP on 127.0.0.1:PORT, else 1.
where curl.exe >NUL 2>&1
if not errorlevel 1 (
  curl.exe -sf --connect-timeout 1 -o NUL "%URL%" >NUL 2>&1
  if not errorlevel 1 exit /b 0
  exit /b 1
)
powershell -NoProfile -Command "try { $c = New-Object Net.Sockets.TcpClient; $iar = $c.BeginConnect('127.0.0.1', %PORT%, $null, $null); if (-not $iar.AsyncWaitHandle.WaitOne(400, $false)) { $c.Close(); exit 1 }; $c.EndConnect($iar); $c.Close(); exit 0 } catch { exit 1 }" >NUL 2>&1
exit /b %ERRORLEVEL%
