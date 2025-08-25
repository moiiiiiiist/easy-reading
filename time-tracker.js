/**
 * 学习时间统计管理器
 * 使用 Page Visibility API 跟踪用户实际的学习时间
 */
class TimeTracker {
    constructor() {
        this.isActive = true;
        this.sessionStartTime = Date.now();
        this.totalTime = 0;
        this.todayTime = 0;
        this.weekTime = 0;
        this.isTracking = false;
        
        // 会话统计
        this.sessionCount = 0;
        this.totalSessions = 0;
        
        // 每日详细记录
        this.dailyRecords = {};
        
        // 存储键
        this.STORAGE_KEY = 'reading_app_time_data';
        
        // 初始化
        this.init();
    }
    
    /**
     * 初始化时间追踪器
     */
    init() {
        // 加载历史数据
        this.loadTimeData();
        
        // 检查是否需要重置今日时间
        this.checkDateReset();
        
        // 设置页面可见性监听
        this.setupVisibilityListener();
        
        // 设置窗口关闭监听
        this.setupBeforeUnloadListener();
        
        // 开始追踪
        this.startTracking();
        
        console.log('[时间统计] 初始化完成');
    }
    
    /**
     * 设置页面可见性监听器
     */
    setupVisibilityListener() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.onPageHidden();
            } else {
                this.onPageVisible();
            }
        });
        
        // 监听窗口焦点
        window.addEventListener('focus', () => this.onPageVisible());
        window.addEventListener('blur', () => this.onPageHidden());
    }
    
    /**
     * 设置页面关闭前监听器
     */
    setupBeforeUnloadListener() {
        window.addEventListener('beforeunload', () => {
            this.stopTracking();
            this.saveTimeData();
        });
        
        // 定期保存数据
        setInterval(() => {
            if (this.isTracking) {
                this.updateTime();
                this.saveTimeData();
            }
        }, 30000); // 每30秒保存一次
    }
    
    /**
     * 页面隐藏时的处理
     */
    onPageHidden() {
        if (this.isActive) {
            this.updateTime();
            this.isActive = false;
            console.log('[时间统计] 页面隐藏，暂停计时');
        }
    }
    
    /**
     * 页面可见时的处理
     */
    onPageVisible() {
        if (!this.isActive) {
            this.sessionStartTime = Date.now();
            this.isActive = true;
            console.log('[时间统计] 页面可见，恢复计时');
        }
    }
    
    /**
     * 开始追踪时间
     */
    startTracking() {
        if (!this.isTracking) {
            this.isTracking = true;
            this.sessionStartTime = Date.now();
            console.log('[时间统计] 开始追踪学习时间');
        }
    }
    
    /**
     * 停止追踪时间
     */
    stopTracking() {
        if (this.isTracking) {
            this.updateTime();
            this.isTracking = false;
            console.log('[时间统计] 停止追踪学习时间');
        }
    }
    
    /**
     * 更新时间统计
     */
    updateTime() {
        if (!this.isActive || !this.isTracking) return;
        
        const now = Date.now();
        const sessionDuration = now - this.sessionStartTime;
        
        // 只有当会话时间大于5秒时才计入（避免频繁切换造成的误差）
        if (sessionDuration > 5000) {
            this.totalTime += sessionDuration;
            this.todayTime += sessionDuration;
            this.weekTime += sessionDuration;
            this.sessionStartTime = now;
            
            console.log(`[时间统计] 更新时间：+${Math.round(sessionDuration/1000)}秒，今日总计：${this.formatTime(this.todayTime)}`);
        }
    }
    
    /**
     * 检查日期重置
     */
    checkDateReset() {
        const today = new Date().toDateString();
        const storedData = this.getStoredData();
        
        if (storedData.lastDate !== today) {
            // 新的一天，重置今日时间但保留历史记录
            this.todayTime = 0;
            this.sessionCount = 0;
            
            // 重新计算本周时间
            this.calculateWeekTime();
            
            console.log('[时间统计] 检测到新的一天，重置今日学习时间，重新计算本周时间');
        }
    }
    
    /**
     * 计算本周学习时间
     */
    calculateWeekTime() {
        const now = new Date();
        const weekStart = this.getWeekStart(now);
        let weekTime = 0;
        
        // 遍历所有日期记录，计算本周时间
        for (const [dateStr, record] of Object.entries(this.dailyRecords)) {
            const recordDate = new Date(dateStr);
            if (recordDate >= weekStart && recordDate <= now) {
                weekTime += record.time || 0;
            }
        }
        
        this.weekTime = weekTime;
        console.log(`[时间统计] 本周学习时间：${this.formatTime(this.weekTime)}`);
    }
    
    /**
     * 获取本周开始日期（周一）
     */
    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 调整为周一开始
        const weekStart = new Date(d.setDate(diff));
        weekStart.setHours(0, 0, 0, 0);
        return weekStart;
    }
    
    /**
     * 加载时间数据
     */
    loadTimeData() {
        const data = this.getStoredData();
        this.totalTime = data.totalTime || 0;
        this.todayTime = data.todayTime || 0;
        this.weekTime = data.weekTime || 0;
        this.totalSessions = data.totalSessions || 0;
        this.dailyRecords = data.dailyRecords || {};
        
        // 检查今日会话数
        const today = new Date().toDateString();
        if (this.dailyRecords[today]) {
            this.sessionCount = this.dailyRecords[today].sessions || 0;
        } else {
            this.sessionCount = 0;
        }
        
        // 只有在开始新的计时会话时才增加会话数
        this.startNewSession();
        
        console.log(`[时间统计] 加载历史数据：总时间=${this.formatTime(this.totalTime)}, 今日时间=${this.formatTime(this.todayTime)}, 本周时间=${this.formatTime(this.weekTime)}, 今日会话数=${this.sessionCount}`);
    }
    
    /**
     * 开始新的会话
     */
    startNewSession() {
        const today = new Date().toDateString();
        const lastSessionKey = 'last_session_date';
        const lastSessionDate = localStorage.getItem(lastSessionKey);
        
        // 只有在新的一天或者距离上次会话超过30分钟才算新会话
        const now = Date.now();
        const lastUpdate = this.getStoredData().lastUpdate || 0;
        const thirtyMinutes = 30 * 60 * 1000;
        
        if (lastSessionDate !== today || (now - lastUpdate > thirtyMinutes)) {
            this.sessionCount++;
            if (lastSessionDate !== today) {
                // 新的一天，重置今日会话数
                this.sessionCount = 1;
            }
            localStorage.setItem(lastSessionKey, today);
            console.log(`[时间统计] 开始新会话，今日第${this.sessionCount}次`);
        }
    }
    
    /**
     * 保存时间数据
     */
    saveTimeData() {
        const today = new Date().toDateString();
        const now = Date.now();
        
        // 更新每日记录
        if (!this.dailyRecords[today]) {
            this.dailyRecords[today] = {
                time: 0,
                sessions: 0,
                firstSession: now,
                lastSession: now
            };
        }
        this.dailyRecords[today].time = this.todayTime;
        this.dailyRecords[today].sessions = this.sessionCount;
        this.dailyRecords[today].lastSession = now;
        
        const data = {
            totalTime: this.totalTime,
            todayTime: this.todayTime,
            weekTime: this.weekTime,
            totalSessions: this.totalSessions,
            dailyRecords: this.dailyRecords,
            lastDate: today,
            lastUpdate: now
        };
        
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    }
    
    /**
     * 获取存储的数据
     */
    getStoredData() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('[时间统计] 加载数据失败:', error);
            return {};
        }
    }
    
    /**
     * 获取今日学习时间
     * @returns {number} 毫秒数
     */
    getTodayTime() {
        this.updateTime();
        return this.todayTime;
    }
    
    /**
     * 获取总学习时间
     * @returns {number} 毫秒数
     */
    getTotalTime() {
        this.updateTime();
        return this.totalTime;
    }
    
    /**
     * 格式化时间显示
     * @param {number} ms - 毫秒数
     * @returns {string} 格式化的时间字符串
     */
    formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}小时${minutes % 60}分钟`;
        } else if (minutes > 0) {
            return `${minutes}分钟${seconds % 60}秒`;
        } else {
            return `${seconds}秒`;
        }
    }
    
    /**
     * 获取学习统计信息
     * @returns {Object} 统计信息对象
     */
    getStats() {
        this.updateTime();
        this.calculateWeekTime(); // 确保周时间是最新的
        
        return {
            todayTime: this.todayTime,
            weekTime: this.weekTime,
            totalTime: this.totalTime,
            sessionCount: this.sessionCount,
            totalSessions: this.totalSessions,
            todayFormatted: this.formatTime(this.todayTime),
            weekFormatted: this.formatTime(this.weekTime),
            totalFormatted: this.formatTime(this.totalTime),
            isTracking: this.isTracking,
            isActive: this.isActive,
            dailyRecords: this.dailyRecords
        };
    }
    
    /**
     * 导出学习数据为JSON格式
     */
    exportData() {
        this.updateTime();
        this.calculateWeekTime();
        
        const exportData = {
            exportTime: new Date().toISOString(),
            summary: {
                totalTime: this.totalTime,
                todayTime: this.todayTime,
                weekTime: this.weekTime,
                totalSessions: this.totalSessions,
                totalTimeFormatted: this.formatTime(this.totalTime),
                todayTimeFormatted: this.formatTime(this.todayTime),
                weekTimeFormatted: this.formatTime(this.weekTime)
            },
            dailyRecords: this.dailyRecords,
            rawData: this.getStoredData()
        };
        
        return exportData;
    }
    
    /**
     * 下载学习数据
     */
    downloadData() {
        const data = this.exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reading_app_stats_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('[时间统计] 数据导出完成');
    }
    
    /**
     * 获取最近7天的学习记录
     */
    getRecentWeekData() {
        const today = new Date();
        const records = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateStr = date.toDateString();
            
            const dayRecord = this.dailyRecords[dateStr] || { time: 0, sessions: 0 };
            records.push({
                date: dateStr,
                dayName: date.toLocaleDateString('zh-CN', { weekday: 'short' }),
                time: dayRecord.time,
                sessions: dayRecord.sessions,
                timeFormatted: this.formatTime(dayRecord.time)
            });
        }
        
        return records;
    }
    
    /**
     * 重置所有数据
     */
    resetAllData() {
        this.totalTime = 0;
        this.todayTime = 0;
        this.weekTime = 0;
        this.sessionCount = 0;
        this.totalSessions = 0;
        this.dailyRecords = {};
        
        // 清除存储的数据
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.removeItem('last_session_date');
        
        // 重新开始追踪
        this.sessionStartTime = Date.now();
        this.isTracking = true;
        this.startNewSession();
        
        console.log('[时间统计] 所有数据已重置');
    }
} 