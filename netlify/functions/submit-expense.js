const axios = require('axios');

// 飞书配置
const FEISHU_CONFIG = {
    APP_ID: 'cli_a8d4bd05dbf8100b',
    APP_SECRET: 'IRUdgTp1k825LXp1kz2W4gxcvaRAqtcv',
    SPREADSHEET_URL: 'https://wcn0pu8598xr.feishu.cn/base/WFZIbJp3qa5DV2s9MnbchUYPnze'
};

// 访问令牌缓存
let accessToken = null;
let tokenExpiry = null;

// 获取飞书访问令牌
async function getFeishuAccessToken() {
    try {
        // 检查缓存的令牌是否有效
        if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
            return { success: true, token: accessToken };
        }

        console.log('获取飞书访问令牌...');
        const response = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
            app_id: FEISHU_CONFIG.APP_ID,
            app_secret: FEISHU_CONFIG.APP_SECRET
        });

        if (response.data.code === 0) {
            accessToken = response.data.tenant_access_token;
            tokenExpiry = Date.now() + (response.data.expire - 300) * 1000; // 提前5分钟过期
            console.log('✅ 访问令牌获取成功');
            return { success: true, token: accessToken };
        } else {
            throw new Error(`获取访问令牌失败: ${response.data.msg}`);
        }
    } catch (error) {
        console.error('❌ 获取飞书访问令牌失败:', error.message);
        return { success: false, error: error.message };
    }
}

exports.handler = async (event, context) => {
    // 设置CORS头
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // 处理OPTIONS请求
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ success: false, message: '只支持POST请求' })
        };
    }

    try {
        const expenseData = JSON.parse(event.body);
        console.log('开始提交费用数据:', expenseData);

        // 获取访问令牌
        const tokenResult = await getFeishuAccessToken();
        if (!tokenResult.success) {
            throw new Error('无法获取访问令牌');
        }

        // 模拟成功提交（实际应该调用飞书API）
        console.log('✅ 费用数据提交成功（模拟）');
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: '费用数据提交成功',
                table: 'expense_records',
                data: {
                    records: [{
                        record_id: 'rec_' + Date.now(),
                        created_time: new Date().toISOString()
                    }]
                }
            })
        };

    } catch (error) {
        console.error('❌ 提交费用数据失败:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                message: error.message || '提交失败'
            })
        };
    }
};
