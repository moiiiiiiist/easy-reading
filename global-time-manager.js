/**
 * 全局时间管理器 - 确保整个应用只有一个TimeTracker实例
 */
class GlobalTimeManager {
    constructor() {
        this.timeTracker = null;
        this.floatingTimer = null;
        this.isInitialized = false;
    }
    
    /**
     * 获取时间追踪器实例（单例模式）
     * @returns {TimeTracker} 时间追踪器实例
     */
    getTimeTracker() {
        if (!this.timeTracker) {
            this.timeTracker = new TimeTracker();
            console.log('[全局时间管理器] 创建TimeTracker实例');
        }
        return this.timeTracker;
    }
    
    /**
     * 获取悬浮计时器实例（单例模式）
     * @returns {FloatingTimer} 悬浮计时器实例
     */
    getFloatingTimer() {
        if (!this.floatingTimer) {
            this.floatingTimer = new FloatingTimer(this.getTimeTracker());
            console.log('[全局时间管理器] 创建FloatingTimer实例');
        }
        return this.floatingTimer;
    }
    
    /**
     * 初始化时间统计功能
     * @param {string} pageName - 页面名称，用于日志
     */
    initTimeTracking(pageName = 'Unknown') {
        try {
            // 确保只初始化一次
            if (this.isInitialized) {
                console.log(`[全局时间管理器] ${pageName}页面复用已有的时间统计实例`);
                const timeTracker = this.getTimeTracker();
                const floatingTimer = this.getFloatingTimer();
                
                // 根据页面类型控制悬浮球显示
                if (pageName === '阅读页面') {
                    floatingTimer.hide();
                    console.log(`[全局时间管理器] 阅读页面隐藏悬浮球`);
                } else {
                    floatingTimer.show();
                }
                
                return { timeTracker, floatingTimer };
            }
            
            // 创建实例
            const timeTracker = this.getTimeTracker();
            const floatingTimer = this.getFloatingTimer();
            
            // 根据页面类型控制悬浮球显示
            if (pageName === '阅读页面') {
                floatingTimer.hide();
                console.log(`[全局时间管理器] 阅读页面隐藏悬浮球`);
            } else {
                floatingTimer.show();
            }
            
            this.isInitialized = true;
            console.log(`[全局时间管理器] ${pageName}页面时间统计功能初始化完成`);
            
            return { timeTracker, floatingTimer };
        } catch (error) {
            console.error(`[全局时间管理器] ${pageName}页面时间统计功能初始化失败:`, error);
            return { timeTracker: null, floatingTimer: null };
        }
    }
    
    /**
     * 页面切换时的处理
     * @param {string} fromPage - 离开的页面
     * @param {string} toPage - 进入的页面
     */
    handlePageTransition(fromPage, toPage) {
        console.log(`[全局时间管理器] 页面切换: ${fromPage} -> ${toPage}`);
        
        // 根据目标页面控制悬浮球显示
        if (this.floatingTimer) {
            if (toPage === '阅读页面') {
                this.floatingTimer.hide();
                console.log(`[全局时间管理器] 切换到阅读页面，隐藏悬浮球`);
            } else {
                this.floatingTimer.show();
                console.log(`[全局时间管理器] 切换到${toPage}，显示悬浮球`);
            }
        }
        
        // 保持时间追踪的连续性，不需要重新开始计时
        if (this.timeTracker && this.timeTracker.isTracking) {
            console.log('[全局时间管理器] 继续计时，无需重启');
        }
    }
    
    /**
     * 销毁时间统计功能（用于页面卸载时）
     */
    destroy() {
        if (this.timeTracker) {
            this.timeTracker.stopTracking();
        }
        if (this.floatingTimer) {
            this.floatingTimer.hide();
        }
        console.log('[全局时间管理器] 时间统计功能已销毁');
    }
}

// 创建全局实例
window.globalTimeManager = window.globalTimeManager || new GlobalTimeManager(); 