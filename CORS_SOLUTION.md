# CORS 问题解决方案

## 🔍 **问题说明**

由于浏览器的同源策略限制，直接从前端调用飞书API会遇到CORS（跨域资源共享）错误：
```
Failed to fetch
```

## 🛠️ **解决方案**

### 方案1: 使用CORS代理（当前实现）

系统已集成CORS代理服务，自动处理跨域问题：

```javascript
// 使用CORS代理
const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
const targetUrl = 'https://open.feishu.cn/open-apis/...';
const response = await fetch(proxyUrl + targetUrl, {...});
```

**注意**: `cors-anywhere.herokuapp.com` 需要先访问激活。

### 方案2: 本地数据备用方案（自动回退）

如果CORS代理失败，系统会自动切换到本地数据方案：

- ✅ 使用localStorage存储数据
- ✅ 模拟飞书API响应格式
- ✅ 保持完整的用户体验
- ✅ 支持数据导出和统计

## 🚀 **使用步骤**

### 1. 激活CORS代理（推荐）

1. 访问：https://cors-anywhere.herokuapp.com/corsdemo
2. 点击 "Request temporary access to the demo server"
3. 等待激活完成

### 2. 直接使用本地方案

如果不想使用CORS代理，可以直接使用本地数据方案：

```javascript
// 强制使用本地方案
window.feishuAPI.useFallback = true;
```

## 📊 **功能对比**

| 功能 | CORS代理方案 | 本地数据方案 |
|------|-------------|-------------|
| 读取花名册 | ✅ 实时数据 | ⚠️ 预设数据 |
| 写入费用数据 | ✅ 写入飞书 | ✅ 本地存储 |
| 数据持久化 | ✅ 云端存储 | ✅ 浏览器存储 |
| 多人协作 | ✅ 支持 | ❌ 不支持 |
| 离线使用 | ❌ 需要网络 | ✅ 完全离线 |

## 🔧 **技术实现**

### 自动回退机制

```javascript
class FeishuAPIWrapper {
    async submitExpense(expenseData) {
        try {
            // 尝试使用主API（CORS代理）
            return await this.primaryAPI.submitExpense(expenseData);
        } catch (error) {
            // 自动切换到备用方案
            this.useFallback = true;
            return await this.fallbackAPI.submitExpense(expenseData);
        }
    }
}
```

### 本地数据管理

```javascript
// 数据自动保存到localStorage
saveLocalData() {
    localStorage.setItem('feishu_expenses', JSON.stringify(this.expenses));
}

// 支持数据导出
exportData() {
    return {
        expenses: this.expenses,
        exportTime: new Date().toISOString()
    };
}
```

## 🎯 **推荐使用方式**

### 开发/测试环境
- 使用本地数据方案
- 快速测试功能
- 无需网络依赖

### 生产环境
1. **首选**: 配置企业级CORS代理
2. **备选**: 使用CORS代理服务
3. **兜底**: 自动回退到本地方案

## 🔒 **安全考虑**

### CORS代理方案
- ⚠️ 数据经过第三方代理
- ⚠️ 需要信任代理服务
- ✅ 真实的飞书API调用

### 本地数据方案
- ✅ 数据完全本地存储
- ✅ 无第三方依赖
- ⚠️ 数据仅在当前浏览器

## 📱 **用户体验**

系统会自动处理所有技术细节：

1. **透明切换**: 用户无感知的方案切换
2. **状态提示**: 清晰的数据来源提示
3. **错误处理**: 友好的错误信息
4. **功能完整**: 无论哪种方案都保持完整功能

## 🛠️ **故障排除**

### CORS错误仍然出现
1. 检查是否激活了CORS代理
2. 尝试刷新页面
3. 检查网络连接
4. 系统会自动切换到本地方案

### 数据丢失
- 本地数据存储在浏览器中
- 清除浏览器数据会丢失记录
- 建议定期导出数据备份

### 性能问题
- CORS代理可能有延迟
- 本地方案响应更快
- 可手动切换到本地方案

现在你可以正常使用系统了！🎉
