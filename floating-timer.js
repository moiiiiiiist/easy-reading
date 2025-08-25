/**
 * 悬浮球时间显示组件
 */
class FloatingTimer {
    constructor(timeTracker) {
        this.timeTracker = timeTracker;
        this.floatingBall = null;
        this.modal = null;
        this.updateInterval = null;
        
        this.init();
    }
    
    /**
     * 初始化悬浮球
     */
    init() {
        this.createFloatingBall();
        this.createModal();
        this.startUpdating();
        
        console.log('[悬浮计时器] 初始化完成');
    }
    
    /**
     * 创建悬浮球
     */
    createFloatingBall() {
        this.floatingBall = document.createElement('div');
        this.floatingBall.className = 'floating-timer-ball';
        this.floatingBall.innerHTML = `
            <div class="timer-icon">⏱️</div>
            <div class="timer-text">0分钟</div>
        `;
        
        // 添加点击事件
        this.floatingBall.addEventListener('click', () => {
            this.showModal();
        });
        
        // 添加到页面
        document.body.appendChild(this.floatingBall);
        
        // 使悬浮球可拖拽
        this.makeDraggable();
    }
    
    /**
     * 创建详细信息弹窗
     */
    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'timer-modal';
        this.modal.innerHTML = `
            <div class="timer-modal-content">
                <div class="timer-modal-header">
                    <h3>📚 学习时长统计</h3>
                    <button class="timer-modal-close">✕</button>
                </div>
                <div class="timer-modal-body">
                    <div class="stats-summary">
                        <div class="main-stat">
                            <div class="stat-label">今日学习时长</div>
                            <div class="stat-value large" id="todayTimeValue">0分钟</div>
                        </div>
                        <div class="sub-stats">
                            <div class="sub-stat">
                                <span class="label">本周：</span>
                                <span class="value" id="weekTimeValue">0分钟</span>
                            </div>
                            <div class="sub-stat">
                                <span class="label">累计：</span>
                                <span class="value" id="totalTimeValue">0分钟</span>
                            </div>
                            <div class="sub-stat">
                                <span class="label">今日会话：</span>
                                <span class="value" id="sessionCountValue">0</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="week-chart-section">
                        <h4>最近7天学习情况</h4>
                        <div class="week-chart" id="weekChart"></div>
                    </div>
                    
                    <div class="timer-actions">
                        <button id="exportDataBtn" class="btn primary">📊 导出数据</button>
                        <button id="resetDataBtn" class="btn secondary">🗑️ 重置数据</button>
                    </div>
                </div>
            </div>
        `;
        
        // 添加事件监听
        this.modal.querySelector('.timer-modal-close').addEventListener('click', () => {
            this.hideModal();
        });
        
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hideModal();
            }
        });
        
        // 添加导出按钮事件
        this.modal.querySelector('#exportDataBtn').addEventListener('click', () => {
            this.timeTracker.downloadData();
        });
        
        // 添加重置按钮事件
        this.modal.querySelector('#resetDataBtn').addEventListener('click', () => {
            if (confirm('确定要重置所有学习数据吗？此操作不可恢复！')) {
                this.timeTracker.resetAllData();
                this.updateModalContent();
                alert('数据已重置！');
            }
        });
        
        document.body.appendChild(this.modal);
    }
    
    /**
     * 使悬浮球可拖拽
     */
    makeDraggable() {
        let isDragging = false;
        let startX, startY, initialX, initialY;
        
        this.floatingBall.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialX = this.floatingBall.offsetLeft;
            initialY = this.floatingBall.offsetTop;
            
            this.floatingBall.style.cursor = 'grabbing';
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            let newX = initialX + deltaX;
            let newY = initialY + deltaY;
            
            // 限制在视窗范围内
            const maxX = window.innerWidth - this.floatingBall.offsetWidth;
            const maxY = window.innerHeight - this.floatingBall.offsetHeight;
            
            newX = Math.max(0, Math.min(newX, maxX));
            newY = Math.max(0, Math.min(newY, maxY));
            
            this.floatingBall.style.left = newX + 'px';
            this.floatingBall.style.top = newY + 'px';
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                this.floatingBall.style.cursor = 'pointer';
            }
        });
        
        // 触摸事件支持
        this.floatingBall.addEventListener('touchstart', (e) => {
            isDragging = true;
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            initialX = this.floatingBall.offsetLeft;
            initialY = this.floatingBall.offsetTop;
            e.preventDefault();
        });
        
        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            
            const touch = e.touches[0];
            const deltaX = touch.clientX - startX;
            const deltaY = touch.clientY - startY;
            
            let newX = initialX + deltaX;
            let newY = initialY + deltaY;
            
            const maxX = window.innerWidth - this.floatingBall.offsetWidth;
            const maxY = window.innerHeight - this.floatingBall.offsetHeight;
            
            newX = Math.max(0, Math.min(newX, maxX));
            newY = Math.max(0, Math.min(newY, maxY));
            
            this.floatingBall.style.left = newX + 'px';
            this.floatingBall.style.top = newY + 'px';
            
            e.preventDefault();
        });
        
        document.addEventListener('touchend', () => {
            isDragging = false;
        });
    }
    
    /**
     * 显示详细信息弹窗
     */
    showModal() {
        this.updateModalContent();
        this.modal.style.display = 'block';
        
        // 添加显示动画
        requestAnimationFrame(() => {
            this.modal.classList.add('show');
        });
    }
    
    /**
     * 隐藏详细信息弹窗
     */
    hideModal() {
        this.modal.classList.remove('show');
        
        setTimeout(() => {
            this.modal.style.display = 'none';
        }, 300);
    }
    
    /**
     * 更新弹窗内容
     */
    updateModalContent() {
        const stats = this.timeTracker.getStats();
        
        // 更新基础统计
        this.modal.querySelector('#todayTimeValue').textContent = stats.todayFormatted;
        this.modal.querySelector('#weekTimeValue').textContent = stats.weekFormatted;
        this.modal.querySelector('#totalTimeValue').textContent = stats.totalFormatted;
        
        // 更新会话统计
        this.modal.querySelector('#sessionCountValue').textContent = stats.sessionCount;
        
        // 更新最近7天数据
        this.updateWeekChart(stats);
    }
    
    /**
     * 更新最近7天学习图表
     */
    updateWeekChart(stats) {
        const weekData = this.timeTracker.getRecentWeekData();
        const chartContainer = this.modal.querySelector('#weekChart');
        
        chartContainer.innerHTML = '';
        
        weekData.forEach(day => {
            const dayElement = document.createElement('div');
            dayElement.className = 'day-stats';
            
            const maxTime = Math.max(...weekData.map(d => d.time), 1); // 避免除以0
            const heightPercent = (day.time / maxTime) * 100;
            
            dayElement.innerHTML = `
                <div class="day-bar" style="height: ${heightPercent}%"></div>
                <div class="day-label">${day.dayName}</div>
                <div class="day-time">${day.timeFormatted}</div>
                <div class="day-sessions">${day.sessions}次</div>
            `;
            
            chartContainer.appendChild(dayElement);
        });
    }
    
    /**
     * 更新悬浮球显示
     */
    updateDisplay() {
        const stats = this.timeTracker.getStats();
        const timerText = this.floatingBall.querySelector('.timer-text');
        
        // 显示今日学习时间
        timerText.textContent = stats.todayFormatted;
        
        // 更新悬浮球状态样式
        if (stats.isTracking && stats.isActive) {
            this.floatingBall.classList.add('active');
            this.floatingBall.classList.remove('paused');
        } else if (stats.isTracking && !stats.isActive) {
            this.floatingBall.classList.add('paused');
            this.floatingBall.classList.remove('active');
        } else {
            this.floatingBall.classList.remove('active', 'paused');
        }
    }
    
    /**
     * 开始定期更新
     */
    startUpdating() {
        // 立即更新一次
        this.updateDisplay();
        
        // 每5秒更新一次显示
        this.updateInterval = setInterval(() => {
            this.updateDisplay();
        }, 5000);
    }
    
    /**
     * 停止更新
     */
    stopUpdating() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    /**
     * 销毁悬浮球
     */
    destroy() {
        this.stopUpdating();
        
        if (this.floatingBall) {
            this.floatingBall.remove();
        }
        
        if (this.modal) {
            this.modal.remove();
        }
        
        console.log('[悬浮计时器] 已销毁');
    }
} 