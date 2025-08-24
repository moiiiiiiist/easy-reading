/**
 * 工具函数集合
 */
const Utils = {
    /**
     * 防抖函数
     * @param {Function} func - 要防抖的函数
     * @param {number} wait - 等待时间
     * @returns {Function}
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * 节流函数
     * @param {Function} func - 要节流的函数
     * @param {number} limit - 时间限制
     * @returns {Function}
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * 深拷贝对象
     * @param {*} obj - 要拷贝的对象
     * @returns {*}
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const clonedObj = {};
            Object.keys(obj).forEach(key => {
                clonedObj[key] = this.deepClone(obj[key]);
            });
            return clonedObj;
        }
    },

    /**
     * 格式化时间
     * @param {Date|number} date - 日期对象或时间戳
     * @returns {string}
     */
    formatTime(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const day = d.getDate().toString().padStart(2, '0');
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    },

    /**
     * 生成唯一ID
     * @returns {string}
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    /**
     * 清理HTML标签
     * @param {string} html - HTML字符串
     * @returns {string}
     */
    stripHtml(html) {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        return temp.textContent || temp.innerText || '';
    },

    /**
     * 高亮文本中的关键词
     * @param {string} text - 原文本
     * @param {string} keyword - 关键词
     * @param {string} className - 高亮CSS类名
     * @returns {string}
     */
    highlightText(text, keyword, className = 'highlight') {
        if (!keyword) return text;
        
        const regex = new RegExp(`(${keyword})`, 'gi');
        return text.replace(regex, `<span class="${className}">$1</span>`);
    },

    /**
     * 提取文本中的单词
     * @param {string} text - 文本内容
     * @returns {Array}
     */
    extractWords(text) {
        if (!text) return [];
        
        // 匹配英文单词
        const words = text.match(/\b[a-zA-Z]+\b/g) || [];
        
        // 去重并转为小写
        return [...new Set(words.map(word => word.toLowerCase()))];
    },

    /**
     * 检查是否为移动设备
     * @returns {boolean}
     */
    isMobile() {
        return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },

    /**
     * 平滑滚动到元素
     * @param {Element} element - 目标元素
     * @param {Object} options - 滚动选项
     */
    smoothScrollTo(element, options = {}) {
        const defaultOptions = {
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
        };
        
        element.scrollIntoView({ ...defaultOptions, ...options });
    },

    /**
     * 检查元素是否在视口中（考虑固定头部和底部）
     * @param {Element} element - 要检查的元素
     * @param {number} offset - 额外偏移量（默认100px，为固定头部/底部留空间）
     * @returns {boolean}
     */
    isInViewport(element, offset = 100) {
        const rect = element.getBoundingClientRect();
        const viewHeight = window.innerHeight || document.documentElement.clientHeight;
        const viewWidth = window.innerWidth || document.documentElement.clientWidth;
        
        return (
            rect.top >= offset &&
            rect.left >= 0 &&
            rect.bottom <= (viewHeight - offset) &&
            rect.right <= viewWidth &&
            rect.height > 0 && // 确保元素有高度
            rect.width > 0    // 确保元素有宽度
        );
    },

    /**
     * 检查元素是否接近视口底部（懒滚动检测）
     * @param {Element} element - 要检查的元素
     * @param {number} thresholdPercent - 距离底部的阈值（百分比，如0.1表示10%）
     * @returns {boolean} 如果元素接近视口底部返回true
     */
    isNearViewportBottom(element, thresholdPercent = 0.1) {
        const rect = element.getBoundingClientRect();
        const viewHeight = window.innerHeight || document.documentElement.clientHeight;
        
        // 将百分比转换为像素阈值
        const threshold = viewHeight * thresholdPercent;
        
        // 检查元素底部是否接近或超出视口底部
        return rect.bottom > (viewHeight - threshold);
    },

    /**
     * 检查元素是否接近视口顶部（懒滚动检测）
     * @param {Element} element - 要检查的元素
     * @param {number} thresholdPercent - 距离顶部的阈值（百分比，如0.1表示10%）
     * @returns {boolean} 如果元素接近视口顶部返回true
     */
    isNearViewportTop(element, thresholdPercent = 0.1) {
        const rect = element.getBoundingClientRect();
        const viewHeight = window.innerHeight || document.documentElement.clientHeight;
        
        // 将百分比转换为像素阈值
        const threshold = viewHeight * thresholdPercent;
        
        // 检查元素顶部是否接近或超出视口顶部
        return rect.top < threshold;
    },

    /**
     * 智能滚动检测 - 判断是否需要滚动（懒滚动策略）
     * @param {Element} element - 当前句子元素
     * @returns {boolean} 是否需要滚动
     */
    needsLazyScroll(element) {
        if (!element) return false;
        
        const rect = element.getBoundingClientRect();
        const viewHeight = window.innerHeight || document.documentElement.clientHeight;
        
        // 如果句子完全不在视口中，需要滚动
        if (rect.bottom <= 0 || rect.top >= viewHeight) {
            console.log('[懒滚动] 句子不在视口中，需要滚动');
            return true;
        }
        
        // 如果句子接近视口底部，需要滚动到下一页（10%阈值）
        if (this.isNearViewportBottom(element, 0.1)) {
            console.log('[懒滚动] 句子接近视口底部（10%区域），需要滚动');
            return true;
        }
        
        // 如果句子接近视口顶部，需要滚动到上一页（10%阈值）
        if (this.isNearViewportTop(element, 0.1)) {
            console.log('[懒滚动] 句子接近视口顶部（10%区域），需要滚动');
            return true;
        }
        
        console.log('[懒滚动] 句子在安全区域，不需要滚动');
        return false;
    },

    /**
     * 改进的平滑滚动到元素（专为阅读句子优化）
     * @param {Element} element - 目标元素
     * @param {Object} options - 滚动选项
     */
    smoothScrollToSentence(element, options = {}) {
        if (!element) {
            console.log('[滚动调试] smoothScrollToSentence: 元素为空');
            return;
        }
        
        console.log('[滚动调试] smoothScrollToSentence: 开始滚动到元素', element);
        
        // 智能选择滚动位置
        let blockPosition = 'start'; // 默认显示在顶部附近
        
        // 如果句子接近顶部，滚动到 start 位置（屏幕顶部）
        if (this.isNearViewportTop(element, 0.1)) {
            blockPosition = 'start';
            console.log('[滚动调试] 句子接近顶部，滚动到屏幕顶部');
        }
        // 如果句子接近底部，滚动到 start 位置
        else if (this.isNearViewportBottom(element, 0.1)) {
            blockPosition = 'start';
            console.log('[滚动调试] 句子接近底部，滚动到屏幕顶部');
        }
        
        const defaultOptions = {
            behavior: 'smooth',
            block: blockPosition,
            inline: 'nearest'
        };
        
        const finalOptions = { ...defaultOptions, ...options };
        console.log('[滚动调试] 滚动选项:', finalOptions);
        
        // 使用 requestAnimationFrame 确保 DOM 更新完成后再滚动
        requestAnimationFrame(() => {
            console.log('[滚动调试] 执行 scrollIntoView');
            element.scrollIntoView(finalOptions);
        });
    },

    /**
     * 显示提示消息
     * @param {string} message - 消息内容
     * @param {string} type - 消息类型 (success, error, warning, info)
     * @param {number} duration - 显示时长（毫秒）
     */
    showToast(message, type = 'info', duration = 3000) {
        // 移除已存在的toast
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        // 创建toast元素
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        // 添加样式
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '4px',
            color: 'white',
            fontWeight: 'bold',
            zIndex: '10000',
            animation: 'slideIn 0.3s ease',
            maxWidth: '300px',
            wordWrap: 'break-word'
        });

        // 设置不同类型的背景色
        const colors = {
            success: '#27ae60',
            error: '#e74c3c',
            warning: '#f39c12',
            info: '#3498db'
        };
        toast.style.backgroundColor = colors[type] || colors.info;

        // 添加到页面
        document.body.appendChild(toast);

        // 自动移除
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }
        }, duration);
    },

    /**
     * 加载状态管理
     * @param {Element} element - 要添加加载状态的元素
     * @param {boolean} isLoading - 是否正在加载
     */
    setLoading(element, isLoading) {
        if (isLoading) {
            element.classList.add('loading');
            element.style.pointerEvents = 'none';
        } else {
            element.classList.remove('loading');
            element.style.pointerEvents = '';
        }
    },

    /**
     * 文件读取
     * @param {File} file - 文件对象
     * @returns {Promise<string>}
     */
    readFile(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('没有选择文件'));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('文件读取失败'));
            reader.readAsText(file, 'UTF-8');
        });
    },

    /**
     * 下载文本文件
     * @param {string} content - 文件内容
     * @param {string} filename - 文件名
     * @param {string} mimeType - MIME类型
     */
    downloadFile(content, filename, mimeType = 'text/plain') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    },

    /**
     * 复制文本到剪贴板
     * @param {string} text - 要复制的文本
     * @returns {Promise<void>}
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('已复制到剪贴板', 'success');
        } catch (error) {
            // 降级方案
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            
            try {
                document.execCommand('copy');
                this.showToast('已复制到剪贴板', 'success');
            } catch (fallbackError) {
                this.showToast('复制失败', 'error');
            }
            
            document.body.removeChild(textArea);
        }
    },

    /**
     * 格式化文件大小
     * @param {number} bytes - 字节数
     * @returns {string}
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * 验证JSON格式
     * @param {string} jsonString - JSON字符串
     * @returns {boolean}
     */
    isValidJSON(jsonString) {
        try {
            JSON.parse(jsonString);
            return true;
        } catch (error) {
            return false;
        }
    },

    /**
     * 获取元素的绝对位置
     * @param {Element} element - 目标元素
     * @returns {Object}
     */
    getElementPosition(element) {
        const rect = element.getBoundingClientRect();
        return {
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
            height: rect.height
        };
    },

    /**
     * 延迟执行
     * @param {number} ms - 延迟时间（毫秒）
     * @returns {Promise}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * 格式化数字
     * @param {number} num - 数字
     * @returns {string}
     */
    formatNumber(num) {
        return new Intl.NumberFormat('zh-CN').format(num);
    }
};

// 添加CSS动画样式
if (!document.querySelector('#utils-styles')) {
    const styles = document.createElement('style');
    styles.id = 'utils-styles';
    styles.textContent = `
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateX(100%);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        
        @keyframes slideOut {
            from {
                opacity: 1;
                transform: translateX(0);
            }
            to {
                opacity: 0;
                transform: translateX(100%);
            }
        }
    `;
    document.head.appendChild(styles);
}