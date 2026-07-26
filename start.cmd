@echo off
rem Локальний запуск mathhub. Подвійний клік — і програма відкривається
rem як звичайний сайт, за адресою, а не як файл із диска.
rem Це важливо: тільки так працює автоматичний курс НБУ.
rem Щоб закрити — просто закрийте це вікно.

cd /d "%~dp0"
chcp 65001 >nul

where py >nul 2>nul
if %errorlevel%==0 (set PY=py) else (set PY=python)

echo mathhub запущено: http://localhost:8000/
echo Не закривайте це вікно, поки працюєте.
start "" http://localhost:8000/
%PY% -m http.server 8000 --bind 127.0.0.1
