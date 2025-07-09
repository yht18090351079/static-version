// 飞书API - 使用本地代理服务器
class FeishuAPIProxy {
    constructor() {
        // 代理服务器地址
        this.proxyUrl = window.location.origin.includes('localhost')
            ? 'http://localhost:3002'
            : window.location.origin + '/.netlify/functions';
        console.log('🔧 API代理URL:', this.proxyUrl);
    }

    // 从花名册获取申请人数据
    async getApplicantsFromRoster() {
        try {
            console.log('从飞书花名册获取申请人数据...');
            
            const response = await fetch(`${this.proxyUrl}/applicants`);
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ 从飞书花名册获取到申请人:', result.data.length, '人');
                if (result.source === 'fallback') {
                    console.log('⚠️ 使用备用数据，原因:', result.error);
                }
                return { success: true, data: result.data };
            } else {
                throw new Error(result.message || '获取申请人失败');
            }
        } catch (error) {
            console.error('❌ 获取申请人失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 提交费用数据
    async submitExpense(expenseData) {
        try {
            console.log('开始提交费用数据到飞书...');
            console.log('=== 代理API发送的数据 ===');
            console.log('expenseData:', JSON.stringify(expenseData, null, 2));
            console.log('reportMonth值:', expenseData.reportMonth);

            const response = await fetch(`${this.proxyUrl}/submit-expense`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(expenseData)
            });

            const result = await response.json();
            
            if (result.success) {
                console.log('✅ 费用数据提交成功');
                console.log('写入表格:', result.table);
                console.log('记录ID:', result.data?.records?.[0]?.record_id);
                return { success: true, data: result.data };
            } else {
                throw new Error(result.message || '提交失败');
            }
        } catch (error) {
            console.error('❌ 提交费用数据失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 健康检查
    async checkHealth() {
        try {
            const response = await fetch(`${this.proxyUrl}/health`);
            const result = await response.json();
            return { success: true, data: result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 获取访问令牌（兼容性方法）
    async getAccessToken() {
        // 代理模式下不需要前端获取令牌
        return { success: true, token: 'proxy_mode' };
    }
}

// 创建全局实例
window.feishuAPI = new FeishuAPIProxy();
console.log('✅ 飞书API代理模块已加载');
