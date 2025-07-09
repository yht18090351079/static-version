#!/bin/bash

# 差旅费用填报系统启动脚本

echo "🚀 启动差旅费用填报系统..."

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

# 检查是否已安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖包..."
    npm install
fi

# 启动代理服务器
echo "🌐 启动代理服务器..."
echo "📊 飞书表格: https://wcn0pu8598xr.feishu.cn/base/WFZIbJp3qa5DV2s9MnbchUYPnze"
echo "🔗 访问地址: http://localhost:3001"
echo ""

npm start
