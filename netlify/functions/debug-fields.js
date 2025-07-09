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
        console.log('开始调试字段信息...');
        
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

        // 获取所有表格
        const tablesResponse = await axios.get(
            `https://open.feishu.cn/open-apis/bitable/v1/apps/${urlInfo.appToken}/tables`,
            {
                headers: {
                    'Authorization': `Bearer ${tokenResult.token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (tablesResponse.data.code !== 0) {
            throw new Error(`获取表格列表失败: ${tablesResponse.data.msg}`);
        }

        const tables = tablesResponse.data.data.items;
        const debugInfo = {
            appToken: urlInfo.appToken,
            tables: []
        };

        // 遍历每个表格获取字段信息
        for (const table of tables) {
            const fieldsResponse = await axios.get(
                `https://open.feishu.cn/open-apis/bitable/v1/apps/${urlInfo.appToken}/tables/${table.table_id}/fields`,
                {
                    headers: {
                        'Authorization': `Bearer ${tokenResult.token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (fieldsResponse.data.code === 0) {
                const fields = fieldsResponse.data.data.items;
                debugInfo.tables.push({
                    name: table.name,
                    table_id: table.table_id,
                    fields: fields.map(field => ({
                        name: field.field_name,
                        type: field.type,
                        required: field.property?.required || false,
                        description: field.description || ''
                    }))
                });
            }
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                data: debugInfo,
                message: '字段信息获取成功'
            })
        };

    } catch (error) {
        console.error('调试字段信息失败:', error);
        
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
