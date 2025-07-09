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

// 查找费用表格
async function findExpenseTables(appToken, accessToken) {
    try {
        // 获取所有表格
        const tablesResponse = await axios.get(
            `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (tablesResponse.data.code !== 0) {
            throw new Error(`获取表格列表失败: ${tablesResponse.data.msg}`);
        }

        const tables = tablesResponse.data.data.items;
        
        // 查找费用相关的表格（包含月份的表格，排除花名册）
        const expenseTables = tables.filter(table => 
            (table.name.includes('月') || table.name.includes('费用') || table.name.includes('报销')) &&
            !table.name.includes('花名册')
        );

        return { success: true, tables: expenseTables };

    } catch (error) {
        console.error('查找费用表格失败:', error);
        return { success: false, error: error.message };
    }
}

// 获取表格数据
async function getTableData(appToken, tableId, accessToken) {
    try {
        const response = await axios.get(
            `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                params: {
                    page_size: 500
                }
            }
        );

        if (response.data.code !== 0) {
            throw new Error(`获取表格数据失败: ${response.data.msg}`);
        }

        return { success: true, records: response.data.data.items || [] };

    } catch (error) {
        console.error('获取表格数据失败:', error);
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

    try {
        console.log('开始获取费用统计数据...');
        
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

        // 查找费用表格
        const tablesResult = await findExpenseTables(urlInfo.appToken, tokenResult.token);
        if (!tablesResult.success) {
            throw new Error('无法找到费用表格');
        }

        console.log(`找到 ${tablesResult.tables.length} 个费用表格`);

        // 获取所有费用表格的数据
        const allExpenseData = [];
        
        for (const table of tablesResult.tables) {
            console.log(`获取表格数据: ${table.name}`);
            
            const dataResult = await getTableData(urlInfo.appToken, table.table_id, tokenResult.token);
            if (dataResult.success && dataResult.records.length > 0) {
                // 处理数据并添加表格名称（月份信息）
                const processedRecords = dataResult.records.map(record => {
                    const fields = record.fields;
                    return {
                        record_id: record.record_id,
                        applicant: fields['申请人'] || '',
                        department: fields['申请部门'] || '',
                        month: table.name, // 使用表格名称作为月份
                        dates: fields['出差日期'] || '',
                        type: fields['差补类型'] || '',
                        travelDays: parseInt(fields['应享受差补天数']) || 0,
                        travelAmount: parseFloat(fields['差补金额']) || 0,
                        mealDays: parseInt(fields['应享受餐补天数']) || 0,
                        mealAmount: parseFloat(fields['餐补金额']) || 0,
                        totalAmount: parseFloat(fields['合计']) || 0,
                        submitTime: fields['填报时间'] ? new Date(fields['填报时间']).toLocaleDateString('zh-CN') : ''
                    };
                }).filter(record => record.applicant && record.department); // 过滤掉空记录
                
                allExpenseData.push(...processedRecords);
            }
        }

        console.log(`✅ 获取到 ${allExpenseData.length} 条费用记录`);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                data: allExpenseData,
                message: `成功获取 ${allExpenseData.length} 条费用记录`,
                tables: tablesResult.tables.map(t => ({ name: t.name, id: t.table_id }))
            })
        };

    } catch (error) {
        console.error('❌ 获取费用统计数据失败:', error);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: false,
                message: error.message || '获取统计数据失败',
                error: error.response?.data || null
            })
        };
    }
};
