@echo off
rem La Regie du MJ - Copyright (C) 2026 Sebastien Guizard - GPL-3.0-or-later
rem Sert "La Regie du MJ" sur http://localhost:8000 (cache navigateur desactive).
setlocal
cd /d "%~dp0"
set "PORT=%~1"
if "%PORT%"=="" set "PORT=8000"

where py >nul 2>nul
if %errorlevel%==0 (
  py serve.py %PORT%
  goto :eof
)

where python >nul 2>nul
if %errorlevel%==0 (
  python serve.py %PORT%
  goto :eof
)

where npx >nul 2>nul
if %errorlevel%==0 (
  echo La Regie du MJ  -^>  http://localhost:%PORT%
  npx --yes serve -l %PORT% --no-clipboard -c 0 .
  goto :eof
)

echo.
echo Python 3 (ou Node/npx) est requis pour lancer le serveur.
echo Installe Python depuis https://www.python.org/downloads/
echo (coche "Add python.exe to PATH" pendant l'installation).
echo.
pause
