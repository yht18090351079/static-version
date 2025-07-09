@echo off
chcp 65001 >nul

echo 🔄 开始清除Git历史并重新初始化...

REM 删除现有的.git目录（如果存在）
if exist ".git" (
    echo 📁 删除现有Git历史...
    rmdir /s /q .git
)

REM 初始化新的Git仓库
echo 🆕 初始化新的Git仓库...
git init

REM 添加所有文件
echo 📝 添加文件到Git...
git add .

REM 创建初始提交
echo 💾 创建初始提交...
git commit -m "feat: 差旅费用填报系统 - 静态版本

✨ 功能特性:
- 纯静态HTML/CSS/JavaScript实现
- Node.js代理服务器解决CORS问题
- 直接集成飞书API读写数据
- 响应式设计，支持移动端
- 完整的表单验证和错误处理

🚀 部署方式:
- 本地运行: npm start
- 云端部署: 支持Vercel、Netlify等
- 访问地址: http://localhost:3002

📊 飞书集成:
- 自动从花名册读取人员信息
- 费用数据直接写入指定表格
- 支持月份表格自动识别
- 完善的字段映射和类型转换"

REM 设置主分支
echo 🌿 设置主分支...
git branch -M main

echo ✅ Git仓库重新初始化完成！
echo.
echo 📋 接下来的步骤:
echo 1. 添加远程仓库: git remote add origin ^<你的仓库URL^>
echo 2. 推送到GitHub: git push -u origin main --force
echo.
echo ⚠️  注意: 使用 --force 会覆盖远程仓库的所有历史记录

pause
