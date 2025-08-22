# Story Claude - 轻松阅读

一个功能强大的英语学习应用，支持文章阅读、单词解释、句子分析和高质量的文本转语音功能。

## 功能特性

- 📚 **文章管理**: 上传和管理英语文章
- 🔍 **智能分析**: 使用Google Gemini AI进行单词解释和句子分析
- 🎤 **高质量TTS**: 支持Google Cloud Text-to-Speech、Web Speech API和Google Translate TTS
- 📖 **阅读模式**: 逐句阅读，支持高亮和发音
- 💾 **本地存储**: 所有数据本地存储，保护隐私

## 安装和设置

### 1. 安装依赖

```bash
npm install
```

### 2. 启动服务器

```bash
npm start
```

或者开发模式：

```bash
npm run dev
```

### 3. 访问应用

打开浏览器访问 `http://localhost:3000`

## Google Cloud TTS 配置

### 1. 创建Google Cloud项目

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用 Text-to-Speech API

### 2. 创建服务账户

1. 在Google Cloud Console中，进入"IAM和管理" > "服务账户"
2. 点击"创建服务账户"
3. 填写服务账户名称和描述
4. 为服务账户分配"Cloud Text-to-Speech API 用户"角色

### 3. 下载私钥

1. 点击刚创建的服务账户
2. 进入"密钥"标签页
3. 点击"添加密钥" > "创建新密钥"
4. 选择JSON格式，下载私钥文件

### 4. 配置应用

1. 打开应用设置页面
2. 在"Google Cloud TTS 配置"部分填写：
   - **项目ID**: 你的Google Cloud项目ID
   - **客户端邮箱**: 服务账户的邮箱地址
   - **私钥**: 从下载的JSON文件中复制private_key字段的内容
3. 点击"保存Google Cloud配置"
4. 点击"测试Google Cloud TTS"验证配置

## API配置

### Google Gemini AI

1. 访问 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 创建API密钥
3. 在应用设置中填入API密钥

## 使用说明

### 上传文章

1. 点击"文章管理"
2. 选择或拖拽TXT文件
3. 点击"开始阅读"

### 阅读模式

- 点击句子进行发音
- 双击单词查看详细解释
- 使用设置调整语音和字体

### TTS优先级

应用按以下优先级使用TTS服务：

1. **Google Cloud TTS** (最高质量，需要配置)
2. **Web Speech API** (浏览器原生，免费)
3. **Google Translate TTS** (备用方案，可能有CORS限制)

## 技术架构

- **前端**: 原生JavaScript + HTML5 + CSS3
- **后端**: Node.js + Express
- **存储**: IndexedDB (本地) + localStorage
- **TTS**: Google Cloud TTS API + Web Speech API
- **AI**: Google Gemini AI API

## 文件结构

```
story_claude/
├── server.js              # 后端服务器
├── package.json           # 项目配置
├── index.html             # 主页面
├── main-app.js            # 主应用逻辑
├── google-api.js          # Google API服务
├── audio-manager.js       # 音频管理
├── storage.js             # 存储管理
├── sentence-splitter.js   # 句子分割
├── utils.js               # 工具函数
├── styles.css             # 样式文件
└── README.md              # 说明文档
```

## 故障排除

### TTS不工作

1. 检查Google Cloud TTS配置是否正确
2. 确认服务账户有正确的权限
3. 尝试使用Web Speech API作为备用方案

### API调用失败

1. 检查网络连接
2. 验证API密钥是否正确
3. 确认API配额是否充足

### 音频缓存问题

1. 清除浏览器缓存
2. 检查IndexedDB存储空间
3. 重启应用

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request来改进这个项目！ 