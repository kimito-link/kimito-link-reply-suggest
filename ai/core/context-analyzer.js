/**
 * コンテキスト分析
 * 
 * メッセージの文脈や意図を分析する（将来的な拡張用）
 * Phase 2で実装予定
 */

/**
 * メッセージの長さを分析
 * @param {string} message - メッセージ
 * @returns {string} - 'short' | 'medium' | 'long'
 */
export function analyzeMessageLength(message) {
  const length = message.trim().length;
  
  if (length < 20) return 'short';
  if (length < 100) return 'medium';
  return 'long';
}

/**
 * メッセージの感情を分析（簡易版）
 * @param {string} message - メッセージ
 * @returns {string} - 'positive' | 'neutral' | 'negative'
 */
export function analyzeSentiment(message) {
  const positiveKeywords = ['ありがとう', '嬉しい', '楽しみ', '良い', '最高', '喜び'];
  const negativeKeywords = ['すみません', '申し訳', '困る', '心配', '大変', '難しい'];
  
  const lowerMessage = message.toLowerCase();
  
  const hasPositive = positiveKeywords.some(keyword => lowerMessage.includes(keyword));
  const hasNegative = negativeKeywords.some(keyword => lowerMessage.includes(keyword));
  
  if (hasPositive && !hasNegative) return 'positive';
  if (hasNegative && !hasPositive) return 'negative';
  return 'neutral';
}

/**
 * 質問かどうかを判別
 * @param {string} message - メッセージ
 * @returns {boolean}
 */
export function isQuestion(message) {
  const questionMarkers = ['？', '?', 'でしょうか', 'ですか', 'かな', 'ですけど'];
  return questionMarkers.some(marker => message.includes(marker));
}

/**
 * 第三者についての話題かどうかを判別
 * @param {string} message - メッセージ
 * @returns {boolean}
 */
export function isThirdPartyTopic(message) {
  const thirdPartyMarkers = ['さん', 'ちゃん', 'くん', '氏', '彼', '彼女', 'みんな'];
  return thirdPartyMarkers.some(marker => message.includes(marker));
}

/**
 * 完全なコンテキスト分析（将来的に拡張）
 * @param {string} message - メッセージ
 * @returns {Object} - 分析結果
 */
export function analyzeContext(message) {
  return {
    length: analyzeMessageLength(message),
    sentiment: analyzeSentiment(message),
    isQuestion: isQuestion(message),
    isThirdParty: isThirdPartyTopic(message),
    timestamp: new Date().toISOString()
  };
}

/**
 * 分析結果をログ出力（デバッグ用）
 * @param {string} message - メッセージ
 * @returns {void}
 */
export function debugContext(message) {
  const context = analyzeContext(message);
  console.log('=== Context Analysis ===');
  console.log(`Message: ${message}`);
  console.log(`Length: ${context.length}`);
  console.log(`Sentiment: ${context.sentiment}`);
  console.log(`Is Question: ${context.isQuestion}`);
  console.log(`Is Third Party: ${context.isThirdParty}`);
  console.log('========================');
}