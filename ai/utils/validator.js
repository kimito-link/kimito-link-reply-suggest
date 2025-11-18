/**
 * 入力検証とエラーハンドリング
 */

/**
 * メッセージの検証
 * @param {string} message - 検証対象のメッセージ
 * @returns {Object} - {valid: boolean, error?: string}
 */
export function validateMessage(message) {
  if (!message || typeof message !== 'string') {
    return { valid: false, error: 'メッセージが空です' };
  }
  
  const trimmed = message.trim();
  
  if (trimmed.length === 0) {
    return { valid: false, error: 'メッセージが空です' };
  }
  
  if (trimmed.length > 5000) {
    return { valid: false, error: 'メッセージが長すぎます（最大5000文字）' };
  }
  
  return { valid: true };
}

/**
 * APIキーの検証
 * @param {string} apiKey - 検証対象のAPIキー
 * @returns {boolean}
 */
export function validateApiKey(apiKey) {
  return typeof apiKey === 'string' && apiKey.trim().length > 0;
}

/**
 * 英語検出（日本語返信を強制するため）
 * @param {string} text - 検証対象のテキスト
 * @returns {boolean} - 英語が多い場合true
 */
export function isEnglishDominant(text) {
  const englishPattern = /[a-zA-Z]{5,}/;
  return englishPattern.test(text);
}

/**
 * 返信候補の品質チェック
 * @param {Object} suggestions - 返信候補オブジェクト
 * @returns {Object} - {valid: boolean, error?: string}
 */
export function validateSuggestions(suggestions) {
  const requiredFields = [
    'short_polite',
    'short_casual',
    'short_friendly',
    'long_polite',
    'long_casual',
    'long_friendly'
  ];
  
  // 必須フィールドチェック
  for (const field of requiredFields) {
    if (!suggestions[field] || typeof suggestions[field] !== 'string') {
      return { valid: false, error: `${field}が不正です` };
    }
    
    // 英語チェック
    if (isEnglishDominant(suggestions[field])) {
      return { valid: false, error: `${field}に英語が含まれています` };
    }
  }
  
  return { valid: true };
}