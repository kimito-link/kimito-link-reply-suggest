/**
 * OpenRouter AIサービス
 * 
 * API呼び出しとレスポンス処理を担当
 */

import { REPLY_SUGGESTIONS_SCHEMA, validateResponse } from '../utils/json-schema.js';
import { validateApiKey, validateMessage, isEnglishDominant } from '../utils/validator.js';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'google/gemma-2-9b-it:free';

/**
 * デフォルトの返信候補（フォールバック用）
 */
const DEFAULT_SUGGESTIONS = {
  short_polite: '承知いたしました',
  short_casual: '了解です',
  short_friendly: 'OK！',
  long_polite: 'かしこまりました。ご連絡ありがとうございます。',
  long_casual: 'わかりました。どうもありがとう！',
  long_friendly: '了解です！教えてくれてありがとうございます😊'
};

/**
 * OpenRouter APIを呼び出し
 * @param {string} prompt - プロンプト
 * @param {string} apiKey - APIキー
 * @param {Object} options - オプション
 * @returns {Promise<Object>} - 返信候補
 */
export async function callOpenRouter(prompt, apiKey, options = {}) {
  const {
    model = DEFAULT_MODEL,
    temperature = 0.2,
    max_tokens = 200
  } = options;
  
  // 検証
  if (!validateApiKey(apiKey)) {
    throw new Error('APIキーが不正です');
  }
  
  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': chrome.runtime.getURL(''),
        'X-Title': 'AI Reply Copilot'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: temperature,
        max_tokens: max_tokens,
        response_format: REPLY_SUGGESTIONS_SCHEMA
      })
    });
    
    if (!response.ok) {
      throw new Error(`APIエラー: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // JSONパース
    let suggestions = JSON.parse(content);
    
    // 英語チェック（フォールバック）
    for (const key in suggestions) {
      if (isEnglishDominant(suggestions[key])) {
        console.warn(`英語検出: ${key}`);
        return DEFAULT_SUGGESTIONS;
      }
    }
    
    // スキーマ検証
    if (!validateResponse(suggestions)) {
      console.warn('スキーマ検証失敗');
      return DEFAULT_SUGGESTIONS;
    }
    
    return suggestions;
    
  } catch (error) {
    console.error('OpenRouter APIエラー:', error);
    return DEFAULT_SUGGESTIONS;
  }
}

/**
 * 返信候補を生成（メインAPI）
 * @param {string} message - 相手のメッセージ
 * @param {string} prompt - 完全なプロンプト
 * @param {string} apiKey - APIキー
 * @returns {Promise<Object>} - 返信候補
 */
export async function generateReplySuggestions(message, prompt, apiKey) {
  // メッセージ検証
  const validation = validateMessage(message);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  
  // API呼び出し
  return await callOpenRouter(prompt, apiKey, {
    temperature: 0.2,
    max_tokens: 200
  });
}