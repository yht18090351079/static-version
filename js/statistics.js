// 统计分析模块
let expenseData = [];
let filteredData = [];
let charts = {};

// 分页配置
const ITEMS_PER_PAGE = 20;
let currentPage = 1;
let totalPages = 1;

// DOM元素
const dataSourceStatus = document.getElementById('dataSourceStatus');
const monthFilter = document.getElementById('monthFilter');
const departmentFilter = document.getElementById('departmentFilter');
const typeFilter = document.getElementById('typeFilter');
const refreshDataBtn = document.getElementById('refreshData');
const exportDataBtn = document.getElementById('exportData');

// 概览统计元素
const totalApplicants = document.getElementById('totalApplicants');
const totalApplications = document.getElementById('totalApplications');
const totalAmount = document.getElementById('totalAmount');
const totalDays = document.getElementById('totalDays');

// 表格元素
const tableBody = document.getElementById('tableBody');
const paginationInfo = document.getElementById('paginationInfo');
const currentPageSpan = document.getElementById('currentPage');
const totalPagesSpan = document.getElementById('totalPages');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 统计分析页面初始化...');
    loadExpenseData();
    bindEvents();
});

// 绑定事件
function bindEvents() {
    // 筛选器事件
    monthFilter.addEventListener('change', applyFilters);
    departmentFilter.addEventListener('change', applyFilters);
    typeFilter.addEventListener('change', applyFilters);
    
    // 按钮事件
    refreshDataBtn.addEventListener('click', loadExpenseData);
    exportDataBtn.addEventListener('click', exportData);
    
    // 分页事件
    prevPageBtn.addEventListener('click', () => changePage(currentPage - 1));
    nextPageBtn.addEventListener('click', () => changePage(currentPage + 1));
    
    // 图表类型切换事件
    document.querySelectorAll('.chart-type-btn').forEach(btn => {
        btn.addEventListener('click', handleChartTypeChange);
    });
}

// 加载费用数据
async function loadExpenseData() {
    try {
        updateDataSourceStatus('loading', '正在从飞书加载费用数据...');
        showLoading(refreshDataBtn, '加载中...');

        // 从飞书获取费用数据
        const response = await fetch(`${window.feishuAPI.proxyUrl}/get-statistics`);
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            expenseData = result.data;
            updateDataSourceStatus('success', `✅ 已从飞书加载 ${expenseData.length} 条费用记录`);
            console.log('✅ 从飞书获取到费用数据:', expenseData.length, '条');
        } else {
            // 使用模拟数据作为备用
            expenseData = generateMockData();
            updateDataSourceStatus('fallback', `⚠️ 使用模拟数据 (${expenseData.length} 条) - 原因: ${result.message || '飞书数据为空'}`);
            console.log('⚠️ 使用模拟数据，原因:', result.message || '飞书数据为空');
        }

        // 更新筛选器选项
        updateFilterOptions();

        // 应用筛选并更新显示
        applyFilters();

    } catch (error) {
        console.error('加载费用数据失败:', error);

        // 使用模拟数据作为备用
        expenseData = generateMockData();
        updateDataSourceStatus('fallback', `⚠️ 使用模拟数据 (${expenseData.length} 条) - 网络错误`);

        // 更新筛选器选项
        updateFilterOptions();
        applyFilters();

        showMessage('从飞书加载数据失败，使用模拟数据: ' + error.message, 'warning');
    } finally {
        hideLoading(refreshDataBtn);
    }
}

// 生成模拟数据（实际应用中应该从飞书API获取）
function generateMockData() {
    const departments = ['技术部', '市场部', '财务部', '人事部', '商务部'];
    const names = ['张三', '李四', '王五', '赵六', '袁昊天', '陈小明', '刘小红', '王大力'];
    const types = ['商务', '实施'];
    const months = ['1月', '2月', '3月', '4月', '5月', '6月'];
    
    const data = [];
    
    for (let i = 0; i < 100; i++) {
        const department = departments[Math.floor(Math.random() * departments.length)];
        const name = names[Math.floor(Math.random() * names.length)];
        const type = types[Math.floor(Math.random() * types.length)];
        const month = months[Math.floor(Math.random() * months.length)];
        const travelDays = Math.floor(Math.random() * 10) + 1;
        const mealDays = Math.floor(Math.random() * travelDays) + 1;
        const travelAmount = type === '商务' ? travelDays * 90 : travelDays * 60;
        const mealAmount = mealDays * 30;
        const totalAmount = travelAmount + mealAmount;
        
        data.push({
            id: i + 1,
            applicant: name,
            department: department,
            month: month,
            dates: `2024-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
            type: type,
            travelDays: travelDays,
            travelAmount: travelAmount,
            mealDays: mealDays,
            mealAmount: mealAmount,
            totalAmount: totalAmount,
            submitTime: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toLocaleDateString('zh-CN')
        });
    }
    
    return data;
}

// 更新数据源状态
function updateDataSourceStatus(status, text) {
    const statusIcon = document.querySelector('.status-icon');
    
    switch (status) {
        case 'loading':
            statusIcon.textContent = '⏳';
            break;
        case 'success':
            statusIcon.textContent = '📊';
            break;
        case 'error':
            statusIcon.textContent = '❌';
            break;
    }
    
    dataSourceStatus.textContent = text;
}

// 更新筛选器选项
function updateFilterOptions() {
    // 更新月份筛选器
    const months = [...new Set(expenseData.map(item => item.month))].sort();
    monthFilter.innerHTML = '<option value="">所有月份</option>';
    months.forEach(month => {
        const option = document.createElement('option');
        option.value = month;
        option.textContent = month;
        monthFilter.appendChild(option);
    });
    
    // 更新部门筛选器
    const departments = [...new Set(expenseData.map(item => item.department))].sort();
    departmentFilter.innerHTML = '<option value="">所有部门</option>';
    departments.forEach(department => {
        const option = document.createElement('option');
        option.value = department;
        option.textContent = department;
        departmentFilter.appendChild(option);
    });
}

// 应用筛选条件
function applyFilters() {
    const selectedMonth = monthFilter.value;
    const selectedDepartment = departmentFilter.value;
    const selectedType = typeFilter.value;
    
    filteredData = expenseData.filter(item => {
        const matchesMonth = !selectedMonth || item.month === selectedMonth;
        const matchesDepartment = !selectedDepartment || item.department === selectedDepartment;
        const matchesType = !selectedType || item.type === selectedType;
        
        return matchesMonth && matchesDepartment && matchesType;
    });
    
    // 更新显示
    updateOverviewStats();
    updateCharts();
    updateTable();
}

// 更新概览统计
function updateOverviewStats() {
    const uniqueApplicants = new Set(filteredData.map(item => item.applicant)).size;
    const totalApps = filteredData.length;
    const totalAmt = filteredData.reduce((sum, item) => sum + item.totalAmount, 0);
    const totalTravelDays = filteredData.reduce((sum, item) => sum + item.travelDays, 0);
    
    totalApplicants.textContent = uniqueApplicants;
    totalApplications.textContent = totalApps;
    totalAmount.textContent = `¥${totalAmt.toLocaleString()}`;
    totalDays.textContent = totalTravelDays;
}

// 显示加载状态
function showLoading(button, text) {
    button.disabled = true;
    button.dataset.originalText = button.textContent;
    button.innerHTML = `<span class="loading"></span> ${text}`;
}

// 隐藏加载状态
function hideLoading(button) {
    button.disabled = false;
    button.textContent = button.dataset.originalText || '刷新数据';
}

// 更新图表
function updateCharts() {
    updateDepartmentChart();
    updateMonthChart();
    updateTypeChart();
    updatePersonChart();
}

// 更新部门费用统计图表
function updateDepartmentChart() {
    const ctx = document.getElementById('departmentChart').getContext('2d');

    // 按部门统计费用
    const departmentStats = {};
    filteredData.forEach(item => {
        departmentStats[item.department] = (departmentStats[item.department] || 0) + item.totalAmount;
    });

    const labels = Object.keys(departmentStats);
    const data = Object.values(departmentStats);

    if (charts.departmentChart) {
        charts.departmentChart.destroy();
    }

    charts.departmentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '费用金额 (元)',
                data: data,
                backgroundColor: [
                    '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
                    '#1abc9c', '#34495e', '#e67e22', '#95a5a6', '#d35400'
                ],
                borderColor: '#2c3e50',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '¥' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// 更新月份趋势图表
function updateMonthChart() {
    const ctx = document.getElementById('monthChart').getContext('2d');

    // 按月份统计费用
    const monthStats = {};
    filteredData.forEach(item => {
        monthStats[item.month] = (monthStats[item.month] || 0) + item.totalAmount;
    });

    // 按月份顺序排序
    const monthOrder = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    const labels = monthOrder.filter(month => monthStats[month]);
    const data = labels.map(month => monthStats[month]);

    if (charts.monthChart) {
        charts.monthChart.destroy();
    }

    charts.monthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '费用金额 (元)',
                data: data,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '¥' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// 更新差补类型统计图表
function updateTypeChart() {
    const ctx = document.getElementById('typeChart').getContext('2d');

    // 按类型统计费用
    const typeStats = {};
    filteredData.forEach(item => {
        typeStats[item.type] = (typeStats[item.type] || 0) + item.totalAmount;
    });

    const labels = Object.keys(typeStats);
    const data = Object.values(typeStats);

    if (charts.typeChart) {
        charts.typeChart.destroy();
    }

    charts.typeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: ['#3498db', '#e74c3c'],
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// 更新人员费用排行图表
function updatePersonChart() {
    const ctx = document.getElementById('personChart').getContext('2d');

    // 按人员统计费用
    const personStats = {};
    filteredData.forEach(item => {
        const key = `${item.applicant} (${item.department})`;
        personStats[key] = (personStats[key] || 0) + item.totalAmount;
    });

    // 排序并取前10名
    const sortedPersons = Object.entries(personStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);

    const labels = sortedPersons.map(([name]) => name);
    const data = sortedPersons.map(([,amount]) => amount);

    if (charts.personChart) {
        charts.personChart.destroy();
    }

    charts.personChart = new Chart(ctx, {
        type: 'horizontalBar',
        data: {
            labels: labels,
            datasets: [{
                label: '费用金额 (元)',
                data: data,
                backgroundColor: '#2ecc71',
                borderColor: '#27ae60',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '¥' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// 更新表格
function updateTable() {
    totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    currentPage = Math.min(currentPage, totalPages || 1);

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredData.length);
    const pageData = filteredData.slice(startIndex, endIndex);

    // 更新表格内容
    tableBody.innerHTML = pageData.map(item => `
        <tr>
            <td>${item.applicant}</td>
            <td>${item.department}</td>
            <td>${item.month}</td>
            <td>${item.dates}</td>
            <td>${item.type}</td>
            <td>${item.travelDays}</td>
            <td>¥${item.travelAmount.toLocaleString()}</td>
            <td>${item.mealDays}</td>
            <td>¥${item.mealAmount.toLocaleString()}</td>
            <td><strong>¥${item.totalAmount.toLocaleString()}</strong></td>
            <td>${item.submitTime}</td>
        </tr>
    `).join('');

    // 更新分页信息
    updatePagination();
}

// 更新分页信息
function updatePagination() {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const endIndex = Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length);

    paginationInfo.textContent = `显示 ${startIndex} - ${endIndex} 条，共 ${filteredData.length} 条记录`;
    currentPageSpan.textContent = currentPage;
    totalPagesSpan.textContent = totalPages;

    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
}

// 切换页面
function changePage(page) {
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        updateTable();
    }
}

// 处理图表类型切换
function handleChartTypeChange(event) {
    const button = event.target;
    const chartId = button.dataset.chart;
    const chartType = button.dataset.type;

    // 更新按钮状态
    button.parentNode.querySelectorAll('.chart-type-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    button.classList.add('active');

    // 重新创建图表
    if (chartId === 'departmentChart') {
        updateDepartmentChart();
    } else if (chartId === 'monthChart') {
        updateMonthChart();
    }
}

// 导出数据
function exportData() {
    const csvContent = generateCSV(filteredData);
    downloadCSV(csvContent, 'expense_statistics.csv');
}

// 生成CSV内容
function generateCSV(data) {
    const headers = ['申请人', '部门', '申请月份', '出差日期', '差补类型', '差补天数', '差补金额', '餐补天数', '餐补金额', '合计金额', '填报时间'];
    const rows = data.map(item => [
        item.applicant,
        item.department,
        item.month,
        item.dates,
        item.type,
        item.travelDays,
        item.travelAmount,
        item.mealDays,
        item.mealAmount,
        item.totalAmount,
        item.submitTime
    ]);

    const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

    return csvContent;
}

// 下载CSV文件
function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// 显示消息
function showMessage(message, type = 'info') {
    // 简单的消息显示实现
    alert(message);
}

console.log('✅ 统计分析脚本已加载');
