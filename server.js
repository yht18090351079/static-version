const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

// 重试工具函数
async function retryAsync(fn, maxRetries = 3, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            console.log(`尝试 ${i + 1}/${maxRetries} 失败:`, error.message);

            if (i === maxRetries - 1) {
                throw error;
            }

            // 指数退避延迟
            await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }
    }
}

// 重试工具函数
async function retryAsync(fn, maxRetries = 3, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            console.log(`尝试 ${i + 1}/${maxRetries} 失败:`, error.message);

            if (i === maxRetries - 1) {
                throw error;
            }

            // 指数退避延迟
            await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }
    }
}

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// 路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/applicants', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'applicants.html'));
});

// API路由
app.post('/api/submit-expense', async (req, res) => {
    try {
        console.log('收到费用提交:', req.body);

        // 写入飞书表格
        const result = await writeToFeishu(req.body);

        if (result.success) {
            res.json({ success: true, message: '提交成功，数据已写入飞书表格' });
        } else {
            res.status(500).json({ success: false, message: '写入飞书表格失败: ' + result.error });
        }
    } catch (error) {
        console.error('提交费用失败:', error);
        res.status(500).json({ success: false, message: '提交失败' });
    }
});

// 申请人数据存储（实际项目中应该使用数据库）
let applicants = [
    { id: 1, name: '张三', department: '技术部' },
    { id: 2, name: '李四', department: '市场部' },
    { id: 3, name: '王五', department: '财务部' },
    { id: 4, name: '赵六', department: '人事部' },
    { id: 5, name: '袁昊天', department: '商务部' },
    { id: 6, name: '陈小明', department: '技术部' },
    { id: 7, name: '刘小红', department: '人事部' },
    { id: 8, name: '王大力', department: '市场部' }
];
let nextApplicantId = 9;

app.get('/api/applicants', async (req, res) => {
    try {
        // 尝试从飞书花名册获取人员信息
        const feishuApplicants = await getApplicantsFromFeishu();
        if (feishuApplicants.success && feishuApplicants.data.length > 0) {
            console.log('✅ 从飞书花名册获取到人员信息:', feishuApplicants.data.length, '人');
            res.json(feishuApplicants.data);
        } else {
            console.log('⚠️  飞书花名册获取失败，使用本地人员数据');
            res.json(applicants);
        }
    } catch (error) {
        console.error('❌ 获取申请人失败:', error);
        res.json(applicants);
    }
});

app.post('/api/applicants', (req, res) => {
    const { name, department } = req.body;

    if (!name || name.trim() === '') {
        return res.status(400).json({ success: false, message: '申请人姓名不能为空' });
    }

    if (!department || department.trim() === '') {
        return res.status(400).json({ success: false, message: '申请部门不能为空' });
    }

    if (applicants.some(applicant => applicant.name === name.trim())) {
        return res.status(400).json({ success: false, message: '申请人已存在' });
    }

    const newApplicant = {
        id: nextApplicantId++,
        name: name.trim(),
        department: department.trim()
    };

    applicants.push(newApplicant);
    res.json({ success: true, message: '申请人添加成功', data: newApplicant });
});

app.delete('/api/applicants/:id', (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    // 验证管理员密码
    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ success: false, message: '管理员密码错误' });
    }

    const applicantId = parseInt(id);
    const index = applicants.findIndex(applicant => applicant.id === applicantId);

    if (index === -1) {
        return res.status(404).json({ success: false, message: '申请人不存在' });
    }

    const deletedApplicant = applicants.splice(index, 1)[0];
    res.json({ success: true, message: '申请人删除成功', data: deletedApplicant });
});

// 更新申请人信息
app.put('/api/applicants/:id', (req, res) => {
    const { id } = req.params;
    const { name, department } = req.body;

    if (!name || name.trim() === '') {
        return res.status(400).json({ success: false, message: '申请人姓名不能为空' });
    }

    if (!department || department.trim() === '') {
        return res.status(400).json({ success: false, message: '申请部门不能为空' });
    }

    const applicantId = parseInt(id);
    const index = applicants.findIndex(applicant => applicant.id === applicantId);

    if (index === -1) {
        return res.status(404).json({ success: false, message: '申请人不存在' });
    }

    // 检查是否有重名（排除自己）
    if (applicants.some(applicant => applicant.name === name.trim() && applicant.id !== applicantId)) {
        return res.status(400).json({ success: false, message: '申请人已存在' });
    }

    applicants[index] = {
        ...applicants[index],
        name: name.trim(),
        department: department.trim()
    };

    res.json({ success: true, message: '申请人更新成功', data: applicants[index] });
});





// 详细权限检查API
app.get('/api/check-table-permissions', async (req, res) => {
    try {
        console.log('开始详细权限检查...');

        const appId = process.env.FEISHU_APP_ID;
        const appSecret = process.env.FEISHU_APP_SECRET;
        const mainTableUrl = 'https://wcn0pu8598xr.feishu.cn/base/WFZIbJp3qa5DV2s9MnbchUYPnze';
        const rosterUrl = process.env.FEISHU_ROSTER_URL;

        if (!appId || !appSecret) {
            return res.status(400).json({
                success: false,
                message: '飞书配置不完整'
            });
        }

        // 获取访问令牌
        const tokenResult = await getFeishuAccessToken(appId, appSecret);
        if (!tokenResult.success) {
            return res.status(400).json({
                success: false,
                message: '获取访问令牌失败: ' + tokenResult.error
            });
        }

        // 解析主表格URL
        const tableInfo = parseFeishuUrl(mainTableUrl);
        if (!tableInfo.success) {
            return res.status(400).json({
                success: false,
                message: '解析主表格URL失败: ' + tableInfo.error
            });
        }

        // 解析花名册URL
        const rosterInfo = parseRosterUrl(rosterUrl);
        if (!rosterInfo.success) {
            return res.status(400).json({
                success: false,
                message: '解析花名册URL失败: ' + rosterInfo.error
            });
        }

        console.log('权限检查信息:', {
            appToken: tableInfo.appToken,
            rosterTableId: rosterInfo.tableId
        });

        // 获取所有数据表
        const tablesResult = await getFeishuTables(tokenResult.token, tableInfo.appToken);
        if (!tablesResult.success) {
            return res.status(400).json({
                success: false,
                message: '获取数据表列表失败: ' + tablesResult.error
            });
        }

        console.log('所有数据表:', tablesResult.tables.map(t => ({ name: t.name, id: t.table_id })));

        // 逐个测试每个表格的读取权限
        const permissionResults = [];
        for (const table of tablesResult.tables) {
            console.log(`测试表格权限: ${table.name} (${table.table_id})`);

            try {
                const recordsResult = await getFeishuTableRecords(tokenResult.token, tableInfo.appToken, table.table_id);
                if (recordsResult.success) {
                    permissionResults.push({
                        tableName: table.name,
                        tableId: table.table_id,
                        canRead: true,
                        recordCount: recordsResult.records.length,
                        fields: recordsResult.records.length > 0 ? Object.keys(recordsResult.records[0].fields) : [],
                        error: null
                    });
                    console.log(`✅ ${table.name}: 可读取，${recordsResult.records.length} 条记录`);
                } else {
                    permissionResults.push({
                        tableName: table.name,
                        tableId: table.table_id,
                        canRead: false,
                        recordCount: 0,
                        fields: [],
                        error: recordsResult.error
                    });
                    console.log(`❌ ${table.name}: 读取失败 - ${recordsResult.error}`);
                }
            } catch (error) {
                permissionResults.push({
                    tableName: table.name,
                    tableId: table.table_id,
                    canRead: false,
                    recordCount: 0,
                    fields: [],
                    error: error.message
                });
                console.log(`❌ ${table.name}: 异常 - ${error.message}`);
            }
        }

        // 特别检查花名册表格
        const rosterTableResult = permissionResults.find(t => t.tableId === rosterInfo.tableId);

        res.json({
            success: true,
            message: '权限检查完成',
            data: {
                appToken: tableInfo.appToken,
                totalTables: tablesResult.tables.length,
                rosterTableId: rosterInfo.tableId,
                rosterTableFound: !!rosterTableResult,
                rosterCanRead: rosterTableResult ? rosterTableResult.canRead : false,
                rosterError: rosterTableResult ? rosterTableResult.error : '表格未找到',
                permissionSummary: {
                    canRead: permissionResults.filter(t => t.canRead).length,
                    cannotRead: permissionResults.filter(t => !t.canRead).length,
                    total: permissionResults.length
                },
                tablePermissions: permissionResults
            }
        });

    } catch (error) {
        console.error('权限检查失败:', error);
        res.status(500).json({
            success: false,
            message: '权限检查失败: ' + error.message
        });
    }
});

// 飞书配置测试接口
app.post('/api/test-feishu-connection', async (req, res) => {
    try {
        const { appId, appSecret, spreadsheetUrl } = req.body;

        if (!appId || !appSecret) {
            return res.status(400).json({ success: false, message: '缺少App ID或App Secret' });
        }

        // 测试获取访问令牌
        const tokenResult = await getFeishuAccessToken(appId, appSecret);
        if (!tokenResult.success) {
            return res.status(400).json({ success: false, message: tokenResult.error });
        }

        // 解析表格信息
        const tableInfo = parseFeishuUrl(spreadsheetUrl);
        if (!tableInfo.success) {
            return res.status(400).json({ success: false, message: tableInfo.error });
        }

        // 测试花名册权限
        const rosterTest = await getApplicantsFromFeishu();
        const rosterStatus = rosterTest.success ? '✅ 可读取' : '❌ 权限不足';

        res.json({
            success: true,
            message: '连接成功',
            data: {
                hasToken: true,
                appToken: tableInfo.appToken,
                tableId: tableInfo.tableId,
                rosterAccess: rosterStatus,
                rosterError: rosterTest.success ? null : rosterTest.error
            }
        });
    } catch (error) {
        console.error('测试飞书连接失败:', error);
        res.status(500).json({ success: false, message: '连接测试失败' });
    }
});

// 获取飞书访问令牌（带重试机制）
async function getFeishuAccessToken(appId, appSecret) {
    try {
        const result = await retryAsync(async () => {
            const response = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal/', {
                app_id: appId,
                app_secret: appSecret
            }, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000 // 10秒超时
            });

            if (response.data.code === 0) {
                return {
                    success: true,
                    token: response.data.tenant_access_token,
                    expire: response.data.expire
                };
            } else {
                throw new Error(`获取访问令牌失败: ${response.data.msg}`);
            }
        }, 3, 1000);

        return result;
    } catch (error) {
        console.error('获取飞书访问令牌失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// 解析飞书表格URL
function parseFeishuUrl(url) {
    try {
        // 从URL中提取app_token
        // 示例URL: https://wcn0pu8598xr.feishu.cn/base/WFZIbJp3qa5DV2s9MnbchUYPnze
        const urlMatch = url.match(/\/base\/([a-zA-Z0-9]+)/);
        if (!urlMatch) {
            return {
                success: false,
                error: '无法从URL中解析app_token'
            };
        }

        const appToken = urlMatch[1];

        return {
            success: true,
            appToken: appToken,
            tableId: null // 需要后续通过API获取
        };
    } catch (error) {
        return {
            success: false,
            error: `解析URL失败: ${error.message}`
        };
    }
}

// 获取数据表列表（带重试机制）
async function getFeishuTables(accessToken, appToken) {
    try {
        const result = await retryAsync(async () => {
            const response = await axios.get(`https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            if (response.data.code === 0) {
                return {
                    success: true,
                    tables: response.data.data.items
                };
            } else {
                throw new Error(`获取数据表失败: ${response.data.msg}`);
            }
        }, 3, 1000);

        return result;
    } catch (error) {
        console.error('获取飞书数据表失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// 创建新的数据表
async function createFeishuTable(accessToken, appToken, tableName) {
    try {
        const result = await retryAsync(async () => {
            const response = await axios.post(
                `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables`,
                {
                    table: {
                        name: tableName,
                        default_view_name: "表格视图",
                        fields: [
                            {
                                field_name: "申请人",
                                type: 1 // 多行文本
                            },
                            {
                                field_name: "申请部门",
                                type: 1
                            },
                            {
                                field_name: "出差日期",
                                type: 1
                            },
                            {
                                field_name: "差补类型",
                                type: 1
                            },
                            {
                                field_name: "应享受差补天数",
                                type: 1
                            },
                            {
                                field_name: "差补金额",
                                type: 1
                            },
                            {
                                field_name: "应享受餐补天数",
                                type: 1
                            },
                            {
                                field_name: "餐补金额",
                                type: 1
                            },
                            {
                                field_name: "合计",
                                type: 1
                            }
                        ]
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 15000
                }
            );

            if (response.data.code === 0) {
                return {
                    success: true,
                    table: response.data.data.table
                };
            } else {
                throw new Error(`创建数据表失败: ${response.data.msg}`);
            }
        }, 3, 2000);

        return result;
    } catch (error) {
        console.error('创建飞书数据表失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// 查找或创建月份表格
async function findOrCreateMonthTable(accessToken, appToken, monthName) {
    try {
        // 先获取现有表格列表
        const tablesResult = await getFeishuTables(accessToken, appToken);
        if (!tablesResult.success) {
            return tablesResult;
        }

        // 查找是否已存在该月份的表格
        const existingTable = tablesResult.tables.find(table =>
            table.name === monthName || table.name.includes(monthName)
        );

        if (existingTable) {
            console.log(`找到现有表格: ${existingTable.name}`);
            return {
                success: true,
                table: existingTable,
                isNew: false
            };
        }

        // 如果不存在，创建新表格
        console.log(`创建新表格: ${monthName}`);
        const createResult = await createFeishuTable(accessToken, appToken, monthName);
        if (createResult.success) {
            return {
                success: true,
                table: createResult.table,
                isNew: true
            };
        }

        return createResult;
    } catch (error) {
        console.error('查找或创建月份表格失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// 解析花名册URL获取table ID
function parseRosterUrl(url) {
    try {
        // 从URL中提取table参数
        // 示例URL: https://wcn0pu8598xr.feishu.cn/base/WFZIbJp3qa5DV2s9MnbchUYPnze?table=tblHkoHtRQLLe1T9&view=vewOKzidxw
        const urlObj = new URL(url);
        const tableId = urlObj.searchParams.get('table');

        if (!tableId) {
            return {
                success: false,
                error: '无法从URL中解析table ID'
            };
        }

        // 从路径中提取app_token
        const pathMatch = urlObj.pathname.match(/\/base\/([a-zA-Z0-9]+)/);
        if (!pathMatch) {
            return {
                success: false,
                error: '无法从URL中解析app_token'
            };
        }

        return {
            success: true,
            appToken: pathMatch[1],
            tableId: tableId
        };
    } catch (error) {
        return {
            success: false,
            error: `解析花名册URL失败: ${error.message}`
        };
    }
}

// 从飞书花名册获取人员信息
async function getApplicantsFromFeishu() {
    try {
        const appId = process.env.FEISHU_APP_ID;
        const appSecret = process.env.FEISHU_APP_SECRET;
        const rosterUrl = process.env.FEISHU_ROSTER_URL;

        if (!appId || !appSecret || !rosterUrl) {
            console.log('飞书配置不完整，使用本地数据');
            return { success: false, error: '飞书配置不完整' };
        }

        console.log('开始从飞书花名册获取人员信息...');

        // 获取访问令牌
        const tokenResult = await getFeishuAccessToken(appId, appSecret);
        if (!tokenResult.success) {
            console.error('获取访问令牌失败:', tokenResult.error);
            return tokenResult;
        }

        // 解析花名册URL
        const rosterInfo = parseRosterUrl(rosterUrl);
        if (!rosterInfo.success) {
            console.error('解析花名册URL失败:', rosterInfo.error);
            return rosterInfo;
        }

        console.log('花名册信息:', { appToken: rosterInfo.appToken, tableId: rosterInfo.tableId });

        // 获取花名册数据
        const recordsResult = await getFeishuTableRecords(tokenResult.token, rosterInfo.appToken, rosterInfo.tableId);
        if (!recordsResult.success) {
            console.error('获取花名册数据失败:', recordsResult.error);
            return recordsResult;
        }

        console.log('获取到花名册记录数:', recordsResult.records.length);

        // 解析人员数据
        const applicantsData = recordsResult.records.map(record => {
            const fields = record.fields;
            console.log('记录字段:', Object.keys(fields));
            return {
                id: record.record_id,
                name: fields['姓名'] || fields['申请人'] || fields['名字'] || '',
                department: fields['部门'] || fields['申请部门'] || fields['所属部门'] || ''
            };
        }).filter(applicant => applicant.name && applicant.department);

        console.log('从花名册解析到人员数据:', applicantsData.length, '人');
        applicantsData.forEach(applicant => {
            console.log(`- ${applicant.name} (${applicant.department})`);
        });

        return {
            success: true,
            data: applicantsData
        };

    } catch (error) {
        console.error('从飞书获取人员信息失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// 获取飞书表格记录
async function getFeishuTableRecords(accessToken, appToken, tableId) {
    try {
        const result = await retryAsync(async () => {
            const response = await axios.get(
                `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );

            if (response.data.code === 0) {
                return {
                    success: true,
                    records: response.data.data.items
                };
            } else {
                throw new Error(`获取表格记录失败: ${response.data.msg}`);
            }
        }, 3, 1000);

        return result;
    } catch (error) {
        console.error('获取飞书表格记录失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// 获取数据表字段信息
async function getFeishuTableFields(accessToken, appToken, tableId) {
    try {
        const result = await retryAsync(async () => {
            const response = await axios.get(`https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/fields`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            if (response.data.code === 0) {
                return {
                    success: true,
                    fields: response.data.data.items
                };
            } else {
                throw new Error(`获取字段信息失败: ${response.data.msg}`);
            }
        }, 3, 1000);

        return result;
    } catch (error) {
        console.error('获取飞书表格字段失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// 写入数据到飞书表格（带重试机制）
async function writeToFeishuTable(accessToken, appToken, tableId, recordData) {
    try {
        const result = await retryAsync(async () => {
            // 使用批量创建记录的API
            const response = await axios.post(
                `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/batch_create`,
                {
                    records: [
                        {
                            fields: recordData
                        }
                    ]
                },
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 15000 // 写入数据可能需要更长时间
                }
            );

            console.log('飞书API响应:', JSON.stringify(response.data, null, 2));

            if (response.data.code === 0) {
                return {
                    success: true,
                    recordId: response.data.data.records[0]?.record_id
                };
            } else {
                throw new Error(`写入数据失败: ${response.data.msg}`);
            }
        }, 3, 2000); // 写入失败时延迟更长时间重试

        return result;
    } catch (error) {
        console.error('写入飞书数据失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// 飞书集成功能
async function writeToFeishu(expenseData) {
    try {
        console.log('开始写入飞书，数据:', expenseData);

        // 从环境变量获取配置
        const appId = process.env.FEISHU_APP_ID;
        const appSecret = process.env.FEISHU_APP_SECRET;
        const spreadsheetUrl = process.env.FEISHU_SPREADSHEET_URL;

        console.log('飞书配置:', { appId: appId ? '已配置' : '未配置', appSecret: appSecret ? '已配置' : '未配置', spreadsheetUrl });

        if (!appId || !appSecret || appId === 'your_app_id_here' || appSecret === 'your_app_secret_here') {
            console.log('飞书应用未正确配置');
            return {
                success: false,
                error: '飞书应用未配置，请先在.env文件中配置正确的App ID和App Secret'
            };
        }

        if (!spreadsheetUrl) {
            return {
                success: false,
                error: '飞书表格链接未配置'
            };
        }

        console.log('开始获取访问令牌...');
        // 获取访问令牌
        const tokenResult = await getFeishuAccessToken(appId, appSecret);
        if (!tokenResult.success) {
            console.error('获取访问令牌失败:', tokenResult.error);
            return tokenResult;
        }
        console.log('访问令牌获取成功');

        // 解析表格URL
        const tableInfo = parseFeishuUrl(spreadsheetUrl);
        if (!tableInfo.success) {
            console.error('解析表格URL失败:', tableInfo.error);
            return tableInfo;
        }
        console.log('表格信息解析成功:', tableInfo);

        console.log('开始查找或创建月份表格...');
        // 查找或创建对应月份的表格
        const monthName = expenseData.reportMonth || '当月';
        let tableResult = await findOrCreateMonthTable(tokenResult.token, tableInfo.appToken, monthName);

        // 如果创建表格失败（可能是权限问题），使用现有的第一个表格
        if (!tableResult.success) {
            console.warn('创建月份表格失败，使用现有表格:', tableResult.error);
            const tablesResult = await getFeishuTables(tokenResult.token, tableInfo.appToken);
            if (tablesResult.success && tablesResult.tables.length > 0) {
                tableResult = {
                    success: true,
                    table: tablesResult.tables[0],
                    isNew: false
                };
                console.log('使用现有表格:', tableResult.table.name);
            } else {
                console.error('获取现有表格也失败:', tablesResult.error);
                return tableResult;
            }
        }

        const tableId = tableResult.table.table_id;
        console.log(`使用表格: ${tableResult.table.name} (${tableResult.isNew ? '新创建' : '已存在'}), ID: ${tableId}`);

        // 获取表格字段信息
        console.log('开始获取表格字段信息...');
        const fieldsResult = await getFeishuTableFields(tokenResult.token, tableInfo.appToken, tableId);
        if (!fieldsResult.success) {
            console.error('获取字段信息失败:', fieldsResult.error);
            return fieldsResult;
        }

        console.log('字段信息获取成功，字段数量:', fieldsResult.fields.length);
        console.log('可用字段:', fieldsResult.fields.map(f => ({ name: f.field_name, type: f.type })));

        // 准备写入的数据（直接使用字段名）
        const recordData = {};

        // 映射数据到可用字段（根据最新表格字段，所有值转为字符串）
        const dataMapping = {
            '申请人': String(expenseData.applicant),
            '申请部门': String(expenseData.applicantDepartment || ''),
            '出差日期': expenseData.selectedDates ? expenseData.selectedDates.join(', ') : '',
            '差补类型': expenseData.allowanceType === '90' ? '实施' : '商务',
            '应享受差补天数': String(expenseData.travelDays),
            '差补金额': String(expenseData.travelAllowanceAmount),
            '应享受餐补天数': String(expenseData.mealDays),
            '餐补金额': String(expenseData.mealAllowanceAmount),
            '合计': String(expenseData.totalAmount)
        };

        // 检查字段是否存在并添加数据
        const availableFieldNames = fieldsResult.fields.map(f => f.field_name);
        for (const [fieldName, value] of Object.entries(dataMapping)) {
            if (availableFieldNames.includes(fieldName)) {
                recordData[fieldName] = value;
                console.log(`映射字段: ${fieldName} = ${value}`);
            } else {
                console.warn(`字段不存在: ${fieldName}`);
            }
        }

        console.log('准备写入飞书的数据:', recordData);

        // 写入数据
        console.log('开始写入数据到飞书表格...');
        const writeResult = await writeToFeishuTable(tokenResult.token, tableInfo.appToken, tableId, recordData);

        if (writeResult.success) {
            console.log('数据写入飞书成功，记录ID:', writeResult.recordId);
        } else {
            console.error('数据写入飞书失败:', writeResult.error);
        }

        return writeResult;

    } catch (error) {
        console.error('写入飞书过程中发生异常:', error);
        return { success: false, error: `写入飞书失败: ${error.message}` };
    }
}

app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});
