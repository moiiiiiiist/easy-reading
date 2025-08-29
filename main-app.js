/**
 * 轻松阅读主页面应用
 */
class MainApp extends BaseApp {
    constructor() {
        super();
        
        // DOM元素缓存
        this.cacheElements();
        
        // 初始化时间统计
        this.initTimeTracking();
        
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
            
            // 文本导入
            articleTitleInput: document.getElementById('articleTitleInput'),
            textPasteArea: document.getElementById('textPasteArea'),
            importTextBtn: document.getElementById('importTextBtn'),
            
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
            saveFontBtn: document.getElementById('saveFontBtn'),
            
            // 数据导出/导入
            exportArticleSelect: document.getElementById('exportArticleSelect'),
            exportSingleBtn: document.getElementById('exportSingleBtn'),
            exportAllBtn: document.getElementById('exportAllBtn'),
            importFileInput: document.getElementById('importFileInput'),
            selectImportFileBtn: document.getElementById('selectImportFileBtn'),
            importFileName: document.getElementById('importFileName'),
            overwriteExisting: document.getElementById('overwriteExisting'),
            generateNewId: document.getElementById('generateNewId'),
            importDataBtn: document.getElementById('importDataBtn'),
            importStatus: document.getElementById('importStatus')
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
        
        // 确保导出选项在初始化时也更新
        setTimeout(() => {
            this.updateExportArticleOptions();
        }, 500);
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
        
        // 文本导入事件
        this.elements.importTextBtn.addEventListener('click', () => this.handleTextImport());
        
        this.elements.startReadingBtn.addEventListener('click', () => this.startReading());
        
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
        
        // 数据导出/导入事件
        this.elements.exportSingleBtn.addEventListener('click', () => this.exportSingleArticle());
        this.elements.exportAllBtn.addEventListener('click', () => this.exportAllArticles());
        this.elements.selectImportFileBtn.addEventListener('click', () => this.elements.importFileInput.click());
        this.elements.importFileInput.addEventListener('change', (e) => this.handleImportFileSelect(e));
        this.elements.importDataBtn.addEventListener('click', () => this.importData());
        this.elements.overwriteExisting.addEventListener('change', () => this.updateImportOptions());
        this.elements.generateNewId.addEventListener('change', () => this.updateImportOptions());
    }

    /**
     * 初始化时间统计功能
     */
    initTimeTracking() {
        try {
            // 使用全局时间管理器
            const timeInstances = window.globalTimeManager.initTimeTracking('主页面');
            this.timeTracker = timeInstances.timeTracker;
            this.floatingTimer = timeInstances.floatingTimer;
            
            console.log('[主应用] 时间统计功能初始化完成');
        } catch (error) {
            console.error('[主应用] 时间统计功能初始化失败:', error);
        }
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
            // 延迟更新导出选项，确保DOM完全渲染
            setTimeout(() => {
                this.updateExportArticleOptions();
            }, 100);
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
     * 处理文本导入
     */
    async handleTextImport() {
        const content = this.elements.textPasteArea.value;
        const customTitle = this.elements.articleTitleInput.value;
        
        const article = await super.handleTextImport(content, customTitle, this.elements.importTextBtn);
        if (article) {
            // 清空输入框
            this.elements.textPasteArea.value = '';
            this.elements.articleTitleInput.value = '';
            
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
    }

    /**
     * 开始阅读
     */
    startReading() {
        if (!this.currentArticle) {
            Utils.showToast('请先选择文章', 'error');
            return;
        }
        
        // 增加阅读次数统计
        if (window.globalTimeManager && window.globalTimeManager.getTimeTracker()) {
            window.globalTimeManager.getTimeTracker().incrementReadingCount();
        }
        
        // 通知全局时间管理器页面切换
        if (window.globalTimeManager) {
            window.globalTimeManager.handlePageTransition('主页面', '阅读页面');
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
        this.updateExportArticleOptions();
        if (this.currentArticle) {
            this.updateArticlePreview();
        }
    }
    
    /**
     * 更新导出文章选项
     */
    updateExportArticleOptions() {
        // 确保元素存在
        const select = this.elements.exportArticleSelect;
        if (!select) {
            console.warn('导出文章选择框元素不存在');
            return;
        }

        const articles = this.storage.getArticles();
        
        // 清空选项
        select.innerHTML = '<option value="">请选择要导出的文章</option>';
        
        // 检查是否有文章
        if (!articles || Object.keys(articles).length === 0) {
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "暂无文章可导出";
            option.disabled = true;
            select.appendChild(option);
            return;
        }
        
        // 添加文章选项
        Object.entries(articles).forEach(([id, article]) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = article.title || `文章-${id.substring(0, 8)}`;
            select.appendChild(option);
        });
        
        console.log(`[导出选项] 已加载 ${Object.keys(articles).length} 篇文章`);
    }
    
    /**
     * 导出单篇文章
     */
    exportSingleArticle() {
        const selectedId = this.elements.exportArticleSelect.value;
        if (!selectedId) {
            Utils.showToast('请先选择要导出的文章', 'error');
            return;
        }
        
        try {
            const exportData = this.storage.exportArticle(selectedId);
            if (!exportData) {
                Utils.showToast('导出失败：文章不存在', 'error');
                return;
            }
            
            this.downloadJSON(exportData, `article_${exportData.article.title}_${new Date().toISOString().split('T')[0]}.json`);
            Utils.showToast('文章导出成功', 'success');
        } catch (error) {
            console.error('导出文章失败:', error);
            Utils.showToast('导出失败：' + error.message, 'error');
        }
    }
    
    /**
     * 导出所有文章
     */
    exportAllArticles() {
        try {
            const exportData = this.storage.exportAllArticles();
            if (exportData.metadata.articleCount === 0) {
                Utils.showToast('没有可导出的文章', 'error');
                return;
            }
            
            this.downloadJSON(exportData, `all_articles_${new Date().toISOString().split('T')[0]}.json`);
            Utils.showToast(`成功导出 ${exportData.metadata.articleCount} 篇文章`, 'success');
        } catch (error) {
            console.error('导出所有文章失败:', error);
            Utils.showToast('导出失败：' + error.message, 'error');
        }
    }
    
    /**
     * 下载JSON数据
     */
    downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    /**
     * 处理导入文件选择
     */
    handleImportFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.name.toLowerCase().endsWith('.json')) {
            Utils.showToast('请选择JSON格式的文件', 'error');
            this.elements.importFileInput.value = '';
            return;
        }
        
        this.elements.importFileName.textContent = file.name;
        this.elements.importDataBtn.disabled = false;
        this.selectedImportFile = file;
    }
    
    /**
     * 导入数据
     */
    async importData() {
        if (!this.selectedImportFile) {
            Utils.showToast('请先选择要导入的文件', 'error');
            return;
        }
        
        try {
            Utils.setLoading(this.elements.importDataBtn, true);
            this.elements.importStatus.textContent = '正在读取文件...';
            
            const fileContent = await this.readFileAsText(this.selectedImportFile);
            const importData = JSON.parse(fileContent);
            
            this.elements.importStatus.textContent = '正在导入数据...';
            
            const options = {
                overwrite: this.elements.overwriteExisting.checked,
                generateNewId: this.elements.generateNewId.checked
            };
            
            let successCount = 0;
            let errorCount = 0;
            let results = [];
            
            // 检查是否是单篇文章还是多篇文章
            if (importData.article) {
                // 单篇文章
                const result = this.storage.importArticle(importData, options);
                results.push(result);
                if (result.success) successCount++;
                else errorCount++;
            } else if (importData.articles) {
                // 多篇文章
                for (const [articleId, articleData] of Object.entries(importData.articles)) {
                    const result = this.storage.importArticle(articleData, options);
                    results.push(result);
                    if (result.success) successCount++;
                    else errorCount++;
                }
            } else {
                throw new Error('无效的导入数据格式');
            }
            
            // 更新界面
            this.updateArticleList();
            this.updateExportArticleOptions();
            
            // 显示结果
            let statusMessage = `导入完成：成功 ${successCount} 篇`;
            if (errorCount > 0) {
                statusMessage += `，失败 ${errorCount} 篇`;
            }
            
            this.elements.importStatus.innerHTML = statusMessage;
            
            if (successCount > 0) {
                Utils.showToast(statusMessage, 'success');
            } else {
                Utils.showToast('导入失败，请检查文件格式', 'error');
            }
            
            // 显示详细结果
            console.log('导入详细结果:', results);
            
        } catch (error) {
            console.error('导入数据失败:', error);
            this.elements.importStatus.textContent = '导入失败：' + error.message;
            Utils.showToast('导入失败：' + error.message, 'error');
        } finally {
            Utils.setLoading(this.elements.importDataBtn, false);
        }
    }
    
    /**
     * 读取文件为文本
     */
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('文件读取失败'));
            reader.readAsText(file, 'UTF-8');
        });
    }
    
    /**
     * 更新导入选项
     */
    updateImportOptions() {
        // 如果选择覆盖现有文章，则禁用生成新ID选项
        if (this.elements.overwriteExisting.checked) {
            this.elements.generateNewId.checked = false;
            this.elements.generateNewId.disabled = true;
        } else {
            this.elements.generateNewId.disabled = false;
        }
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MainApp();
    window.mainApp = window.app; // 保持向后兼容
});