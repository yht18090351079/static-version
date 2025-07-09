const axios = require('axios');

// 飞书配置
const FEISHU_CONFIG = {
    APP_ID: 'cli_a8d4bd05dbf8100b',
    APP_SECRET: 'IRUdgTp1k825LXp1kz2W4gxcvaRAqtcv',
    ROSTER_URL: 'https://wcn0pu8598xr.feishu.cn/base/WFZIbJp3qa5DV2s9MnbchUYPnze?table=tblHkoHtRQLLe1T9&view=vewOKzidxw'
};

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

// 备用申请人数据
const fallbackApplicants = [
    { name: '张三', department: '技术部', employee_id: 'EMP001' },
    { name: '李四', department: '市场部', employee_id: 'EMP002' },
    { name: '王五', department: '财务部', employee_id: 'EMP003' },
    { name: '赵六', department: '人事部', employee_id: 'EMP004' },
    { name: '钱七', department: '运营部', employee_id: 'EMP005' }
];

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
        console.log('开始获取申请人数据...');

        // 尝试从飞书获取数据
        const tokenResult = await getFeishuAccessToken();
        if (!tokenResult.success) {
            throw new Error('无法获取访问令牌');
        }

        // 解析花名册URL
        const urlInfo = parseFeishuUrl(FEISHU_CONFIG.ROSTER_URL);
        if (!urlInfo.success) {
            throw new Error('无法解析花名册URL');
        }

        console.log('从飞书花名册获取数据...', urlInfo.appToken, urlInfo.tableId);

        // 调用飞书API获取花名册数据
        const response = await axios.get(
            `https://open.feishu.cn/open-apis/bitable/v1/apps/${urlInfo.appToken}/tables/${urlInfo.tableId}/records`,
            {
                headers: {
                    'Authorization': `Bearer ${tokenResult.token}`,
                    'Content-Type': 'application/json'
                },
                params: {
                    page_size: 100
                }
            }
        );

        if (response.data.code !== 0) {
            throw new Error(`获取花名册数据失败: ${response.data.msg}`);
        }

        // 处理返回的数据
        const records = response.data.data.items || [];
        const applicants = records.map(record => {
            const fields = record.fields;
            return {
                name: fields['姓名'] || fields['员工姓名'] || fields['申请人'] || '未知',
                department: fields['部门'] || fields['所属部门'] || fields['申请部门'] || '未知部门',
                employee_id: fields['工号'] || fields['员工编号'] || record.record_id
            };
        }).filter(applicant => applicant.name !== '未知');

        console.log(`✅ 从飞书花名册获取到申请人: ${applicants.length} 人`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                data: applicants.length > 0 ? applicants : fallbackApplicants,
                source: applicants.length > 0 ? 'feishu' : 'fallback',
                message: applicants.length > 0 ? '从飞书获取成功' : '飞书数据为空，使用备用数据'
            })
        };

    } catch (error) {
        console.error('❌ 获取申请人失败:', error);
        console.error('错误堆栈:', error.stack);

        // 更详细的错误信息
        let errorMessage = error.message || '获取申请人失败';
        if (error.response) {
            console.error('API响应错误:', error.response.data);
            errorMessage = `API错误: ${error.response.data.msg || error.response.statusText}`;
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                data: fallbackApplicants,
                source: 'fallback',
                error: errorMessage,
                details: error.response?.data || null
            })
        };
    }
};
