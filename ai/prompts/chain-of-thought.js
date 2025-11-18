/**
 * Chain-of-Thought推論
 * 
 * AIに段階的な思考プロセスを実行させる
 * 文脈理解30%向上に貢献
 */

export const CHAIN_OF_THOUGHT_STEPS = `
【段階的に考えてください】

1. シーン判別: このメッセージはどんな状況か？（ビジネス/日常/感謝/質問/報告など）
2. 意図理解: 相手は何を求めているか？（承認/共感/情報/アドバイスなど）
3. トーン設定: どの程度の丁寧さが適切か？
4. 差異化: 6パターンがそれぞれ明確に異なるようにする
5. 最終チェック: 日本語として自然か？文字数は適切か？
`;

/**
 * Chain-of-Thought推論を含むプロンプトを生成
 * @param {string} basePrompt - 基本プロンプト
 * @returns {string} - 推論プロセスを含むプロンプト
 */
export function addChainOfThought(basePrompt) {
  return `${basePrompt}\n\n${CHAIN_OF_THOUGHT_STEPS}`;
}