@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"
title AI 学习教练

echo.
echo   AI 学习教练
echo   ==============
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [错误] 未检测到 Node.js。
  echo 请先安装 Node.js 22.16 或更高版本：https://nodejs.org/
  echo.
  pause
  exit /b 1
)

if not exist ".env.local" (
  if exist ".env.local.example" (
    copy /y ".env.local.example" ".env.local" >nul
    echo [提示] 已创建 .env.local（可选配置）。API Key 在启动后的「设置」页填写即可。
    echo.
  )
)

if not exist "node_modules" (
  echo 首次运行，正在安装依赖，请稍候...
  call npm install
  if errorlevel 1 (
    echo.
    echo [错误] 依赖安装失败，请检查网络后重试。
    pause
    exit /b 1
  )
)

rem 如果本项目的服务已经在运行，直接打开浏览器，不再启动第二个进程。
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/health' -TimeoutSec 2; if ($null -ne $r.schemaVersion) { exit 0 } } catch {}; exit 1"
if not errorlevel 1 (
  echo 服务已经在运行，正在打开浏览器...
  start "" "http://127.0.0.1:3000"
  exit /b 0
)

echo 正在启动服务...
echo 浏览器会自动打开；关闭本窗口或按 Ctrl+C 可停止服务。
echo.

start "" /b powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "for ($i = 0; $i -lt 120; $i++) { foreach ($port in 3000,3001,3002) { try { $r = Invoke-RestMethod -Uri ('http://127.0.0.1:' + $port + '/api/health') -TimeoutSec 1; if ($null -ne $r.schemaVersion) { Start-Process ('http://127.0.0.1:' + $port); exit } } catch {} }; Start-Sleep -Seconds 1 }"

call npm run dev -- -H 127.0.0.1

echo.
echo 服务已停止。
pause
