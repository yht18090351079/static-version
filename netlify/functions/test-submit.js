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
        if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
            return { success: true, token: accessToken };
        }

        const response = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
            app_id: FEISHU_CONFIG.APP_ID,
            app_secret: FEISHU_CONFIG.APP_SECRET
        });

        if (response.data.code === 0) {
            accessToken = response.data.tenant_access_token;
            tokenExpiry = Date.now() + (response.data.expire - 300) * 1000;
            return { success: true, token: accessToken };
        } else {
            throw new Error(`获取访问令牌失败: ${response.data.msg}`);
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// 解析飞书URL
function parseFeishuUrl(url) {
    try {
        const match = url.match(/\/base\/([a-zA-Z0-9]+)/);
        if (!match) {
            throw new Error('无法解析飞书表格URL');
        }
        return { success: true, appToken: match[1] };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        console.log('开始测试提交...');
        
        // 获取访问令牌
        const tokenResult = await getFeishuAccessToken();
        if (!tokenResult.success) {
            throw new Error('无法获取访问令牌');
        }

        // 解析表格URL
        const urlInfo = parseFeishuUrl(FEISHU_CONFIG.SPREADSHEET_URL);
        if (!urlInfo.success) {
            throw new Error('无法解析表格URL');
        }

        // 使用6月表格ID
        const tableId = 'tblIu5VDeKeCOe7a';
        
        // 测试数据 - 最简单的数据
        const testData = {
            '申请人': '测试用户',
            '申请部门': '测试部门',
            '出差日期': '2024-01-01',
            '差补类型': '实施',
            '应享受差补天数': '1',
            '差补金额': '60',
            '应享受餐补天数': '1',
            '餐补金额': '30',
            '合计': '90'
        };

        console.log('测试数据:', testData);

        // 提交数据到飞书表格
        const submitResponse = await axios.post(
            `https://open.feishu.cn/open-apis/bitable/v1/apps/${urlInfo.appToken}/tables/${tableId}/records`,
            {
                records: [{ fields: testData }]
            },
            {
                headers: {
                    'Authorization': `Bearer ${tokenResult.token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('提交响应:', submitResponse.data);

        if (submitResponse.data.code !== 0) {
            throw new Error(`提交数据失败: ${submitResponse.data.msg}`);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: '测试提交成功',
                data: submitResponse.data.data
            })
        };

    } catch (error) {
        console.error('测试提交失败:', error);
        console.error('错误详情:', error.response?.data);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: false,
                message: error.message,
                error: error.response?.data || null
            })
        };
    }
};
