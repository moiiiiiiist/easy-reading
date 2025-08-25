/**
 * 基础应用类 - 提供通用功能
 */
class BaseApp {
    constructor() {
        // 初始化各个管理器
        this.storage = new StorageManager();
        this.splitter = new SentenceSplitter();
        this.googleAPI = new GoogleAPIService();
        this.audioManager = new AudioManager();
        
        // 设置音频管理器的Google API引用
        this.audioManager.setGoogleAPIService(this.googleAPI);
        
        // 应用状态
        this.currentArticle = null;
        this.currentArticleId = null;
        this.isPlaying = false;
        this.explanations = new Map(); // 存储解释内容
        
        // DOM元素缓存
        this.elements = {};
    }

    /**
     * 加载当前文章
     */
    loadCurrentArticle() {
        this.currentArticleId = this.storage.getCurrentArticleId();
        if (this.currentArticleId) {
            this.currentArticle = this.storage.getArticle(this.currentArticleId);
        }
        return this.currentArticle;
    }

    /**
     * 处理文件上传 - 通用方法
     * @param {Event} event - 文件上传事件
     * @param {Element} uploadBtn - 上传按钮元素
     */
    async handleFileUpload(event, uploadBtn) {
        const file = event.target.files[0];
        if (!file) return null;
        
        try {
            Utils.setLoading(uploadBtn, true);
            
            // 读取文件内容
            const content = await Utils.readFile(file);
            
            // 分割句子并保留段落信息
            const { sentences, paragraphBreaks } = this.splitter.splitIntoSentencesWithBreaks(content);
            
            if (sentences.length === 0) {
                Utils.showToast('文件内容为空或格式不正确', 'error');
                return null;
            }
            
            // 统计信息
            const stats = this.splitter.getTextStats(content, sentences);
            
            // 创建文章数据
            const articleData = {
                title: file.name.replace('.txt', ''),
                content: content,
                sentences: sentences,
                paragraphBreaks: paragraphBreaks,
                stats: stats,
                timestamp: Date.now()
            };
            
            // 保存文章数据
            const articleId = this.storage.saveArticle(articleData);
            this.currentArticleId = articleId;
            this.storage.setCurrentArticleId(articleId);
            this.currentArticle = this.storage.getArticle(articleId);
            
            Utils.showToast('文章导入成功', 'success');
            return this.currentArticle;
            
        } catch (error) {
            console.error('文件上传失败:', error);
            Utils.showToast('文件读取失败: ' + error.message, 'error');
            return null;
        } finally {
            Utils.setLoading(uploadBtn, false);
        }
    }

    /**
     * 处理文本导入
     * @param {string} content - 粘贴的文本内容
     * @param {string} customTitle - 用户输入的自定义标题
     * @param {Element} importBtn - 导入按钮元素
     */
    async handleTextImport(content, customTitle, importBtn) {
        if (!content || content.trim() === '') {
            Utils.showToast('请输入文章内容', 'error');
            return null;
        }
        
        try {
            Utils.setLoading(importBtn, true);
            
            const trimmedContent = content.trim();
            
            // 分割句子并保留段落信息
            const { sentences, paragraphBreaks } = this.splitter.splitIntoSentencesWithBreaks(trimmedContent);
            
            if (sentences.length === 0) {
                Utils.showToast('文本内容为空或格式不正确', 'error');
                return null;
            }
            
            // 生成标题：使用自定义标题或前5个单词
            let title = customTitle && customTitle.trim() !== '' 
                ? customTitle.trim() 
                : this.generateTitleFromContent(trimmedContent);
            
            // 统计信息
            const stats = this.splitter.getTextStats(trimmedContent, sentences);
            
            // 创建文章数据
            const articleData = {
                title: title,
                content: trimmedContent,
                sentences: sentences,
                paragraphBreaks: paragraphBreaks,
                stats: stats,
                timestamp: Date.now()
            };
            
            // 保存文章数据
            const articleId = this.storage.saveArticle(articleData);
            this.currentArticleId = articleId;
            this.storage.setCurrentArticleId(articleId);
            this.currentArticle = this.storage.getArticle(articleId);
            
            Utils.showToast('文章导入成功', 'success');
            return this.currentArticle;
            
        } catch (error) {
            console.error('文本导入失败:', error);
            Utils.showToast('文本导入失败: ' + error.message, 'error');
            return null;
        } finally {
            Utils.setLoading(importBtn, false);
        }
    }

    /**
     * 从内容生成标题（使用前5个单词）
     * @param {string} content - 文章内容
     * @returns {string} 生成的标题
     */
    generateTitleFromContent(content) {
        // 清理文本：移除多余的换行符和空格
        const cleanText = content.replace(/\s+/g, ' ').trim();
        
        // 按空格分割单词
        const words = cleanText.split(' ');
        
        // 取前5个单词，如果不足5个就全部使用
        const titleWords = words.slice(0, 5);
        
        // 组合成标题，如果原文很长则加省略号
        let title = titleWords.join(' ');
        if (words.length > 5) {
            title += '...';
        }
        
        // 限制标题长度，避免过长
        if (title.length > 50) {
            title = title.substring(0, 47) + '...';
        }
        
        return title || '未命名文章';
    }

    /**
     * 更新文章列表 - 通用方法
     * @param {Element} container - 文章列表容器
     * @param {string} appInstanceName - 应用实例名称 (如 'mainApp' 或 'app')
     */
    updateArticleList(container, appInstanceName) {
        const articles = this.storage.getArticleList();
        
        container.innerHTML = '';
        
        if (articles.length === 0) {
            const placeholder = document.createElement('p');
            placeholder.className = 'placeholder';
            placeholder.textContent = '暂无文章，请先导入文章';
            container.appendChild(placeholder);
            return;
        }
        
        articles.forEach(article => {
            const articleItem = document.createElement('div');
            articleItem.className = 'article-item';
            articleItem.dataset.articleId = article.id;
            
            if (article.id === this.currentArticleId) {
                articleItem.classList.add('active');
            }
            
            articleItem.innerHTML = `
                <div class="article-info">
                    <div class="article-title">${article.title}</div>
                    <div class="article-meta">
                        ${this.splitter.formatStats(article.stats)} | 
                        ${Utils.formatTime(article.createdAt)}
                    </div>
                </div>
                <div class="article-actions">
                    <button class="btn primary" onclick="${appInstanceName}.selectArticle('${article.id}')">选择</button>
                    <button class="btn secondary" onclick="${appInstanceName}.deleteArticle('${article.id}')">删除</button>
                </div>
            `;
            
            container.appendChild(articleItem);
        });
    }

    /**
     * 选择文章
     * @param {string} articleId - 文章ID
     */
    selectArticle(articleId) {
        this.currentArticleId = articleId;
        this.storage.setCurrentArticleId(articleId);
        this.currentArticle = this.storage.getArticle(articleId);
        
        // 子类需要重写这个方法来更新界面
        this.onArticleSelected();
    }

    /**
     * 删除文章
     * @param {string} articleId - 文章ID
     */
    deleteArticle(articleId) {
        if (confirm('确定要删除这篇文章吗？')) {
            this.storage.deleteArticle(articleId);
            
            // 如果删除的是当前文章，清空预览
            if (articleId === this.currentArticleId) {
                this.currentArticleId = null;
                this.currentArticle = null;
                this.onArticleCleared();
            }
            
            this.onArticleDeleted();
            Utils.showToast('文章已删除', 'success');
        }
    }

    /**
     * 播放单词发音 - 通用方法
     * @param {string} word - 单词
     * @param {boolean} silent - 是否静默播放（不显示提示）
     */
    async playWordPronunciation(word, silent = false) {
        const btn = document.querySelector(`[data-word="${word}"].pronunciation-btn`);
        try {
            if (btn) {
                btn.classList.add('playing');
                btn.disabled = true;
            }
            
            const language = this.audioManager.detectLanguage(word);
            
            // 只在非静默模式下显示播放状态
            if (!silent) {
                Utils.showToast(`正在播放: ${word}`, 'info', 1000);
            }
            
            await this.audioManager.play(word, language);
            
        } catch (error) {
            console.error('播放单词发音失败:', error);
            
            // 只在非静默模式下显示错误提示
            if (!silent) {
                // 根据错误类型显示不同提示
                if (error.message.includes('不支持语音合成')) {
                    Utils.showToast('您的浏览器不支持语音合成功能', 'error');
                } else if (error.message.includes('语音合成失败')) {
                    Utils.showToast('语音播放失败，请检查系统音量设置', 'error');
                } else {
                    Utils.showToast('发音播放失败，请稍后再试', 'error');
                }
            }
        } finally {
            if (btn) {
                btn.classList.remove('playing');
                btn.disabled = false;
            }
        }
    }

    /**
     * 预加载音频 - 通用方法
     * @param {Array} sentences - 句子数组
     */
    async preloadAudio(sentences) {
        try {
            // 检查系统TTS支持
            if (!this.audioManager.systemTTSSupported) {
                console.warn('系统不支持TTS，跳过音频预加载');
                return;
            }
            
            console.log('开始语音系统预检查...');
            
            await this.audioManager.batchPreload(sentences, (completed, total) => {
                console.log(`语音系统预检查进度: ${completed}/${total}`);
            });
            
            console.log('语音系统预检查完成');
            
            // 显示可用语音信息
            const voiceInfo = this.audioManager.getVoiceInfo();
            console.log('可用语音:', voiceInfo.availableVoices.length, '个');
            console.log('支持语言:', voiceInfo.supportedLanguages);
            
        } catch (error) {
            console.error('语音系统预检查失败:', error);
        }
    }

    /**
     * 分隔条拖拽初始化 - 通用方法
     * @param {Element} resizer - 分隔条元素
     * @param {Element} leftPanel - 左侧面板
     * @param {Element} rightPanel - 右侧面板
     * @param {Element} container - 容器元素
     */
    initResizer(resizer, leftPanel, rightPanel, container) {
        let isResizing = false;
        let animationId = null;
        let lastTouchY = null;
        
        // 桌面端鼠标事件
        resizer.addEventListener('mousedown', startResize);
        
        // 移动端触摸事件 - 优化为非passive以确保preventDefault生效
        resizer.addEventListener('touchstart', startResizeTouch, { passive: false });
        
        function startResize(e) {
            isResizing = true;
            document.addEventListener('mousemove', handleResize);
            document.addEventListener('mouseup', stopResize);
            e.preventDefault();
        }
        
        function startResizeTouch(e) {
            isResizing = true;
            lastTouchY = e.touches[0].clientY;
            document.addEventListener('touchmove', handleResizeTouch, { passive: false });
            document.addEventListener('touchend', stopResize);
            e.preventDefault();
            e.stopPropagation();
        }
        
        function handleResize(e) {
            if (!isResizing) return;
            
            const containerRect = container.getBoundingClientRect();
            const containerWidth = containerRect.width;
            const mouseX = e.clientX - containerRect.left;
            
            let leftWidth = (mouseX / containerWidth) * 100;
            
            // 限制最小宽度 - 允许拉到97%，最小宽度3%
            leftWidth = Math.max(3, Math.min(97, leftWidth));
            const rightWidth = 100 - leftWidth;
            
            leftPanel.style.width = leftWidth + '%';
            rightPanel.style.width = rightWidth + '%';
        }
        
        function handleResizeTouch(e) {
            if (!isResizing) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            const touchY = e.touches[0].clientY;
            lastTouchY = touchY;
            
            // 使用requestAnimationFrame来优化性能
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
            
            animationId = requestAnimationFrame(() => {
                updatePanelPositions(lastTouchY);
            });
        }
        
        function updatePanelPositions(touchY) {
            const viewportHeight = window.innerHeight;
            
            // 计算解释区高度（vh单位）- 触摸点即为分割线位置
            let explanationHeightVh = (touchY / viewportHeight) * 100;
            
            // 边界限制 - 考虑到resizer的transform偏移(-4px)，需要留足够空间
            // 计算安全边界：确保拖拽条始终在视口内可见
            const minHeightVh = Math.max(3, (8 / viewportHeight) * 100); // 最小3%，至少8px的安全距离
            const maxHeightVh = Math.min(97, 100 - (8 / viewportHeight) * 100); // 最大97%，底部也留8px安全距离
            explanationHeightVh = Math.max(minHeightVh, Math.min(maxHeightVh, explanationHeightVh));
            
            // 计算阅读区高度（包含控制按钮）- 占用剩余的全部空间
            const readingHeightVh = 100 - explanationHeightVh;
            
            // 更新CSS样式
            leftPanel.style.height = explanationHeightVh + 'vh';
            leftPanel.style.top = '0';
            
            rightPanel.style.top = explanationHeightVh + 'vh';
            rightPanel.style.height = readingHeightVh + 'vh';
            
            // 移动resizer位置 - 使用 !important 强制覆盖CSS
            resizer.style.setProperty('top', explanationHeightVh + 'vh', 'important');
        }
        
        function stopResize() {
            isResizing = false;
            lastTouchY = null;
            
            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
            
            document.removeEventListener('mousemove', handleResize);
            document.removeEventListener('mouseup', stopResize);
            document.removeEventListener('touchmove', handleResizeTouch);
            document.removeEventListener('touchend', stopResize);
        }
        
        // 移动端初始化：确保分隔条位置正确，防止出现灰色条
        if (window.innerWidth <= 768) {
            setTimeout(() => {
                const viewportHeight = window.innerHeight;
                const initialHeightVh = 30; // 默认30vh
                
                leftPanel.style.height = initialHeightVh + 'vh';
                leftPanel.style.top = '0';
                
                rightPanel.style.top = initialHeightVh + 'vh';
                rightPanel.style.height = (100 - initialHeightVh) + 'vh';
                
                // 初始化时也使用 !important 强制覆盖CSS
                resizer.style.setProperty('top', initialHeightVh + 'vh', 'important');
            }, 50); // 延迟50ms确保DOM完全加载
        }
    }

    /**
     * 窗口大小变化处理 - 通用方法
     * @param {Element} container - 容器元素
     * @param {Element} explanationPanel - 解释面板
     * @param {Element} readingPanel - 阅读面板
     */
    adjustMobileLayout(container, explanationPanel, readingPanel) {
        if (Utils.isMobile()) {
            container.style.flexDirection = 'column';
            explanationPanel.style.width = '100%';
            explanationPanel.style.height = '40%';
            readingPanel.style.width = '100%';
            readingPanel.style.height = '60%';
        } else {
            container.style.flexDirection = 'row';
            explanationPanel.style.width = '40%';
            explanationPanel.style.height = '100%';
            readingPanel.style.width = '60%';
            readingPanel.style.height = '100%';
        }
    }

    // 子类需要重写的方法
    onArticleSelected() {}
    onArticleCleared() {}
    onArticleDeleted() {}
} 