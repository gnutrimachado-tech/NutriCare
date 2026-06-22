@echo off
chcp 65001 >nul
echo ============================================
echo   Instalador do Sistema de Agendamento
echo   NutriCare
echo ============================================
echo.

REM Caminhos
set NUTRICARE=C:\Users\Guilherme\Desktop\NutriCare
set ORIGEM=C:\Users\Guilherme\Downloads

REM Tenta encontrar a pasta extraída
set PASTA_AGENDA=
if exist "%ORIGEM%\agenda_nutricare\prisma\schema.prisma" (
    set PASTA_AGENDA=%ORIGEM%\agenda_nutricare
    goto :encontrou
)
if exist "%ORIGEM%\prisma\schema.prisma" (
    set PASTA_AGENDA=%ORIGEM%
    goto :encontrou
)
if exist "%ORIGEM%\app\api\agendamentos\route.ts" (
    set PASTA_AGENDA=%ORIGEM%
    goto :encontrou
)

echo ERRO: Nao encontrei os arquivos extraidos em Downloads.
echo.
echo Verifique se voce extraiu o arquivo agenda_nutricare.tar.gz
echo e se a pasta resultante esta em:
echo    %ORIGEM%
echo.
pause
exit /b 1

:encontrou
echo Arquivos encontrados em: %PASTA_AGENDA%
echo Destino: %NUTRICARE%
echo.

REM Criar pastas
echo Criando pastas...
if not exist "%NUTRICARE%\app\api\agendamentos" mkdir "%NUTRICARE%\app\api\agendamentos"
if not exist "%NUTRICARE%\app\api\agendamentos\[id]" mkdir "%NUTRICARE%\app\api\agendamentos\[id]"
if not exist "%NUTRICARE%\app\api\agendamentos\confirmar" mkdir "%NUTRICARE%\app\api\agendamentos\confirmar"
if not exist "%NUTRICARE%\app\api\agendamentos\enviar" mkdir "%NUTRICARE%\app\api\agendamentos\enviar"

REM Copiar arquivos
echo Copiando arquivos...
copy /y "%PASTA_AGENDA%\prisma\schema.prisma" "%NUTRICARE%\prisma\schema.prisma"
copy /y "%PASTA_AGENDA%\app\pacientes\agenda\page.tsx" "%NUTRICARE%\app\pacientes\agenda\page.tsx"
copy /y "%PASTA_AGENDA%\app\pacientes\agenda\AgendaClient.tsx" "%NUTRICARE%\app\pacientes\agenda\AgendaClient.tsx"
copy /y "%PASTA_AGENDA%\app\api\agendamentos\route.ts" "%NUTRICARE%\app\api\agendamentos\route.ts"
copy /y "%PASTA_AGENDA%\app\api\agendamentos\[id]\route.ts" "%NUTRICARE%\app\api\agendamentos\[id]\route.ts"
copy /y "%PASTA_AGENDA%\app\api\agendamentos\confirmar\route.ts" "%NUTRICARE%\app\api\agendamentos\confirmar\route.ts"
copy /y "%PASTA_AGENDA%\app\api\agendamentos\enviar\route.ts" "%NUTRICARE%\app\api\agendamentos\enviar\route.ts"

echo.
echo ============================================
echo   CONCLUIDO! Arquivos copiados com sucesso.
echo ============================================
echo.
echo Agora abra o Prompt de Comando na pasta NutriCare e rode:
echo.
echo   git add .
echo   git commit -m "Sistema de agendamento"
echo   git push origin main
echo.
echo Lembre-se tambem de rodar o SQL no banco:
echo   ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS confirmation_token VARCHAR(120) UNIQUE;
echo   ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS email_enviado BOOLEAN DEFAULT FALSE;
echo.
pause
