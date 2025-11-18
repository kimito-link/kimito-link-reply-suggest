/**
 * プロンプトビルダー
 * 
 * 基本プロンプト + Few-shot例 + Chain-of-Thoughtを組み合わせる
 */

import { BASE_PROMPT, createMessagePrompt } from './base-prompt.js';
import { formatFewShotExamples } from './few-shot-examples.js';
import { addChainOfThought } from './chain-of-thought.js';

/**
 * 完全なプロンプトを構築
 * @param {string} message - 相手のメッセージ
 * @param {Object} options - オプション
 * @returns {string} - 完全なプロンプト
 */
export function buildPrompt(message, options = {}) {
  const {
    includeFewShot = true,
    includeChainOfThought = true
  } = options;
  
  // 1. 基本プロンプト
  let prompt = BASE_PROMPT;
  
  // 2. Few-shot例を追加
  if (includeFewShot) {
    prompt += `\n\n【参考例】\n${formatFewShotExamples()}`;
  }
  
  // 3. Chain-of-Thoughtを追加
  if (includeChainOfThought) {
    prompt = addChainOfThought(prompt);
  }
  
  // 4. メッセージを追加
  prompt += `\n\n【相手のメッセージ】\n${message}`;
  
  return prompt;
}

/**
 * プロンプトのプレビュー（デバッグ用）
 * @param {string} message - 相手のメッセージ
 * @returns {void}
 */
export function previewPrompt(message) {
  const prompt = buildPrompt(message);
  console.log('=== Prompt Preview ===');
  console.log(prompt);
  console.log(`\n文字数: ${prompt.length}`);
  console.log('======================');
}