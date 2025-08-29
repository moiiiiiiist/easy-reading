/**
 * Supabase 同步管理器
 * 实现多端数据同步功能
 */
class SupabaseSync {
    constructor() {
        this.supabase = null;
        this.userId = null;
        this.syncQueue = [];
        this.isSyncing = false;
        this.lastSyncTime = null;
        this.syncInterval = null;
        this.offlineQueue = [];
        
        // 同步配置
        this.config = {
            autoSyncInterval: 30000, // 30秒自动同步
            debounceDelay: 5000, // 5秒防抖延迟
            maxRetries: 3,
            conflictResolution: 'last-write-wins' // 冲突解决策略
        };
        
        // 初始化事件
        this.onSyncStart = null;
        this.onSyncComplete = null;
        this.onSyncError = null;
        this.onConflict = null;
    }
    
    /**
     * 初始化 Supabase 客户端
     */
    async initialize(supabaseUrl, supabaseKey, syncSecret) {
        try {
            // 动态加载 Supabase 客户端库
            if (!window.supabase) {
                await this.loadSupabaseClient();
            }
            
            // 创建 Supabase 客户端
            this.supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
            
            // 使用同步密钥作为用户ID（所有设备共享）
            if (syncSecret) {
                // 对密钥进行哈希处理，生成固定的用户ID
                this.userId = await this.hashSecret(syncSecret);
                console.log('[Supabase] 使用共享密钥标识，多设备将同步数据');
            } else {
                // 如果没有提供密钥，使用设备ID（单设备模式）
                this.userId = this.getDeviceId();
                console.log('[Supabase] 使用设备ID作为标识（单设备模式）');
            }
            
            // 监听网络状态
            this.setupNetworkListener();
            
            // 设置实时订阅
            await this.setupRealtimeSubscription();
            
            // 启动自动同步
            this.startAutoSync();
            
            console.log('[Supabase] 初始化成功，用户ID:', this.userId);
            return true;
        } catch (error) {
            console.error('[Supabase] 初始化失败:', error);
            throw error;
        }
    }
    
    /**
     * 对密钥进行哈希处理
     */
    async hashSecret(secret) {
        // 使用简单的哈希方法生成固定ID
        let hash = 0;
        for (let i = 0; i < secret.length; i++) {
            const char = secret.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        // 转换为正数并添加前缀
        return 'sync_' + Math.abs(hash).toString(36);
    }
    
    /**
     * 动态加载 Supabase 客户端库
     */
    async loadSupabaseClient() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    /**
     * 用户认证
     */
    async authenticateUser(email) {
        try {
            // 使用 Magic Link 登录（无密码）
            const { data, error } = await this.supabase.auth.signInWithOtp({
                email: email,
                options: {
                    shouldCreateUser: true
                }
            });
            
            if (error) throw error;
            
            // 监听认证状态变化
            this.supabase.auth.onAuthStateChange((event, session) => {
                if (session) {
                    this.userId = session.user.id;
                    console.log('[Supabase] 用户已登录:', this.userId);
                } else {
                    this.userId = null;
                    console.log('[Supabase] 用户已登出');
                }
            });
            
            return data;
        } catch (error) {
            console.error('[Supabase] 认证失败:', error);
            throw error;
        }
    }
    
    /**
     * 设置网络状态监听
     */
    setupNetworkListener() {
        window.addEventListener('online', () => {
            console.log('[Supabase] 网络已连接，处理离线队列');
            this.processOfflineQueue();
        });
        
        window.addEventListener('offline', () => {
            console.log('[Supabase] 网络已断开，启用离线模式');
        });
    }
    
    /**
     * 设置实时订阅
     */
    async setupRealtimeSubscription() {
        if (!this.supabase || !this.userId) return;
        
        // 订阅数据变化
        const subscription = this.supabase
            .channel('sync-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'user_data',
                    filter: `user_id=eq.${this.userId}`
                },
                (payload) => this.handleRealtimeUpdate(payload)
            )
            .subscribe();
        
        return subscription;
    }
    
    /**
     * 处理实时更新
     */
    handleRealtimeUpdate(payload) {
        console.log('[Supabase] 收到实时更新:', payload);
        
        // 如果是其他设备的更新，同步到本地
        if (payload.new && payload.new.device_id !== this.getDeviceId()) {
            this.mergeRemoteData(payload.new);
        }
    }
    
    /**
     * 同步所有数据到云端
     */
    async syncToCloud(force = false) {
        if (this.isSyncing && !force) {
            console.log('[Supabase] 同步已在进行中');
            return;
        }
        
        this.isSyncing = true;
        this.onSyncStart?.();
        
        try {
            // 检查网络连接
            if (!navigator.onLine) {
                throw new Error('网络未连接');
            }
            
            // 获取本地数据
            const localData = this.getLocalData();
            
            // 获取云端数据用于比较
            const cloudData = await this.fetchCloudData();
            
            // 解决冲突并合并数据
            const mergedData = await this.resolveConflicts(localData, cloudData);
            
            // 上传到云端
            await this.uploadData(mergedData);
            
            // 更新最后同步时间
            this.lastSyncTime = Date.now();
            localStorage.setItem('lastSyncTime', this.lastSyncTime);
            
            console.log('[Supabase] 同步成功');
            this.onSyncComplete?.(mergedData);
            
            return mergedData;
        } catch (error) {
            console.error('[Supabase] 同步失败:', error);
            
            // 如果离线，添加到队列
            if (!navigator.onLine) {
                this.addToOfflineQueue('sync', localData);
            }
            
            this.onSyncError?.(error);
            throw error;
        } finally {
            this.isSyncing = false;
        }
    }
    
    /**
     * 从云端同步到本地
     */
    async syncFromCloud() {
        try {
            const cloudData = await this.fetchCloudData();
            
            if (cloudData) {
                // 合并到本地存储
                this.mergeToLocal(cloudData);
                
                console.log('[Supabase] 从云端同步成功');
                return cloudData;
            }
        } catch (error) {
            console.error('[Supabase] 从云端同步失败:', error);
            throw error;
        }
    }
    
    /**
     * 获取本地数据
     */
    getLocalData() {
        const storage = window.storageManager || new StorageManager();
        
        return {
            articles: storage.getArticles(),
            favorites: storage.get(storage.keys.FAVORITES) || {},
            highlightedWords: storage.get(storage.keys.HIGHLIGHTED_WORDS) || {},
            explanations: storage.get(storage.keys.EXPLANATIONS) || {},
            readingProgress: storage.get(storage.keys.READING_PROGRESS) || {},
            settings: {
                apiKey: storage.get(storage.keys.GEMINI_API_KEY) || '',
                googleCloudApiKey: storage.get(storage.keys.GOOGLE_CLOUD_API_KEY) || '',
                prompts: storage.get(storage.keys.PROMPTS) || {},
                ttsSettings: storage.get(storage.keys.TTS_SETTINGS) || {},
                fontSize: storage.get(storage.keys.FONT_SIZE) || 16
            },
            timeStats: storage.get('timeStats') || {},
            metadata: {
                deviceId: this.getDeviceId(),
                timestamp: Date.now(),
                version: '1.0.0'
            }
        };
    }
    
    /**
     * 获取云端数据
     */
    async fetchCloudData() {
        if (!this.supabase || !this.userId) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('user_data')
                .select('*')
                .eq('user_id', this.userId)
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();  // 使用 maybeSingle 替代 single，允许返回 null
            
            if (error) {
                console.error('[Supabase] 获取云端数据错误:', error);
                throw error;
            }
            
            return data ? JSON.parse(data.data) : null;
        } catch (error) {
            console.error('[Supabase] 获取云端数据失败:', error);
            // 如果是404或无数据，返回null而不是抛出错误
            if (error.message && error.message.includes('not found')) {
                return null;
            }
            throw error;
        }
    }
    
    /**
     * 上传数据到云端
     */
    async uploadData(data) {
        if (!this.supabase || !this.userId) {
            throw new Error('未初始化或未登录');
        }
        
        try {
            // 准备上传数据
            const uploadData = {
                user_id: this.userId,
                data: JSON.stringify(data),
                device_id: this.getDeviceId(),
                updated_at: new Date().toISOString()
            };
            
            console.log('[Supabase] 准备上传数据，用户ID:', this.userId);
            console.log('[Supabase] 数据大小:', JSON.stringify(data).length, '字节');
            
            const { data: result, error } = await this.supabase
                .from('user_data')
                .upsert(uploadData, {
                    onConflict: 'user_id'  // 明确指定冲突字段
                })
                .select();  // 返回插入/更新的数据
            
            if (error) throw error;
            
            console.log('[Supabase] 数据已上传，结果:', result);
        } catch (error) {
            console.error('[Supabase] 上传失败:', error);
            throw error;
        }
    }
    
    /**
     * 解决冲突
     */
    async resolveConflicts(localData, cloudData) {
        if (!cloudData) return localData;
        
        const conflicts = this.detectConflicts(localData, cloudData);
        
        if (conflicts.length === 0) {
            return localData;
        }
        
        console.log('[Supabase] 检测到冲突:', conflicts);
        
        // 根据策略解决冲突
        if (this.config.conflictResolution === 'last-write-wins') {
            // 比较时间戳，保留最新的
            if (localData.metadata.timestamp > cloudData.metadata.timestamp) {
                return localData;
            } else {
                return cloudData;
            }
        } else if (this.config.conflictResolution === 'merge') {
            // 智能合并
            return this.mergeData(localData, cloudData);
        } else if (this.config.conflictResolution === 'manual') {
            // 手动解决（触发回调）
            if (this.onConflict) {
                return await this.onConflict(localData, cloudData, conflicts);
            }
        }
        
        return localData;
    }
    
    /**
     * 检测冲突
     */
    detectConflicts(localData, cloudData) {
        const conflicts = [];
        
        // 检查文章冲突
        Object.keys(localData.articles).forEach(articleId => {
            if (cloudData.articles[articleId]) {
                const localArticle = localData.articles[articleId];
                const cloudArticle = cloudData.articles[articleId];
                
                if (localArticle.updatedAt !== cloudArticle.updatedAt) {
                    conflicts.push({
                        type: 'article',
                        id: articleId,
                        local: localArticle,
                        cloud: cloudArticle
                    });
                }
            }
        });
        
        return conflicts;
    }
    
    /**
     * 合并数据
     */
    mergeData(localData, cloudData) {
        const merged = JSON.parse(JSON.stringify(localData));
        
        // 合并文章
        Object.keys(cloudData.articles).forEach(articleId => {
            if (!merged.articles[articleId] || 
                cloudData.articles[articleId].updatedAt > merged.articles[articleId].updatedAt) {
                merged.articles[articleId] = cloudData.articles[articleId];
            }
        });
        
        // 合并标注数据（采用并集策略）
        ['favorites', 'highlightedWords', 'explanations'].forEach(key => {
            Object.keys(cloudData[key]).forEach(articleId => {
                if (!merged[key][articleId]) {
                    merged[key][articleId] = cloudData[key][articleId];
                } else {
                    // 合并数组，去重
                    if (Array.isArray(cloudData[key][articleId])) {
                        const localItems = merged[key][articleId];
                        const cloudItems = cloudData[key][articleId];
                        const mergedItems = [...localItems];
                        
                        cloudItems.forEach(item => {
                            const exists = localItems.some(localItem => 
                                JSON.stringify(localItem) === JSON.stringify(item)
                            );
                            if (!exists) {
                                mergedItems.push(item);
                            }
                        });
                        
                        merged[key][articleId] = mergedItems;
                    }
                }
            });
        });
        
        // 更新元数据
        merged.metadata.timestamp = Date.now();
        
        return merged;
    }
    
    /**
     * 合并到本地存储
     */
    mergeToLocal(cloudData) {
        const storage = window.storageManager || new StorageManager();
        
        // 合并文章
        if (cloudData.articles) {
            const localArticles = storage.getArticles();
            const mergedArticles = { ...localArticles, ...cloudData.articles };
            storage.set(storage.keys.ARTICLES, mergedArticles);
        }
        
        // 合并其他数据
        const keyMapping = {
            'favorites': 'FAVORITES',
            'highlightedWords': 'HIGHLIGHTED_WORDS',
            'explanations': 'EXPLANATIONS',
            'readingProgress': 'READING_PROGRESS'
        };
        
        Object.keys(keyMapping).forEach(key => {
            if (cloudData[key]) {
                const storageKey = storage.keys[keyMapping[key]];
                if (storageKey) {
                    storage.set(storageKey, cloudData[key]);
                }
            }
        });
        
        // 合并设置（直接使用 storage.set 方法）
        if (cloudData.settings) {
            if (cloudData.settings.apiKey) {
                storage.set(storage.keys.GEMINI_API_KEY, cloudData.settings.apiKey);
            }
            if (cloudData.settings.googleCloudApiKey) {
                storage.set(storage.keys.GOOGLE_CLOUD_API_KEY, cloudData.settings.googleCloudApiKey);
            }
            if (cloudData.settings.prompts) {
                storage.set(storage.keys.PROMPTS, cloudData.settings.prompts);
            }
            if (cloudData.settings.ttsSettings) {
                storage.set(storage.keys.TTS_SETTINGS, cloudData.settings.ttsSettings);
            }
            if (cloudData.settings.fontSize) {
                storage.set(storage.keys.FONT_SIZE, cloudData.settings.fontSize);
            }
        }
        
        // 合并时间统计
        if (cloudData.timeStats) {
            storage.set('timeStats', cloudData.timeStats);
        }
    }
    
    /**
     * 合并远程数据
     */
    mergeRemoteData(remoteData) {
        try {
            const data = JSON.parse(remoteData.data);
            this.mergeToLocal(data);
            console.log('[Supabase] 远程数据已合并到本地');
        } catch (error) {
            console.error('[Supabase] 合并远程数据失败:', error);
        }
    }
    
    /**
     * 启动自动同步
     */
    startAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        this.syncInterval = setInterval(() => {
            if (navigator.onLine && !this.isSyncing) {
                this.syncToCloud();
            }
        }, this.config.autoSyncInterval);
        
        console.log('[Supabase] 自动同步已启动');
    }
    
    /**
     * 停止自动同步
     */
    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            console.log('[Supabase] 自动同步已停止');
        }
    }
    
    /**
     * 添加到离线队列
     */
    addToOfflineQueue(action, data) {
        this.offlineQueue.push({
            action,
            data,
            timestamp: Date.now(),
            retries: 0
        });
        
        // 保存到本地存储
        localStorage.setItem('offlineQueue', JSON.stringify(this.offlineQueue));
        
        console.log('[Supabase] 已添加到离线队列');
    }
    
    /**
     * 处理离线队列
     */
    async processOfflineQueue() {
        if (this.offlineQueue.length === 0) return;
        
        console.log(`[Supabase] 处理离线队列，共 ${this.offlineQueue.length} 项`);
        
        const queue = [...this.offlineQueue];
        this.offlineQueue = [];
        
        for (const item of queue) {
            try {
                if (item.action === 'sync') {
                    await this.uploadData(item.data);
                }
                console.log('[Supabase] 离线任务处理成功:', item.action);
            } catch (error) {
                console.error('[Supabase] 离线任务处理失败:', error);
                
                // 重试逻辑
                if (item.retries < this.config.maxRetries) {
                    item.retries++;
                    this.offlineQueue.push(item);
                }
            }
        }
        
        // 更新本地存储
        localStorage.setItem('offlineQueue', JSON.stringify(this.offlineQueue));
    }
    
    /**
     * 获取设备ID
     */
    getDeviceId() {
        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
            deviceId = this.generateDeviceId();
            localStorage.setItem('deviceId', deviceId);
        }
        return deviceId;
    }
    
    /**
     * 生成设备ID
     */
    generateDeviceId() {
        return 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * 获取同步状态
     */
    getSyncStatus() {
        return {
            isInitialized: !!this.supabase,
            isAuthenticated: !!this.userId,
            isSyncing: this.isSyncing,
            lastSyncTime: this.lastSyncTime,
            offlineQueueSize: this.offlineQueue.length,
            isOnline: navigator.onLine
        };
    }
    
    /**
     * 清理资源
     */
    cleanup() {
        this.stopAutoSync();
        
        if (this.supabase) {
            this.supabase.removeAllChannels();
        }
        
        console.log('[Supabase] 资源已清理');
    }
}

// 导出为全局变量
window.SupabaseSync = SupabaseSync;