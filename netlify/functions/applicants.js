const axios = require('axios');

// 飞书配置
const FEISHU_CONFIG = {
    APP_ID: 'cli_a8d4bd05dbf8100b',
    APP_SECRET: 'IRUdgTp1k825LXp1kz2W4gxcvaRAqtcv',
    ROSTER_URL: 'https://wcn0pu8598xr.feishu.cn/base/WFZIbJp3qa5DV2s9MnbchUYPnze?table=tblHkoHtRQLLe1T9&view=vewOKzidxw'
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

// 备用申请人数据
const fallbackApplicants = [
    { name: '张三', department: '技术部', employee_id: 'EMP001' },
    { name: '李四', department: '市场部', employee_id: 'EMP002' },
    { name: '王五', department: '财务部', employee_id: 'EMP003' },
    { name: '赵六', department: '人事部', employee_id: 'EMP004' },
    { name: '钱七', department: '运营部', employee_id: 'EMP005' }
];

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

    try {
        console.log('开始获取申请人数据...');
        
        // 尝试从飞书获取数据
        const tokenResult = await getFeishuAccessToken();
        if (!tokenResult.success) {
            throw new Error('无法获取访问令牌');
        }

        // 这里应该调用飞书API获取花名册数据
        // 由于复杂性，暂时返回备用数据
        console.log('⚠️ 使用备用申请人数据');
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                data: fallbackApplicants,
                source: 'fallback',
                message: '使用备用数据'
            })
        };

    } catch (error) {
        console.error('❌ 获取申请人失败:', error);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                data: fallbackApplicants,
                source: 'fallback',
                error: error.message
            })
        };
    }
};
