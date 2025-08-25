/**
 * 句子分割器 - 智能处理中英文文本分割
 * 版本: 4.0 - 极简版本，只保留缩写词判定和句子合并判定
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
        
        // 数字序号模式（支持有空格和无空格的情况）
        this.numberedPattern = /^\d+\./;
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
                // 获取当前句子的最后一个词（包含当前字符）
                const words = currentSentence.trim().split(/\s+/);
                const lastWord = words[words.length - 1];
                
                // 检查是否为缩写词、数字序号等
                if (this.isAbbreviation(lastWord)) {
                    i++;
                    continue;
                }

                // 检查下一个字符
                const nextChar = text[i + 1];
                
                // 简化的分割条件：
                // 1. 没有下一个字符（文本结束）
                // 2. 下一个字符是空格
                // 3. 下一个字符是大写字母（新句子开始）
                if (!nextChar || 
                    /\s/.test(nextChar) || 
                    (nextChar && /[A-Z]/.test(nextChar))) {
                    
                    const sentence = currentSentence.trim();
                    if (sentence) {
                        sentences.push(sentence);
                    }
                    currentSentence = '';
                }
            }
            
            i++;
        }

        // 处理最后一个句子（如果没有结束标点）
        const lastSentence = currentSentence.trim();
        if (lastSentence) {
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

        // 预处理：统一换行符
        text = text.replace(/\r\n/g, '\n'); // 统一换行符
        text = text.replace(/\r/g, '\n'); // 处理Mac格式
        text = text.trim();

        // 检查文本格式：如果每行都是一个完整的句子（以数字开头），按行分割
        const lines = text.split('\n');
        
        // 检查是否大部分行都以数字开头（编号列表格式）
        const numberedLines = lines.filter(line => /^\d+\./.test(line.trim()));
        
        if (numberedLines.length > lines.length * 0.5) {
            // 这是一个编号列表，需要特殊处理
            const sentences = [];
            const paragraphBreaks = [];
            
            lines.forEach((line, lineIndex) => {
                const trimmedLine = line.trim();
                if (trimmedLine.length === 0) return;
                
                // 检查是否以数字开头
                if (/^\d+\./.test(trimmedLine)) {
                    // 移除编号，获取内容部分
                    const content = trimmedLine.replace(/^\d+\.\s*/, '');
                    
                    // 将内容分割为句子
                    const lineSentences = this.splitIntoSentences(content);
                    
                    // 将第一个句子与编号合并
                    if (lineSentences.length > 0) {
                        const numbering = trimmedLine.match(/^\d+\.\s*/)[0];
                        lineSentences[0] = numbering + lineSentences[0];
                        
                        // 添加所有句子
                        sentences.push(...lineSentences);
                        
                        // 如果这不是最后一行编号项，添加段落分隔
                        if (lineIndex < lines.length - 1) {
                            const nextLine = lines[lineIndex + 1];
                            if (nextLine.trim() === '' || /^\d+\./.test(nextLine.trim())) {
                                paragraphBreaks.push(sentences.length - 1);
                            }
                        }
                    }
                } else {
                    // 非编号行，正常分割句子
                    const lineSentences = this.splitIntoSentences(trimmedLine);
                    sentences.push(...lineSentences);
                }
            });
            
            return {
                sentences: sentences,
                paragraphBreaks: paragraphBreaks
            };
        }

        // 按原来的逻辑处理段落文本
        // 将连续的换行符标准化为双换行符
        text = text.replace(/\n\s*\n/g, '\n\n');
        // 清理行内多余的制表符和空格，但保留换行符
        text = text.replace(/[ \t]+/g, ' ');
        
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
                // 获取当前句子的最后一个词（包含当前字符）
                const words = currentSentence.trim().split(/\s+/);
                const lastWord = words[words.length - 1];
                
                // 检查是否为缩写词、数字序号等
                if (this.isAbbreviation(lastWord)) {
                    i++;
                    continue;
                }

                // 检查下一个字符
                const nextChar = text[i + 1];
                
                // 简化的分割条件：
                // 1. 没有下一个字符（文本结束）
                // 2. 下一个字符是空格
                // 3. 下一个字符是大写字母（新句子开始）
                if (!nextChar || 
                    /\s/.test(nextChar) || 
                    (nextChar && /[A-Z]/.test(nextChar))) {
                    
                    const sentence = currentSentence.trim();
                    if (sentence) {
                        sentences.push(sentence);
                        
                        // 检查句子后是否有段落分隔
                        const remainingText = text.substring(i + 1);
                        // 检查双换行符（明确的段落分隔）或单换行符后跟大写字母（可能的段落开始）
                        if (remainingText.startsWith('\n\n') || 
                            (remainingText.startsWith('\n') && remainingText.length > 1 && /[A-Z]/.test(remainingText[1]))) {
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
        if (lastSentence) {
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
     * @param {string} text - 要检查的文本
     * @returns {boolean}
     */
    isAbbreviation(text) {
        // 检查是否在缩写词列表中
        if (this.abbreviations.has(text.toLowerCase())) {
            return true;
        }
        
        // 检查是否为数字序号（如 1., 2., 10., 100.）
        if (/^\d+\.$/.test(text.trim())) {
            return true;
        }
        
        // 检查是否为单个大写字母加句号（如 A., B., C.）
        if (/^[A-Z]\.$/.test(text.trim())) {
            return true;
        }
        
        // 检查是否为常见缩写模式
        if (/^[A-Z]{1,5}\.$/.test(text.trim())) {
            return true;
        }
        
        return false;
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