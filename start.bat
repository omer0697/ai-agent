@echo off
echo ==============================
echo   AI Agent - Docker ile Baslatiliyor
echo ==============================

docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo HATA: Docker calismıyor. Docker Desktop'u baslatın.
    pause
    exit /b 1
)

echo [1/2] Docker image'lar build ediliyor (ilk seferde uzun surebilir)...
docker compose build

echo.
echo [2/2] Servisler baslatiliyor...
docker compose up -d

echo.
echo ==============================
echo  Uygulama hazir!
echo  http://localhost:3000  adresini acin
echo ==============================
echo.
echo Logları görmek icin: docker compose logs -f
echo Durdurmak icin:      docker compose down
echo.
pause
