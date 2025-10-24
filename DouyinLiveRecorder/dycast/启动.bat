@echo off
chcp 65001 >nul
title 抖音弹幕姬
echo ====================================
echo    抖音弹幕姬 - 启动中...
echo ====================================
echo.

cd /d "%~dp0"

echo [1/2] 检查依赖...
if not exist "node_modules\" (
    echo 首次运行，正在安装依赖，请稍候...
    call npm install
    if errorlevel 1 (
        echo.
        echo [错误] 依赖安装失败！
        pause
        exit /b 1
    )
)

echo [2/2] 启动开发服务器...
echo.
echo 启动成功后，浏览器会自动打开
echo 如果没有自动打开，请手动访问显示的地址
echo.
echo 按 Ctrl+C 可以停止服务器
echo ====================================
echo.

start http://localhost:5173

call npm run dev

pause
