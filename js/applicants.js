// 申请人管理模块
let applicants = [];
let filteredApplicants = [];

// DOM元素
const sourceStatus = document.getElementById('sourceStatus');
const searchInput = document.getElementById('searchInput');
const departmentFilter = document.getElementById('departmentFilter');
const refreshDataBtn = document.getElementById('refreshData');
const applicantsGrid = document.getElementById('applicantsGrid');
const totalCount = document.getElementById('totalCount');
const filteredCount = document.getElementById('filteredCount');
const departmentStats = document.getElementById('departmentStats');
const applicantDetailModal = document.getElementById('applicantDetailModal');
const applicantDetailInfo = document.getElementById('applicantDetailInfo');

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 申请人管理页面初始化...');
    loadApplicants();
    bindEvents();
});

// 绑定事件
function bindEvents() {
    // 搜索输入
    searchInput.addEventListener('input', handleSearch);
    
    // 部门筛选
    departmentFilter.addEventListener('change', handleFilter);
    
    // 刷新数据
    refreshDataBtn.addEventListener('click', refreshApplicants);
    
    // 模态框关闭
    document.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal') || event.target.classList.contains('close')) {
            applicantDetailModal.style.display = 'none';
        }
    });
}

// 加载申请人数据
async function loadApplicants() {
    try {
        updateSourceStatus('loading', '正在从飞书花名册加载数据...');
        showLoading(refreshDataBtn, '加载中...');
        
        // 从飞书花名册获取数据
        console.log('开始调用飞书API获取申请人数据...');
        const feishuResult = await window.feishuAPI.getApplicantsFromRoster();
        console.log('飞书API返回结果:', feishuResult);

        if (feishuResult.success && feishuResult.data.length > 0) {
            applicants = feishuResult.data;
            updateSourceStatus('success', `✅ 已从飞书花名册加载 ${applicants.length} 人 (来源: ${feishuResult.source || 'feishu'})`);
            console.log('✅ 从飞书花名册获取到申请人:', applicants.length, '人');
            console.log('申请人数据详情:', applicants);
        } else {
            // 使用本地备用数据
            applicants = [
                { id: 1, name: '张三', department: '技术部' },
                { id: 2, name: '李四', department: '市场部' },
                { id: 3, name: '王五', department: '财务部' },
                { id: 4, name: '赵六', department: '人事部' },
                { id: 5, name: '袁昊天', department: '商务部' },
                { id: 6, name: '陈小明', department: '技术部' },
                { id: 7, name: '刘小红', department: '人事部' },
                { id: 8, name: '王大力', department: '市场部' }
            ];
            updateSourceStatus('fallback', `⚠️ 使用本地数据 (${applicants.length} 人) - 原因: ${feishuResult.error || '飞书数据为空'}`);
            console.log('⚠️ 使用本地备用数据，原因:', feishuResult.error || '飞书数据为空');
        }
        
        // 更新显示
        updateDepartmentFilter();
        applyFilters();
        updateDepartmentStats();
        
    } catch (error) {
        console.error('加载申请人失败:', error);
        updateSourceStatus('error', '❌ 数据加载失败');
        showMessage('加载申请人数据失败: ' + error.message, 'error');
    } finally {
        hideLoading(refreshDataBtn);
    }
}

// 刷新申请人数据
async function refreshApplicants() {
    await loadApplicants();
    showMessage('数据已刷新', 'success');
}

// 更新数据源状态
function updateSourceStatus(status, text) {
    const statusIcon = sourceStatus.querySelector('.status-icon');
    const statusText = sourceStatus.querySelector('.status-text');
    
    // 更新图标
    switch (status) {
        case 'loading':
            statusIcon.textContent = '⏳';
            break;
        case 'success':
            statusIcon.textContent = '📊';
            break;
        case 'fallback':
            statusIcon.textContent = '💾';
            break;
        case 'error':
            statusIcon.textContent = '❌';
            break;
    }
    
    statusText.textContent = text;
}

// 更新部门筛选器
function updateDepartmentFilter() {
    const departments = [...new Set(applicants.map(a => a.department))].sort();
    
    departmentFilter.innerHTML = '<option value="">所有部门</option>';
    departments.forEach(department => {
        const option = document.createElement('option');
        option.value = department;
        option.textContent = department;
        departmentFilter.appendChild(option);
    });
}

// 处理搜索
function handleSearch() {
    applyFilters();
}

// 处理筛选
function handleFilter() {
    applyFilters();
}

// 应用筛选条件
function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const selectedDepartment = departmentFilter.value;
    
    filteredApplicants = applicants.filter(applicant => {
        const matchesSearch = !searchTerm || 
            applicant.name.toLowerCase().includes(searchTerm) ||
            applicant.department.toLowerCase().includes(searchTerm);
        
        const matchesDepartment = !selectedDepartment || 
            applicant.department === selectedDepartment;
        
        return matchesSearch && matchesDepartment;
    });
    
    updateApplicantsList();
    updateCounts();
}

// 更新申请人列表显示
function updateApplicantsList() {
    if (filteredApplicants.length === 0) {
        applicantsGrid.innerHTML = `
            <div class="no-data">
                <div class="no-data-icon">👥</div>
                <div class="no-data-text">没有找到匹配的申请人</div>
            </div>
        `;
        return;
    }
    
    applicantsGrid.innerHTML = filteredApplicants.map(applicant => `
        <div class="applicant-card" onclick="showApplicantDetail('${applicant.id}')">
            <div class="applicant-avatar">
                <span class="avatar-text">${applicant.name.charAt(0)}</span>
            </div>
            <div class="applicant-info">
                <div class="applicant-name">${applicant.name}</div>
                <div class="applicant-department">${applicant.department}</div>
            </div>
            <div class="applicant-actions">
                <button type="button" class="btn-detail" onclick="event.stopPropagation(); showApplicantDetail('${applicant.id}')">
                    详情
                </button>
            </div>
        </div>
    `).join('');
}

// 更新计数显示
function updateCounts() {
    totalCount.textContent = `总计: ${applicants.length} 人`;
    
    if (filteredApplicants.length !== applicants.length) {
        filteredCount.textContent = `筛选结果: ${filteredApplicants.length} 人`;
        filteredCount.style.display = 'inline';
    } else {
        filteredCount.style.display = 'none';
    }
}

// 更新部门统计
function updateDepartmentStats() {
    const departmentCounts = {};
    
    applicants.forEach(applicant => {
        departmentCounts[applicant.department] = (departmentCounts[applicant.department] || 0) + 1;
    });
    
    const sortedDepartments = Object.entries(departmentCounts)
        .sort(([,a], [,b]) => b - a);
    
    departmentStats.innerHTML = sortedDepartments.map(([department, count]) => `
        <div class="stat-card">
            <div class="stat-department">${department}</div>
            <div class="stat-count">${count} 人</div>
            <div class="stat-percentage">${((count / applicants.length) * 100).toFixed(1)}%</div>
        </div>
    `).join('');
}

// 显示申请人详情
function showApplicantDetail(applicantId) {
    const applicant = applicants.find(a => a.id == applicantId);
    if (!applicant) return;
    
    applicantDetailInfo.innerHTML = `
        <div class="detail-header">
            <div class="detail-avatar">
                <span class="avatar-text large">${applicant.name.charAt(0)}</span>
            </div>
            <div class="detail-basic">
                <h4>${applicant.name}</h4>
                <p>${applicant.department}</p>
            </div>
        </div>
        <div class="detail-fields">
            <div class="detail-field">
                <label>姓名:</label>
                <span>${applicant.name}</span>
            </div>
            <div class="detail-field">
                <label>部门:</label>
                <span>${applicant.department}</span>
            </div>
            <div class="detail-field">
                <label>记录ID:</label>
                <span>${applicant.id}</span>
            </div>
        </div>
    `;
    
    applicantDetailModal.style.display = 'block';
}

// 显示消息
function showMessage(message, type = 'info') {
    const messageContainer = document.getElementById('messageContainer') || createMessageContainer();
    
    const messageElement = document.createElement('div');
    messageElement.className = `message message-${type}`;
    messageElement.textContent = message;
    
    messageContainer.appendChild(messageElement);
    
    // 3秒后自动移除
    setTimeout(() => {
        if (messageElement.parentNode) {
            messageElement.parentNode.removeChild(messageElement);
        }
    }, 3000);
}

// 创建消息容器
function createMessageContainer() {
    let container = document.getElementById('messageContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'messageContainer';
        container.className = 'message-container';
        document.body.appendChild(container);
    }
    return container;
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

console.log('✅ 申请人管理脚本已加载');
