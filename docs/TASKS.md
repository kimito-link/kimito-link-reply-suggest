# Phase 1 実装タスク

## Phase 1.1: Few-shot例の拡張（1日）

### タスク1.1.1: Few-shot例を12個に拡張
- [ ] 相槌系の例を3個追加（ビジネス承認、ビジネス報告、感謝への返信）
- [ ] 選択肢系の例を3個追加（体調質問、予定質問、提案への反応）
- [ ] 確認要求系の例を3個追加（資料確認、日程確認、進捗確認）
- [ ] グループ系の例を3個追加（会議参加、イベント案内、情報共有）

**ファイル**: `ai/prompts/few-shot-examples.js`

**テスト**: 
- 各例が正しくフォーマットされているか確認
- プロンプトビルダーで正常に読み込めるか確認

---

### タスク1.1.2: Git commit
- [ ] git add .
- [ ] git commit -m 'feat: Few-shot例を12個に拡張（4タイプ対応）'
- [ ] git push

---

## Phase 1.2: シーン判別機能（2-3日）

### タスク1.2.1: scene-classifier.js作成
- [ ] `ai/core/scene-classifier.js`を新規作成
- [ ] `classifyMessageType()`関数を実装
- [ ] 4タイプの判別ロジックを実装
  - [ ] グループチャット判定（groupSize >= 3）
  - [ ] 確認要求判定（確認フレーズ + 連続メッセージ）
  - [ ] 選択肢系判定（質問文 + 感情 + 提案）
  - [ ] デフォルト: 相槌系

**ファイル**: `ai/core/scene-classifier.js`

**テスト**: 
```javascript
// テストケース
classifyMessageType("お願いします", {}) // => "tone_based"
classifyMessageType("元気ですか？", {}) // => "content_based"
classifyMessageType("届いてますか？", { previousMessages: [...]}) // => "confirmation"
classifyMessageType("参加できる人？", { groupSize: 5 }) // => "group_chat"
```

---

### タスク1.2.2: 補助関数の実装
- [ ] `isConfirmationRequest()`
- [ ] `requiresMultipleOptions()`
- [ ] 単体テストを作成

**テスト**: 各関数が正しく動作するか確認

---

### タスク1.2.3: Git commit
- [ ] git add ai/core/scene-classifier.js
- [ ] git commit -m 'feat: シーン判別機能を実装'
- [ ] git push

---

## Phase 1.3: プロンプト動的生成（1-2日）

### タスク1.3.1: prompt-builder.js修正
- [ ] `classifyMessageType()`をインポート
- [ ] `buildPrompt()`を修正してタイプ別プロンプトを生成
- [ ] `getTypeInstructions()`を実装
- [ ] `getFewShotExamplesByType()`を実装

**ファイル**: `ai/prompts/prompt-builder.js`

**テスト**: 
```javascript
// タイプごとに適切なプロンプトが生成されるか確認
buildPrompt("お願いします", {}) // => 相槌系プロンプト
buildPrompt("元気ですか？", {}) // => 選択肢系プロンプト
```

---

### タスク1.3.2: Git commit
- [ ] git add ai/prompts/prompt-builder.js
- [ ] git commit -m 'feat: プロンプト動的生成を実装'
- [ ] git push

---

## Phase 1.4: JSON Schemaの拡張（1日）

### タスク1.4.1: json-schema.js修正
- [ ] `REPLY_SCHEMAS`を4タイプ分定義
  - [ ] `tone_based`: 既存の6パターン
  - [ ] `content_based`: option1-6
  - [ ] `confirmation`: confirmed, not_yet, checking, etc.
  - [ ] `group_chat`: participate, absent, question_all, etc.

**ファイル**: `ai/utils/json-schema.js`

**テスト**: 各スキーマが正しく定義されているか確認

---

### タスク1.4.2: ai-service.js修正
- [ ] `callOpenRouter()`を修正してタイプ別スキーマを使用
- [ ] スキーマの動的選択を実装

**ファイル**: `ai/core/ai-service.js`

**テスト**: タイプごとに正しいスキーマが適用されるか確認

---

### タスク1.4.3: Git commit
- [ ] git add ai/utils/json-schema.js ai/core/ai-service.js
- [ ] git commit -m 'feat: JSON Schemaを4タイプに拡張'
- [ ] git push

---

## Phase 1.5: 文脈取得機能（2日）

### タスク1.5.1: content.js修正
- [ ] 会話履歴の取得機能を実装（3-5メッセージ）
- [ ] グループサイズの取得
- [ ] メンションの抽出
- [ ] 送信者名の取得

**ファイル**: `content.js`

**対応サイト**:
- [ ] Chatwork
- [ ] ココナラ
- [ ] ランサーズ

**テスト**: 各サイトで正しく文脈を取得できるか確認

---

### タスク1.5.2: service-worker.js修正
- [ ] 文脈情報を`generateReplySuggestions()`に渡す
- [ ] `context`オブジェクトの構築

**ファイル**: `service-worker.js`

**テスト**: 文脈情報が正しく伝達されるか確認

---

### タスク1.5.3: Git commit
- [ ] git add content.js service-worker.js
- [ ] git commit -m 'feat: 文脈取得機能を実装'
- [ ] git push

---

## Phase 1.6: UI調整（1日）

### タスク1.6.1: popup.js修正
- [ ] 4タイプごとにUI表示を変更
- [ ] 選択肢系の場合、ラベルを「option1」「option2」などに変更
- [ ] グループ系の場合、メンション付き返信を強調表示

**ファイル**: `popup.js`, `popup.html`, `styles.css`

**テスト**: 各タイプで適切なUIが表示されるか確認

---

### タスク1.6.2: Git commit
- [ ] git add popup.js popup.html styles.css
- [ ] git commit -m 'feat: 4タイプ対応のUI調整'
- [ ] git push

---

## Phase 1.7: 統合テスト（2日）

### タスク1.7.1: 相槌系テスト（5ケース）
- [ ] ビジネス承認: 「お願いします」
- [ ] ビジネス報告: 「完了しました」
- [ ] 感謝: 「ありがとう」
- [ ] 謝罪: 「ごめんなさい」
- [ ] 挨拶: 「おはよう」

**期待結果**: トーンの違いが明確な6パターン生成

---

### タスク1.7.2: 選択肢系テスト（5ケース）
- [ ] 体調質問: 「元気ですか？」
- [ ] 予定質問: 「明日空いてる？」
- [ ] 好み質問: 「どっちが好き？」
- [ ] 提案: 「この案どうかな？」
- [ ] 相談: 「どうしよう...」

**期待結果**: 意味的に異なる6パターン生成

---

### タスク1.7.3: 確認要求系テスト（3ケース）
- [ ] 受信確認: 「届いてますか？」
- [ ] 進捗確認: 「どうですか？」
- [ ] 日程確認: 「大丈夫ですか？」

**期待結果**: 確認済み/未確認/確認中などの返信

---

### タスク1.7.4: グループ系テスト（3ケース）
- [ ] 会議召集: 「参加できる人？」
- [ ] イベント案内: 「懇親会のお知らせ」
- [ ] 情報共有: 「進捗報告です」

**期待結果**: 参加/不参加/質問/メンションなどの返信

---

### タスク1.7.5: test-progress.mdに結果を記録
- [ ] 各テストケースの結果を記録
- [ ] 問題点を特定
- [ ] 改善案を記載

**ファイル**: `test-progress.md`

---

### タスク1.7.6: Git commit
- [ ] git add test-progress.md
- [ ] git commit -m 'test: Phase 1統合テストを完了'
- [ ] git push

---

## Phase 1.8: ドキュメント更新（1日）

### タスク1.8.1: README.md更新
- [ ] Phase 1の新機能を追加
- [ ] 4タイプの説明
- [ ] スクリーンショット更新

**ファイル**: `README.md`

---

### タスク1.8.2: CHANGELOG.md更新
- [ ] Phase 1のリリースノート作成
- [ ] 主要な変更点をリスト化

**ファイル**: `CHANGELOG.md`

---

### タスク1.8.3: Git commit
- [ ] git add README.md CHANGELOG.md
- [ ] git commit -m 'docs: Phase 1完了のドキュメント更新'
- [ ] git push

---

## Phase 1.9: リリース準備（0.5日）

### タスク1.9.1: manifest.jsonのバージョン更新
- [ ] バージョンを`6.6.0`に更新
- [ ] リリースノートを追記

**ファイル**: `manifest.json`

---

### タスク1.9.2: Git tag作成
- [ ] git tag v6.6.0
- [ ] git push origin v6.6.0

---

### タスク1.9.3: GitHubリリース作成
- [ ] リリースノートを記載
- [ ] ZIPファイルを添付

---

## 完了チェックリスト

### Phase 1完了の定義
- [ ] 4つのパターンタイプすべてに対応
- [ ] シーン自動判別の精度80%以上
- [ ] 62シーンのテストケースをすべてクリア
- [ ] 応答時間2秒以内
- [ ] エラー率5%以下
- [ ] ドキュメント更新完了
- [ ] GitHubリリース作成完了

---

## 見積もり時間

| Phase | タスク | 見積もり時間 |
|-------|--------|------------|
| 1.1 | Few-shot例の拡張 | 1日 |
| 1.2 | シーン判別機能 | 2-3日 |
| 1.3 | プロンプト動的生成 | 1-2日 |
| 1.4 | JSON Schemaの拡張 | 1日 |
| 1.5 | 文脈取得機能 | 2日 |
| 1.6 | UI調整 | 1日 |
| 1.7 | 統合テスト | 2日 |
| 1.8 | ドキュメント更新 | 1日 |
| 1.9 | リリース準備 | 0.5日 |
| **合計** | | **11.5-13.5日** |

---

## 次のアクション

1. ✅ DESIGN.md作成（完了）
2. ✅ TASKS.md作成（完了）
3. ⏳ Phase 1.1開始（Few-shot例の拡張）
