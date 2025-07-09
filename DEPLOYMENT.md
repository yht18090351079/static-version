# 部署说明 - 差旅费用填报系统

## 🎯 **系统架构**

```
前端 (静态文件) ←→ Node.js代理服务器 ←→ 飞书API
```

- **前端**: 纯静态HTML/CSS/JavaScript
- **后端**: 轻量级Node.js代理服务器
- **数据**: 直接写入你的飞书表格

## 🚀 **快速启动**

### 1. 安装Node.js
确保已安装Node.js (版本 >= 14)
```bash
node --version
npm --version
```

### 2. 启动系统

**Linux/Mac:**
```bash
chmod +x start.sh
./start.sh
```

**Windows:**
```cmd
start.bat
```

**手动启动:**
```bash
npm install
npm start
```

### 3. 访问系统
打开浏览器访问：http://localhost:3001

## 📊 **飞书表格配置**

### 当前配置
- **表格地址**: https://wcn0pu8598xr.feishu.cn/base/WFZIbJp3qa5DV2s9MnbchUYPnze
- **花名册**: 自动从同一表格的花名册表读取
- **数据写入**: 自动写入到表格中

### 表格字段映射
系统会自动映射以下字段：
- `申请人` ← 选择的申请人姓名
- `申请部门` ← 选择的部门
- `出差日期` ← 选择的日期列表
- `差补类型` ← 实施(90元) 或 商务(60元)
- `应享受差补天数` ← 选择的天数
- `差补金额` ← 自动计算
- `应享受餐补天数` ← 可调整的天数
- `餐补金额` ← 自动计算 (30元/天)
- `合计` ← 总金额

## 🔧 **配置修改**

如需修改飞书配置，编辑 `proxy-server.js` 文件：

```javascript
const FEISHU_CONFIG = {
    APP_ID: 'your_app_id',
    APP_SECRET: 'your_app_secret',
    SPREADSHEET_URL: 'your_spreadsheet_url',
    ROSTER_URL: 'your_roster_url'
};
```

## 🌐 **生产环境部署**

### 方式1: 云服务器部署

1. **上传文件到服务器**
2. **安装依赖**
   ```bash
   npm install --production
   ```
3. **使用PM2管理进程**
   ```bash
   npm install -g pm2
   pm2 start proxy-server.js --name "expense-system"
   pm2 startup
   pm2 save
   ```
4. **配置Nginx反向代理**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3001;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

### 方式2: Vercel部署

1. **创建vercel.json**
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "proxy-server.js",
         "use": "@vercel/node"
       },
       {
         "src": "**",
         "use": "@vercel/static"
       }
     ],
     "routes": [
       {
         "src": "/api/(.*)",
         "dest": "/proxy-server.js"
       },
       {
         "src": "/(.*)",
         "dest": "/$1"
       }
     ]
   }
   ```

2. **部署到Vercel**
   ```bash
   npm install -g vercel
   vercel
   ```

### 方式3: Heroku部署

1. **创建Procfile**
   ```
   web: node proxy-server.js
   ```

2. **部署到Heroku**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   heroku create your-app-name
   git push heroku main
   ```

## 🔒 **安全配置**

### 环境变量
建议使用环境变量存储敏感信息：

```bash
export FEISHU_APP_ID="your_app_id"
export FEISHU_APP_SECRET="your_app_secret"
export PORT=3001
```

### HTTPS配置
生产环境建议启用HTTPS：

```javascript
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('private-key.pem'),
  cert: fs.readFileSync('certificate.pem')
};

https.createServer(options, app).listen(443);
```

## 📱 **功能特性**

### ✅ 已实现功能
- 从飞书花名册读取人员信息
- 可视化日历选择出差日期
- 自动计算差补和餐补金额
- 数据直接写入指定飞书表格
- 响应式设计，支持移动端
- 完整的错误处理和用户提示

### 🔄 自动回退机制
- 飞书API失败时自动使用本地数据
- 网络错误时显示友好提示
- 保证系统始终可用

## 🛠️ **故障排除**

### 常见问题

1. **端口被占用**
   ```bash
   # 查找占用端口的进程
   lsof -i :3001
   # 杀死进程
   kill -9 <PID>
   ```

2. **飞书API权限错误**
   - 检查APP_ID和APP_SECRET是否正确
   - 确认应用有多维表格读写权限
   - 检查表格是否对应用开放

3. **CORS错误**
   - 确保代理服务器正常运行
   - 检查前端是否正确连接到代理服务器

### 日志查看
```bash
# 查看实时日志
npm start

# 使用PM2查看日志
pm2 logs expense-system
```

## 📊 **监控和维护**

### 健康检查
访问 `/api/health` 端点检查系统状态：
```bash
curl http://localhost:3001/api/health
```

### 性能监控
- 使用PM2监控进程状态
- 配置日志轮转避免日志文件过大
- 定期检查飞书API调用次数

现在你的系统已经完全配置好了！🎉
