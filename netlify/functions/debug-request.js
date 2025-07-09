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
        console.log('开始调试请求...');
        
        // 获取访问令牌
        const tokenResult = await getFeishuAccessToken();
        if (!tokenResult.success) {
            throw new Error('无法获取访问令牌');
        }

        const appToken = 'WFZIbJp3qa5DV2s9MnbchUYPnze';
        const tableId = 'tblIu5VDeKeCOe7a';
        
        // 先获取表格信息确认权限
        console.log('1. 检查表格访问权限...');
        const tableResponse = await axios.get(
            `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}`,
            {
                headers: {
                    'Authorization': `Bearer ${tokenResult.token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('表格信息:', tableResponse.data);
        
        // 检查字段信息
        console.log('2. 检查字段信息...');
        const fieldsResponse = await axios.get(
            `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/fields`,
            {
                headers: {
                    'Authorization': `Bearer ${tokenResult.token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('字段信息:', fieldsResponse.data);
        
        // 尝试读取现有记录
        console.log('3. 尝试读取现有记录...');
        const recordsResponse = await axios.get(
            `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records?page_size=1`,
            {
                headers: {
                    'Authorization': `Bearer ${tokenResult.token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('现有记录:', recordsResponse.data);
        
        // 现在尝试写入 - 使用不同的格式
        console.log('4. 尝试写入记录...');
        
        // 方法1: 标准格式
        const requestBody1 = {
            records: [
                {
                    fields: {
                        '申请人': '调试测试1'
                    }
                }
            ]
        };
        
        console.log('尝试方法1:', JSON.stringify(requestBody1, null, 2));
        
        try {
            const submitResponse1 = await axios.post(
                `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`,
                requestBody1,
                {
                    headers: {
                        'Authorization': `Bearer ${tokenResult.token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            console.log('方法1成功:', submitResponse1.data);
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    message: '调试成功',
                    method: 1,
                    data: submitResponse1.data
                })
            };
            
        } catch (error1) {
            console.log('方法1失败:', error1.response?.data);
            
            // 方法2: 尝试不同的字段名
            const requestBody2 = {
                records: [
                    {
                        fields: {
                            'fldcnKJbKqGqh': '调试测试2'  // 尝试使用字段ID而不是名称
                        }
                    }
                ]
            };
            
            console.log('尝试方法2:', JSON.stringify(requestBody2, null, 2));
            
            try {
                const submitResponse2 = await axios.post(
                    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`,
                    requestBody2,
                    {
                        headers: {
                            'Authorization': `Bearer ${tokenResult.token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        message: '调试成功',
                        method: 2,
                        data: submitResponse2.data
                    })
                };
                
            } catch (error2) {
                console.log('方法2也失败:', error2.response?.data);
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        message: '所有方法都失败',
                        tableInfo: tableResponse.data,
                        fieldsInfo: fieldsResponse.data,
                        recordsInfo: recordsResponse.data,
                        error1: error1.response?.data,
                        error2: error2.response?.data
                    })
                };
            }
        }

    } catch (error) {
        console.error('调试失败:', error);
        
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
