// 测试字段映射脚本
const axios = require('axios');

// 飞书配置
const FEISHU_CONFIG = {
    APP_ID: 'cli_a8d4bd05dbf8100b',
    APP_SECRET: 'IRUdgTp1k825LXp1kz2W4gxcvaRAqtcv',
    SPREADSHEET_URL: 'https://wcn0pu8598xr.feishu.cn/base/WFZIbJp3qa5DV2s9MnbchUYPnze'
};

// 获取访问令牌
async function getAccessToken() {
    try {
        const response = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
            app_id: FEISHU_CONFIG.APP_ID,
            app_secret: FEISHU_CONFIG.APP_SECRET
        });

        if (response.data.code === 0) {
            return { success: true, token: response.data.tenant_access_token };
        } else {
            throw new Error(`获取访问令牌失败: ${response.data.msg}`);
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// 解析URL
function parseFeishuUrl(url) {
    const match = url.match(/\/base\/([a-zA-Z0-9]+)/);
    if (!match) {
        throw new Error('无法解析飞书表格URL');
    }
    return { appToken: match[1] };
}

// 获取表格信息
async function getTableInfo() {
    try {
        console.log('🔍 开始检查表格结构...');
        
        // 获取访问令牌
        const tokenResult = await getAccessToken();
        if (!tokenResult.success) {
            throw new Error(tokenResult.error);
        }
        console.log('✅ 访问令牌获取成功');

        // 解析URL
        const { appToken } = parseFeishuUrl(FEISHU_CONFIG.SPREADSHEET_URL);
        console.log('📊 应用Token:', appToken);

        // 获取表格列表
        const tablesResponse = await axios.get(
            `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables`,
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
        console.log(`📋 找到 ${tables.length} 个表格:`);
        
        for (const table of tables) {
            console.log(`  - ${table.name} (${table.table_id})`);
        }

        // 查找6月表格
        const targetTable = tables.find(table => 
            table.name.includes('6月') || table.name.includes('六月')
        ) || tables[0];

        console.log(`\n🎯 使用表格: ${targetTable.name}`);

        // 获取字段信息
        const fieldsResponse = await axios.get(
            `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${targetTable.table_id}/fields`,
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

        const fields = fieldsResponse.data.data.items;
        console.log(`\n📝 表格字段 (${fields.length}个):`);
        
        fields.forEach(field => {
            console.log(`  - ${field.field_name} (类型: ${field.type})`);
        });

        // 测试字段映射
        console.log('\n🔍 测试字段映射:');
        const testMappings = [
            '申请人', '姓名', '员工姓名',
            '申请部门', '部门', '所属部门',
            '出差日期', '差旅日期', '日期',
            '差补类型', '补贴类型',
            '应享受差补天数', '差补天数', '出差天数',
            '差补金额', '差旅补贴',
            '应享受餐补天数', '餐补天数',
            '餐补金额', '餐费补贴',
            '合计', '总计', '总金额'
        ];

        const fieldMap = {};
        fields.forEach(field => {
            fieldMap[field.field_name] = field;
        });

        testMappings.forEach(fieldName => {
            if (fieldMap[fieldName]) {
                console.log(`  ✅ ${fieldName} - 存在 (类型: ${fieldMap[fieldName].type})`);
            } else {
                console.log(`  ❌ ${fieldName} - 不存在`);
            }
        });

        return {
            appToken,
            table: targetTable,
            fields: fields,
            fieldMap: fieldMap
        };

    } catch (error) {
        console.error('❌ 检查失败:', error.message);
        throw error;
    }
}

// 测试数据写入
async function testWrite(tableInfo) {
    try {
        console.log('\n🧪 测试数据写入...');
        
        const tokenResult = await getAccessToken();
        if (!tokenResult.success) {
            throw new Error(tokenResult.error);
        }

        // 准备测试数据 (所有字段都是文本类型，需要转为字符串)
        const testData = {
            '申请人': '测试用户',
            '申请部门': '测试部门',
            '出差日期': '2025-06-15, 2025-06-16',
            '差补类型': '商务',
            '应享受差补天数': '2',
            '差补金额': '180',
            '应享受餐补天数': '2',
            '餐补金额': '60',
            '合计': '240'
        };

        // 只保留存在的字段
        const finalData = {};
        for (const [fieldName, value] of Object.entries(testData)) {
            if (tableInfo.fieldMap[fieldName]) {
                finalData[fieldName] = value;
                console.log(`  ✅ ${fieldName}: ${value}`);
            } else {
                console.log(`  ❌ ${fieldName}: 字段不存在`);
            }
        }

        if (Object.keys(finalData).length === 0) {
            throw new Error('没有可用的字段进行测试');
        }

        console.log('\n📤 准备写入的数据:', finalData);

        // 写入数据 (使用批量创建API)
        const writeResponse = await axios.post(
            `https://open.feishu.cn/open-apis/bitable/v1/apps/${tableInfo.appToken}/tables/${tableInfo.table.table_id}/records/batch_create`,
            {
                records: [{ fields: finalData }]
            },
            {
                headers: {
                    'Authorization': `Bearer ${tokenResult.token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (writeResponse.data.code === 0) {
            console.log('✅ 测试写入成功!');
            console.log('记录ID:', writeResponse.data.data.records[0].record_id);
        } else {
            console.log('❌ 测试写入失败:', writeResponse.data);
            if (writeResponse.data.error && writeResponse.data.error.field_violations) {
                console.log('字段验证错误详情:');
                writeResponse.data.error.field_violations.forEach(violation => {
                    console.log(`  - 字段: ${violation.field}`);
                    console.log(`  - 错误: ${violation.description}`);
                });
            }
        }

    } catch (error) {
        console.error('❌ 测试写入失败:', error.message);
        if (error.response) {
            console.error('错误详情:', error.response.data);
            if (error.response.data.error && error.response.data.error.field_violations) {
                console.log('\n字段验证错误详情:');
                error.response.data.error.field_violations.forEach(violation => {
                    console.log(`  - 字段: ${violation.field}`);
                    console.log(`  - 错误: ${violation.description}`);
                });
            }
        }
    }
}

// 主函数
async function main() {
    try {
        const tableInfo = await getTableInfo();
        await testWrite(tableInfo);
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        process.exit(1);
    }
}

// 运行测试
if (require.main === module) {
    main();
}

module.exports = { getTableInfo, testWrite };
