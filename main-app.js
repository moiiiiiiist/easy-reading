/**
 * 轻松阅读主页面应用
 */
class MainApp extends BaseApp {
    constructor() {
        super();
        
        // DOM元素缓存
        this.cacheElements();
        
        // 初始化应用
        this.init();
    }

    /**
     * 缓存DOM元素
     */
    cacheElements() {
        this.elements = {
            // 导航按钮
            manageBtn: document.getElementById('manageBtn'),
            settingsBtn: document.getElementById('settingsBtn'),
            
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
            apiStatus: document.getElementById('apiStatus'),
            saveApiBtn: document.getElementById('saveApiBtn'),
            
            // Google Cloud配置
            googleCloudApiKey: document.getElementById('googleCloudApiKey'),
            saveGoogleCloudBtn: document.getElementById('saveGoogleCloudBtn'),
            testGoogleCloudBtn: document.getElementById('testGoogleCloudBtn'),
            googleCloudStatus: document.getElementById('googleCloudStatus'),
            
            wordPrompt: document.getElementById('wordPrompt'),
            sentencePrompt: document.getElementById('sentencePrompt'),
            savePromptsBtn: document.getElementById('savePromptsBtn'),
            ttsVoice: document.getElementById('ttsVoice'),
            ttsSpeed: document.getElementById('ttsSpeed'),
            ttsPitch: document.getElementById('ttsPitch'),
            saveTTSBtn: document.getElementById('saveTTSBtn'),
            testTTSBtn: document.getElementById('testTTSBtn'),
            fontSize: document.getElementById('fontSize'),
            fontSizeValue: document.getElementById('fontSizeValue'),
            saveFontBtn: document.getElementById('saveFontBtn')
        };
    }

    /**
     * 初始化应用
     */
    init() {
        // 设置Google API服务到音频管理器
        this.audioManager.setGoogleAPI(this.googleAPI);
        
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
        
        // 文件上传事件
        this.elements.uploadBtn.addEventListener('click', () => this.elements.fileInput.click());
        this.elements.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        this.elements.startReadingBtn.addEventListener('click', () => this.startReading());
        this.elements.deleteArticleBtn.addEventListener('click', () => this.deleteCurrentArticle());
        
        // 设置保存事件
        this.elements.saveApiBtn.addEventListener('click', () => this.saveApiConfig());
        this.elements.saveGoogleCloudBtn.addEventListener('click', () => this.saveGoogleCloudConfig());
        this.elements.testGoogleCloudBtn.addEventListener('click', () => this.testGoogleCloudTTS());
        this.elements.savePromptsBtn.addEventListener('click', () => this.savePrompts());
        this.elements.saveFontBtn.addEventListener('click', () => this.saveFontSize());
        this.elements.saveTTSBtn.addEventListener('click', () => this.saveTTSSettings());
        this.elements.testTTSBtn.addEventListener('click', () => this.testTTS());
        
        // 字体大小滑块事件
        this.elements.fontSize.addEventListener('input', (e) => {
            this.elements.fontSizeValue.textContent = e.target.value + 'px';
        });
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
     * 处理文件上传
     * @param {Event} event - 文件上传事件
     */
    async handleFileUpload(event) {
        const article = await super.handleFileUpload(event, this.elements.uploadBtn);
        if (article) {
            // 更新界面
            this.updateArticleList();
            this.updateArticlePreview();
        }
    }

    /**
     * 更新文章列表
     */
    updateArticleList() {
        super.updateArticleList(this.elements.articleList, 'mainApp');
    }

    // 重写基类方法
    onArticleSelected() {
        this.updateArticleList();
        this.updateArticlePreview();
    }

    onArticleCleared() {
        this.clearArticlePreview();
    }

    onArticleDeleted() {
        this.updateArticleList();
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
    startReading() {
        if (!this.currentArticle) {
            Utils.showToast('请先选择文章', 'error');
            return;
        }
        
        // 跳转到阅读页面
        window.location.href = 'reading.html';
    }

    /**
     * 设置相关方法
     */
    loadSettings() {
        // 加载API配置
        const geminiApiKey = this.storage.getGeminiApiKey();
        
        if (geminiApiKey) {
            this.elements.geminiApiKey.value = geminiApiKey;
        }
        
        // 加载Google Cloud API Key
        const googleCloudApiKey = this.storage.getGoogleCloudApiKey();
        if (googleCloudApiKey) {
            this.elements.googleCloudApiKey.value = googleCloudApiKey;
        }
        
        // 更新API状态
        this.updateApiStatus();
        this.updateGoogleCloudStatus();
        
        // 加载提示词
        const prompts = this.storage.getPrompts();
        this.elements.wordPrompt.value = prompts.wordPrompt || '';
        this.elements.sentencePrompt.value = prompts.sentencePrompt || '';
        
        // 加载字体设置
        const fontSize = this.storage.getFontSize();
        this.elements.fontSize.value = fontSize;
        this.elements.fontSizeValue.textContent = fontSize + 'px';
        
        // 加载TTS设置
        this.loadTTSSettings();
    }

    /**
     * 加载TTS设置
     */
    loadTTSSettings() {
        const ttsSettings = this.storage.get('tts_settings');
        if (ttsSettings) {
            if (ttsSettings.voice) {
                this.elements.ttsVoice.value = ttsSettings.voice;
            }
            if (ttsSettings.speed) {
                this.elements.ttsSpeed.value = ttsSettings.speed;
            }
            if (ttsSettings.pitch) {
                this.elements.ttsPitch.value = ttsSettings.pitch;
            }
        }
    }

    /**
     * 保存TTS设置
     */
    saveTTSSettings() {
        const settings = {
            voice: this.elements.ttsVoice.value,
            speed: parseFloat(this.elements.ttsSpeed.value),
            pitch: parseFloat(this.elements.ttsPitch.value)
        };
        
        this.storage.set('tts_settings', settings);
        this.audioManager.saveVoiceSettings(settings);
        
        Utils.showToast('Google Cloud TTS设置保存成功', 'success');
    }

    /**
     * 测试TTS
     */
    async testTTS() {
        try {
            Utils.setLoading(this.elements.testTTSBtn, true);
            
            const testText = "Hello, this is a test of the selected voice and speed. 你好，这是语音测试。";
            
            // 应用当前设置
            const settings = {
                voice: this.elements.ttsVoice.value,
                speed: parseFloat(this.elements.ttsSpeed.value),
                pitch: parseFloat(this.elements.ttsPitch.value)
            };
            this.audioManager.saveVoiceSettings(settings);
            
            // 从语音名称中提取语言代码
            const voiceName = this.elements.ttsVoice.value;
            const language = voiceName.split('-').slice(0, 2).join('-'); // 提取 en-US 或 en-GB
            
            await this.audioManager.testTTS(testText, language);
            
            Utils.showToast('语音测试完成', 'success');
            
        } catch (error) {
            console.error('语音测试失败:', error);
            Utils.showToast('语音测试失败: ' + error.message, 'error');
        } finally {
            Utils.setLoading(this.elements.testTTSBtn, false);
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
        
        if (status.gemini) {
            statusText = '✅ Gemini AI 已配置';
            statusContainer.classList.add('configured');
        } else {
            statusText = '❌ 未配置API\n将使用免费词典API作为备用方案';
            statusContainer.classList.add('error');
        }
        
        statusElement.textContent = statusText;
    }

    /**
     * 更新Google Cloud状态显示
     */
    updateGoogleCloudStatus() {
        const status = this.googleAPI.getConfigStatus();
        const statusElement = this.elements.googleCloudStatus;
        const statusContainer = statusElement.parentElement;
        
        // 重置样式
        statusContainer.className = 'api-status';
        
        let statusText = '';
        
        if (status.googleCloud) {
            statusText = '✅ Google Cloud TTS 已配置';
            statusContainer.classList.add('configured');
        } else {
            statusText = '❌ 未配置Google Cloud TTS\n将使用Web Speech API作为备用方案';
            statusContainer.classList.add('error');
        }
        
        statusElement.textContent = statusText;
    }

    /**
     * 保存Google Cloud API Key
     */
    async saveGoogleCloudConfig() {
        try {
            Utils.setLoading(this.elements.saveGoogleCloudBtn, true);
            
            const apiKey = this.elements.googleCloudApiKey.value.trim();
            
            if (!apiKey) {
                Utils.showToast('请输入Google Cloud API Key', 'error');
                return;
            }
            
            // 验证API Key
            const isValid = await this.googleAPI.validateGoogleCloudApiKey(apiKey);
            if (!isValid) {
                Utils.showToast('Google Cloud API Key验证失败，请检查API Key是否正确', 'error');
                return;
            }
            
            // 保存API Key到本地存储
            this.googleAPI.setGoogleCloudApiKey(apiKey);
            this.updateGoogleCloudStatus();
            
            Utils.showToast('Google Cloud API Key保存成功', 'success');
            
        } catch (error) {
            console.error('保存Google Cloud API Key失败:', error);
            Utils.showToast('Google Cloud API Key保存失败: ' + error.message, 'error');
        } finally {
            Utils.setLoading(this.elements.saveGoogleCloudBtn, false);
        }
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
     * 测试Google Cloud TTS
     */
    async testGoogleCloudTTS() {
        try {
            Utils.setLoading(this.elements.testGoogleCloudBtn, true);
            
            if (!this.googleAPI.isGoogleCloudConfigured()) {
                Utils.showToast('请先配置Google Cloud TTS', 'error');
                return;
            }
            
            const testText = "Hello, this is a test of Google Cloud Text-to-Speech. 你好，这是Google Cloud TTS测试。";
            
            // 使用Google Cloud TTS生成音频
            const blob = await this.googleAPI.synthesizeSpeechWithGoogleCloud(testText, 'en-US', {
                speed: this.audioManager.voiceSettings.speed
            });
            
            // 播放音频
            const audio = new Audio(URL.createObjectURL(blob));
            await audio.play();
            
            Utils.showToast('Google Cloud TTS测试完成', 'success');
            
        } catch (error) {
            console.error('Google Cloud TTS测试失败:', error);
            Utils.showToast('Google Cloud TTS测试失败: ' + error.message, 'error');
        } finally {
            Utils.setLoading(this.elements.testGoogleCloudBtn, false);
        }
    }

    async saveApiConfig() {
        try {
            const geminiApiKey = this.elements.geminiApiKey.value.trim();
            
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
            
            if (hasValidConfig) {
                this.updateApiStatus();
                Utils.showToast('API配置保存成功', 'success');
            } else if (!geminiApiKey) {
                Utils.showToast('请输入Gemini API Key', 'error');
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
        Utils.showToast('字体设置保存成功', 'success');
    }

    /**
     * 加载当前文章
     */
    loadCurrentArticle() {
        super.loadCurrentArticle();
        
        this.updateArticleList();
        if (this.currentArticle) {
            this.updateArticlePreview();
        }
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.mainApp = new MainApp();
});