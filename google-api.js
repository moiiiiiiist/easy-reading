/**
 * Google AI 服务集成 - 专注于AI功能
 */
class GoogleAPIService {
    constructor() {
        this.geminiApiKey = null;
        this.googleCloudApiKey = null; // 改为使用API Key
        this.storage = new StorageManager();
        this.loadConfig();
    }

    /**
     * 加载API配置
     */
    loadConfig() {
        this.geminiApiKey = this.storage.getGeminiApiKey();
        this.googleCloudApiKey = this.storage.getGoogleCloudApiKey(); // 加载API Key
    }

    /**
     * 设置Gemini API配置
     * @param {string} apiKey - Gemini API Key
     */
    setGeminiApiKey(apiKey) {
        this.geminiApiKey = apiKey;
        return this.storage.saveGeminiApiKey(apiKey);
    }

    /**
     * 设置Google Cloud API Key
     * @param {string} apiKey - Google Cloud API Key
     */
    setGoogleCloudApiKey(apiKey) {
        this.googleCloudApiKey = apiKey;
        return this.storage.saveGoogleCloudApiKey(apiKey);
    }

    /**
     * 检查Gemini API是否可用
     * @returns {boolean}
     */
    isGeminiConfigured() {
        return !!(this.geminiApiKey);
    }

    /**
     * 检查Google Cloud TTS是否可用
     * @returns {boolean}
     */
    isGoogleCloudConfigured() {
        return !!(this.googleCloudApiKey && this.googleCloudApiKey.trim() !== '');
    }

    /**
     * 检查是否有任何API配置
     * @returns {boolean}
     */
    isConfigured() {
        return this.isGeminiConfigured() || this.isGoogleCloudConfigured();
    }

    /**
     * 获取API配置状态
     * @returns {Object}
     */
    getConfigStatus() {
        return {
            gemini: this.isGeminiConfigured(),
            googleCloud: this.isGoogleCloudConfigured(),
            hasAnyConfig: this.isConfigured()
        };
    }

    /**
     * 使用Google Cloud TTS API
     * @param {string} text - 要转换的文本
     * @param {string} language - 语言代码
     * @param {Object} options - 语音选项
     * @returns {Promise<Blob>} 音频数据
     */
    async synthesizeSpeechWithGoogleCloud(text, language = 'en-US', options = {}) {
        if (!this.isGoogleCloudConfigured()) {
            throw new Error('Google Cloud TTS未配置');
        }

        try {
            // 直接调用Google Cloud TTS API
            const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${this.googleCloudApiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    input: { text },
                    voice: {
                        languageCode: language,
                        name: options.voiceName || this.getDefaultVoice(language),
                        ssmlGender: options.gender || 'NEUTRAL'
                    },
                    audioConfig: {
                        audioEncoding: 'MP3',
                        speakingRate: options.speed || 1.0,
                        pitch: options.pitch || 0.0,
                        volumeGainDb: options.volume || 0.0
                    }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Google Cloud TTS API请求失败: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            
            if (data.audioContent) {
                // 将base64转换为Blob
                const audioData = atob(data.audioContent);
                const audioArray = new Uint8Array(audioData.length);
                for (let i = 0; i < audioData.length; i++) {
                    audioArray[i] = audioData.charCodeAt(i);
                }
                return new Blob([audioArray], { type: 'audio/mp3' });
            } else {
                throw new Error('Google Cloud TTS API响应格式异常');
            }
        } catch (error) {
            console.error('Google Cloud TTS API调用失败:', error);
            throw error;
        }
    }

    /**
     * 验证Google Cloud API Key
     * @param {string} apiKey - API Key
     * @returns {Promise<boolean>}
     */
    async validateGoogleCloudApiKey(apiKey) {
        try {
            console.log('正在验证Google Cloud API Key...');
            
            if (!apiKey || apiKey.trim() === '') {
                console.error('API Key为空');
                return false;
            }

            // 尝试调用Google Cloud TTS API来验证密钥
            const testResponse = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    input: { text: 'test' },
                    voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' },
                    audioConfig: { audioEncoding: 'MP3' }
                })
            });

            console.log('验证响应状态:', testResponse.status);
            
            if (testResponse.status === 200) {
                console.log('Google Cloud API Key验证成功');
                return true;
            } else if (testResponse.status === 403) {
                console.error('API Key无效或权限不足');
                return false;
            } else {
                const errorText = await testResponse.text();
                console.error('API验证失败:', errorText);
                return false;
            }
        } catch (error) {
            console.error('Google Cloud API Key验证失败:', error);
            console.error('错误详情:', error.message);
            return false;
        }
    }

    /**
     * 获取默认语音
     * @param {string} language - 语言代码
     * @returns {string} 语音名称
     */
    getDefaultVoice(language) {
        const voices = {
            'en-US': 'en-US-Standard-A',
            'en-GB': 'en-GB-Standard-A',
            'zh-CN': 'cmn-CN-Standard-A',
            'zh-TW': 'cmn-TW-Standard-A',
            'ja-JP': 'ja-JP-Standard-A',
            'ko-KR': 'ko-KR-Standard-A',
            'fr-FR': 'fr-FR-Standard-A',
            'de-DE': 'de-DE-Standard-A',
            'es-ES': 'es-ES-Standard-A',
            'it-IT': 'it-IT-Standard-A',
            'pt-BR': 'pt-BR-Standard-A',
            'ru-RU': 'ru-RU-Standard-A'
        };
        
        return voices[language] || 'en-US-Standard-A';
    }

    /**
     * 使用Gemini生成文本
     * @param {string} prompt - 提示词
     * @param {string} content - 要处理的内容
     * @returns {Promise<string>} AI生成的响应
     */
    async generateContentWithGemini(prompt, content) {
        if (!this.isGeminiConfigured()) {
            throw new Error('Gemini API未配置');
        }

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-goog-api-key': this.geminiApiKey
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `${prompt}\n\n内容：${content}`
                        }]
                    }]
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Gemini API请求失败: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();
            
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                return data.candidates[0].content.parts[0].text;
            } else {
                throw new Error('Gemini API响应格式异常');
            }
        } catch (error) {
            console.error('Gemini API调用失败:', error);
            throw error;
        }
    }

    /**
     * 使用免费词典API作为备用
     * @param {string} word - 单词
     * @returns {Promise<Object>}
     */
    async getWordDefinitionFromFreeDictionary(word) {
        try {
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
            
            if (!response.ok) {
                throw new Error('词典API请求失败');
            }
            
            const data = await response.json();
            const entry = data[0];
            
            if (!entry) {
                throw new Error('未找到单词定义');
            }
            
            // 提取音标
            let phonetic = '';
            if (entry.phonetics && entry.phonetics.length > 0) {
                phonetic = entry.phonetics.find(p => p.text)?.text || '';
            }
            
            // 提取定义
            let definitions = [];
            if (entry.meanings && entry.meanings.length > 0) {
                entry.meanings.forEach(meaning => {
                    const partOfSpeech = meaning.partOfSpeech;
                    meaning.definitions.forEach((def, index) => {
                        if (index < 3) {
                            definitions.push(`${partOfSpeech}: ${def.definition}`);
                        }
                    });
                });
            }
            
            return {
                word: word,
                phonetic: phonetic,
                explanation: definitions.join('\n\n'),
                source: 'Free Dictionary API'
            };
            
        } catch (error) {
            console.error('免费词典API调用失败:', error);
            throw error;
        }
    }

    /**
     * 生成简单的句子分析（备用方案）
     * @param {string} sentence - 句子
     * @returns {Object}
     */
    generateBasicSentenceAnalysis(sentence) {
        const wordCount = sentence.split(/\s+/).length;
        const hasQuestion = sentence.includes('?');
        const hasExclamation = sentence.includes('!');
        
        let analysis = `句子分析：\n\n`;
        analysis += `1. 词数统计：${wordCount} 个单词\n\n`;
        
        if (hasQuestion) {
            analysis += `2. 句型：疑问句\n\n`;
        } else if (hasExclamation) {
            analysis += `2. 句型：感叹句\n\n`;
        } else {
            analysis += `2. 句型：陈述句\n\n`;
        }
        
        analysis += `3. 建议：\n`;
        analysis += `- 注意句子的语法结构\n`;
        analysis += `- 理解关键词汇的含义\n`;
        analysis += `- 练习朗读以提高语感\n\n`;
        analysis += `注：这是基础分析，建议配置AI API获取更详细的分析。`;
        
        return {
            sentence: sentence,
            analysis: analysis,
            source: 'Basic Analysis'
        };
    }

    /**
     * 解释单词（智能选择API）
     * @param {string} word - 要解释的单词
     * @returns {Promise<Object>} 包含解释信息的对象
     */
    async explainWord(word) {
        // 优先使用Gemini API
        if (this.isGeminiConfigured()) {
            try {
                const prompts = this.storage.getPrompts();
                const explanation = await this.generateContentWithGemini(prompts.wordPrompt, word);
                
                // 解析音标
                const phoneticMatch = explanation.match(/[\[\u002F]([^\]\u002F]+)[\]\u002F]/);
                const phonetic = phoneticMatch ? phoneticMatch[1] : '';

                return {
                    word: word,
                    phonetic: phonetic,
                    explanation: explanation,
                    timestamp: Date.now(),
                    source: 'Gemini AI'
                };
            } catch (error) {
                console.warn('Gemini API失败，使用备用方案:', error);
            }
        }
        
        // 备用方案：使用免费词典API
        try {
            return await this.getWordDefinitionFromFreeDictionary(word);
        } catch (error) {
            console.warn('免费词典API失败:', error);
            
            // 最终备用方案：基础解释
            return {
                word: word,
                phonetic: '',
                explanation: `单词：${word}\n\n暂无法获取详细解释，请配置API或检查网络连接。\n\n建议：\n1. 查阅词典了解含义\n2. 注意单词的发音\n3. 学习相关词汇搭配`,
                timestamp: Date.now(),
                source: 'Fallback'
            };
        }
    }

    /**
     * 分析句子（智能选择API）
     * @param {string} sentence - 要分析的句子
     * @returns {Promise<Object>} 包含分析信息的对象
     */
    async analyzeSentence(sentence) {
        // 优先使用Gemini API
        if (this.isGeminiConfigured()) {
            try {
                const prompts = this.storage.getPrompts();
                const analysis = await this.generateContentWithGemini(prompts.sentencePrompt, sentence);
                
                return {
                    sentence: sentence,
                    analysis: analysis,
                    timestamp: Date.now(),
                    source: 'Gemini AI'
                };
            } catch (error) {
                console.warn('Gemini API失败，使用备用方案:', error);
            }
        }
        
        // 备用方案：基础分析
        return this.generateBasicSentenceAnalysis(sentence);
    }

    /**
     * 检测文本语言
     * @param {string} text - 要检测的文本
     * @returns {string} 语言代码
     */
    detectLanguage(text) {
        if (!text) return 'en';
        
        const chineseRegex = /[\u4e00-\u9fa5]/;
        if (chineseRegex.test(text)) {
            return 'zh';
        }
        
        return 'en';
    }

    /**
     * 验证Gemini API配置
     * @param {string} apiKey - API Key
     * @returns {Promise<boolean>}
     */
    async validateGeminiApiKey(apiKey) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-goog-api-key': apiKey
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: 'Hello, this is a test.'
                        }]
                    }]
                })
            });

            return response.ok;
        } catch (error) {
            console.error('Gemini API验证失败:', error);
            return false;
        }
    }
}