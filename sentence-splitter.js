/**
 * 句子分割器 - 智能处理中英文文本分割
 * 版本: 2.0 - 支持无空格句子分割
 */
class SentenceSplitter {
    constructor() {
        // 英语缩写词列表
        this.abbreviations = new Set([
            'Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'Sr.', 'Jr.',
            'U.S.A.', 'U.K.', 'U.S.', 'Ph.D.', 'M.D.', 'B.A.', 'M.A.',
            'vs.', 'etc.', 'e.g.', 'i.e.', 'Inc.', 'Corp.', 'Ltd.',
            'St.', 'Ave.', 'Blvd.', 'Rd.', 'No.', 'Vol.', 'pp.',
            'a.m.', 'p.m.', 'A.M.', 'P.M.'
        ]);
        
        // 句子结束标点符号（中英文）
        this.sentenceEnders = /[.!?。！？]/;
        
        // 数字序号模式
        this.numberedPattern = /^\d+\.\s/;
    }

    /**
     * 分割文本为句子数组
     * @param {string} text - 要分割的文本
     * @returns {Array} 句子数组
     */
    splitIntoSentences(text) {
        if (!text || typeof text !== 'string') {
            return [];
        }

        // 预处理：清理多余的空白字符
        text = text.replace(/\s+/g, ' ').trim();
        
        const sentences = [];
        let currentSentence = '';
        let i = 0;

        while (i < text.length) {
            const char = text[i];
            currentSentence += char;

            // 检查是否遇到句子结束符
            if (this.sentenceEnders.test(char)) {
                // 检查是否为缩写词
                if (this.isAbbreviation(currentSentence.trim())) {
                    i++;
                    continue;
                }

                // 检查下一个字符
                const nextChar = text[i + 1];
                
                // 如果下一个字符是空格、句子结束，或者是中文语境，或者是大写字母（新句子开始）
                if (!nextChar || /\s/.test(nextChar) || this.isChineseContext(char, nextChar) || 
                    (nextChar && /[A-Z]/.test(nextChar) && !this.isAbbreviation(currentSentence.trim() + nextChar))) {
                    const sentence = currentSentence.trim();
                    if (sentence && this.isValidSentence(sentence)) {
                        sentences.push(sentence);
                    }
                    currentSentence = '';
                }
            }
            
            i++;
        }

        // 处理最后一个句子（如果没有结束标点）
        const lastSentence = currentSentence.trim();
        if (lastSentence && this.isValidSentence(lastSentence)) {
            sentences.push(lastSentence);
        }

        // 后处理：合并过短的句子片段
        return this.postProcessSentences(sentences);
    }

    /**
     * 分割文本为句子数组，并保留段落信息
     * @param {string} text - 要分割的文本
     * @returns {Object} 包含句子数组和段落分隔信息的对象
     */
    splitIntoSentencesWithBreaks(text) {
        if (!text || typeof text !== 'string') {
            return { sentences: [], paragraphBreaks: [] };
        }

        // 预处理：保留段落结构
        // 将连续的换行符标准化为双换行符
        text = text.replace(/\n\s*\n/g, '\n\n');
        // 清理行内多余的空白字符
        text = text.replace(/[ \t]+/g, ' ');
        text = text.trim();
        
        const sentences = [];
        const paragraphBreaks = [];
        let currentSentence = '';
        let i = 0;
        let sentenceIndex = 0;

        while (i < text.length) {
            const char = text[i];
            currentSentence += char;

            // 检查是否遇到句子结束符
            if (this.sentenceEnders.test(char)) {
                // 检查是否为缩写词
                if (this.isAbbreviation(currentSentence.trim())) {
                    i++;
                    continue;
                }

                // 检查下一个字符
                const nextChar = text[i + 1];
                
                // 如果下一个字符是空格、句子结束，或者是中文语境，或者是大写字母（新句子开始）
                if (!nextChar || /\s/.test(nextChar) || this.isChineseContext(char, nextChar) || 
                    (nextChar && /[A-Z]/.test(nextChar) && !this.isAbbreviation(currentSentence.trim() + nextChar))) {
                    const sentence = currentSentence.trim();
                    if (sentence && this.isValidSentence(sentence)) {
                        sentences.push(sentence);
                        
                        // 检查句子后是否有段落分隔
                        const remainingText = text.substring(i + 1);
                        if (remainingText.startsWith('\n\n')) {
                            paragraphBreaks.push(sentenceIndex);
                        }
                        
                        sentenceIndex++;
                    }
                    currentSentence = '';
                }
            }
            
            i++;
        }

        // 处理最后一个句子（如果没有结束标点）
        const lastSentence = currentSentence.trim();
        if (lastSentence && this.isValidSentence(lastSentence)) {
            sentences.push(lastSentence);
        }

        // 后处理：合并过短的句子片段
        const processedSentences = this.postProcessSentences(sentences);
        
        // 重新计算段落分隔位置
        const adjustedBreaks = [];
        let adjustedIndex = 0;
        
        for (let i = 0; i < processedSentences.length; i++) {
            if (paragraphBreaks.includes(i)) {
                adjustedBreaks.push(adjustedIndex);
            }
            adjustedIndex++;
        }
        
        return {
            sentences: processedSentences,
            paragraphBreaks: adjustedBreaks
        };
    }

    /**
     * 检查是否为缩写词
     * @param {string} text - 当前句子文本
     * @returns {boolean}
     */
    isAbbreviation(text) {
        // 获取最后一个单词（包括点号）
        const words = text.split(/\s+/);
        const lastWord = words[words.length - 1];
        
        // 检查是否在缩写词列表中
        if (this.abbreviations.has(lastWord)) {
            return true;
        }

        // 检查数字后的点号（如 1. 2. 等）
        if (this.numberedPattern.test(lastWord)) {
            return true;
        }

        // 检查单个大写字母后的点号（如 A. B. C.）
        if (/^[A-Z]\.$/.test(lastWord)) {
            return true;
        }

        return false;
    }

    /**
     * 检查是否为中文语境
     * @param {string} currentChar - 当前字符
     * @param {string} nextChar - 下一个字符
     * @returns {boolean}
     */
    isChineseContext(currentChar, nextChar) {
        // 中文句号后面直接跟中文字符
        if (/[。！？]/.test(currentChar) && nextChar && /[\u4e00-\u9fa5]/.test(nextChar)) {
            return true;
        }
        
        // 英文句号后面直接跟中文字符
        if (/[.!?]/.test(currentChar) && nextChar && /[\u4e00-\u9fa5]/.test(nextChar)) {
            return true;
        }

        return false;
    }

    /**
     * 验证是否为有效句子
     * @param {string} sentence - 句子文本
     * @returns {boolean}
     */
    isValidSentence(sentence) {
        // 过滤过短的句子（少于3个字符）
        if (sentence.length < 3) {
            return false;
        }

        // 过滤只包含标点符号的句子
        if (/^[^\w\u4e00-\u9fa5]+$/.test(sentence)) {
            return false;
        }

        // 过滤只包含数字和符号的句子
        if (/^[\d\s\-.,()]+$/.test(sentence)) {
            return false;
        }

        return true;
    }

    /**
     * 后处理句子数组
     * @param {Array} sentences - 原始句子数组
     * @returns {Array} 处理后的句子数组
     */
    postProcessSentences(sentences) {
        const processed = [];
        
        for (let i = 0; i < sentences.length; i++) {
            let sentence = sentences[i].trim();
            
            // 如果当前句子太短且下一个句子存在，尝试合并
            if (sentence.length < 20 && i < sentences.length - 1) {
                const nextSentence = sentences[i + 1].trim();
                
                // 检查是否应该合并（如引用、对话等）
                if (this.shouldMerge(sentence, nextSentence)) {
                    sentence = sentence + ' ' + nextSentence;
                    i++; // 跳过下一个句子
                }
            }
            
            if (sentence) {
                processed.push(sentence);
            }
        }
        
        return processed;
    }

    /**
     * 判断是否应该合并两个句子
     * @param {string} current - 当前句子
     * @param {string} next - 下一个句子
     * @returns {boolean}
     */
    shouldMerge(current, next) {
        // 如果当前句子以引号开始但未结束
        if (/^["'""]/.test(current) && !/["'""]$/.test(current) && /["'""]$/.test(next)) {
            return true;
        }
        
        // 如果当前句子太短且不以句号结尾
        if (current.length < 15 && !/[.!?。！？]$/.test(current)) {
            return true;
        }
        
        return false;
    }

    /**
     * 统计文本信息
     * @param {string} text - 原始文本
     * @param {Array} sentences - 分割后的句子数组
     * @returns {Object} 统计信息
     */
    getTextStats(text, sentences) {
        if (!text) {
            return { wordCount: 0, sentenceCount: 0, charCount: 0 };
        }

        // 统计单词数（英文单词 + 中文字符）
        const englishWords = text.match(/\b[a-zA-Z]+\b/g) || [];
        const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
        const wordCount = englishWords.length + chineseChars.length;

        // 统计字符数（不包含空格）
        const charCount = text.replace(/\s/g, '').length;

        return {
            wordCount,
            sentenceCount: sentences.length,
            charCount,
            avgWordsPerSentence: sentences.length > 0 ? Math.round(wordCount / sentences.length) : 0
        };
    }

    /**
     * 格式化统计信息为显示文本
     * @param {Object} stats - 统计信息对象
     * @returns {string} 格式化的统计文本
     */
    formatStats(stats) {
        return `共 ${stats.sentenceCount} 句，${stats.wordCount} 词，${stats.charCount} 字符 | 平均每句 ${stats.avgWordsPerSentence} 词`;
    }
}