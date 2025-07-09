// 飞书API集成模块 - 备用方案（使用本地数据）
class FeishuAPIAlternative {
    constructor() {
        // 飞书配置
        this.config = {
            APP_ID: 'cli_a8d4bd05dbf8100b',
            APP_SECRET: 'IRUdgTp1k825LXp1kz2W4gxcvaRAqtcv',
            SPREADSHEET_URL: 'https://wcn0pu8598xr.feishu.cn/base/WFZIbJp3qa5DV2s9MnbchUYPnze',
            ROSTER_URL: 'https://wcn0pu8598xr.feishu.cn/base/WFZIbJp3qa5DV2s9MnbchUYPnze?table=tblHkoHtRQLLe1T9&view=vewOKzidxw'
        };
        
        // 本地存储的数据
        this.localData = {
            applicants: [
                { id: 1, name: '张三', department: '技术部' },
                { id: 2, name: '李四', department: '市场部' },
                { id: 3, name: '王五', department: '财务部' },
                { id: 4, name: '赵六', department: '人事部' },
                { id: 5, name: '袁昊天', department: '商务部' },
                { id: 6, name: '陈小明', department: '技术部' },
                { id: 7, name: '刘小红', department: '人事部' },
                { id: 8, name: '王大力', department: '市场部' }
            ],
            expenses: []
        };
        
        // 从localStorage加载数据
        this.loadLocalData();
    }

    // 加载本地数据
    loadLocalData() {
        try {
            const savedExpenses = localStorage.getItem('feishu_expenses');
            if (savedExpenses) {
                this.localData.expenses = JSON.parse(savedExpenses);
            }
        } catch (error) {
            console.warn('加载本地数据失败:', error);
        }
    }

    // 保存本地数据
    saveLocalData() {
        try {
            localStorage.setItem('feishu_expenses', JSON.stringify(this.localData.expenses));
        } catch (error) {
            console.warn('保存本地数据失败:', error);
        }
    }

    // 模拟获取访问令牌
    async getAccessToken() {
        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 500));
        return { 
            success: true, 
            token: 'mock_token_' + Date.now() 
        };
    }

    // 从花名册获取申请人数据
    async getApplicantsFromRoster() {
        try {
            console.log('从本地数据获取申请人信息...');
            
            // 模拟网络延迟
            await new Promise(resolve => setTimeout(resolve, 800));
            
            console.log('✅ 从本地数据获取到申请人:', this.localData.applicants.length, '人');
            return { 
                success: true, 
                data: this.localData.applicants 
            };
        } catch (error) {
            console.error('❌ 获取申请人失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 提交费用数据
    async submitExpense(expenseData) {
        try {
            console.log('开始提交费用数据到本地存储...');
            
            // 模拟网络延迟
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 生成记录ID
            const recordId = 'rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            // 创建费用记录
            const expenseRecord = {
                record_id: recordId,
                fields: {
                    '申请人': String(expenseData.applicant),
                    '申请部门': String(expenseData.applicantDepartment || ''),
                    '申请月份': String(expenseData.reportMonth || ''),
                    '出差日期': expenseData.selectedDates ? expenseData.selectedDates.join(', ') : '',
                    '差补类型': expenseData.allowanceType === '90' ? '实施' : '商务',
                    '应享受差补天数': String(expenseData.travelDays),
                    '差补金额': String(expenseData.travelAllowanceAmount),
                    '应享受餐补天数': String(expenseData.mealDays),
                    '餐补金额': String(expenseData.mealAllowanceAmount),
                    '合计': String(expenseData.totalAmount)
                },
                created_time: new Date().toISOString(),
                last_modified_time: new Date().toISOString()
            };
            
            // 保存到本地数据
            this.localData.expenses.push(expenseRecord);
            this.saveLocalData();
            
            console.log('✅ 费用数据已保存到本地存储');
            console.log('记录详情:', expenseRecord);
            
            // 模拟飞书API响应格式
            return { 
                success: true, 
                data: {
                    records: [expenseRecord]
                }
            };
            
        } catch (error) {
            console.error('❌ 提交费用数据失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 获取已提交的费用记录
    async getExpenseRecords() {
        try {
            console.log('从本地存储获取费用记录...');
            
            // 模拟网络延迟
            await new Promise(resolve => setTimeout(resolve, 300));
            
            return {
                success: true,
                records: this.localData.expenses
            };
        } catch (error) {
            console.error('获取费用记录失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 清空本地数据（用于测试）
    clearLocalData() {
        this.localData.expenses = [];
        this.saveLocalData();
        console.log('✅ 本地数据已清空');
    }

    // 导出数据（用于备份）
    exportData() {
        return {
            applicants: this.localData.applicants,
            expenses: this.localData.expenses,
            exportTime: new Date().toISOString()
        };
    }

    // 获取统计信息
    getStatistics() {
        const expenses = this.localData.expenses;
        const totalRecords = expenses.length;
        const totalAmount = expenses.reduce((sum, record) => {
            return sum + (parseInt(record.fields['合计']) || 0);
        }, 0);
        
        const departmentStats = {};
        expenses.forEach(record => {
            const dept = record.fields['申请部门'];
            if (dept) {
                departmentStats[dept] = (departmentStats[dept] || 0) + 1;
            }
        });
        
        return {
            totalRecords,
            totalAmount,
            departmentStats,
            lastSubmission: expenses.length > 0 ? expenses[expenses.length - 1].created_time : null
        };
    }
}

// 检测是否支持CORS，如果不支持则使用备用方案
async function detectCORSSupport() {
    try {
        // 尝试一个简单的CORS请求
        const response = await fetch('https://httpbin.org/get', {
            method: 'GET',
            mode: 'cors'
        });
        return response.ok;
    } catch (error) {
        return false;
    }
}

// 智能选择API实现
async function createFeishuAPI() {
    console.log('检测CORS支持...');
    
    // 先尝试检测CORS支持
    const corsSupported = await detectCORSSupport();
    
    if (corsSupported) {
        console.log('✅ CORS支持正常，使用完整飞书API');
        return new FeishuAPI();
    } else {
        console.log('⚠️ CORS受限，使用本地数据方案');
        return new FeishuAPIAlternative();
    }
}

// 如果主API失败，自动切换到备用方案
window.feishuAPIAlternative = new FeishuAPIAlternative();

console.log('✅ 飞书API备用模块已加载');
