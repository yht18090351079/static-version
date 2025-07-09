# 差旅费用填报系统 - 静态版本

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)](https://nodejs.org/)
[![飞书集成](https://img.shields.io/badge/飞书-API集成-blue.svg)](https://open.feishu.cn/)

## 🎯 项目概述

这是一个现代化的差旅费用填报系统，采用纯静态前端 + 轻量级Node.js代理的架构，直接集成飞书API，实现无缝的数据读写体验。

## ✨ 功能特性

### 📝 费用填报
- **申请人管理**: 先选部门再选申请人的流程
- **日历选择**: 可视化多选日期功能
- **自动计算**: 差补和餐补金额自动计算
- **实时验证**: 完整的前端表单验证

### 👥 申请人管理
- **飞书集成**: 直接从飞书花名册读取人员信息
- **搜索筛选**: 支持按姓名和部门搜索筛选
- **统计分析**: 部门人员统计和占比分析
- **详情查看**: 申请人详细信息查看

### 🔗 飞书集成
- **花名册读取**: 自动从飞书花名册获取人员信息
- **数据写入**: 费用数据直接写入飞书表格
- **月份管理**: 自动按月份管理费用数据
- **错误处理**: 完善的错误处理和回退机制

## 🚀 部署方式

### 方式1: Netlify 部署（推荐）

1. **上传文件到 Git 仓库**
2. **连接 Netlify**
   - 在 Netlify 中连接你的 Git 仓库
   - 设置构建目录为 `static-version`
3. **配置完成**
   - 无需额外配置，直接部署即可

### 方式2: 任意静态托管

将 `static-version` 文件夹中的所有文件上传到任意静态托管服务：
- GitHub Pages
- Vercel
- 阿里云OSS
- 腾讯云COS
- 等等

## 📁 文件结构

```
static-version/
├── index.html              # 主页面 - 费用填报
├── applicants.html         # 申请人管理页面
├── css/
│   ├── style.css           # 基础样式
│   └── main.css            # 主页面专用样式
├── js/
│   ├── feishu-api.js       # 飞书API集成模块
│   ├── app.js              # 主应用逻辑
│   └── applicants.js       # 申请人管理逻辑
├── netlify.toml            # Netlify 配置
└── README.md               # 说明文档
```

## ⚙️ 配置说明

### 飞书配置

在 `js/feishu-api.js` 中配置飞书应用信息：

```javascript
this.config = {
    APP_ID: 'your_app_id',
    APP_SECRET: 'your_app_secret',
    SPREADSHEET_URL: 'your_spreadsheet_url',
    ROSTER_URL: 'your_roster_url'
};
```

### 当前配置

系统已预配置以下信息：
- **APP_ID**: `cli_a8d4bd05dbf8100b`
- **APP_SECRET**: `IRUdgTp1k825LXp1kz2W4gxcvaRAqtcv`
- **费用表格**: `https://wcn0pu8598xr.feishu.cn/base/WFZIbJp3qa5DV2s9MnbchUYPnze`
- **花名册**: `https://wcn0pu8598xr.feishu.cn/base/WFZIbJp3qa5DV2s9MnbchUYPnze?table=tblHkoHtRQLLe1T9&view=vewOKzidxw`

## 🔧 技术特点

### 纯前端实现
- 无需后端服务器
- 直接调用飞书API
- 完全静态部署

### CORS 处理
- 飞书API支持跨域调用
- 无需代理服务器
- 直接浏览器调用

### 错误处理
- 网络错误自动重试
- 飞书API错误处理
- 本地数据回退机制

### 用户体验
- 响应式设计
- 加载状态提示
- 实时数据验证
- 友好的错误提示

## 📱 浏览器兼容性

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 🔒 安全说明

- 飞书 App Secret 在前端代码中可见
- 建议仅在内部网络或受信任环境中使用
- 可考虑使用飞书的公开API或其他安全方案

## 🆚 与原版本对比

| 功能 | 原版本 (Node.js) | 静态版本 |
|------|------------------|----------|
| 部署复杂度 | 需要服务器 | 静态托管即可 |
| 维护成本 | 高 | 低 |
| 扩展性 | 高 | 中等 |
| 安全性 | 高 | 中等 |
| 性能 | 中等 | 高 |

## 📝 使用说明

1. **访问系统**: 打开 `index.html`
2. **选择申请人**: 先选部门，再选申请人
3. **选择日期**: 在日历中点击选择出差日期
4. **填写信息**: 选择差补类型，调整餐补天数
5. **提交申请**: 点击提交，数据自动写入飞书

## 🎉 完成状态

✅ **所有核心功能已实现**
- 费用填报功能完整
- 申请人管理功能完整
- 飞书集成功能完整
- 响应式设计完整
- 错误处理完整

这个静态版本完全复制了原版本的所有功能，可以直接部署使用！
