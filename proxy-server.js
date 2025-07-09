// 简单的Node.js代理服务器，解决CORS问题
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

// 飞书配置
const FEISHU_CONFIG = {
    APP_ID: 'cli_a8d4bd05dbf8100b',
    APP_SECRET: 'IRUdgTp1k825LXp1kz2W4gxcvaRAqtcv',
    SPREADSHEET_URL: 'https://wcn0pu8598xr.feishu.cn/base/WFZIbJp3qa5DV2s9MnbchUYPnze',
    ROSTER_URL: 'https://wcn0pu8598xr.feishu.cn/base/WFZIbJp3qa5DV2s9MnbchUYPnze?table=tblHkoHtRQLLe1T9&view=vewOKzidxw'
};

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

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

// 解析花名册URL
function parseRosterUrl(url) {
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

// API路由：获取申请人列表
app.get('/api/applicants', async (req, res) => {
    try {
        console.log('获取申请人列表...');
        
        // 获取访问令牌
        const tokenResult = await getFeishuAccessToken();
        if (!tokenResult.success) {
            throw new Error(tokenResult.error);
        }

        // 解析花名册URL
        const rosterInfo = parseRosterUrl(FEISHU_CONFIG.ROSTER_URL);
        if (!rosterInfo.success) {
            throw new Error(rosterInfo.error);
        }

        // 获取花名册数据
        const response = await axios.get(
            `https://open.feishu.cn/open-apis/bitable/v1/apps/${rosterInfo.appToken}/tables/${rosterInfo.tableId}/records`,
            {
                headers: {
                    'Authorization': `Bearer ${tokenResult.token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data.code === 0) {
            // 解析申请人数据
            const applicants = response.data.data.items.map(record => {
                const fields = record.fields;
                return {
                    id: record.record_id,
                    name: fields['姓名'] || fields['申请人'] || fields['名字'] || '',
                    department: fields['部门'] || fields['申请部门'] || fields['所属部门'] || ''
                };
            }).filter(applicant => applicant.name && applicant.department);

            console.log('✅ 从飞书花名册获取到申请人:', applicants.length, '人');
            res.json({ success: true, data: applicants });
        } else {
            throw new Error(`获取花名册数据失败: ${response.data.msg}`);
        }
    } catch (error) {
        console.error('❌ 获取申请人失败:', error.message);
        
        // 返回本地备用数据
        const fallbackApplicants = [
            { id: 1, name: '张三', department: '技术部' },
            { id: 2, name: '李四', department: '市场部' },
            { id: 3, name: '王五', department: '财务部' },
            { id: 4, name: '赵六', department: '人事部' },
            { id: 5, name: '袁昊天', department: '商务部' },
            { id: 6, name: '陈小明', department: '技术部' },
            { id: 7, name: '刘小红', department: '人事部' },
            { id: 8, name: '王大力', department: '市场部' }
        ];
        
        res.json({ 
            success: true, 
            data: fallbackApplicants,
            source: 'fallback',
            error: error.message 
        });
    }
});

// API路由：提交费用数据
app.post('/api/submit-expense', async (req, res) => {
    try {
        const expenseData = req.body;
        console.log('提交费用数据:', expenseData);

        // 获取访问令牌
        const tokenResult = await getFeishuAccessToken();
        if (!tokenResult.success) {
            throw new Error(tokenResult.error);
        }

        // 解析表格URL
        const tableInfo = parseFeishuUrl(FEISHU_CONFIG.SPREADSHEET_URL);
        if (!tableInfo.success) {
            throw new Error(tableInfo.error);
        }

        // 获取数据表列表
        const tablesResponse = await axios.get(
            `https://open.feishu.cn/open-apis/bitable/v1/apps/${tableInfo.appToken}/tables`,
            {
                headers: {
                    'Authorization': `Bearer ${tokenResult.token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (tablesResponse.data.code !== 0) {
            throw new Error(`获取数据表失败: ${tablesResponse.data.msg}`);
        }

        // 查找或使用第一个表格
        const tables = tablesResponse.data.data.items;
        const targetTable = tables.find(table => 
            table.name.includes('6月') || table.name.includes('7月') || table.name.includes('当月')
        ) || tables[0];

        if (!targetTable) {
            throw new Error('未找到可用的数据表');
        }

        console.log(`使用表格: ${targetTable.name}`);

        // 获取表格字段信息
        const fieldsResponse = await axios.get(
            `https://open.feishu.cn/open-apis/bitable/v1/apps/${tableInfo.appToken}/tables/${targetTable.table_id}/fields`,
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

        // 获取字段信息并创建字段映射
        const fields = fieldsResponse.data.data.items;
        const fieldMap = {};
        fields.forEach(field => {
            fieldMap[field.field_name] = field;
        });

        console.log('可用字段:', Object.keys(fieldMap));

        // 智能字段映射 - 支持多种可能的字段名称
        const fieldMappings = {
            applicant: ['申请人', '姓名', '员工姓名', '申请者'],
            department: ['申请部门', '部门', '所属部门', '员工部门'],
            reportMonth: ['申请月份', '月份', '填报月份', '报销月份'],
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

        console.log('=== 开始数据映射 ===');
        console.log('接收到的expenseData:', JSON.stringify(expenseData, null, 2));

        // 申请人
        const applicantField = findFieldName(fieldMappings.applicant);
        console.log('申请人字段映射:', applicantField, '值:', expenseData.applicant);
        if (applicantField) dataMapping[applicantField] = expenseData.applicant;

        // 申请部门
        const departmentField = findFieldName(fieldMappings.department);
        console.log('申请部门字段映射:', departmentField, '值:', expenseData.applicantDepartment);
        if (departmentField) dataMapping[departmentField] = expenseData.applicantDepartment || '';

        // 申请月份
        const reportMonthField = findFieldName(fieldMappings.reportMonth);
        console.log('申请月份字段映射:', reportMonthField, '值:', expenseData.reportMonth);
        if (reportMonthField) dataMapping[reportMonthField] = expenseData.reportMonth || '';

        // 出差日期
        const datesField = findFieldName(fieldMappings.dates);
        if (datesField) dataMapping[datesField] = expenseData.selectedDates ? expenseData.selectedDates.join(', ') : '';

        // 差补类型 (修正：商务90，实施60)
        const allowanceTypeField = findFieldName(fieldMappings.allowanceType);
        if (allowanceTypeField) dataMapping[allowanceTypeField] = expenseData.allowanceType === '90' ? '商务' : '实施';

        // 应享受差补天数 (转为字符串，因为字段类型是文本)
        const travelDaysField = findFieldName(fieldMappings.travelDays);
        if (travelDaysField) dataMapping[travelDaysField] = String(expenseData.travelDays || 0);

        // 差补金额 (转为字符串，因为字段类型是文本)
        const travelAmountField = findFieldName(fieldMappings.travelAmount);
        if (travelAmountField) dataMapping[travelAmountField] = String(expenseData.travelAllowanceAmount || 0);

        // 应享受餐补天数 (转为字符串，因为字段类型是文本)
        const mealDaysField = findFieldName(fieldMappings.mealDays);
        if (mealDaysField) dataMapping[mealDaysField] = String(expenseData.mealDays || 0);

        // 餐补金额 (转为字符串，因为字段类型是文本)
        const mealAmountField = findFieldName(fieldMappings.mealAmount);
        if (mealAmountField) dataMapping[mealAmountField] = String(expenseData.mealAllowanceAmount || 0);

        // 合计 (转为字符串，因为字段类型是文本)
        const totalField = findFieldName(fieldMappings.total);
        if (totalField) dataMapping[totalField] = String(expenseData.totalAmount || 0);

        console.log('=== 数据映射完成 ===');
        console.log('dataMapping:', JSON.stringify(dataMapping, null, 2));

        // 根据字段类型转换数据
        const finalData = {};
        for (const [fieldName, value] of Object.entries(dataMapping)) {
            const field = fieldMap[fieldName];
            if (field) {
                let convertedValue = value;

                // 根据字段类型转换数据
                switch (field.type) {
                    case 1: // 多行文本
                        convertedValue = String(value || '');
                        break;
                    case 2: // 数字
                        if (typeof value === 'number') {
                            convertedValue = value;
                        } else if (typeof value === 'string' && value.trim() !== '' && !isNaN(value)) {
                            convertedValue = parseFloat(value);
                        } else {
                            convertedValue = 0; // 数字字段默认为0
                        }
                        break;
                    case 3: // 单选
                        convertedValue = String(value || '');
                        break;
                    case 4: // 多选
                        // 多选字段需要数组格式
                        if (Array.isArray(value)) {
                            convertedValue = value;
                        } else {
                            convertedValue = [String(value)];
                        }
                        break;
                    case 5: // 日期
                        // 日期字段需要时间戳格式
                        if (typeof value === 'string' && value.includes(',')) {
                            // 多个日期的情况，取第一个
                            const firstDate = value.split(',')[0].trim();
                            convertedValue = new Date(firstDate).getTime();
                        } else if (value) {
                            convertedValue = new Date(value).getTime();
                        } else {
                            convertedValue = null;
                        }
                        break;
                    case 7: // 复选框
                        convertedValue = Boolean(value);
                        break;
                    case 11: // 人员
                        // 人员字段需要特殊格式
                        convertedValue = String(value || '');
                        break;
                    case 13: // 电话号码
                    case 15: // 超链接
                    case 17: // 附件
                    case 18: // 关联
                    case 19: // 查找引用
                    case 20: // 公式
                    case 21: // 双向关联
                    default:
                        convertedValue = String(value || '');
                        break;
                }

                // 只添加非空值
                if (convertedValue !== null && convertedValue !== undefined && convertedValue !== '') {
                    finalData[fieldName] = convertedValue;
                    console.log(`映射字段: ${fieldName} (类型:${field.type}) = ${convertedValue}`);
                }
            } else {
                console.log(`⚠️ 字段不存在: ${fieldName}`);
            }
        }

        // 检查是否有可用的字段
        if (Object.keys(finalData).length === 0) {
            console.log('❌ 没有找到匹配的字段，尝试使用原始字段名');

            // 使用原始字段名作为备用方案 (所有字段都转为字符串)
            const fallbackData = {
                '申请人': String(expenseData.applicant || ''),
                '申请部门': String(expenseData.applicantDepartment || ''),
                '出差日期': expenseData.selectedDates ? expenseData.selectedDates.join(', ') : '',
                '差补类型': expenseData.allowanceType === '90' ? '商务' : '实施',
                '应享受差补天数': String(expenseData.travelDays || 0),
                '差补金额': String(expenseData.travelAllowanceAmount || 0),
                '应享受餐补天数': String(expenseData.mealDays || 0),
                '餐补金额': String(expenseData.mealAllowanceAmount || 0),
                '合计': String(expenseData.totalAmount || 0)
            };

            // 检查哪些字段在表格中存在
            for (const [fieldName, value] of Object.entries(fallbackData)) {
                if (fieldMap[fieldName]) {
                    finalData[fieldName] = value;
                    console.log(`✅ 备用映射: ${fieldName} = ${value}`);
                }
            }

            // 如果还是没有字段，抛出错误
            if (Object.keys(finalData).length === 0) {
                throw new Error('无法找到匹配的表格字段，请检查表格结构');
            }
        }

        console.log('最终数据字段数量:', Object.keys(finalData).length);
        console.log('最终数据:', finalData);

        // 准备写入的数据
        const writeData = {
            records: [{ fields: finalData }]
        };

        console.log('准备写入的数据:', JSON.stringify(writeData, null, 2));

        // 写入数据到飞书表格 (使用批量创建API)
        const writeResponse = await axios.post(
            `https://open.feishu.cn/open-apis/bitable/v1/apps/${tableInfo.appToken}/tables/${targetTable.table_id}/records/batch_create`,
            writeData,
            {
                headers: {
                    'Authorization': `Bearer ${tokenResult.token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('飞书API响应:', writeResponse.data);

        if (writeResponse.data.code === 0) {
            console.log('✅ 数据写入成功');
            res.json({
                success: true,
                message: '费用申请提交成功！',
                data: writeResponse.data.data,
                table: targetTable.name,
                recordId: writeResponse.data.data.records?.[0]?.record_id
            });
        } else {
            console.error('❌ 飞书API错误:', writeResponse.data);
            throw new Error(`写入数据失败: ${writeResponse.data.msg} (错误码: ${writeResponse.data.code})`);
        }

    } catch (error) {
        console.error('❌ 提交费用数据失败:', error.message);

        // 详细的错误信息
        let errorMessage = error.message;
        let errorDetails = {};

        if (error.response) {
            // axios错误响应
            console.error('错误响应状态:', error.response.status);
            console.error('错误响应数据:', error.response.data);

            errorMessage = `HTTP ${error.response.status}: ${error.response.data?.msg || error.response.statusText}`;
            errorDetails = {
                status: error.response.status,
                data: error.response.data,
                headers: error.response.headers
            };
        } else if (error.request) {
            // 网络错误
            console.error('网络错误:', error.request);
            errorMessage = '网络连接失败，请检查网络连接';
            errorDetails = { type: 'network_error' };
        }

        res.status(500).json({
            success: false,
            message: '提交失败: ' + errorMessage,
            error: errorDetails,
            timestamp: new Date().toISOString()
        });
    }
});

// 检查表格结构
app.get('/api/table-info', async (req, res) => {
    try {
        // 获取访问令牌
        const tokenResult = await getFeishuAccessToken();
        if (!tokenResult.success) {
            throw new Error(tokenResult.error);
        }

        // 解析表格URL
        const tableInfo = parseFeishuUrl(FEISHU_CONFIG.SPREADSHEET_URL);
        if (!tableInfo.success) {
            throw new Error(tableInfo.error);
        }

        // 获取数据表列表
        const tablesResponse = await axios.get(
            `https://open.feishu.cn/open-apis/bitable/v1/apps/${tableInfo.appToken}/tables`,
            {
                headers: {
                    'Authorization': `Bearer ${tokenResult.token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (tablesResponse.data.code !== 0) {
            throw new Error(`获取数据表失败: ${tablesResponse.data.msg}`);
        }

        const tables = tablesResponse.data.data.items;
        const tableDetails = [];

        // 获取每个表格的字段信息
        for (const table of tables) {
            const fieldsResponse = await axios.get(
                `https://open.feishu.cn/open-apis/bitable/v1/apps/${tableInfo.appToken}/tables/${table.table_id}/fields`,
                {
                    headers: {
                        'Authorization': `Bearer ${tokenResult.token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (fieldsResponse.data.code === 0) {
                tableDetails.push({
                    name: table.name,
                    table_id: table.table_id,
                    fields: fieldsResponse.data.data.items.map(field => ({
                        name: field.field_name,
                        type: field.type,
                        type_name: getFieldTypeName(field.type)
                    }))
                });
            }
        }

        res.json({
            success: true,
            app_token: tableInfo.appToken,
            tables: tableDetails
        });

    } catch (error) {
        console.error('获取表格信息失败:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// 字段类型名称映射
function getFieldTypeName(type) {
    const typeMap = {
        1: '多行文本',
        2: '数字',
        3: '单选',
        4: '多选',
        5: '日期',
        7: '复选框',
        11: '人员',
        13: '电话号码',
        15: '超链接',
        17: '附件',
        18: '关联',
        19: '查找引用',
        20: '公式',
        21: '双向关联'
    };
    return typeMap[type] || `未知类型(${type})`;
}

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        config: {
            spreadsheet: FEISHU_CONFIG.SPREADSHEET_URL,
            hasCredentials: !!(FEISHU_CONFIG.APP_ID && FEISHU_CONFIG.APP_SECRET)
        }
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`🚀 代理服务器运行在 http://localhost:${PORT}`);
    console.log(`📊 飞书表格: ${FEISHU_CONFIG.SPREADSHEET_URL}`);
    console.log(`👥 花名册: ${FEISHU_CONFIG.ROSTER_URL}`);
});

module.exports = app;
