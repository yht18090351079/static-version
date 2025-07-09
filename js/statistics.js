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
const dateRangeFilter = document.getElementById('dateRangeFilter');
const startDate = document.getElementById('startDate');
const endDate = document.getElementById('endDate');
const monthFilter = document.getElementById('monthFilter');
const departmentFilter = document.getElementById('departmentFilter');
const typeFilter = document.getElementById('typeFilter');
const amountFilter = document.getElementById('amountFilter');
const clearFiltersBtn = document.getElementById('clearFilters');
const refreshDataBtn = document.getElementById('refreshData');
const exportDataBtn = document.getElementById('exportData');
const printReportBtn = document.getElementById('printReport');

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
    dateRangeFilter.addEventListener('change', handleDateRangeChange);
    startDate.addEventListener('change', applyFilters);
    endDate.addEventListener('change', applyFilters);
    monthFilter.addEventListener('change', applyFilters);
    departmentFilter.addEventListener('change', applyFilters);
    typeFilter.addEventListener('change', applyFilters);
    amountFilter.addEventListener('change', applyFilters);

    // 按钮事件
    clearFiltersBtn.addEventListener('click', clearAllFilters);
    refreshDataBtn.addEventListener('click', loadExpenseData);
    exportDataBtn.addEventListener('click', exportData);
    printReportBtn.addEventListener('click', printReport);

    // 分页事件
    prevPageBtn.addEventListener('click', () => changePage(currentPage - 1));
    nextPageBtn.addEventListener('click', () => changePage(currentPage + 1));

    // 图表类型切换事件
    document.querySelectorAll('.chart-type-btn').forEach(btn => {
        btn.addEventListener('click', handleChartTypeChange);
    });

    // 洞察和分析事件
    document.getElementById('refreshInsights').addEventListener('click', updateInsights);
    document.getElementById('generateComparison').addEventListener('click', generateComparison);
    document.getElementById('runAnomalyDetection').addEventListener('click', runAnomalyDetection);
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

// 处理日期范围变化
function handleDateRangeChange() {
    const customDateGroup = document.getElementById('customDateGroup');
    const customDateGroup2 = document.getElementById('customDateGroup2');

    if (dateRangeFilter.value === 'custom') {
        customDateGroup.style.display = 'flex';
        customDateGroup2.style.display = 'flex';
    } else {
        customDateGroup.style.display = 'none';
        customDateGroup2.style.display = 'none';
        applyFilters();
    }
}

// 清空所有筛选
function clearAllFilters() {
    dateRangeFilter.value = '';
    startDate.value = '';
    endDate.value = '';
    monthFilter.value = '';
    departmentFilter.value = '';
    typeFilter.value = '';
    amountFilter.value = '';

    document.getElementById('customDateGroup').style.display = 'none';
    document.getElementById('customDateGroup2').style.display = 'none';

    applyFilters();
}

// 应用筛选条件
function applyFilters() {
    const selectedDateRange = dateRangeFilter.value;
    const selectedStartDate = startDate.value;
    const selectedEndDate = endDate.value;
    const selectedMonth = monthFilter.value;
    const selectedDepartment = departmentFilter.value;
    const selectedType = typeFilter.value;
    const selectedAmountRange = amountFilter.value;

    filteredData = expenseData.filter(item => {
        // 日期范围筛选
        let matchesDateRange = true;
        if (selectedDateRange) {
            const now = new Date();
            const itemDate = new Date(item.submitTime);

            switch (selectedDateRange) {
                case 'thisMonth':
                    matchesDateRange = itemDate.getMonth() === now.getMonth() &&
                                     itemDate.getFullYear() === now.getFullYear();
                    break;
                case 'lastMonth':
                    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
                    matchesDateRange = itemDate.getMonth() === lastMonth.getMonth() &&
                                     itemDate.getFullYear() === lastMonth.getFullYear();
                    break;
                case 'thisQuarter':
                    const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3);
                    matchesDateRange = itemDate >= quarterStart;
                    break;
                case 'thisYear':
                    matchesDateRange = itemDate.getFullYear() === now.getFullYear();
                    break;
                case 'custom':
                    if (selectedStartDate && selectedEndDate) {
                        const start = new Date(selectedStartDate);
                        const end = new Date(selectedEndDate);
                        matchesDateRange = itemDate >= start && itemDate <= end;
                    }
                    break;
            }
        }

        // 其他筛选条件
        const matchesMonth = !selectedMonth || item.month === selectedMonth;
        const matchesDepartment = !selectedDepartment || item.department === selectedDepartment;
        const matchesType = !selectedType || item.type === selectedType;

        // 金额范围筛选
        let matchesAmount = true;
        if (selectedAmountRange) {
            const amount = item.totalAmount;
            switch (selectedAmountRange) {
                case '0-500':
                    matchesAmount = amount >= 0 && amount <= 500;
                    break;
                case '500-1000':
                    matchesAmount = amount > 500 && amount <= 1000;
                    break;
                case '1000-2000':
                    matchesAmount = amount > 1000 && amount <= 2000;
                    break;
                case '2000+':
                    matchesAmount = amount > 2000;
                    break;
            }
        }

        return matchesDateRange && matchesMonth && matchesDepartment && matchesType && matchesAmount;
    });

    // 更新显示
    updateOverviewStats();
    updateCharts();
    updateTable();
    updateInsights();
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
    try {
        updateDepartmentChart();
        updateMonthChart();
        updateTypeChart();
        updatePersonChart();
    } catch (error) {
        console.error('更新图表失败:', error);
    }
}

// 更新部门费用统计图表
function updateDepartmentChart(chartType = 'bar') {
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

    const chartConfig = {
        type: chartType,
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
                    display: chartType === 'pie' || chartType === 'doughnut'
                }
            }
        }
    };

    // 根据图表类型设置不同的选项
    if (chartType === 'bar') {
        chartConfig.options.scales = {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function(value) {
                        return '¥' + value.toLocaleString();
                    }
                }
            }
        };
    }

    charts.departmentChart = new Chart(ctx, chartConfig);
}

// 更新月份趋势图表
function updateMonthChart(chartType = 'line') {
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

    const chartConfig = {
        type: chartType,
        data: {
            labels: labels,
            datasets: [{
                label: '费用金额 (元)',
                data: data,
                borderColor: '#3498db',
                backgroundColor: chartType === 'line' ? 'rgba(52, 152, 219, 0.1)' : '#3498db',
                borderWidth: chartType === 'line' ? 3 : 1,
                fill: chartType === 'line',
                tension: chartType === 'line' ? 0.4 : 0
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
    };

    charts.monthChart = new Chart(ctx, chartConfig);
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
        type: 'bar',
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
            indexAxis: 'y', // 这使得条形图变为水平
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
    try {
        if (chartId === 'departmentChart') {
            updateDepartmentChart(chartType);
        } else if (chartId === 'monthChart') {
            updateMonthChart(chartType);
        }
    } catch (error) {
        console.error('切换图表类型失败:', error);
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

// 更新数据洞察
function updateInsights() {
    if (filteredData.length === 0) {
        // 清空洞察数据
        document.getElementById('topDepartment').textContent = '-';
        document.getElementById('topDepartmentAmount').textContent = '¥0';
        document.getElementById('topEmployee').textContent = '-';
        document.getElementById('topEmployeeAmount').textContent = '¥0';
        document.getElementById('topMonth').textContent = '-';
        document.getElementById('topMonthAmount').textContent = '¥0';
        document.getElementById('avgAmount').textContent = '¥0';
        document.getElementById('avgDays').textContent = '平均0天';
        document.getElementById('trendDirection').textContent = '-';
        document.getElementById('trendPercent').textContent = '0%';
        document.getElementById('activityLevel').textContent = '-';
        document.getElementById('activityDetail').textContent = '-';
        return;
    }

    // 部门费用统计
    const departmentStats = {};
    filteredData.forEach(item => {
        departmentStats[item.department] = (departmentStats[item.department] || 0) + item.totalAmount;
    });
    const topDept = Object.entries(departmentStats).sort(([,a], [,b]) => b - a)[0];
    document.getElementById('topDepartment').textContent = topDept[0];
    document.getElementById('topDepartmentAmount').textContent = `¥${topDept[1].toLocaleString()}`;

    // 员工费用统计
    const employeeStats = {};
    filteredData.forEach(item => {
        const key = `${item.applicant} (${item.department})`;
        employeeStats[key] = (employeeStats[key] || 0) + item.totalAmount;
    });
    const topEmp = Object.entries(employeeStats).sort(([,a], [,b]) => b - a)[0];
    document.getElementById('topEmployee').textContent = topEmp[0];
    document.getElementById('topEmployeeAmount').textContent = `¥${topEmp[1].toLocaleString()}`;

    // 月份费用统计
    const monthStats = {};
    filteredData.forEach(item => {
        monthStats[item.month] = (monthStats[item.month] || 0) + item.totalAmount;
    });
    const topMonth = Object.entries(monthStats).sort(([,a], [,b]) => b - a)[0];
    document.getElementById('topMonth').textContent = topMonth[0];
    document.getElementById('topMonthAmount').textContent = `¥${topMonth[1].toLocaleString()}`;

    // 平均费用和天数
    const totalAmount = filteredData.reduce((sum, item) => sum + item.totalAmount, 0);
    const totalDays = filteredData.reduce((sum, item) => sum + item.travelDays, 0);
    const avgAmount = totalAmount / filteredData.length;
    const avgDays = totalDays / filteredData.length;
    document.getElementById('avgAmount').textContent = `¥${Math.round(avgAmount).toLocaleString()}`;
    document.getElementById('avgDays').textContent = `平均${Math.round(avgDays)}天`;

    // 费用趋势（简单的月度对比）
    const months = Object.keys(monthStats).sort();
    if (months.length >= 2) {
        const lastMonth = monthStats[months[months.length - 1]];
        const prevMonth = monthStats[months[months.length - 2]];
        const trend = ((lastMonth - prevMonth) / prevMonth * 100);
        document.getElementById('trendDirection').textContent = trend > 0 ? '上升' : '下降';
        document.getElementById('trendPercent').textContent = `${Math.abs(trend).toFixed(1)}%`;
    } else {
        document.getElementById('trendDirection').textContent = '稳定';
        document.getElementById('trendPercent').textContent = '0%';
    }

    // 活跃度分析
    const uniqueApplicants = new Set(filteredData.map(item => item.applicant)).size;
    const totalApplicants = new Set(expenseData.map(item => item.applicant)).size;
    const activityRate = (uniqueApplicants / totalApplicants * 100);

    let activityLevel = '低';
    if (activityRate > 70) activityLevel = '高';
    else if (activityRate > 40) activityLevel = '中';

    document.getElementById('activityLevel').textContent = activityLevel;
    document.getElementById('activityDetail').textContent = `${uniqueApplicants}/${totalApplicants}人活跃`;
}

// 生成对比分析
function generateComparison() {
    const comparisonType = document.getElementById('comparisonType').value;
    const comparisonChart = document.getElementById('comparisonChart');
    const comparisonTableHead = document.getElementById('comparisonTableHead');
    const comparisonTableBody = document.getElementById('comparisonTableBody');

    let data = {};
    let headers = [];
    let rows = [];

    switch (comparisonType) {
        case 'department':
            // 部门对比
            filteredData.forEach(item => {
                if (!data[item.department]) {
                    data[item.department] = { count: 0, amount: 0, days: 0 };
                }
                data[item.department].count++;
                data[item.department].amount += item.totalAmount;
                data[item.department].days += item.travelDays;
            });

            headers = ['部门', '申请次数', '总金额', '总天数', '平均金额'];
            rows = Object.entries(data).map(([dept, stats]) => [
                dept,
                stats.count,
                `¥${stats.amount.toLocaleString()}`,
                `${stats.days}天`,
                `¥${Math.round(stats.amount / stats.count).toLocaleString()}`
            ]);
            break;

        case 'month':
            // 月份对比
            filteredData.forEach(item => {
                if (!data[item.month]) {
                    data[item.month] = { count: 0, amount: 0, days: 0 };
                }
                data[item.month].count++;
                data[item.month].amount += item.totalAmount;
                data[item.month].days += item.travelDays;
            });

            headers = ['月份', '申请次数', '总金额', '总天数', '平均金额'];
            rows = Object.entries(data).map(([month, stats]) => [
                month,
                stats.count,
                `¥${stats.amount.toLocaleString()}`,
                `${stats.days}天`,
                `¥${Math.round(stats.amount / stats.count).toLocaleString()}`
            ]);
            break;

        case 'type':
            // 类型对比
            filteredData.forEach(item => {
                if (!data[item.type]) {
                    data[item.type] = { count: 0, amount: 0, days: 0 };
                }
                data[item.type].count++;
                data[item.type].amount += item.totalAmount;
                data[item.type].days += item.travelDays;
            });

            headers = ['类型', '申请次数', '总金额', '总天数', '平均金额'];
            rows = Object.entries(data).map(([type, stats]) => [
                type,
                stats.count,
                `¥${stats.amount.toLocaleString()}`,
                `${stats.days}天`,
                `¥${Math.round(stats.amount / stats.count).toLocaleString()}`
            ]);
            break;

        case 'person':
            // 人员对比
            filteredData.forEach(item => {
                const key = `${item.applicant} (${item.department})`;
                if (!data[key]) {
                    data[key] = { count: 0, amount: 0, days: 0 };
                }
                data[key].count++;
                data[key].amount += item.totalAmount;
                data[key].days += item.travelDays;
            });

            headers = ['员工', '申请次数', '总金额', '总天数', '平均金额'];
            rows = Object.entries(data)
                .sort(([,a], [,b]) => b.amount - a.amount)
                .slice(0, 10)
                .map(([person, stats]) => [
                    person,
                    stats.count,
                    `¥${stats.amount.toLocaleString()}`,
                    `${stats.days}天`,
                    `¥${Math.round(stats.amount / stats.count).toLocaleString()}`
                ]);
            break;
    }

    // 更新表格
    comparisonTableHead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
    comparisonTableBody.innerHTML = rows.map(row =>
        `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`
    ).join('');

    // 更新图表
    updateComparisonChart(data, comparisonType);
}

// 更新对比图表
function updateComparisonChart(data, type) {
    const ctx = document.getElementById('comparisonChart').getContext('2d');

    if (charts.comparisonChart) {
        charts.comparisonChart.destroy();
    }

    const labels = Object.keys(data);
    const amounts = Object.values(data).map(item => item.amount);

    charts.comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '费用金额 (元)',
                data: amounts,
                backgroundColor: '#3498db',
                borderColor: '#2980b9',
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

// 运行异常检测
function runAnomalyDetection() {
    const anomalyResults = document.getElementById('anomalyResults');
    const anomalies = [];

    if (filteredData.length === 0) {
        anomalyResults.innerHTML = `
            <div class="no-anomalies">
                <div class="no-data-icon">✅</div>
                <div class="no-data-text">暂无数据进行异常检测</div>
            </div>
        `;
        return;
    }

    // 计算统计指标
    const amounts = filteredData.map(item => item.totalAmount);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(amounts.reduce((sq, n) => sq + Math.pow(n - avgAmount, 2), 0) / amounts.length);

    // 检测异常高额费用
    const highThreshold = avgAmount + 2 * stdDev;
    filteredData.forEach(item => {
        if (item.totalAmount > highThreshold) {
            anomalies.push({
                type: 'high_amount',
                title: '异常高额费用',
                description: `${item.applicant} (${item.department}) 在 ${item.month} 的费用 ¥${item.totalAmount.toLocaleString()} 超出正常范围`,
                severity: 'warning'
            });
        }
    });

    // 检测异常长时间出差
    const days = filteredData.map(item => item.travelDays);
    const avgDays = days.reduce((a, b) => a + b, 0) / days.length;
    const dayThreshold = avgDays + 2 * Math.sqrt(days.reduce((sq, n) => sq + Math.pow(n - avgDays, 2), 0) / days.length);

    filteredData.forEach(item => {
        if (item.travelDays > dayThreshold) {
            anomalies.push({
                type: 'long_travel',
                title: '异常长时间出差',
                description: `${item.applicant} (${item.department}) 在 ${item.month} 出差 ${item.travelDays} 天，超出正常范围`,
                severity: 'info'
            });
        }
    });

    // 检测频繁申请
    const applicantCounts = {};
    filteredData.forEach(item => {
        applicantCounts[item.applicant] = (applicantCounts[item.applicant] || 0) + 1;
    });

    const avgApplications = Object.values(applicantCounts).reduce((a, b) => a + b, 0) / Object.keys(applicantCounts).length;
    Object.entries(applicantCounts).forEach(([applicant, count]) => {
        if (count > avgApplications * 2) {
            anomalies.push({
                type: 'frequent_applications',
                title: '频繁申请',
                description: `${applicant} 申请次数 ${count} 次，明显高于平均水平`,
                severity: 'info'
            });
        }
    });

    // 显示结果
    if (anomalies.length === 0) {
        anomalyResults.innerHTML = `
            <div class="no-anomalies">
                <div class="no-data-icon">✅</div>
                <div class="no-data-text">未发现异常数据</div>
            </div>
        `;
    } else {
        anomalyResults.innerHTML = anomalies.map(anomaly => `
            <div class="anomaly-item">
                <div class="anomaly-icon">⚠️</div>
                <div class="anomaly-content">
                    <div class="anomaly-title">${anomaly.title}</div>
                    <div class="anomaly-description">${anomaly.description}</div>
                </div>
            </div>
        `).join('');
    }
}

// 打印报告
function printReport() {
    const printWindow = window.open('', '_blank');
    const printContent = generatePrintContent();

    printWindow.document.write(`
        <html>
        <head>
            <title>差旅费用统计报告</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .section { margin-bottom: 20px; }
                .section h3 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 5px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f8f9fa; }
                .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 20px; }
                .stat-card { border: 1px solid #ddd; padding: 15px; text-align: center; }
                .stat-value { font-size: 1.5em; font-weight: bold; color: #3498db; }
                @media print { body { margin: 0; } }
            </style>
        </head>
        <body>
            ${printContent}
        </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.print();
}

// 生成打印内容
function generatePrintContent() {
    const now = new Date().toLocaleDateString('zh-CN');
    const totalAmount = filteredData.reduce((sum, item) => sum + item.totalAmount, 0);
    const totalDays = filteredData.reduce((sum, item) => sum + item.travelDays, 0);
    const uniqueApplicants = new Set(filteredData.map(item => item.applicant)).size;

    return `
        <div class="header">
            <h1>差旅费用统计报告</h1>
            <p>生成时间: ${now}</p>
            <p>数据范围: ${filteredData.length} 条记录</p>
        </div>

        <div class="section">
            <h3>概览统计</h3>
            <div class="stats-grid">
                <div class="stat-card">
                    <div>总申请人数</div>
                    <div class="stat-value">${uniqueApplicants}</div>
                </div>
                <div class="stat-card">
                    <div>总申请次数</div>
                    <div class="stat-value">${filteredData.length}</div>
                </div>
                <div class="stat-card">
                    <div>总费用金额</div>
                    <div class="stat-value">¥${totalAmount.toLocaleString()}</div>
                </div>
                <div class="stat-card">
                    <div>总出差天数</div>
                    <div class="stat-value">${totalDays}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h3>详细数据</h3>
            <table>
                <thead>
                    <tr>
                        <th>申请人</th>
                        <th>部门</th>
                        <th>月份</th>
                        <th>类型</th>
                        <th>天数</th>
                        <th>金额</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredData.map(item => `
                        <tr>
                            <td>${item.applicant}</td>
                            <td>${item.department}</td>
                            <td>${item.month}</td>
                            <td>${item.type}</td>
                            <td>${item.travelDays}</td>
                            <td>¥${item.totalAmount.toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// 显示消息
function showMessage(message, type = 'info') {
    // 简单的消息显示实现
    alert(message);
}

console.log('✅ 统计分析脚本已加载');
