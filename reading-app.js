/**
 * 轻松阅读阅读页面应用
 */
class ReadingApp extends BaseApp {
    constructor() {
        super();
        
        // 配置 Markdown 解析器
        this.configureMarkdown();
        
        // 阅读特有状态
        this.sentences = [];
        this.currentSentenceIndex = 0;
        
        // DOM元素缓存
        this.cacheElements();
        
        // 初始化应用
        this.init();
    }

    /**
     * 配置 Markdown 解析器
     */
    configureMarkdown() {
        // 配置 marked 选项，确保安全性
        marked.setOptions({
            breaks: true, // 支持换行
            gfm: true, // 支持 GitHub 风格的 Markdown
            sanitize: false, // 不进行 HTML 清理，因为我们信任 AI 返回的内容
            smartLists: true, // 智能列表
            smartypants: true // 智能标点
        });
    }

    /**
     * 缓存DOM元素
     */
    cacheElements() {
        this.elements = {
            backBtn: document.getElementById('backBtn'),
            explanationContent: document.getElementById('explanationContent'),
            resizer: document.getElementById('resizer'),
            readingContent: document.getElementById('readingContent'),
            playPauseBtn: document.getElementById('playPauseBtn'),
            prevBtn: document.getElementById('prevBtn'),
            nextBtn: document.getElementById('nextBtn'),
            favoriteBtn: document.getElementById('favoriteBtn'),
            progressStatus: document.getElementById('progressStatus'),
            explanationPanel: document.getElementById('explanationPanel'),
            readingPanel: document.getElementById('readingPanel')
        };
    }

    /**
     * 初始化应用
     */
    init() {
        this.bindEvents();
        this.loadCurrentArticle();
        this.initResizer();
        this.loadFontSettings();
        
        // 初始化移动端布局
        if (Utils.isMobile()) {
            this.adjustMobileLayout();
        }
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 返回按钮
        this.elements.backBtn.addEventListener('click', () => this.goBack());
        
        // 播放控制事件
        this.elements.playPauseBtn.addEventListener('click', () => this.togglePlay());
        this.elements.prevBtn.addEventListener('click', () => this.previousSentence());
        this.elements.nextBtn.addEventListener('click', () => this.nextSentence());
        this.elements.favoriteBtn.addEventListener('click', () => this.toggleFavorite());
        
        // 字体大小控制事件
        document.getElementById('decreaseFontBtn').addEventListener('click', () => this.decreaseFontSize());
        document.getElementById('increaseFontBtn').addEventListener('click', () => this.increaseFontSize());
        
        // 事件委托：处理解释面板中的按钮点击
        this.elements.explanationContent.addEventListener('click', (e) => this.handleExplanationClick(e));
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // 窗口大小变化事件
        window.addEventListener('resize', Utils.throttle(() => this.handleResize(), 100));
    }

    /**
     * 返回主页面
     */
    goBack() {
        // 停止音频播放
        this.audioManager.stop();
        this.isPlaying = false;
        this.updatePlayButton();
        
        // 跳转回主页面
        window.location.href = 'index.html';
    }

    /**
     * 加载当前文章
     */
    loadCurrentArticle() {
        const articleId = this.storage.getCurrentArticleId();
        if (!articleId) {
            Utils.showToast('没有选择文章，即将返回主页', 'error');
            setTimeout(() => this.goBack(), 2000);
            return;
        }
        
        this.currentArticleId = articleId;
        this.currentArticle = this.storage.getArticle(articleId);
        if (!this.currentArticle) {
            Utils.showToast('文章不存在，即将返回主页', 'error');
            setTimeout(() => this.goBack(), 2000);
            return;
        }
        
        // 初始化阅读数据
        this.sentences = this.currentArticle.sentences;
        this.currentSentenceIndex = 0;
        
        // 加载保存的解释条数据
        this.loadExplanations();
        
        // 加载阅读状态
        this.loadReadingState();
        
        // 初始化阅读界面
        this.initReadingInterface();
        
        // 高亮当前句子
        this.updateCurrentSentence();
        
        // 预加载音频（后台进行）
        this.preloadAudio();
    }

    /**
     * 初始化阅读界面
     */
    initReadingInterface() {
        // 渲染文章内容
        this.renderReadingContent();
        
        // 应用字体设置
        this.applyFontSettings();
        
        // 加载保存的状态
        this.loadReadingState();
        
        // 恢复解释条显示
        this.restoreExplanations();
        
        // 更新界面状态
        this.updateReadingInterface();
    }

    /**
     * 渲染阅读内容
     */
    renderReadingContent() {
        const container = this.elements.readingContent;
        container.innerHTML = '';
        
        this.sentences.forEach((sentence, index) => {
            const sentenceElement = document.createElement('span');
            sentenceElement.className = 'sentence';
            sentenceElement.dataset.index = index;
            sentenceElement.innerHTML = this.processSentenceText(sentence);
            
            // 添加句子事件监听
            this.addSentenceEvents(sentenceElement, index);
            
            container.appendChild(sentenceElement);
            
            // 检查是否需要添加段落分隔
            if (index < this.sentences.length - 1) {
                if (this.currentArticle.paragraphBreaks && this.currentArticle.paragraphBreaks.includes(index)) {
                    // 添加段落分隔
                    container.appendChild(document.createElement('br'));
                    container.appendChild(document.createElement('br'));
                } else {
                    // 添加空格
                    container.appendChild(document.createTextNode(' '));
                }
            }
        });
        
        // 应用已保存的高亮状态
        this.applyHighlightStates();
    }

    /**
     * 处理句子文本，将单词包装为可点击元素
     * @param {string} sentence - 句子文本
     * @returns {string} 处理后的HTML
     */
    processSentenceText(sentence) {
        // 将英文单词包装为span元素，保留换行符
        return sentence.replace(/\b[a-zA-Z]+\b/g, (word) => {
            return `<span class="word" data-word="${word.toLowerCase()}">${word}</span>`;
        });
    }

    /**
     * 添加句子事件监听
     * @param {Element} element - 句子元素
     * @param {number} index - 句子索引
     */
    addSentenceEvents(element, index) {
        let clickTimer = null;
        
        // 单击事件
        element.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // 如果点击的是标注单词，不触发句子滚动
            if (e.target.classList.contains('word') && e.target.classList.contains('highlighted')) {
                return;
            }
            
            if (clickTimer) {
                clearTimeout(clickTimer);
                clickTimer = null;
                return;
            }
            
            clickTimer = setTimeout(() => {
                this.currentSentenceIndex = index;
                this.updateCurrentSentence();
                
                // 如果是重点句子，滚动到对应的解释条
                if (element.classList.contains('favorited')) {
                    this.scrollToSentenceExplanation(index);
                }
                
                clickTimer = null;
            }, 200);
        });
        
        // 为单词添加双击事件
        element.addEventListener('dblclick', (e) => {
            if (e.target.classList.contains('word')) {
                e.stopPropagation();
                this.toggleWordHighlight(e.target);
            }
        });
        
        // 为已高亮单词添加单击事件
        element.addEventListener('click', async (e) => {
            if (e.target.classList.contains('word') && e.target.classList.contains('highlighted')) {
                e.stopPropagation();
                await this.scrollToWordExplanation(e.target.dataset.word);
            }
        });
    }

    /**
     * 切换单词高亮状态
     * @param {Element} wordElement - 单词元素
     */
    async toggleWordHighlight(wordElement) {
        const word = wordElement.dataset.word;
        
        if (wordElement.classList.contains('highlighted')) {
            // 取消高亮并删除解释条
            this.removeWordHighlightAndExplanation(word);
        } else {
            // 添加高亮
            await this.addWordHighlight(word);
        }
    }

    /**
     * 添加单词高亮
     * @param {string} word - 单词
     */
    async addWordHighlight(word) {
        try {
            // 添加视觉高亮
            document.querySelectorAll(`[data-word="${word}"]`).forEach(el => {
                el.classList.add('highlighted');
            });
            
            // 保存到存储
            this.storage.addHighlightedWord(this.currentArticleId, word, this.currentSentenceIndex);
            
            // 生成解释
            await this.generateWordExplanation(word);
            
        } catch (error) {
            console.error('添加单词高亮失败:', error);
            Utils.showToast('单词解释生成失败', 'error');
        }
    }

    /**
     * 移除单词高亮
     * @param {string} word - 单词
     */
    removeWordHighlight(word) {
        // 移除视觉高亮
        document.querySelectorAll(`[data-word="${word}"]`).forEach(el => {
            el.classList.remove('highlighted');
        });
        
        // 从存储中移除
        this.storage.removeHighlightedWord(this.currentArticleId, word);
    }

    /**
     * 移除单词高亮和解释
     * @param {string} word - 单词
     */
    removeWordHighlightAndExplanation(word) {
        // 移除视觉高亮
        document.querySelectorAll(`[data-word="${word}"]`).forEach(el => {
            el.classList.remove('highlighted');
        });
        
        // 从存储中移除
        this.storage.removeHighlightedWord(this.currentArticleId, word);
        
        // 移除解释
        this.removeWordExplanation(word);
    }

    /**
     * 生成单词解释
     * @param {string} word - 单词
     */
    async generateWordExplanation(word) {
        try {
            // 获取当前句子作为上下文
            const currentSentence = this.sentences[this.currentSentenceIndex] || '';
            
            const explanation = await this.googleAPI.explainWord(word, currentSentence);
            this.addExplanationToPanel('word', word, explanation);
            
            // 自动播放三次发音
            for (let i = 0; i < 3; i++) {
                setTimeout(() => {
                    this.playWordPronunciation(word, true); // true表示静默播放
                }, i * 2000); // 每2秒播放一次
            }
        } catch (error) {
            console.error('单词解释生成失败:', error);
            throw error;
        }
    }

    /**
     * 生成句子解释
     * @param {string} sentence - 句子
     * @param {number} index - 句子索引
     */
    async generateSentenceExplanation(sentence, index) {
        try {
            const analysis = await this.googleAPI.analyzeSentence(sentence);
            this.addExplanationToPanel('sentence', index, analysis);
        } catch (error) {
            console.error('句子分析失败:', error);
            throw error;
        }
    }

    /**
     * 添加解释到面板
     * @param {string} type - 类型 ('word' 或 'sentence')
     * @param {string|number} key - 关键词或索引
     * @param {Object} data - 解释数据
     */
    addExplanationToPanel(type, key, data) {
        const container = this.elements.explanationContent;
        
        // 移除占位符
        const placeholder = container.querySelector('.placeholder');
        if (placeholder) {
            placeholder.remove();
        }
        
        // 创建解释元素
        const explanationElement = document.createElement('div');
        explanationElement.className = 'explanation-item';
        explanationElement.dataset.type = type;
        explanationElement.dataset.key = key;
        
        if (type === 'word') {
            explanationElement.innerHTML = `
                <div class="explanation-word">
                    <span class="word-text">${data.word}</span>
                    <button class="pronunciation-btn" data-word="${data.word}" title="播放发音">
                        🔊
                    </button>
                    ${data.phonetic ? `<span class="phonetic-text">/${data.phonetic}/</span>` : ''}
                </div>
                <div class="explanation-meaning">${marked.parse(data.explanation)}</div>
                <button class="delete-btn" data-word="${data.word}" title="删除解释">
                    ✕
                </button>
            `;
        } else {
            // 获取句子内容
            const sentenceText = this.sentences[key] || '';
            explanationElement.innerHTML = `
                <div class="explanation-word">
                    <span class="sentence-text" style="color: purple;">${sentenceText}</span>
                </div>
                <div class="explanation-meaning">${marked.parse(data.analysis)}</div>
                <button class="delete-btn" data-sentence-key="${key}" title="删除解释">
                    ✕
                </button>
            `;
        }
        
        // 添加到容器
        container.appendChild(explanationElement);
        
        // 滚动到新解释
        Utils.smoothScrollTo(explanationElement);
        
        // 保存到本地缓存
        this.explanations.set(`${type}_${key}`, data);
        
        // 保存到localStorage（仅在非恢复模式下）
        if (!this.isRestoring) {
            this.saveExplanations();
        }
    }

    /**
     * 处理解释面板中的按钮点击事件
     * @param {Event} e - 点击事件
     */
    handleExplanationClick(e) {
        const target = e.target;
        
        // 处理发音按钮点击
        if (target.classList.contains('pronunciation-btn')) {
            const word = target.getAttribute('data-word');
            if (word) {
                this.playWordPronunciation(word);
            }
            return;
        }
        
        // 处理删除按钮点击
        if (target.classList.contains('delete-btn')) {
            const word = target.getAttribute('data-word');
            const sentenceKey = target.getAttribute('data-sentence-key');
            
            if (word) {
                this.removeWordExplanation(word);
            } else if (sentenceKey) {
                this.removeSentenceExplanation(parseInt(sentenceKey));
            }
            return;
        }
    }

    // 使用基类的 playWordPronunciation 方法

    /**
     * 移除单词解释
     * @param {string} word - 单词
     */
    removeWordExplanation(word) {
        const element = document.querySelector(`[data-type="word"][data-key="${word}"]`);
        if (element) {
            element.remove();
        }
        this.explanations.delete(`word_${word}`);
        
        // 移除文章区对应单词的高亮
        document.querySelectorAll(`[data-word="${word}"]`).forEach(el => {
            el.classList.remove('highlighted');
        });
        this.storage.removeHighlightedWord(this.currentArticleId, word);
        
        // 保存到localStorage
        this.saveExplanations();
        
        // 如果没有解释了，显示占位符
        this.checkAndShowPlaceholder();
    }

    /**
     * 移除句子解释
     * @param {number} index - 句子索引
     */
    removeSentenceExplanation(index) {
        const element = document.querySelector(`[data-type="sentence"][data-key="${index}"]`);
        if (element) {
            element.remove();
        }
        this.explanations.delete(`sentence_${index}`);
        
        // 移除文章区对应的句子标注（取消收藏状态）
        const sentenceElement = document.querySelector(`[data-index="${index}"]`);
        if (sentenceElement) {
            sentenceElement.classList.remove('favorited');
        }
        
        // 从存储中移除收藏状态
        this.storage.removeFavorite(this.currentArticleId, index);
        
        // 保存到localStorage
        this.saveExplanations();
        
        // 如果没有解释了，显示占位符
        this.checkAndShowPlaceholder();
    }

    /**
     * 检查并显示占位符
     */
    checkAndShowPlaceholder() {
        const container = this.elements.explanationContent;
        if (container.children.length === 0) {
            const placeholder = document.createElement('p');
            placeholder.className = 'placeholder';
            placeholder.textContent = '点击单词或收藏句子查看解释';
            container.appendChild(placeholder);
        }
    }

    /**
     * 滚动到单词解释
     * @param {string} word - 单词
     */
    async scrollToWordExplanation(word) {
        const element = document.querySelector(`[data-type="word"][data-key="${word}"]`);
        if (element) {
            element.classList.add('highlighted');
            Utils.smoothScrollTo(element);
            
            // 播放词汇音频一次
            try {
                await this.playWordPronunciation(word, true); // true表示静默播放，不显示提示
            } catch (error) {
                console.warn('播放词汇音频失败:', error);
                // 静默处理错误，不影响滚动功能
            }
            
            // 移除高亮效果
            setTimeout(() => {
                element.classList.remove('highlighted');
            }, 2000);
        }
    }

    /**
     * 滚动到句子解释
     * @param {number} sentenceIndex - 句子索引
     */
    scrollToSentenceExplanation(sentenceIndex) {
        const explanationElement = document.querySelector(`[data-type="sentence"][data-key="${sentenceIndex}"]`);
        if (explanationElement) {
            // 移除之前的强调效果
            document.querySelectorAll('.explanation-item.highlighted').forEach(el => {
                el.classList.remove('highlighted');
            });
            
            // 添加强调效果
            explanationElement.classList.add('highlighted');
            
            // 滚动到解释条
            Utils.smoothScrollTo(explanationElement);
            
            // 3秒后移除强调效果
            setTimeout(() => {
                explanationElement.classList.remove('highlighted');
            }, 3000);
        } else {
            // 如果没有找到对应的解释条，显示提示
            Utils.showToast('该句子还没有解释条', 'info');
        }
    }

    /**
     * 应用高亮状态
     */
    applyHighlightStates() {
        // 应用单词高亮
        const highlightedWords = this.storage.getHighlightedWords(this.currentArticleId);
        highlightedWords.forEach(item => {
            document.querySelectorAll(`[data-word="${item.word}"]`).forEach(el => {
                el.classList.add('highlighted');
            });
        });
        
        // 应用句子收藏状态
        const favorites = this.storage.getFavorites(this.currentArticleId);
        favorites.forEach(item => {
            const sentenceElement = document.querySelector(`[data-index="${item.index}"]`);
            if (sentenceElement) {
                sentenceElement.classList.add('favorited');
            }
        });
    }

    /**
     * 播放控制方法
     */
    async togglePlay() {
        if (this.isPlaying) {
            this.pausePlaying();
        } else {
            await this.resumeOrPlayCurrentSentence();
        }
    }

    async playCurrentSentence(forceScroll = false) {
        if (this.currentSentenceIndex >= this.sentences.length) return;
        
        try {
            const sentence = this.sentences[this.currentSentenceIndex];
            const language = this.audioManager.detectLanguage(sentence);
            
            this.isPlaying = true;
            this.updatePlayButton();
            this.updateCurrentSentence(forceScroll);
            
            // 检查系统TTS支持
            if (!this.audioManager.systemTTSSupported) {
                Utils.showToast('您的浏览器不支持语音合成功能', 'error');
                this.isPlaying = false;
                this.updatePlayButton();
                return;
            }
            
            await this.audioManager.play(sentence, language);
            
            this.isPlaying = false;
            this.updatePlayButton();
        } catch (error) {
            console.error('播放失败:', error);
            
            // 根据错误类型显示不同提示
            if (error.message.includes('不支持语音合成')) {
                Utils.showToast('您的浏览器不支持语音合成功能', 'error');
            } else if (error.message.includes('语音合成失败')) {
                Utils.showToast('语音播放失败，请检查系统音量和语音设置', 'error');
            } else if (error.message.includes('文本为空')) {
                Utils.showToast('当前句子内容为空', 'error');
            } else {
                Utils.showToast('音频播放失败，请稍后再试', 'error');
            }
            
            this.isPlaying = false;
            this.updatePlayButton();
        }
    }

    pausePlaying() {
        this.audioManager.pause();
        this.isPlaying = false;
        this.updatePlayButton();
    }

    stopPlaying() {
        this.audioManager.stop();
        this.isPlaying = false;
        this.updatePlayButton();
    }

    async resumeOrPlayCurrentSentence() {
        // 如果音频管理器中有暂停的音频，则恢复播放
        if (this.audioManager.currentAudio && !this.audioManager.isCurrentlyPlaying()) {
            try {
                await this.audioManager.resume();
                this.isPlaying = true;
                this.updatePlayButton();
            } catch (error) {
                console.error('恢复播放失败:', error);
                Utils.showToast('恢复播放失败，请重试', 'error');
                this.isPlaying = false;
                this.updatePlayButton();
            }
        } else {
            // 否则播放当前句子
            await this.playCurrentSentence();
        }
    }

    async previousSentence() {
        if (this.currentSentenceIndex > 0) {
            this.currentSentenceIndex--;
            await this.playCurrentSentence(); // 使用懒滚动
        }
    }

    async nextSentence() {
        if (this.currentSentenceIndex < this.sentences.length - 1) {
            this.currentSentenceIndex++;
            await this.playCurrentSentence(); // 使用懒滚动
        }
    }

    /**
     * 切换收藏状态
     */
    async toggleFavorite() {
        const sentence = this.sentences[this.currentSentenceIndex];
        const sentenceElement = document.querySelector(`[data-index="${this.currentSentenceIndex}"]`);
        
        if (sentenceElement.classList.contains('favorited')) {
            // 取消收藏
            sentenceElement.classList.remove('favorited');
            this.storage.removeFavorite(this.currentArticleId, this.currentSentenceIndex);
            this.removeSentenceExplanation(this.currentSentenceIndex);
            this.updateFavoriteButton(false);
        } else {
            // 添加收藏
            try {
                sentenceElement.classList.add('favorited');
                this.storage.addFavorite(this.currentArticleId, this.currentSentenceIndex, sentence);
                await this.generateSentenceExplanation(sentence, this.currentSentenceIndex);
                this.updateFavoriteButton(true);
            } catch (error) {
                console.error('句子分析失败:', error);
                sentenceElement.classList.remove('favorited');
                Utils.showToast('句子分析失败', 'error');
            }
        }
    }

    /**
     * 更新当前句子状态
     * @param {boolean} forceScroll - 是否强制滚动到当前句子
     */
    updateCurrentSentence(forceScroll = false) {
        console.log(`[滚动调试] updateCurrentSentence 被调用，forceScroll=${forceScroll}, currentIndex=${this.currentSentenceIndex}`);
        
        // 移除之前的current类
        document.querySelectorAll('.sentence.current').forEach(el => {
            el.classList.remove('current');
        });
        
        // 添加current类到当前句子
        const currentElement = document.querySelector(`[data-index="${this.currentSentenceIndex}"]`);
        if (currentElement) {
            currentElement.classList.add('current');
            
            // 使用懒滚动策略：只在必要时滚动
            if (forceScroll) {
                console.log(`[懒滚动] 强制滚动模式`);
                Utils.smoothScrollToSentence(currentElement);
            } else if (Utils.needsLazyScroll(currentElement)) {
                console.log(`[懒滚动] 触发懒滚动 - 句子接近边界`);
                Utils.smoothScrollToSentence(currentElement);
            } else {
                console.log(`[懒滚动] 跳过滚动 - 句子在安全区域`);
            }
        } else {
            console.log(`[滚动调试] 未找到当前句子元素，索引: ${this.currentSentenceIndex}`);
        }
        
        this.updateReadingInterface();
    }

    /**
     * 更新阅读界面状态
     */
    updateReadingInterface() {
        // 更新进度状态
        this.elements.progressStatus.textContent = 
            `${this.currentSentenceIndex + 1}/${this.sentences.length}`;
        
        // 更新收藏按钮状态
        const isFavorited = this.storage.isFavorite(this.currentArticleId, this.currentSentenceIndex);
        this.updateFavoriteButton(isFavorited);
        
        // 保存阅读进度
        this.saveReadingProgress();
    }

    /**
     * 更新播放按钮状态
     */
    updatePlayButton() {
        this.elements.playPauseBtn.textContent = this.isPlaying ? '⏸' : '▶';
        if (this.isPlaying) {
            this.elements.playPauseBtn.classList.add('active');
        } else {
            this.elements.playPauseBtn.classList.remove('active');
        }
    }

    /**
     * 更新收藏按钮状态
     * @param {boolean} isFavorited - 是否已收藏
     */
    updateFavoriteButton(isFavorited) {
        this.elements.favoriteBtn.textContent = isFavorited ? '♥' : '♡';
        if (isFavorited) {
            this.elements.favoriteBtn.classList.add('favorite');
        } else {
            this.elements.favoriteBtn.classList.remove('favorite');
        }
    }

    /**
     * 预加载音频
     */
    async preloadAudio() {
        await super.preloadAudio(this.sentences);
    }

    /**
     * 应用字体设置
     */
    applyFontSettings() {
        const fontSize = this.storage.getFontSize();
        this.elements.readingContent.style.fontSize = fontSize + 'px';
    }

    /**
     * 加载阅读状态
     */
    loadReadingState() {
        const progress = this.storage.getReadingProgress(this.currentArticleId);
        if (progress && progress.sentenceIndex !== undefined) {
            this.currentSentenceIndex = progress.sentenceIndex;
        } else {
            // 新文章默认从第0句开始
            this.currentSentenceIndex = 0;
        }
    }

    /**
     * 加载保存的解释条数据
     */
    loadExplanations() {
        const articleId = this.storage.getCurrentArticleId();
        if (!articleId) return;
        
        const savedExplanations = this.storage.getExplanations(articleId);
        if (savedExplanations && savedExplanations.size > 0) {
            this.explanations = savedExplanations;
        }
    }

    /**
     * 保存解释条数据到localStorage
     */
    saveExplanations() {
        const articleId = this.storage.getCurrentArticleId();
        if (!articleId) return;
        
        this.storage.saveExplanations(articleId, this.explanations);
    }

    /**
     * 恢复解释条显示
     */
    restoreExplanations() {
        if (this.explanations.size === 0) {
            this.checkAndShowPlaceholder();
            return;
        }
        
        // 设置恢复标志
        this.isRestoring = true;
        
        // 清空解释面板
        const container = this.elements.explanationContent;
        container.innerHTML = '';
        
        // 恢复所有解释条
        this.explanations.forEach((data, key) => {
            const [type, index] = key.split('_');
            if (type === 'word') {
                this.addExplanationToPanel('word', index, data);
            } else if (type === 'sentence') {
                this.addExplanationToPanel('sentence', parseInt(index), data);
            }
        });
        
        // 清除恢复标志
        this.isRestoring = false;
    }

    /**
     * 保存阅读进度
     */
    saveReadingProgress() {
        const progress = {
            sentenceIndex: this.currentSentenceIndex,
            timestamp: Date.now()
        };
        this.storage.saveReadingProgress(this.currentArticleId, progress);
    }

    /**
     * 初始化分隔条拖拽
     */
    initResizer() {
        const container = document.querySelector('.reading-container');
        super.initResizer(
            this.elements.resizer,
            this.elements.explanationPanel,
            this.elements.readingPanel,
            container
        );
    }

    /**
     * 键盘快捷键处理
     * @param {KeyboardEvent} e - 键盘事件
     */
    handleKeyboard(e) {
        switch (e.key) {
            case ' ':
                e.preventDefault();
                this.togglePlay();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.previousSentence();
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.nextSentence();
                break;
            case 'f':
            case 'F':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.toggleFavorite();
                }
                break;
        }
    }

    /**
     * 窗口大小变化处理
     */
    handleResize() {
        // 在移动设备上调整布局
        if (Utils.isMobile()) {
            this.adjustMobileLayout();
        }
    }

    /**
     * 调整移动设备布局
     */
    adjustMobileLayout() {
        const container = document.querySelector('.reading-container');
        super.adjustMobileLayout(container, this.elements.explanationPanel, this.elements.readingPanel);
    }

    /**
     * 减小字体大小
     */
    decreaseFontSize() {
        const currentSize = this.getCurrentFontSize();
        const newSize = Math.max(0.8, currentSize - 0.1); // 最小0.8rem
        this.setFontSize(newSize);
    }

    /**
     * 增大字体大小
     */
    increaseFontSize() {
        const currentSize = this.getCurrentFontSize();
        const newSize = Math.min(1.5, currentSize + 0.1); // 最大1.5rem
        this.setFontSize(newSize);
    }

    /**
     * 获取当前字体大小
     */
    getCurrentFontSize() {
        const explanationContent = this.elements.explanationContent;
        const computedStyle = window.getComputedStyle(explanationContent);
        const fontSize = parseFloat(computedStyle.fontSize);
        return fontSize / 16; // 转换为rem单位
    }

    /**
     * 设置字体大小
     */
    setFontSize(size) {
        const explanationContent = this.elements.explanationContent;
        explanationContent.style.fontSize = size + 'rem';
        
        // 同时调整词汇和句子文本的字体大小
        const explanationWords = explanationContent.querySelectorAll('.explanation-word');
        const sentenceTexts = explanationContent.querySelectorAll('.sentence-text');
        
        explanationWords.forEach(word => {
            word.style.fontSize = size + 'rem';
        });
        
        sentenceTexts.forEach(text => {
            text.style.fontSize = size + 'rem';
        });
        
        // 保存到本地存储
        this.storage.setItem('explanationFontSize', size.toString());
    }

    /**
     * 加载字体设置
     */
    loadFontSettings() {
        const savedSize = this.storage.getItem('explanationFontSize');
        if (savedSize) {
            const size = parseFloat(savedSize);
            if (size >= 0.8 && size <= 1.5) {
                this.setFontSize(size);
            }
        }
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.readingApp = new ReadingApp();
});