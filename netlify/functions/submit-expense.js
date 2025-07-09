const axios = require('axios');

// 飞书配置
const FEISHU_CONFIG = {
    APP_ID: 'cli_a8d4bd05dbf8100b',
    APP_SECRET: 'IRUdgTp1k825LXp1kz2W4gxcvaRAqtcv',
    SPREADSHEET_URL: 'https://wcn0pu8598xr.feishu.cn/base/WFZIbJp3qa5DV2s9MnbchUYPnze'
};

// 解析飞书URL
function parseFeishuUrl(url) {
    try {
        const match = url.match(/\/base\/([a-zA-Z0-9]+)/);
        if (!match) {
            throw new Error('无法解析飞书表格URL');
        }

        return {
            success: true,
            appToken: match[1]
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

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

// 查找或创建月份表格
async function findOrCreateMonthTable(appToken, monthName, accessToken) {
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

        // 查找现有的月份表格
        let targetTable = tables.find(table =>
            table.name.includes(monthName) ||
            table.name.includes('费用') ||
            table.name.includes('报销')
        );

        // 如果没找到，使用第一个表格
        if (!targetTable && tables.length > 0) {
            targetTable = tables[0];
            console.log(`使用默认表格: ${targetTable.name}`);
        }

        if (!targetTable) {
            throw new Error('未找到可用的表格');
        }

        return {
            success: true,
            table: targetTable
        };

    } catch (error) {
        console.error('查找表格失败:', error);
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
        console.log('收到请求，body:', event.body);

        if (!event.body) {
            throw new Error('请求体为空');
        }

        const expenseData = JSON.parse(event.body);
        console.log('开始提交费用数据:', expenseData);

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

        // 查找或创建月份表格
        const monthName = expenseData.reportMonth || new Date().toISOString().slice(0, 7);
        const tableResult = await findOrCreateMonthTable(urlInfo.appToken, monthName, tokenResult.token);
        if (!tableResult.success) {
            throw new Error('无法找到目标表格');
        }

        const table = tableResult.table;
        console.log(`使用表格: ${table.name}`);

        // 获取表格字段信息
        const fieldsResponse = await axios.get(
            `https://open.feishu.cn/open-apis/bitable/v1/apps/${urlInfo.appToken}/tables/${table.table_id}/fields`,
            {
                headers: {
                    'Authorization': `Bearer ${tokenResult.token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (fieldsResponse.data.code !== 0) {
            throw new Error(`获取字段信息失败: ${fieldsResponse.data.msg}`);
        }

        // 创建字段映射
        const fields = fieldsResponse.data.data.items;
        const fieldMap = {};
        fields.forEach(field => {
            fieldMap[field.field_name] = field;
        });

        console.log('可用字段:', Object.keys(fieldMap));

        // 智能字段映射
        const fieldMappings = {
            applicant: ['申请人', '姓名', '员工姓名', '申请者'],
            department: ['申请部门', '部门', '所属部门', '员工部门'],
            dates: ['出差日期', '差旅日期', '日期', '出差时间'],
            allowanceType: ['差补类型', '补贴类型', '差旅类型'],
            travelDays: ['应享受差补天数', '差补天数', '出差天数', '差旅天数'],
            travelAmount: ['差补金额', '差旅补贴', '出差补贴'],
            mealDays: ['应享受餐补天数', '餐补天数', '用餐天数'],
            mealAmount: ['餐补金额', '餐费补贴', '用餐补贴'],
            total: ['合计', '总计', '总金额', '总费用']
        };

        // 查找匹配的字段名
        function findFieldName(possibleNames) {
            for (const name of possibleNames) {
                if (fieldMap[name]) {
                    return name;
                }
            }
            return null;
        }

        // 准备数据映射
        const dataMapping = {};

        // 申请人
        const applicantField = findFieldName(fieldMappings.applicant);
        if (applicantField) dataMapping[applicantField] = expenseData.applicant;

        // 申请部门
        const departmentField = findFieldName(fieldMappings.department);
        if (departmentField) dataMapping[departmentField] = expenseData.applicantDepartment || '';

        // 出差日期
        const datesField = findFieldName(fieldMappings.dates);
        if (datesField) dataMapping[datesField] = expenseData.selectedDates ? expenseData.selectedDates.join(', ') : '';

        // 差补类型
        const allowanceTypeField = findFieldName(fieldMappings.allowanceType);
        if (allowanceTypeField) dataMapping[allowanceTypeField] = expenseData.allowanceType === '90' ? '商务' : '实施';

        // 应享受差补天数
        const travelDaysField = findFieldName(fieldMappings.travelDays);
        if (travelDaysField) dataMapping[travelDaysField] = parseInt(expenseData.travelDays) || 0;

        // 差补金额
        const travelAmountField = findFieldName(fieldMappings.travelAmount);
        if (travelAmountField) dataMapping[travelAmountField] = parseFloat(expenseData.travelAllowanceAmount) || 0;

        // 应享受餐补天数
        const mealDaysField = findFieldName(fieldMappings.mealDays);
        if (mealDaysField) dataMapping[mealDaysField] = parseInt(expenseData.mealDays) || 0;

        // 餐补金额
        const mealAmountField = findFieldName(fieldMappings.mealAmount);
        if (mealAmountField) dataMapping[mealAmountField] = parseFloat(expenseData.mealAllowanceAmount) || 0;

        // 合计
        const totalField = findFieldName(fieldMappings.total);
        if (totalField) dataMapping[totalField] = parseFloat(expenseData.totalAmount) || 0;

        console.log('数据映射:', dataMapping);

        // 提交数据到飞书表格
        const submitResponse = await axios.post(
            `https://open.feishu.cn/open-apis/bitable/v1/apps/${urlInfo.appToken}/tables/${table.table_id}/records`,
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
            throw new Error(`提交数据失败: ${submitResponse.data.msg}`);
        }

        console.log('✅ 费用数据提交成功');

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: '费用数据提交成功',
                table: table.name,
                data: submitResponse.data.data
            })
        };

    } catch (error) {
        console.error('❌ 提交费用数据失败:', error);
        console.error('错误堆栈:', error.stack);

        // 更详细的错误信息
        let errorMessage = error.message || '提交失败';
        if (error.response) {
            console.error('API响应错误:', error.response.data);
            errorMessage = `API错误: ${error.response.data.msg || error.response.statusText}`;
        }

        return {
            statusCode: 200, // 改为200，让前端能正确处理错误
            headers,
            body: JSON.stringify({
                success: false,
                message: errorMessage,
                error: error.message,
                details: error.response?.data || null
            })
        };
    }
};
