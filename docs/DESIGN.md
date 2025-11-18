# 設計書：AI返信サジェスト Phase 1

## 概要

Phase 0で実装した基盤（Few-shot学習、Chain-of-Thought、構造化出力）を拡張し、62種類の会話シーンに対応する。

**主要な改善点**:
1. **4つのパターンタイプ**の導入（相槌系/選択肢系/確認要求系/グループ系）
2. **シーン自動判別**機能
3. **文脈理解**の強化（3-5メッセージ分析）

---

## アーキテクチャ

### 1. パターンタイプの定義

#### タイプA: 相槌系（Tone-based）（20シーン）
**特徴**: 同じ意味を異なるトーンで表現

**対象シーン**:
- ビジネス: 承認依頼、稟議報告、会議調整、資料依頼（4シーン）
- 日常: ありがとう、すみません、お疲れ様、おはよう、おやすみ（5シーン）
- 感謝・謝罪の返信（6シーン）
- その他（5シーン）

**返信パターン**:
```javascript
{
  short_polite: "承知いたしました",
  short_casual: "了解です",
  short_friendly: "わかった！",
  long_polite: "かしこまりました。対応いたします。",
  long_casual: "了解。やっておくね。",
  long_friendly: "オッケー！任せて😊"
}
```

---

#### タイプB: 選択肢系（Content-based）（25シーン）
**特徴**: 意味的に異なる返答を提示

**対象シーン**:
- 質問応答（10シーン）: はい/いいえ、好み、体調、予定
- 感情表現（10シーン）: 喜び、悲しみ、驚き、不安
- 提案・相談（5シーン）

**返信パターン**:
```javascript
// 例：「元気ですか？」
{
  option1_positive: "元気です！",           // 肯定的
  option2_negative: "あまり元気じゃないです", // 否定的
  option3_neutral: "まあまあですね",         // 中立
  option4_detailed: "忙しいけど元気です",    // 具体的
  option5_question: "そちらは元気ですか？",  // 質問返し
  option6_grateful: "心配してくれてありがとう" // 感謝
}
```

---

#### タイプC: 確認要求系（Confirmation-seeking）（7シーン）
**特徴**: 相手が確認を求めている場合の返信

**対象シーン**:
- 送信確認（2シーン）: 資料/メッセージの受信確認
- 日程調整（2シーン）: 予定の確認、変更の確認
- 進捗確認（3シーン）: タスク完了、対応状況

**検出条件**:
- 同じ送信者からの2通目以降のメッセージ
- 「届いてますか？」「確認できましたか？」などのフレーズ
- 前回メッセージへの未返信

**返信パターン**:
```javascript
// 例：「資料届いてますか？」
{
  confirmed: "はい、確認できました",
  not_yet: "まだ届いていません",
  checking: "今確認します",
  delayed: "少々お待ちください",
  detail_request: "どの資料でしょうか？",
  apology: "申し訳ございません、見落としていました"
}
```

---

#### タイプD: グループチャット系（Group conversation）（10シーン）
**特徴**: 複数人が参加するグループでの返信

**対象シーン**:
- 会議召集（2シーン）
- イベント案内（3シーン）
- 情報共有（3シーン）
- グループ質問（2シーン）

**検出条件**:
- 参加者数が3人以上
- メンション（@username）の有無
- 全体への質問か個別への質問か

**返信パターン**:
```javascript
// 例：「明日の会議、参加できる人？」
{
  participate: "参加します",                    // 全体への返信
  absent: "不参加です",                        // 全体への返信
  question_all: "何時からですか？",            // 全体への質問
  mention_specific: "@田中さん どうですか？",  // 特定個人へのメンション
  mention_sender: "@山田さん 議題を共有してください", // 送信者へのメンション
  conditional: "午後なら参加できます"          // 条件付き返信
}
```

---

## 実装計画

### Phase 1.1: Few-shot例の拡張（1日）

**現状**: 6つの例（すべて相槌系）

**改善後**: 12つの例（各タイプ3つずつ）

```javascript
export const FEW_SHOT_EXAMPLES = [
  // === 相槌系（3例） ===
  {
    type: "tone_based",
    scenario: "ビジネス承認",
    input: "明日の会議、14時からでお願いします",
    output: {
      short_polite: "承知いたしました",
      short_casual: "了解です",
      short_friendly: "OKです！",
      long_polite: "かしこまりました。14時に参加いたします。",
      long_casual: "わかりました。14時ですね、参加します。",
      long_friendly: "了解です！14時に参加しますね😊"
    }
  },
  {
    type: "tone_based",
    scenario: "ビジネス報告",
    input: "稟議が承認されましたので、ご報告いたします",
    output: {
      short_polite: "承知いたしました",
      short_casual: "了解です",
      short_friendly: "わかりました！",
      long_polite: "ご報告ありがとうございます。承知いたしました。",
      long_casual: "報告ありがとう。了解しました。",
      long_friendly: "報告ありがとう！了解です😊"
    }
  },
  {
    type: "tone_based",
    scenario: "感謝への返信",
    input: "昨日は本当にありがとうございました！",
    output: {
      short_polite: "どういたしまして",
      short_casual: "気にしないで",
      short_friendly: "全然！",
      long_polite: "こちらこそありがとうございました。またお願いいたします。",
      long_casual: "いえいえ、こちらこそ。また機会があればよろしく。",
      long_friendly: "こちらこそありがとう！また誘ってね〜😊"
    }
  },
  
  // === 選択肢系（3例） ===
  {
    type: "content_based",
    scenario: "体調の質問",
    input: "最近、体調はどうですか？",
    output: {
      option1_positive: "おかげさまで元気です",
      option2_negative: "ちょっと疲れ気味です",
      option3_neutral: "まあまあですね",
      option4_detailed: "忙しいですが元気です",
      option5_question: "そちらこそ元気ですか？",
      option6_grateful: "心配してくれてありがとう"
    }
  },
  {
    type: "content_based",
    scenario: "予定の質問",
    input: "明日、時間ありますか？",
    output: {
      option1_yes: "はい、大丈夫です",
      option2_no: "すみません、予定があります",
      option3_partial: "午後なら空いています",
      option4_question: "何時頃ですか？",
      option5_alternative: "明後日はどうですか？",
      option6_conditional: "場所次第ですが"
    }
  },
  {
    type: "content_based",
    scenario: "提案への反応",
    input: "この案件、予算的に厳しいかも",
    output: {
      option1_inquiry: "どのくらいでしょうか",
      option2_agreement: "確かに厳しいですね",
      option3_suggestion: "削れる部分はありますか",
      option4_alternative: "別の方法を考えましょう",
      option5_optimistic: "何とかなるかもしれません",
      option6_realistic: "上司に相談してみます"
    }
  },
  
  // === 確認要求系（3例） ===
  {
    type: "confirmation",
    scenario: "資料の受信確認",
    context: "前のメッセージ: 資料を送りました",
    input: "届いてますか？",
    output: {
      confirmed: "はい、確認できました",
      not_yet: "まだ届いていません",
      checking: "今確認します",
      delayed: "少々お待ちください",
      detail_request: "どの資料でしょうか？",
      apology: "申し訳ございません、見落としていました"
    }
  },
  {
    type: "confirmation",
    scenario: "日程の確認",
    context: "前のメッセージ: 明日の会議、14時からでお願いします",
    input: "確認できましたか？",
    output: {
      confirmed: "はい、14時で大丈夫です",
      problem: "すみません、その時間は厳しいです",
      checking: "カレンダーを確認します",
      alternative: "15時からは可能でしょうか",
      detail_request: "場所はどこでしょうか",
      apology: "返信が遅れて申し訳ございません"
    }
  },
  {
    type: "confirmation",
    scenario: "タスクの進捗確認",
    context: "前のメッセージ: 企画書の作成をお願いします",
    input: "進捗はどうですか？",
    output: {
      completed: "完了しました",
      in_progress: "現在作業中です",
      nearly_done: "もうすぐ完了します",
      delayed: "少し遅れています",
      need_help: "相談したいことがあります",
      estimate: "明日中には完了予定です"
    }
  },
  
  // === グループチャット系（3例） ===
  {
    type: "group_chat",
    scenario: "会議の参加確認",
    group_size: 5,
    input: "明日の会議、参加できる人いますか？",
    output: {
      participate: "参加します",
      absent: "不参加です",
      question_all: "何時からですか？",
      mention_specific: "@田中さん どうですか？",
      mention_sender: "@山田さん 議題を共有してください",
      conditional: "午後なら参加できます"
    }
  },
  {
    type: "group_chat",
    scenario: "イベントの案内",
    group_size: 10,
    input: "来週の懇親会、参加希望者は返信お願いします",
    output: {
      participate: "参加します！",
      absent: "今回は欠席します",
      question_all: "場所はどこですか？",
      question_detail: "会費はいくらですか？",
      mention_friend: "@佐藤さん 一緒に行きませんか？",
      tentative: "仮参加で"
    }
  },
  {
    type: "group_chat",
    scenario: "情報共有",
    group_size: 8,
    input: "プロジェクトの進捗報告です。Phase 1が完了しました。",
    output: {
      acknowledge: "了解しました",
      congratulate: "お疲れ様です！",
      question_all: "Phase 2のスケジュールは？",
      question_detail: "どんな成果でしたか？",
      mention_sender: "@鈴木さん ありがとうございます",
      contribute: "私も協力します"
    }
  }
];
```

---

### Phase 1.2: シーン判別機能（2-3日）

**新規ファイル**: `ai/core/scene-classifier.js`

```javascript
/**
 * シーン判別機能
 * 
 * メッセージの内容と文脈から、4つのパターンタイプを判別
 */

export function classifyMessageType(message, context = {}) {
  const {
    previousMessages = [],
    groupSize = 1,
    hasMention = false,
    senderName = null
  } = context;
  
  // 1. グループチャット系の判定
  if (groupSize >= 3) {
    return 'group_chat';
  }
  
  // 2. 確認要求系の判定
  if (isConfirmationRequest(message, previousMessages)) {
    return 'confirmation';
  }
  
  // 3. 選択肢系の判定
  if (requiresMultipleOptions(message)) {
    return 'content_based';
  }
  
  // 4. デフォルト: 相槌系
  return 'tone_based';
}

function isConfirmationRequest(message, previousMessages) {
  // 確認フレーズの検出
  const confirmationPhrases = [
    '届いてますか', '確認できましたか', '見ましたか',
    'どうですか', '進捗', 'いかがでしょうか'
  ];
  
  const hasConfirmationPhrase = confirmationPhrases.some(
    phrase => message.includes(phrase)
  );
  
  // 連続メッセージの検出
  const isFollowUp = previousMessages.length > 0 &&
                     previousMessages[previousMessages.length - 1].sender === 'same';
  
  return hasConfirmationPhrase || isFollowUp;
}

function requiresMultipleOptions(message) {
  // 質問文の検出
  const questionMarkers = ['？', '?', 'ですか', 'ますか', 'どう', '何', 'いつ', 'どこ'];
  const isQuestion = questionMarkers.some(marker => message.includes(marker));
  
  // 感情表現の検出
  const emotionKeywords = ['元気', '気分', '調子', '楽しい', '嬉しい', '悲しい'];
  const hasEmotion = emotionKeywords.some(keyword => message.includes(keyword));
  
  // 提案・相談の検出
  const proposalKeywords = ['どうしよう', '相談', '意見', 'アイデア', '提案'];
  const isProposal = proposalKeywords.some(keyword => message.includes(keyword));
  
  return isQuestion || hasEmotion || isProposal;
}
```

---

### Phase 1.3: プロンプト動的生成（1-2日）

**修正ファイル**: `ai/prompts/prompt-builder.js`

```javascript
import { classifyMessageType } from '../core/scene-classifier.js';

export function buildPrompt(message, context = {}) {
  // シーンタイプを判別
  const messageType = classifyMessageType(message, context);
  
  // タイプごとにプロンプトを変更
  const typeInstructions = getTypeInstructions(messageType);
  const relevantExamples = getFewShotExamplesByType(messageType);
  
  let prompt = BASE_PROMPT + '\n\n' + typeInstructions;
  prompt += '\n\n【参考例】\n' + relevantExamples;
  prompt += '\n\n【相手のメッセージ】\n' + message;
  
  return prompt;
}

function getTypeInstructions(messageType) {
  const instructions = {
    tone_based: `
【このメッセージは「相槌系」です】
同じ意味を、異なるトーン（丁寧/簡潔/フレンドリー）で表現してください。
`,
    content_based: `
【このメッセージは「選択肢系」です】
意味的に異なる6つの返答を生成してください。
肯定/否定/中立/質問返し/具体的/感謝など、多様な選択肢を提示してください。
`,
    confirmation: `
【このメッセージは「確認要求系」です】
相手が確認を求めています。以下の返答を含めてください：
- 確認済み、未確認、確認中
- 詳細の問い合わせ、謝罪など
`,
    group_chat: `
【このメッセージは「グループチャット系」です】
グループでの返信を生成してください：
- 全体への返信、不参加の表明
- 質問（全体へ/送信者へ）
- メンション付き返信など
`
  };
  
  return instructions[messageType] || instructions.tone_based;
}
```

---

### Phase 1.4: JSON Schemaの拡張（1日）

**修正ファイル**: `ai/utils/json-schema.js`

```javascript
export const REPLY_SCHEMAS = {
  tone_based: {
    type: "json_schema",
    json_schema: {
      name: "tone_based_reply",
      strict: true,
      schema: {
        type: "object",
        properties: {
          short_polite: { type: "string" },
          short_casual: { type: "string" },
          short_friendly: { type: "string" },
          long_polite: { type: "string" },
          long_casual: { type: "string" },
          long_friendly: { type: "string" }
        },
        required: ["short_polite", "short_casual", "short_friendly", 
                   "long_polite", "long_casual", "long_friendly"]
      }
    }
  },
  
  content_based: {
    type: "json_schema",
    json_schema: {
      name: "content_based_reply",
      strict: true,
      schema: {
        type: "object",
        properties: {
          option1: { type: "string" },
          option2: { type: "string" },
          option3: { type: "string" },
          option4: { type: "string" },
          option5: { type: "string" },
          option6: { type: "string" }
        },
        required: ["option1", "option2", "option3", "option4", "option5", "option6"]
      }
    }
  }
  
  // confirmation, group_chat も同様に定義
};
```

---

## テスト計画

### テストケース

各パターンタイプごとに5-10のテストケースを実行：

#### 相槌系（5ケース）
1. ビジネス承認: 「お願いします」
2. ビジネス報告: 「完了しました」
3. 感謝: 「ありがとう」
4. 謝罪: 「ごめんなさい」
5. 挨拶: 「おはよう」

#### 選択肢系（5ケース）
1. 体調質問: 「元気ですか？」
2. 予定質問: 「明日空いてる？」
3. 好み質問: 「どっちが好き？」
4. 提案: 「この案どうかな？」
5. 相談: 「どうしよう...」

#### 確認要求系（3ケース）
1. 受信確認: 「届いてますか？」
2. 進捗確認: 「どうですか？」
3. 日程確認: 「大丈夫ですか？」

#### グループ系（3ケース）
1. 会議召集: 「参加できる人？」
2. イベント案内: 「懇親会のお知らせ」
3. 情報共有: 「進捗報告です」

---

## 成功基準

### Phase 1完了の定義
- ✅ 4つのパターンタイプすべてに対応
- ✅ シーン自動判別の精度80%以上
- ✅ 62シーンのテストケースをすべてクリア
- ✅ 応答時間2秒以内
- ✅ エラー率5%以下

### Phase 2への移行条件
- Phase 1の成功基準をすべて達成
- ユーザーテスト（10名以上）で満足度80%以上
- パフォーマンス目標達成

---

## リスクと対策

### リスク1: シーン判別の精度
**対策**: 
- Few-shot例の充実
- Chain-of-Thoughtでの推論強化
- 誤判別時のフォールバック（相槌系）

### リスク2: API呼び出しコスト
**対策**:
- キャッシュシステム導入（Phase 1.5）
- 無料版モデルの継続使用
- バッチ処理の検討

### リスク3: 実装期間の遅延
**対策**:
- MVP（最小機能）優先
- 段階的リリース（1.1 → 1.2 → 1.3）
- 週次レビュー

---

## 次のステップ

1. ✅ DESIGN.md作成（完了）
2. ⏳ TASKS.mdの作成
3. ⏳ Phase 1.1実装（Few-shot例の拡張）
4. ⏳ テスト実行
5. ⏳ Git commit & GitHub push
