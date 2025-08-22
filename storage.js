/**
 * 本地存储管理器 - 处理配置和数据的本地存储
 */
class StorageManager {
    constructor() {
        this.keys = {
            API_CONFIG: 'english_helper_api_config',
            GEMINI_API_KEY: 'english_helper_gemini_api_key',
            GOOGLE_CLOUD_CONFIG: 'english_helper_google_cloud_config',
            WORD_PROMPT: 'english_helper_word_prompt',
            SENTENCE_PROMPT: 'english_helper_sentence_prompt',
            FONT_SIZE: 'english_helper_font_size',
            VOICE_SETTINGS: 'english_helper_voice_settings', // TTS语音设置
            ARTICLES: 'english_helper_articles', // 所有文章列表
            CURRENT_ARTICLE_ID: 'english_helper_current_article_id', // 当前选中的文章ID
            READING_PROGRESS: 'english_helper_reading_progress',
            FAVORITES: 'english_helper_favorites',
            HIGHLIGHTED_WORDS: 'english_helper_highlighted_words',
            EXPLANATIONS: 'english_helper_explanations' // 解释条数据
        };

        // 初始化默认提示词
        this.initializeDefaults();
    }

    /**
     * 初始化默认设置
     */
    initializeDefaults() {
        // 默认单词解释提示词
        const defaultWordPrompt = `请解释这个英语单词，不超过25字。格式为：
1. 中文含义；
2. 词根，辅助记忆。`;

        // 默认句子分析提示词
        const defaultSentencePrompt = `请分析这个英语句子，不超过 150字。格式为：
1，翻译整句；
2，列出生僻词；
3，列出惯用搭配；
4，如果是长难句，列出语法难点。否则忽略该项。`;

        // 设置默认值（如果不存在）
        if (!this.get(this.keys.WORD_PROMPT)) {
            this.set(this.keys.WORD_PROMPT, defaultWordPrompt);
        }

        if (!this.get(this.keys.SENTENCE_PROMPT)) {
            this.set(this.keys.SENTENCE_PROMPT, defaultSentencePrompt);
        }

        if (!this.get(this.keys.FONT_SIZE)) {
            this.set(this.keys.FONT_SIZE, 16);
        }
    }

    /**
     * 保存数据到localStorage
     * @param {string} key - 存储键
     * @param {*} value - 要保存的值
     */
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('保存数据失败:', error);
            return false;
        }
    }

    /**
     * 从localStorage获取数据
     * @param {string} key - 存储键
     * @returns {*} 存储的值
     */
    get(key) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error('读取数据失败:', error);
            return null;
        }
    }

    /**
     * 删除指定键的数据
     * @param {string} key - 存储键
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('删除数据失败:', error);
            return false;
        }
    }

    /**
     * 保存API配置
     * @param {Object} config - API配置对象
     */
    saveApiConfig(config) {
        return this.set(this.keys.API_CONFIG, config);
    }

    /**
     * 获取API配置
     * @returns {Object|null} API配置
     */
    getApiConfig() {
        return this.get(this.keys.API_CONFIG);
    }

    /**
     * 保存提示词设置
     * @param {string} wordPrompt - 单词解释提示词
     * @param {string} sentencePrompt - 句子分析提示词
     */
    savePrompts(wordPrompt, sentencePrompt) {
        const success1 = this.set(this.keys.WORD_PROMPT, wordPrompt);
        const success2 = this.set(this.keys.SENTENCE_PROMPT, sentencePrompt);
        return success1 && success2;
    }

    /**
     * 获取提示词设置
     * @returns {Object} 包含两个提示词的对象
     */
    getPrompts() {
        return {
            wordPrompt: this.get(this.keys.WORD_PROMPT),
            sentencePrompt: this.get(this.keys.SENTENCE_PROMPT)
        };
    }

    /**
     * 保存字体大小设置
     * @param {number} fontSize - 字体大小
     */
    saveFontSize(fontSize) {
        return this.set(this.keys.FONT_SIZE, fontSize);
    }

    /**
     * 获取字体大小设置
     * @returns {number} 字体大小
     */
    getFontSize() {
        return this.get(this.keys.FONT_SIZE) || 16;
    }

    /**
     * 保存Gemini API Key
     * @param {string} apiKey - Gemini API Key
     */
    saveGeminiApiKey(apiKey) {
        return this.set(this.keys.GEMINI_API_KEY, apiKey);
    }

    /**
     * 获取Gemini API Key
     * @returns {string|null}
     */
    getGeminiApiKey() {
        return this.get(this.keys.GEMINI_API_KEY);
    }

    /**
     * 保存Google Cloud配置
     * @param {Object} config - Google Cloud配置
     */
    saveGoogleCloudConfig(config) {
        return this.set(this.keys.GOOGLE_CLOUD_CONFIG, config);
    }

    /**
     * 获取Google Cloud配置
     * @returns {Object|null}
     */
    getGoogleCloudConfig() {
        return this.get(this.keys.GOOGLE_CLOUD_CONFIG);
    }

    /**
     * 保存文章
     * @param {Object} articleData - 文章数据
     * @returns {string} 文章ID
     */
    saveArticle(articleData) {
        const articles = this.getArticles();
        const articleId = this.generateId();
        
        const article = {
            id: articleId,
            ...articleData,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        
        articles[articleId] = article;
        this.set(this.keys.ARTICLES, articles);
        
        return articleId;
    }

    /**
     * 获取所有文章
     * @returns {Object} 文章对象集合
     */
    getArticles() {
        return this.get(this.keys.ARTICLES) || {};
    }

    /**
     * 获取文章列表（数组形式）
     * @returns {Array} 文章数组
     */
    getArticleList() {
        const articles = this.getArticles();
        return Object.values(articles).sort((a, b) => b.updatedAt - a.updatedAt);
    }

    /**
     * 获取单篇文章
     * @param {string} articleId - 文章ID
     * @returns {Object|null}
     */
    getArticle(articleId) {
        const articles = this.getArticles();
        return articles[articleId] || null;
    }

    /**
     * 删除文章
     * @param {string} articleId - 文章ID
     */
    deleteArticle(articleId) {
        const articles = this.getArticles();
        delete articles[articleId];
        this.set(this.keys.ARTICLES, articles);
        
        // 如果删除的是当前文章，清除当前文章ID
        const currentId = this.getCurrentArticleId();
        if (currentId === articleId) {
            this.remove(this.keys.CURRENT_ARTICLE_ID);
        }
        
        return true;
    }

    /**
     * 设置当前文章ID
     * @param {string} articleId - 文章ID
     */
    setCurrentArticleId(articleId) {
        return this.set(this.keys.CURRENT_ARTICLE_ID, articleId);
    }

    /**
     * 获取当前文章ID
     * @returns {string|null}
     */
    getCurrentArticleId() {
        return this.get(this.keys.CURRENT_ARTICLE_ID);
    }

    /**
     * 获取当前文章
     * @returns {Object|null}
     */
    getCurrentArticle() {
        const articleId = this.getCurrentArticleId();
        return articleId ? this.getArticle(articleId) : null;
    }

    /**
     * 保存语音设置
     * @param {Object} settings - 语音设置
     */
    saveVoiceSettings(settings) {
        return this.set(this.keys.VOICE_SETTINGS, settings);
    }

    /**
     * 获取语音设置
     * @returns {Object|null}
     */
    getVoiceSettings() {
        return this.get(this.keys.VOICE_SETTINGS);
    }

    /**
     * 生成唯一ID
     * @returns {string}
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * 保存阅读进度
     * @param {Object} progress - 进度信息
     */
    saveReadingProgress(progress) {
        return this.set(this.keys.READING_PROGRESS, progress);
    }

    /**
     * 获取阅读进度
     * @returns {Object|null} 进度信息
     */
    getReadingProgress() {
        return this.get(this.keys.READING_PROGRESS);
    }

    /**
     * 保存收藏的句子
     * @param {Array} favorites - 收藏句子列表
     */
    saveFavorites(favorites) {
        return this.set(this.keys.FAVORITES, favorites);
    }

    /**
     * 获取收藏的句子
     * @returns {Array} 收藏句子列表
     */
    getFavorites() {
        return this.get(this.keys.FAVORITES) || [];
    }

    /**
     * 添加收藏句子
     * @param {number} sentenceIndex - 句子索引
     * @param {string} sentence - 句子内容
     */
    addFavorite(sentenceIndex, sentence) {
        const favorites = this.getFavorites();
        const existing = favorites.find(f => f.index === sentenceIndex);
        
        if (!existing) {
            favorites.push({
                index: sentenceIndex,
                sentence: sentence,
                timestamp: Date.now()
            });
            return this.saveFavorites(favorites);
        }
        
        return true;
    }

    /**
     * 移除收藏句子
     * @param {number} sentenceIndex - 句子索引
     */
    removeFavorite(sentenceIndex) {
        const favorites = this.getFavorites();
        const filtered = favorites.filter(f => f.index !== sentenceIndex);
        return this.saveFavorites(filtered);
    }

    /**
     * 检查句子是否已收藏
     * @param {number} sentenceIndex - 句子索引
     * @returns {boolean}
     */
    isFavorite(sentenceIndex) {
        const favorites = this.getFavorites();
        return favorites.some(f => f.index === sentenceIndex);
    }

    /**
     * 保存高亮单词
     * @param {Array} highlightedWords - 高亮单词列表
     */
    saveHighlightedWords(highlightedWords) {
        return this.set(this.keys.HIGHLIGHTED_WORDS, highlightedWords);
    }

    /**
     * 获取高亮单词
     * @returns {Array} 高亮单词列表
     */
    getHighlightedWords() {
        return this.get(this.keys.HIGHLIGHTED_WORDS) || [];
    }

    /**
     * 添加高亮单词
     * @param {string} word - 单词
     * @param {number} sentenceIndex - 句子索引
     */
    addHighlightedWord(word, sentenceIndex) {
        const highlightedWords = this.getHighlightedWords();
        const existing = highlightedWords.find(w => w.word === word);
        
        if (!existing) {
            highlightedWords.push({
                word: word,
                sentenceIndex: sentenceIndex,
                timestamp: Date.now()
            });
            return this.saveHighlightedWords(highlightedWords);
        }
        
        return true;
    }

    /**
     * 移除高亮单词
     * @param {string} word - 单词
     */
    removeHighlightedWord(word) {
        const highlightedWords = this.getHighlightedWords();
        const filtered = highlightedWords.filter(w => w.word !== word);
        return this.saveHighlightedWords(filtered);
    }

    /**
     * 检查单词是否已高亮
     * @param {string} word - 单词
     * @returns {boolean}
     */
    isWordHighlighted(word) {
        const highlightedWords = this.getHighlightedWords();
        return highlightedWords.some(w => w.word === word);
    }

    /**
     * 清空所有存储数据
     */
    clearAll() {
        Object.values(this.keys).forEach(key => {
            this.remove(key);
        });
        
        // 重新初始化默认值
        this.initializeDefaults();
    }

    /**
     * 导出所有数据
     * @returns {Object} 所有存储的数据
     */
    exportAll() {
        const data = {};
        Object.entries(this.keys).forEach(([name, key]) => {
            data[name] = this.get(key);
        });
        return data;
    }

    /**
     * 导入数据
     * @param {Object} data - 要导入的数据
     */
    importAll(data) {
        Object.entries(data).forEach(([name, value]) => {
            if (this.keys[name] && value !== null) {
                this.set(this.keys[name], value);
            }
        });
    }

    /**
     * 保存解释条数据
     * @param {string} articleId - 文章ID
     * @param {Map} explanations - 解释条数据
     */
    saveExplanations(articleId, explanations) {
        const allExplanations = this.get(this.keys.EXPLANATIONS) || {};
        allExplanations[articleId] = Array.from(explanations.entries());
        return this.set(this.keys.EXPLANATIONS, allExplanations);
    }

    /**
     * 获取解释条数据
     * @param {string} articleId - 文章ID
     * @returns {Map} 解释条数据
     */
    getExplanations(articleId) {
        const allExplanations = this.get(this.keys.EXPLANATIONS) || {};
        const articleExplanations = allExplanations[articleId] || [];
        return new Map(articleExplanations);
    }

    /**
     * 删除指定文章的解释条数据
     * @param {string} articleId - 文章ID
     */
    removeExplanations(articleId) {
        const allExplanations = this.get(this.keys.EXPLANATIONS) || {};
        delete allExplanations[articleId];
        return this.set(this.keys.EXPLANATIONS, allExplanations);
    }
}