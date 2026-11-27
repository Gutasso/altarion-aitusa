@echo off
chcp 65001 >nul
echo ============================================================
echo   Atualizador Git - Modulo Altarion ^& Aitusa (Foundry VTT)
echo ============================================================
echo.

cd /d "%~dp0\.."
echo Pasta do modulo: %CD%
echo.

where git >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Git nao encontrado no PATH do Windows.
    echo Instale o Git ou atualize o modulo pela tela de Setup do Foundry VTT.
    echo.
    pause
    exit /b 1
)

echo [1/2] Salvando alteracoes locais temporarias (ex.: arquivos de banco packs/subclasses)...
git pull --rebase --autostash origin main

if errorlevel 1 (
    echo.
    echo [ERRO] Nao foi possivel concluir o git pull automaticamente.
    echo Verifique sua conexao com a internet ou conflitos locais.
    echo.
    pause
    exit /b 1
)

echo.
echo [2/2] Modulo atualizado com sucesso!
echo Agora clique em "Recarregar Foundry (Ctrl+F5)" na janela do Foundry (ou pressione Ctrl+F5).
echo.
pause
