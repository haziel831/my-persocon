@echo off
rem Abre o Desktop Pet direto do codigo-fonte (npm start), sem gerar o .exe.
cd /d "%~dp0"
call npm start
pause
