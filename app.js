/**
 * 轻松阅读主应用
 */
class EnglishHelper {
    constructor() {
        // 初始化各个管理器
        this.storage = new StorageManager();
        this.splitter = new SentenceSplitter();
        this.googleAPI = new GoogleAPIService();
        this.audioManager = new AudioManager();
        
        // 应用状态
        this.currentPage = 'main';
        this.currentArticle = null;
        this.currentArticleId = null;
        this.sentences = [];
        this.currentSentenceIndex = 0;
        this.isPlaying = false;
        this.explanations = new Map(); // 存储解释内容
        
        // 设置音频管理器的Google API引用
        this.audioManager.setGoogleAPIService(this.googleAPI);
        
        // DOM元素缓存
        this.elements = {};
        this.cacheElements();
        
        // 初始化应用
        this.init();
    }

    /**
     * 缓存DOM元素
     */
    cacheElements() {
        this.elements = {
            // 主页面元素
            mainPage: document.getElementById('mainPage'),
            readingPage: document.getElementById('readingPage'),
            
            // 导航按钮
            manageBtn: document.getElementById('manageBtn'),
            settingsBtn: document.getElementById('settingsBtn'),
            backBtn: document.getElementById('backBtn'),
            
            // 文章管理
            articleManager: document.getElementById('articleManager'),
            articleList: document.getElementById('articleList'),
            fileInput: document.getElementById('fileInput'),
            uploadBtn: document.getElementById('uploadBtn'),
            fileName: document.getElementById('fileName'),
            articleTitle: document.getElementById('articleTitle'),
            articleStats: document.getElementById('articleStats'),
            articleContent: document.getElementById('articleContent'),
            startReadingBtn: document.getElementById('startReadingBtn'),
            deleteArticleBtn: document.getElementById('deleteArticleBtn'),
            
            // 设置页面
            settingsPanel: document.getElementById('settingsPanel'),
            geminiApiKey: document.getElementById('geminiApiKey'),
            googleCloudConfig: document.getElementById('googleCloudConfig'),
            apiStatus: document.getElementById('apiStatus'),
            saveApiBtn: document.getElementById('saveApiBtn'),
            wordPrompt: document.getElementById('wordPrompt'),
            sentencePrompt: document.getElementById('sentencePrompt'),
            savePromptsBtn: document.getElementById('savePromptsBtn'),
            fontSize: document.getElementById('fontSize'),
            fontSizeValue: document.getElementById('fontSizeValue'),
            saveFontBtn: document.getElementById('saveFontBtn'),
            
            // 阅读页面
            readingTitle: document.getElementById('readingTitle'),
            explanationPanel: document.getElementById('explanationPanel'),
            explanationContent: document.getElementById('explanationContent'),
            resizer: document.getElementById('resizer'),
            readingPanel: document.getElementById('readingPanel'),
            readingContent: document.getElementById('readingContent'),
            
            // 控制按钮
            playPauseBtn: document.getElementById('playPauseBtn'),
            prevBtn: document.getElementById('prevBtn'),
            nextBtn: document.getElementById('nextBtn'),
            favoriteBtn: document.getElementById('favoriteBtn'),
            progressStatus: document.getElementById('progressStatus')
        };
    }

    /**
     * 初始化应用
     */
    init() {
        this.bindEvents();
        this.loadSettings();
        this.loadCurrentArticle();
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 导航事件
        this.elements.manageBtn.addEventListener('click', () => this.showSection('articleManager'));
        this.elements.settingsBtn.addEventListener('click', () => this.showSection('settingsPanel'));
        this.elements.backBtn.addEventListener('click', () => this.showMainPage());
        
        // 文件上传事件
        this.elements.uploadBtn.addEventListener('click', () => this.elements.fileInput.click());
        this.elements.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        this.elements.startReadingBtn.addEventListener('click', () => this.startReading());
        this.elements.deleteArticleBtn.addEventListener('click', () => this.deleteCurrentArticle());
        
        // 设置保存事件
        this.elements.saveApiBtn.addEventListener('click', () => this.saveApiConfig());
        this.elements.savePromptsBtn.addEventListener('click', () => this.savePrompts());
        this.elements.saveFontBtn.addEventListener('click', () => this.saveFontSize());
        
        // 字体大小滑块事件
        this.elements.fontSize.addEventListener('input', (e) => {
            this.elements.fontSizeValue.textContent = e.target.value + 'px';
        });
        
        // 播放控制事件
        this.elements.playPauseBtn.addEventListener('click', () => this.togglePlay());
        this.elements.prevBtn.addEventListener('click', () => this.previousSentence());
        this.elements.nextBtn.addEventListener('click', () => this.nextSentence());
        this.elements.favoriteBtn.addEventListener('click', () => this.toggleFavorite());
        
        // 分隔条拖拽事件
        this.initResizer();
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // 窗口大小变化事件
        window.addEventListener('resize', Utils.throttle(() => this.handleResize(), 100));
    }

    /**
     * 显示页面section
     * @param {string} sectionId - section ID
     */
    showSection(sectionId) {
        // 隐藏所有section
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        
        // 显示目标section
        document.getElementById(sectionId).classList.add('active');
        
        // 更新导航按钮状态
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (sectionId === 'articleManager') {
            this.elements.manageBtn.classList.add('active');
        } else if (sectionId === 'settingsPanel') {
            this.elements.settingsBtn.classList.add('active');
        }
    }

    /**
     * 显示主页面
     */
    showMainPage() {
        this.elements.readingPage.classList.remove('active');
        this.elements.mainPage.classList.add('active');
        this.currentPage = 'main';
        
        // 停止音频播放
        this.audioManager.stop();
        this.isPlaying = false;
        this.updatePlayButton();
    }

    /**
     * 处理文件上传
     * @param {Event} event - 文件上传事件
     */
    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            Utils.setLoading(this.elements.uploadBtn, true);
            
            // 读取文件内容
            const content = await Utils.readFile(file);
            
            // 分割句子并保留段落信息
            const { sentences, paragraphBreaks } = this.splitter.splitIntoSentencesWithBreaks(content);
            
            if (sentences.length === 0) {
                Utils.showToast('文件内容为空或格式不正确', 'error');
                return;
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
            
            // 更新界面
            this.updateArticleList();
            this.updateArticlePreview();
            
            Utils.showToast('文章导入成功', 'success');
            
        } catch (error) {
            console.error('文件上传失败:', error);
            Utils.showToast('文件读取失败: ' + error.message, 'error');
        } finally {
            Utils.setLoading(this.elements.uploadBtn, false);
        }
    }

    /**
     * 更新文章列表
     */
    updateArticleList() {
        const articles = this.storage.getArticleList();
        const container = this.elements.articleList;
        
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
                    <button class="btn primary" onclick="app.selectArticle('${article.id}')">选择</button>
                    <button class="btn secondary" onclick="app.deleteArticle('${article.id}')">删除</button>
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
        
        this.updateArticleList();
        this.updateArticlePreview();
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
                this.clearArticlePreview();
            }
            
            this.updateArticleList();
            Utils.showToast('文章已删除', 'success');
        }
    }

    /**
     * 删除当前文章
     */
    deleteCurrentArticle() {
        if (this.currentArticleId) {
            this.deleteArticle(this.currentArticleId);
        }
    }

    /**
     * 清空文章预览
     */
    clearArticlePreview() {
        this.elements.fileName.textContent = '';
        this.elements.articleTitle.textContent = '文章预览';
        this.elements.articleStats.textContent = '';
        this.elements.articleContent.textContent = '';
        this.elements.startReadingBtn.style.display = 'none';
        this.elements.deleteArticleBtn.style.display = 'none';
    }
    /**
     * 更新文章预览
     */
    updateArticlePreview() {
        if (!this.currentArticle) return;
        
        this.elements.fileName.textContent = this.currentArticle.title + '.txt';
        this.elements.articleTitle.textContent = this.currentArticle.title;
        this.elements.articleStats.textContent = this.splitter.formatStats(this.currentArticle.stats);
        
        // 显示文章预览（限制长度）
        const preview = this.currentArticle.content.length > 500 
            ? this.currentArticle.content.substring(0, 500) + '...'
            : this.currentArticle.content;
        this.elements.articleContent.textContent = preview;
        
        this.elements.startReadingBtn.style.display = 'block';
        this.elements.deleteArticleBtn.style.display = 'block';
    }

    /**
     * 开始阅读
     */
    async startReading() {
        if (!this.currentArticle) {
            Utils.showToast('请先导入文章', 'error');
            return;
        }
        
        try {
            Utils.setLoading(this.elements.startReadingBtn, true);
            
            // 准备阅读数据
            this.sentences = this.currentArticle.sentences;
            this.currentSentenceIndex = 0;
            
            // 切换到阅读页面
            this.elements.mainPage.classList.remove('active');
            this.elements.readingPage.classList.add('active');
            this.currentPage = 'reading';
            
            // 初始化阅读界面
            this.initReadingInterface();
            
            // 预加载音频（后台进行）
            this.preloadAudio();
            
            Utils.showToast('进入阅读模式', 'success');
            
        } catch (error) {
            console.error('启动阅读失败:', error);
            Utils.showToast('启动阅读失败: ' + error.message, 'error');
        } finally {
            Utils.setLoading(this.elements.startReadingBtn, false);
        }
    }

    /**
     * 初始化阅读界面
     */
    initReadingInterface() {
        // 设置标题
        this.elements.readingTitle.textContent = this.currentArticle.title;
        
        // 渲染文章内容
        this.renderReadingContent();
        
        // 应用字体设置
        this.applyFontSettings();
        
        // 加载保存的状态
        this.loadReadingState();
        
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
        // 将英文单词包装为span元素
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
            
            if (clickTimer) {
                clearTimeout(clickTimer);
                clickTimer = null;
                return;
            }
            
            clickTimer = setTimeout(() => {
                this.currentSentenceIndex = index;
                this.updateCurrentSentence();
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
        element.addEventListener('click', (e) => {
            if (e.target.classList.contains('word') && e.target.classList.contains('highlighted')) {
                e.stopPropagation();
                this.scrollToWordExplanation(e.target.dataset.word);
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
            // 取消高亮
            this.removeWordHighlight(word);
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
            this.storage.addHighlightedWord(word, this.currentSentenceIndex);
            
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
        this.storage.removeHighlightedWord(word);
        
        // 移除解释
        this.removeWordExplanation(word);
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
            this.storage.removeFavorite(this.currentSentenceIndex);
            this.removeSentenceExplanation(this.currentSentenceIndex);
            this.updateFavoriteButton(false);
        } else {
            // 添加收藏
            try {
                sentenceElement.classList.add('favorited');
                this.storage.addFavorite(this.currentSentenceIndex, sentence);
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
     * 生成单词解释
     * @param {string} word - 单词
     */
    async generateWordExplanation(word) {
        if (!this.googleAPI.isConfigured()) {
            Utils.showToast('请先配置Google AI API', 'error');
            return;
        }
        
        try {
            const explanation = await this.googleAPI.explainWord(word);
            this.addExplanationToPanel('word', word, explanation);
        } catch (error) {
            throw error;
        }
    }

    /**
     * 生成句子解释
     * @param {string} sentence - 句子
     * @param {number} index - 句子索引
     */
    async generateSentenceExplanation(sentence, index) {
        if (!this.googleAPI.isConfigured()) {
            Utils.showToast('请先配置Google AI API', 'error');
            return;
        }
        
        try {
            const analysis = await this.googleAPI.analyzeSentence(sentence);
            this.addExplanationToPanel('sentence', index, analysis);
        } catch (error) {
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
                <div class="explanation-word">${data.word}</div>
                ${data.phonetic ? `<div class="explanation-phonetic">[${data.phonetic}]</div>` : ''}
                <div class="explanation-meaning">${data.explanation}</div>
            `;
        } else {
            explanationElement.innerHTML = `
                <div class="explanation-word">句子 ${parseInt(key) + 1}</div>
                <div class="explanation-meaning">${data.analysis}</div>
            `;
        }
        
        // 添加到容器
        container.appendChild(explanationElement);
        
        // 滚动到新解释
        Utils.smoothScrollTo(explanationElement);
        
        // 保存到本地缓存
        this.explanations.set(`${type}_${key}`, data);
    }

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
    scrollToWordExplanation(word) {
        const element = document.querySelector(`[data-type="word"][data-key="${word}"]`);
        if (element) {
            element.classList.add('highlighted');
            Utils.smoothScrollTo(element);
            
            // 移除高亮效果
            setTimeout(() => {
                element.classList.remove('highlighted');
            }, 2000);
        }
    }

    /**
     * 滚动到句子解释
     * @param {number} index - 句子索引
     */
    scrollToSentenceExplanation(index) {
        const element = document.querySelector(`[data-type="sentence"][data-key="${index}"]`);
        if (element) {
            element.classList.add('highlighted');
            Utils.smoothScrollTo(element);
            
            // 移除高亮效果
            setTimeout(() => {
                element.classList.remove('highlighted');
            }, 2000);
        }
    }

    /**
     * 应用高亮状态
     */
    applyHighlightStates() {
        // 应用单词高亮
        const highlightedWords = this.storage.getHighlightedWords();
        highlightedWords.forEach(item => {
            document.querySelectorAll(`[data-word="${item.word}"]`).forEach(el => {
                el.classList.add('highlighted');
            });
        });
        
        // 应用句子收藏状态
        const favorites = this.storage.getFavorites();
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

    async playCurrentSentence() {
        if (this.currentSentenceIndex >= this.sentences.length) return;
        
        try {
            const sentence = this.sentences[this.currentSentenceIndex];
            const language = this.audioManager.detectLanguage(sentence);
            
            this.isPlaying = true;
            this.updatePlayButton();
            this.updateCurrentSentence();
            
            await this.audioManager.play(sentence, language);
            
            this.isPlaying = false;
            this.updatePlayButton();
        } catch (error) {
            console.error('播放失败:', error);
            Utils.showToast('音频播放失败', 'error');
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

    previousSentence() {
        if (this.currentSentenceIndex > 0) {
            this.currentSentenceIndex--;
            this.updateCurrentSentence();
        }
    }

    async nextSentence() {
        if (this.currentSentenceIndex < this.sentences.length - 1) {
            this.currentSentenceIndex++;
            await this.playCurrentSentence();
        }
    }

    /**
     * 更新当前句子状态
     */
    updateCurrentSentence() {
        // 移除所有current类
        document.querySelectorAll('.sentence.current').forEach(el => {
            el.classList.remove('current');
        });
        
        // 添加current类到当前句子
        const currentElement = document.querySelector(`[data-index="${this.currentSentenceIndex}"]`);
        if (currentElement) {
            currentElement.classList.add('current');
            
            // 滚动到当前句子
            if (!Utils.isInViewport(currentElement)) {
                Utils.smoothScrollTo(currentElement);
            }
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
        const isFavorited = this.storage.isFavorite(this.currentSentenceIndex);
        this.updateFavoriteButton(isFavorited);
        
        // 保存阅读进度
        this.saveReadingProgress();
    }

    /**
     * 更新播放按钮状态
     */
    updatePlayButton() {
        this.elements.playPauseBtn.textContent = this.isPlaying ? '⏸' : '▶';
    }

    /**
     * 更新收藏按钮状态
     * @param {boolean} isFavorited - 是否已收藏
     */
    updateFavoriteButton(isFavorited) {
        this.elements.favoriteBtn.textContent = isFavorited ? '♥' : '♡';
    }

    /**
     * 预加载音频
     */
    async preloadAudio() {
        try {
            await this.audioManager.batchPreload(this.sentences, (completed, total) => {
                // 可以添加加载进度显示
                console.log(`音频预加载进度: ${completed}/${total}`);
            });
        } catch (error) {
            console.error('音频预加载失败:', error);
        }
    }

    /**
     * 设置相关方法
     */
    loadSettings() {
        // 加载API配置
        const geminiApiKey = this.storage.getGeminiApiKey();
        const googleCloudConfig = this.storage.getGoogleCloudConfig();
        
        if (geminiApiKey) {
            this.elements.geminiApiKey.value = geminiApiKey;
        }
        
        if (googleCloudConfig) {
            this.elements.googleCloudConfig.value = JSON.stringify(googleCloudConfig, null, 2);
            // 同步配置到服务器端
            this.syncGoogleCloudConfigToServer(googleCloudConfig);
        }
        
        // 更新API状态
        this.updateApiStatus();
        
        // 加载提示词
        const prompts = this.storage.getPrompts();
        this.elements.wordPrompt.value = prompts.wordPrompt || '';
        this.elements.sentencePrompt.value = prompts.sentencePrompt || '';
        
        // 加载字体设置
        const fontSize = this.storage.getFontSize();
        this.elements.fontSize.value = fontSize;
        this.elements.fontSizeValue.textContent = fontSize + 'px';
    }

    /**
     * 同步Google Cloud配置到服务器端
     * @param {Object} config - Google Cloud配置
     */
    async syncGoogleCloudConfigToServer(config) {
        try {
            const response = await fetch('/api/google-cloud/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            });
            
            if (!response.ok) {
                console.warn('Google Cloud配置同步到服务器失败');
            } else {
                console.log('Google Cloud配置已同步到服务器');
            }
        } catch (error) {
            console.warn('Google Cloud配置同步失败:', error);
        }
    }

    /**
     * 更新API状态显示
     */
    updateApiStatus() {
        const status = this.googleAPI.getConfigStatus();
        const statusElement = this.elements.apiStatus;
        const statusContainer = statusElement.parentElement;
        
        // 重置样式
        statusContainer.className = 'api-status';
        
        let statusText = '';
        
        if (status.gemini && status.googleCloud) {
            statusText = '✅ Gemini AI 和 Google Cloud TTS 均已配置';
            statusContainer.classList.add('configured');
        } else if (status.gemini) {
            statusText = '✅ Gemini AI 已配置\n⚠️ 可添加 Google Cloud TTS 获得更好的语音效果';
            statusContainer.classList.add('configured');
        } else if (status.googleCloud) {
            statusText = '✅ Google Cloud TTS 已配置\n⚠️ 可添加 Gemini AI 获得AI解释功能';
            statusContainer.classList.add('configured');
        } else {
            statusText = '❌ 未配置API\n将使用系统TTS和免费词典API作为备用方案';
            statusContainer.classList.add('error');
        }
        
        statusElement.textContent = statusText;
    }

    async saveApiConfig() {
        try {
            const geminiApiKey = this.elements.geminiApiKey.value.trim();
            const googleCloudConfigText = this.elements.googleCloudConfig.value.trim();
            
            let hasValidConfig = false;
            
            // 验证和保存Gemini API Key
            if (geminiApiKey) {
                const isValid = await this.googleAPI.validateGeminiApiKey(geminiApiKey);
                if (isValid) {
                    this.googleAPI.setGeminiApiKey(geminiApiKey);
                    hasValidConfig = true;
                } else {
                    Utils.showToast('Gemini API Key验证失败', 'error');
                }
            }
            
            // 验证和保存Google Cloud配置
            if (googleCloudConfigText) {
                try {
                    const config = JSON.parse(googleCloudConfigText);
                    const isValid = await this.googleAPI.validateGoogleCloudConfig(config);
                    if (isValid) {
                        // 发送配置到服务器端
                        const serverResponse = await fetch('/api/google-cloud/config', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(config)
                        });
                        
                        if (!serverResponse.ok) {
                            const errorData = await serverResponse.json();
                            throw new Error(errorData.error || '服务器配置保存失败');
                        }
                        
                        this.googleAPI.setGoogleCloudConfig(config);
                        hasValidConfig = true;
                    } else {
                        Utils.showToast('Google Cloud配置验证失败', 'error');
                    }
                } catch (error) {
                    Utils.showToast('Google Cloud配置JSON格式错误', 'error');
                }
            }
            
            if (hasValidConfig) {
                this.updateApiStatus();
                Utils.showToast('API配置保存成功', 'success');
            } else if (!geminiApiKey && !googleCloudConfigText) {
                Utils.showToast('请至少配置一个API', 'error');
            }
            
        } catch (error) {
            console.error('保存API配置失败:', error);
            Utils.showToast('API配置保存失败', 'error');
        }
    }

    savePrompts() {
        const wordPrompt = this.elements.wordPrompt.value.trim();
        const sentencePrompt = this.elements.sentencePrompt.value.trim();
        
        if (!wordPrompt || !sentencePrompt) {
            Utils.showToast('提示词不能为空', 'error');
            return;
        }
        
        this.storage.savePrompts(wordPrompt, sentencePrompt);
        Utils.showToast('提示词保存成功', 'success');
    }

    saveFontSize() {
        const fontSize = parseInt(this.elements.fontSize.value);
        this.storage.saveFontSize(fontSize);
        this.applyFontSettings();
        Utils.showToast('字体设置保存成功', 'success');
    }

    applyFontSettings() {
        const fontSize = this.storage.getFontSize();
        this.elements.readingContent.style.fontSize = fontSize + 'px';
    }

    /**
     * 加载当前文章
     */
    loadCurrentArticle() {
        this.currentArticleId = this.storage.getCurrentArticleId();
        if (this.currentArticleId) {
            this.currentArticle = this.storage.getArticle(this.currentArticleId);
        }
        
        this.updateArticleList();
        if (this.currentArticle) {
            this.updateArticlePreview();
        }
    }

    /**
     * 加载阅读状态
     */
    loadReadingState() {
        const progress = this.storage.getReadingProgress();
        if (progress && progress.sentenceIndex !== undefined) {
            this.currentSentenceIndex = progress.sentenceIndex;
        }
    }

    /**
     * 保存阅读进度
     */
    saveReadingProgress() {
        const progress = {
            sentenceIndex: this.currentSentenceIndex,
            timestamp: Date.now()
        };
        this.storage.saveReadingProgress(progress);
    }

    /**
     * 初始化分隔条拖拽
     */
    initResizer() {
        const resizer = this.elements.resizer;
        const leftPanel = this.elements.explanationPanel;
        const rightPanel = this.elements.readingPanel;
        const container = document.querySelector('.reading-container');
        
        let isResizing = false;
        
        resizer.addEventListener('mousedown', startResize);
        
        function startResize(e) {
            isResizing = true;
            document.addEventListener('mousemove', handleResize);
            document.addEventListener('mouseup', stopResize);
            e.preventDefault();
        }
        
        function handleResize(e) {
            if (!isResizing) return;
            
            const containerRect = container.getBoundingClientRect();
            const containerWidth = containerRect.width;
            const mouseX = e.clientX - containerRect.left;
            
            const leftWidth = (mouseX / containerWidth) * 100;
            const rightWidth = 100 - leftWidth;
            
            // 限制最小宽度
            if (leftWidth < 20 || rightWidth < 20) return;
            
            leftPanel.style.width = leftWidth + '%';
            rightPanel.style.width = rightWidth + '%';
        }
        
        function stopResize() {
            isResizing = false;
            document.removeEventListener('mousemove', handleResize);
            document.removeEventListener('mouseup', stopResize);
        }
    }

    /**
     * 键盘快捷键处理
     * @param {KeyboardEvent} e - 键盘事件
     */
    handleKeyboard(e) {
        if (this.currentPage !== 'reading') return;
        
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
        const explanationPanel = this.elements.explanationPanel;
        const readingPanel = this.elements.readingPanel;
        
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
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.app = new EnglishHelper();
});