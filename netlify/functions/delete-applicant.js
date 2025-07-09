const axios = require('axios');

// 飞书配置
const FEISHU_CONFIG = {
    APP_ID: 'cli_a8d4bd05dbf8100b',
    APP_SECRET: 'IRUdgTp1k825LXp1kz2W4gxcvaRAqtcv',
    ROSTER_URL: 'https://wcn0pu8598xr.feishu.cn/base/WFZIbJp3qa5DV2s9MnbchUYPnze?table=tblHkoHtRQLLe1T9&view=vewOKzidxw'
};

// 管理员密码（在实际部署中应该使用环境变量）
const ADMIN_PASSWORD = 'admin123';

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
        const urlObj = new URL(url);
        const tableId = urlObj.searchParams.get('table');
        const pathMatch = urlObj.pathname.match(/\/base\/([a-zA-Z0-9]+)/);
        
        if (!tableId || !pathMatch) {
            throw new Error('无法解析花名册URL');
        }
        
        return {
            success: true,
            appToken: pathMatch[1],
            tableId: tableId
        };
    } catch (error) {
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
        const requestData = JSON.parse(event.body);
        console.log('开始删除申请人:', requestData);

        // 验证管理员密码
        if (!requestData.adminPassword || requestData.adminPassword !== ADMIN_PASSWORD) {
            throw new Error('管理员密码错误');
        }

        // 验证必填字段
        if (!requestData.recordId) {
            throw new Error('缺少记录ID');
        }

        // 获取访问令牌
        const tokenResult = await getFeishuAccessToken();
        if (!tokenResult.success) {
            throw new Error('无法获取访问令牌');
        }

        // 解析花名册URL
        const urlInfo = parseFeishuUrl(FEISHU_CONFIG.ROSTER_URL);
        if (!urlInfo.success) {
            throw new Error('无法解析花名册URL');
        }

        console.log('从飞书花名册删除申请人...', urlInfo.appToken, urlInfo.tableId, requestData.recordId);

        // 删除飞书表格中的记录
        const deleteResponse = await axios.delete(
            `https://open.feishu.cn/open-apis/bitable/v1/apps/${urlInfo.appToken}/tables/${urlInfo.tableId}/records/${requestData.recordId}`,
            {
                headers: {
                    'Authorization': `Bearer ${tokenResult.token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (deleteResponse.data.code !== 0) {
            throw new Error(`删除申请人失败: ${deleteResponse.data.msg}`);
        }

        console.log('✅ 申请人删除成功');
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: '申请人删除成功',
                data: deleteResponse.data.data
            })
        };

    } catch (error) {
        console.error('❌ 删除申请人失败:', error);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: false,
                message: error.message || '删除失败',
                error: error.response?.data || null
            })
        };
    }
};
