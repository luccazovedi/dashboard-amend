@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Instalando dependencias pela primeira vez...
  call npm install
)
echo Abrindo o Painel de Cobertura em http://localhost:5180
call npm run dev -- --open
