@echo off
chcp 65001 >nul

echo 🚀 启动差旅费用填报系统...

REM 检查Node.js是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js 未安装，请先安装 Node.js
    pause
    exit /b 1
)

REM 检查是否已安装依赖
if not exist "node_modules" (
    echo 📦 安装依赖包...
    npm install
)

REM 启动代理服务器
echo 🌐 启动代理服务器...
echo 📊 飞书表格: https://wcn0pu8598xr.feishu.cn/base/WFZIbJp3qa5DV2s9MnbchUYPnze
echo 🔗 访问地址: http://localhost:3001
echo.

npm start
