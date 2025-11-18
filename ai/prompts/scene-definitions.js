/**
 * 62種類の会話シーン定義
 * 
 * 将来的にシーン別の最適化を行うためのベース
 * Phase 2で実装予定
 */

export const CONVERSATION_SCENES = {
  business: {
    approval: 'ビジネス承認',
    rejection: 'ビジネス拒否',
    request: 'ビジネス依頼',
    inquiry: 'ビジネス問い合わせ',
    report: 'ビジネス報告',
    meeting: '会議調整',
    deadline: '締め切り確認',
    feedback: 'フィードバック',
    apology: 'ビジネス謝罪'
  },
  casual: {
    greeting: '挨拶',
    thanks: '感謝',
    empathy: '共感',
    encouragement: '励まし',
    congratulations: 'お祝い',
    concern: '心配',
    invitation: '誘い',
    small_talk: '雑談',
    joke: '冷やかし'
  },
  emotional: {
    happiness: '喜び',
    sadness: '悲しみ',
    anger: '怒り',
    surprise: '驚き',
    worry: '不安',
    relief: '安堵',
    excitement: '興奮',
    disappointment: '落胆'
  },
  information: {
    question: '質問',
    answer: '回答',
    explanation: '説明',
    confirmation: '確認',
    announcement: 'お知らせ',
    reminder: 'リマインダー',
    update: '更新',
    clarification: '明確化'
  },
  relationship: {
    first_contact: '初回コンタクト',
    follow_up: 'フォローアップ',
    check_in: '近況報告',
    farewell: '別れの挨拶',
    reunion: '再会',
    introduction: '紹介',
    recommendation: '推薦',
    advice: 'アドバイス'
  }
};

/**
 * シーンを判別する（将来的に実装）
 * @param {string} message - メッセージ
 * @returns {string|null} - シーン名
 */
export function detectScene(message) {
  // Phase 2で実装予定
  // 現在は基本プロンプトがAIに自動判別させる
  return null;
}

/**
 * シーンごとの最適化されたプロンプトを取得（将来的に実装）
 * @param {string} scene - シーン名
 * @returns {string|null} - 最適化プロンプト
 */
export function getScenePrompt(scene) {
  // Phase 2で実装予定
  return null;
}