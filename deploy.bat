@echo off
REM Blood Bank Buddy - Windows Deployment Script

echo ========================================
echo Blood Bank Buddy - Deployment Script
echo ========================================
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 20+ first.
    exit /b 1
)
echo [OK] Node.js found: 
node --version

REM Check npm
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is not installed.
    exit /b 1
)
echo [OK] npm found:
npm --version

echo.
echo Select deployment method:
echo 1. Vercel + Railway (Recommended)
echo 2. Docker
echo 3. Netlify + Render
echo 4. Exit
echo.
set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" goto vercel_railway
if "%choice%"=="2" goto docker
if "%choice%"=="3" goto netlify_render
if "%choice%"=="4" exit /b 0

echo Invalid choice. Exiting...
exit /b 1

:vercel_railway
echo.
echo Deploying with Vercel + Railway
echo.

REM Check Vercel CLI
where vercel >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Installing Vercel CLI...
    npm install -g vercel
)

REM Check Railway CLI
where railway >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Installing Railway CLI...
    npm install -g @railway/cli
)

echo.
echo Step 1: Deploying Backend to Railway
cd server
echo.
echo Please set up environment variables in Railway dashboard first!
pause
railway login
railway init
railway up

echo [SUCCESS] Backend deployed!
echo.
set /p BACKEND_URL="Enter your Railway backend URL: "

cd ..
echo.
echo Step 2: Deploying Frontend to Vercel
echo VITE_API_URL=%BACKEND_URL% > .env.production

echo Don't forget to set VITE_AZURE_OPENAI_* variables in Vercel dashboard!
pause
vercel login
vercel --prod

echo.
echo [SUCCESS] Deployment complete!
echo.
echo Don't forget to:
echo 1. Update ALLOWED_ORIGINS in Railway
echo 2. Set environment variables in both platforms
echo 3. Test your deployment
pause
exit /b 0

:docker
echo.
echo Deploying with Docker
echo.

where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker is not installed. Please install Docker Desktop first.
    exit /b 1
)

where docker-compose >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] docker-compose is not installed.
    exit /b 1
)

echo.
echo Make sure you have configured:
echo   - .env.production
echo   - server\.env.production
echo.
set /p configured="Have you configured the .env files? (y/n): "

if /i "%configured%" NEQ "y" (
    echo.
    echo Please configure .env files first:
    echo   .env.production.example -^> .env.production
    echo   server\.env.production.example -^> server\.env.production
    exit /b 1
)

echo.
echo Building Docker images...
docker-compose build

echo Starting services...
docker-compose up -d

echo.
echo [SUCCESS] Services started!
docker-compose ps

echo.
echo Access your application:
echo   Frontend: http://localhost
echo   Backend: http://localhost:5000
echo   Health: http://localhost:5000/api/health
echo.
echo Commands:
echo   View logs: docker-compose logs -f
echo   Stop: docker-compose down
pause
exit /b 0

:netlify_render
echo.
echo Deploying with Netlify + Render
echo.

where netlify >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Installing Netlify CLI...
    npm install -g netlify-cli
)

echo.
echo Step 1: Deploy Backend to Render manually
echo.
echo Go to https://render.com and:
echo 1. Create new Web Service
echo 2. Connect GitHub repository
echo 3. Root directory: server
echo 4. Build: npm install
echo 5. Start: node server.js
echo 6. Add environment variables
echo.
set /p BACKEND_URL="Enter your Render backend URL: "

echo.
echo Step 2: Deploying Frontend to Netlify
echo VITE_API_URL=%BACKEND_URL% > .env.production

netlify login
netlify deploy --prod

echo.
echo [SUCCESS] Deployment initiated!
pause
exit /b 0
