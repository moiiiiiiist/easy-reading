/**
 * 音频管理器 - 专门处理Google TTS音频播放和缓存
 */
class AudioManager {
    constructor() {
        this.currentAudio = null;
        this.isPlaying = false;
        this.audioCache = new Map(); // 内存缓存
        this.dbName = 'EnglishHelperAudioCache';
        this.dbVersion = 1;
        this.db = null;
        this.storage = new StorageManager();
        
        // TTS设置
        this.voiceSettings = {
            speed: 0.9,
            voice: 'en-US-Standard-C',
            pitch: 0.0
        };
        
        // 系统TTS支持检查
        this.systemTTSSupported = this.checkSystemTTSSupport();
        
        // 检查Web Speech API支持
        // 只有在没有配置Google Cloud TTS时才使用Web Speech API
        this.useWebSpeechAPI = false; // 默认不使用Web Speech API
        
        // Google API服务
        this.googleAPI = null;
        
        this.loadVoiceSettings();
        this.initDB();
    }

    /**
     * 设置Google API服务
     * @param {GoogleAPIService} googleAPI - Google API服务实例
     */
    setGoogleAPI(googleAPI) {
        this.googleAPI = googleAPI;
    }

    /**
     * 加载语音设置
     */
    loadVoiceSettings() {
        const settings = this.storage.get('tts_settings');
        if (settings) {
            this.voiceSettings = { ...this.voiceSettings, ...settings };
        }
    }

    /**
     * 保存语音设置
     * @param {Object} settings - 语音设置
     */
    saveVoiceSettings(settings) {
        this.voiceSettings = { ...this.voiceSettings, ...settings };
        this.storage.set('tts_settings', this.voiceSettings);
    }

    /**
     * 初始化IndexedDB
     */
    async initDB() {
        try {
            this.db = await this.openDB();
        } catch (error) {
            console.error('IndexedDB初始化失败:', error);
        }
    }

    /**
     * 打开IndexedDB数据库
     * @returns {Promise<IDBDatabase>}
     */
    openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 创建音频缓存对象存储
                if (!db.objectStoreNames.contains('audioCache')) {
                    const store = db.createObjectStore('audioCache', { keyPath: 'id' });
                    store.createIndex('text', 'text', { unique: true });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    /**
     * 生成TTS音频URL（使用可靠的方法）
     * @param {string} text - 文本内容
     * @param {string} language - 语言代码
     * @returns {string}
     */
    generateTTSUrl(text, language = 'en') {
        if (!text) return null;
        
        // 清理文本
        const cleanText = encodeURIComponent(text.trim().substring(0, 200));
        
        // 使用多个可靠的Google TTS接口
        const endpoints = [
            `https://translate.google.com/translate_tts?ie=UTF-8&q=${cleanText}&tl=${language}&client=gtx&ttsspeed=${this.voiceSettings.speed}`,
            `https://translate.google.com/translate_tts?ie=UTF-8&q=${cleanText}&tl=${language}&client=tw-ob&ttsspeed=${this.voiceSettings.speed}`,
            `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${cleanText}&tl=${language}&client=gtx&ttsspeed=${this.voiceSettings.speed}`
        ];
        
        return endpoints[0]; // 使用第一个作为主要方案
    }

    /**
     * 使用Blob创建音频（避免CORS）
     * @param {string} text - 文本内容
     * @param {string} language - 语言代码
     * @returns {Promise<Audio>}
     */
    async createAudioFromBlob(text, language = 'en') {
        try {
            const url = this.generateTTSUrl(text, language);
            
            // 由于CORS限制，直接使用Audio对象而不是fetch
            const audio = new Audio();
            
            // 设置跨域属性
            audio.crossOrigin = 'anonymous';
            
            return new Promise((resolve, reject) => {
                audio.oncanplaythrough = () => {
                    // 缓存到IndexedDB（如果支持的话）
                    this.saveAudioToDB(text, null).catch(() => {
                        // 忽略缓存错误
                    });
                    resolve(audio);
                };
                
                audio.onerror = (error) => {
                    console.warn('直接URL方法失败，尝试备用方案:', error);
                    // 尝试备用URL
                    this.tryAlternativeTTS(text, language).then(resolve).catch(reject);
                };
                
                // 设置音频源
                audio.src = url;
                audio.load();
            });
        } catch (error) {
            console.warn('Blob方法失败，使用直接URL:', error);
            // 如果Blob方法失败，直接使用URL
            return new Audio(this.generateTTSUrl(text, language));
        }
    }

    /**
     * 尝试备用TTS方案
     * @param {string} text - 文本内容
     * @param {string} language - 语言代码
     * @returns {Promise<Audio>}
     */
    async tryAlternativeTTS(text, language = 'en') {
        // 首先尝试Web Speech API
        if ('speechSynthesis' in window) {
            try {
                return await this.createWebSpeechAudio(text, language);
            } catch (error) {
                console.warn('Web Speech API失败:', error);
            }
        }
        
        // 然后尝试备用URL
        const cleanText = encodeURIComponent(text.trim().substring(0, 200));
        
        // 备用URL列表
        const alternativeUrls = [
            `https://translate.google.com/translate_tts?ie=UTF-8&q=${cleanText}&tl=${language}&client=tw-ob&ttsspeed=${this.voiceSettings.speed}`,
            `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${cleanText}&tl=${language}&client=gtx&ttsspeed=${this.voiceSettings.speed}`,
            `https://translate.google.com/translate_tts?ie=UTF-8&q=${cleanText}&tl=${language}&client=gtx&ttsspeed=${this.voiceSettings.speed}`
        ];
        
        for (const url of alternativeUrls) {
            try {
                const audio = new Audio();
                audio.crossOrigin = 'anonymous';
                
                return new Promise((resolve, reject) => {
                    audio.oncanplaythrough = () => resolve(audio);
                    audio.onerror = () => reject(new Error('备用URL也失败'));
                    audio.src = url;
                    audio.load();
                });
            } catch (error) {
                console.warn('备用URL失败:', url, error);
                continue;
            }
        }
        
        throw new Error('所有TTS方案都失败了');
    }

    /**
     * 使用Web Speech API创建音频对象（不立即播放）
     * @param {string} text - 文本内容
     * @param {string} language - 语言代码
     * @returns {Promise<Audio>}
     */
    async createWebSpeechAudio(text, language = 'en') {
        // 创建一个模拟的音频对象，包含Web Speech API的utterance
        const audio = new Audio();
        
        // 创建utterance但不立即播放
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language;
        utterance.rate = this.voiceSettings.speed;
        
        // 设置语音
        const voices = speechSynthesis.getVoices();
        const targetVoice = voices.find(voice => 
            voice.lang.startsWith(language) || 
            voice.lang.startsWith(language.split('-')[0])
        );
        if (targetVoice) {
            utterance.voice = targetVoice;
        }
        
        // 将utterance存储在audio对象上，供后续播放使用
        audio.utterance = utterance;
        audio.isWebSpeech = true;
        
        // 重写play方法以使用Web Speech API
        audio.originalPlay = audio.play;
        audio.play = () => {
            return new Promise((resolve, reject) => {
                utterance.onend = () => resolve();
                utterance.onerror = (error) => reject(error);
                speechSynthesis.speak(utterance);
            });
        };
        
        // 重写pause方法
        audio.pause = () => {
            speechSynthesis.cancel();
        };
        
        // 重写stop方法
        audio.stop = () => {
            speechSynthesis.cancel();
        };
        
        return audio;
    }

    /**
     * 播放文本音频
     * @param {string} text - 要播放的文本
     * @param {string} language - 语言代码
     * @param {boolean} bypassCache - 是否绕过缓存（用于测试）
     * @returns {Promise<void>}
     */
    async play(text, language = 'en', bypassCache = false) {
        try {
            // 停止当前播放
            this.stop();
            
            // 优先使用Google Cloud TTS，如果不可用则使用Web Speech API
            const audio = await this.getAudio(text, language, bypassCache);
            
            return new Promise((resolve, reject) => {
                audio.onended = () => {
                    this.isPlaying = false;
                    this.currentAudio = null;
                    resolve();
                };
                
                audio.onerror = (error) => {
                    console.error('音频播放错误:', error);
                    this.isPlaying = false;
                    this.currentAudio = null;
                    // 不抛出错误，而是静默处理
                    resolve();
                };
                
                // 设置音频属性
                audio.playbackRate = this.voiceSettings.speed;
                
                audio.play().then(() => {
                    this.currentAudio = audio;
                    this.isPlaying = true;
                }).catch((error) => {
                    console.error('播放启动失败:', error);
                    reject(error);
                });
            });
        } catch (error) {
            console.error('播放音频失败:', error);
            throw error;
        }
    }

    /**
     * 测试TTS发音（绕过缓存）
     * @param {string} text - 要播放的文本
     * @param {string} language - 语言代码
     * @returns {Promise<void>}
     */
    async testTTS(text, language = 'en') {
        return this.play(text, language, true);
    }

    /**
     * 使用Web Speech API播放
     * @param {string} text - 要播放的文本
     * @param {string} language - 语言代码
     * @returns {Promise<void>}
     */
    async playWithWebSpeech(text, language = 'en') {
        return new Promise((resolve, reject) => {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = language;
            utterance.rate = this.voiceSettings.speed;
            
            // 设置语音
            const voices = speechSynthesis.getVoices();
            const targetVoice = voices.find(voice => 
                voice.lang.startsWith(language) || 
                voice.lang.startsWith(language.split('-')[0])
            );
            if (targetVoice) {
                utterance.voice = targetVoice;
            }
            
            utterance.onend = () => {
                this.isPlaying = false;
                this.currentAudio = null;
                resolve();
            };
            
            utterance.onerror = (error) => {
                console.error('Web Speech API播放错误:', error);
                this.isPlaying = false;
                this.currentAudio = null;
                resolve();
            };
            
            this.isPlaying = true;
            speechSynthesis.speak(utterance);
        });
    }

    /**
     * 获取或创建音频对象（用于测试，绕过缓存）
     * @param {string} text - 要播放的文本
     * @param {string} language - 语言代码
     * @param {boolean} bypassCache - 是否绕过缓存（用于测试）
     * @returns {Promise<Audio>}
     */
    async getAudio(text, language = 'en', bypassCache = false) {
        const cacheKey = `${text}_${language}_${this.voiceSettings.voice}_${this.voiceSettings.speed}_${this.voiceSettings.pitch}`;
        
        // 如果不需要绕过缓存，检查缓存
        if (!bypassCache) {
            // 检查内存缓存
            if (this.audioCache.has(cacheKey)) {
                return this.audioCache.get(cacheKey);
            }

            // 检查IndexedDB缓存
            const cachedBlob = await this.getAudioFromDB(text);
            if (cachedBlob) {
                const audioUrl = URL.createObjectURL(cachedBlob);
                const audio = new Audio(audioUrl);
                audio.playbackRate = this.voiceSettings.speed;
                this.audioCache.set(cacheKey, audio);
                return audio;
            }
        }

        // 1. 优先使用Google Cloud TTS
        if (this.googleAPI && this.googleAPI.isGoogleCloudConfigured()) {
            try {
                console.log('使用Google Cloud TTS生成音频');
                console.log('当前语音设置:', this.voiceSettings);
                console.log('传递的参数:', {
                    speed: this.voiceSettings.speed,
                    pitch: this.voiceSettings.pitch,
                    voiceName: this.voiceSettings.voice
                });
                const blob = await this.googleAPI.synthesizeSpeechWithGoogleCloud(text, language, {
                    speed: this.voiceSettings.speed,
                    pitch: this.voiceSettings.pitch,
                    voiceName: this.voiceSettings.voice
                });
                const audio = new Audio(URL.createObjectURL(blob));
                audio.playbackRate = this.voiceSettings.speed;
                
                // 只有在不绕过缓存时才保存到缓存
                if (!bypassCache) {
                    this.audioCache.set(cacheKey, audio);
                    // 保存到数据库
                    await this.saveAudioToDB(text, blob);
                }
                
                return audio;
            } catch (error) {
                console.warn('Google Cloud TTS失败，使用备用方案:', error);
            }
        }

        // 2. 备用方案：Web Speech API
        if ('speechSynthesis' in window) {
            try {
                console.log('使用Web Speech API生成音频');
                const audio = await this.createWebSpeechAudio(text, language);
                audio.playbackRate = this.voiceSettings.speed;
                
                // 只有在不绕过缓存时才保存到缓存
                if (!bypassCache) {
                    this.audioCache.set(cacheKey, audio);
                }
                return audio;
            } catch (error) {
                console.warn('Web Speech API失败:', error);
            }
        }

        // 3. 最后备用：Google Translate TTS（可能被CORS阻止）
        try {
            console.log('使用Google Translate TTS生成音频');
            const audio = await this.createAudioFromBlob(text, language);
            audio.playbackRate = this.voiceSettings.speed;
            
            // 只有在不绕过缓存时才保存到缓存
            if (!bypassCache) {
                this.audioCache.set(cacheKey, audio);
            }
            return audio;
        } catch (error) {
            console.error('所有TTS方案都失败:', error);
            // 如果所有TTS方法都失败，返回一个空的音频对象
            const fallbackAudio = new Audio();
            fallbackAudio.playbackRate = this.voiceSettings.speed;
            this.audioCache.set(cacheKey, fallbackAudio);
            return fallbackAudio;
        }
    }

    /**
     * 从IndexedDB获取音频数据
     * @param {string} text - 文本内容
     * @returns {Promise<Blob|null>}
     */
    async getAudioFromDB(text) {
        if (!this.db) return null;
        
        try {
            const transaction = this.db.transaction(['audioCache'], 'readonly');
            const store = transaction.objectStore('audioCache');
            const index = store.index('text');
            
            return new Promise((resolve, reject) => {
                const request = index.get(text);
                request.onsuccess = () => {
                    const result = request.result;
                    if (result && result.audioData) {
                        resolve(result.audioData);
                    } else {
                        resolve(null);
                    }
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('从数据库获取音频失败:', error);
            return null;
        }
    }

    /**
     * 保存音频数据到IndexedDB
     * @param {string} text - 文本内容
     * @param {Blob|null} audioBlob - 音频数据（可以为null）
     */
    async saveAudioToDB(text, audioBlob) {
        if (!this.db || !audioBlob) return;
        
        try {
            const transaction = this.db.transaction(['audioCache'], 'readwrite');
            const store = transaction.objectStore('audioCache');
            
            const audioData = {
                id: this.generateAudioId(text),
                text: text,
                audioData: audioBlob,
                timestamp: Date.now()
            };
            
            store.put(audioData);
        } catch (error) {
            console.error('保存音频到数据库失败:', error);
        }
    }

    /**
     * 生成音频缓存ID
     * @param {string} text - 文本内容
     * @returns {string}
     */
    generateAudioId(text) {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'audio_' + Math.abs(hash).toString(36);
    }

    /**
     * 停止播放
     */
    stop() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
        
        // 停止Web Speech API
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
        }
        
        this.isPlaying = false;
    }

    /**
     * 暂停播放
     */
    pause() {
        if (this.currentAudio && this.isPlaying) {
            this.currentAudio.pause();
            this.isPlaying = false;
        }
    }

    /**
     * 恢复播放
     */
    async resume() {
        if (this.currentAudio && !this.isPlaying) {
            try {
                await this.currentAudio.play();
                this.isPlaying = true;
            } catch (error) {
                console.error('恢复播放失败:', error);
                this.isPlaying = false;
                throw error;
            }
        }
    }

    /**
     * 检查是否正在播放
     * @returns {boolean}
     */
    isCurrentlyPlaying() {
        return this.isPlaying;
    }

    /**
     * 设置Google API服务引用
     * @param {GoogleAPIService} googleAPI - Google API服务实例
     */
    setGoogleAPIService(googleAPI) {
        this.googleAPI = googleAPI;
    }

    /**
     * 检测文本语言
     * @param {string} text - 文本内容
     * @returns {string} 语言代码
     */
    detectLanguage(text) {
        // 优先使用Google API服务的语言检测
        if (this.googleAPI && this.googleAPI.detectLanguage) {
            return this.googleAPI.detectLanguage(text);
        }
        
        // 备用方案：本地检测
        if (!text) return 'en';
        
        const chineseRegex = /[\u4e00-\u9fa5]/;
        if (chineseRegex.test(text)) {
            return 'zh';
        }
        
        return 'en';
    }

    /**
     * 批量预加载音频
     * @param {Array} texts - 文本数组
     * @param {Function} progressCallback - 进度回调
     * @returns {Promise<void>}
     */
    async batchPreload(texts, progressCallback) {
        const total = texts.length;
        let completed = 0;
        
        for (let i = 0; i < texts.length; i++) {
            try {
                const language = this.detectLanguage(texts[i]);
                await this.getAudio(texts[i], language);
                completed++;
                
                if (progressCallback) {
                    progressCallback(completed, total);
                }
            } catch (error) {
                console.warn(`预加载音频 ${i + 1} 失败:`, error);
                completed++;
                
                if (progressCallback) {
                    progressCallback(completed, total);
                }
            }
            
            // 添加小延迟避免请求过快
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    /**
     * 获取可用的语音列表
     * @returns {Array}
     */
    getAvailableVoices() {
        return [
            { id: 'en-US-Standard-A', name: '美式英语 - 女声A', language: 'en' },
            { id: 'en-US-Standard-B', name: '美式英语 - 男声B', language: 'en' },
            { id: 'en-US-Standard-C', name: '美式英语 - 女声C', language: 'en' },
            { id: 'en-US-Standard-D', name: '美式英语 - 男声D', language: 'en' },
            { id: 'en-GB-Standard-A', name: '英式英语 - 女声A', language: 'en' },
            { id: 'en-GB-Standard-B', name: '英式英语 - 男声B', language: 'en' },
            { id: 'en-GB-Standard-C', name: '英式英语 - 女声C', language: 'en' },
            { id: 'en-GB-Standard-D', name: '英式英语 - 男声D', language: 'en' }
        ];
    }

    /**
     * 检查系统TTS支持
     * @returns {boolean}
     */
    checkSystemTTSSupport() {
        return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    }

    /**
     * 获取语音信息
     * @returns {Object}
     */
    getVoiceInfo() {
        const availableVoices = this.getAvailableVoices();
        const supportedLanguages = ['en', 'zh'];
        
        return {
            availableVoices: availableVoices,
            supportedLanguages: supportedLanguages,
            systemSupported: this.systemTTSSupported
        };
    }

    /**
     * 获取语速选项
     * @returns {Array}
     */
    getSpeedOptions() {
        return [
            { value: 0.5, label: '0.5x - 很慢' },
            { value: 0.75, label: '0.75x - 慢' },
            { value: 0.9, label: '0.9x - 稍慢' },
            { value: 1.0, label: '1.0x - 正常' },
            { value: 1.25, label: '1.25x - 稍快' },
            { value: 1.5, label: '1.5x - 快' },
            { value: 2.0, label: '2.0x - 很快' }
        ];
    }

    /**
     * 清理过期缓存
     * @param {number} maxAge - 最大缓存时间（毫秒）
     */
    async cleanExpiredCache(maxAge = 7 * 24 * 60 * 60 * 1000) {
        if (!this.db) return;
        
        try {
            const transaction = this.db.transaction(['audioCache'], 'readwrite');
            const store = transaction.objectStore('audioCache');
            const index = store.index('timestamp');
            
            const cutoffTime = Date.now() - maxAge;
            const range = IDBKeyRange.upperBound(cutoffTime);
            
            const request = index.openCursor(range);
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };
        } catch (error) {
            console.error('清理过期缓存失败:', error);
        }
    }
}