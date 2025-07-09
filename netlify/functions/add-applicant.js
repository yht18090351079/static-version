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
        const applicantData = JSON.parse(event.body);
        console.log('开始新增申请人:', applicantData);

        // 验证必填字段
        if (!applicantData.name || !applicantData.department) {
            throw new Error('姓名和部门为必填字段');
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

        console.log('向飞书花名册添加申请人...', urlInfo.appToken, urlInfo.tableId);

        // 准备数据映射
        const dataMapping = {
            '姓名': applicantData.name,
            '部门': applicantData.department
        };

        console.log('数据映射:', dataMapping);

        // 提交数据到飞书表格
        const submitResponse = await axios.post(
            `https://open.feishu.cn/open-apis/bitable/v1/apps/${urlInfo.appToken}/tables/${urlInfo.tableId}/records/batch_create`,
            {
                records: [{ fields: dataMapping }]
            },
            {
                headers: {
                    'Authorization': `Bearer ${tokenResult.token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (submitResponse.data.code !== 0) {
            throw new Error(`新增申请人失败: ${submitResponse.data.msg}`);
        }

        console.log('✅ 申请人新增成功');
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: '申请人新增成功',
                data: submitResponse.data.data
            })
        };

    } catch (error) {
        console.error('❌ 新增申请人失败:', error);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: false,
                message: error.message || '新增失败',
                error: error.response?.data || null
            })
        };
    }
};
