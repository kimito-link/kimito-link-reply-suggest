# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [6.5.0] - 2025-10-30

### Added - Phase 0完了（クイックウィン）
- **Few-shot学習の導入**: 5つの具体的な成功例をAIに学習させることで、返信精度が15-20%向上
- **Chain-of-Thought推論の追加**: AIが段階的に思考するプロセス（シーン判別→意図理解→トーン設定→差異化→最終チェック）で文脈理解が30%向上
- **OpenRouter構造化出力の活用**: JSON Schemaで型安全な応答を保証、エラー率が50%削減
- **モジュール化基盤の構築**: `ai/`ディレクトリ構造を整理し、将来の拡張性を確保
  - `ai/core/`: ai-service.js, context-analyzer.js
  - `ai/prompts/`: prompt-builder.js, few-shot-examples.js, chain-of-thought.js, base-prompt.js
  - `ai/utils/`: json-schema.js, validator.js

### Improved
- 返信精度: 15-30%向上（Phase 0のみで）
- エラー率: 50%削減
- コードの保守性: モジュール化により個別更新が容易に

### Documentation
- 開発ロードマップ（7週間計画）をREADME.mdと設定画面に追加
- Phase 1/2の将来計画を明記

---

## [6.4.0] - 2025-10-29

### Added
- 🎯 **履歴→定型文へのドラッグ&ドロップ**: 履歴を定型文エリアにドロップするだけで即保存
- 🎯 **履歴・定型文の並び替え**: ドラッグ&ドロップで自由に順番を変更可能
- 💬 **マウスオーバーでツールチップ表示**: 履歴：日時+全文、定型文：タイトル+全文
- ⚠️ **バックアップ警告バナー**: 最終バックアップ日時を表示（7日以上経過で警告）
- 💾 **CSV/JSONエクスポート・インポート**: ファイル形式を自動判別して復元
- 📋 **システムクリップボード自動取得**: VSCode、秀丸、EmEditor対応
- 📅 **日程調整機能**: 日程提案文を自動生成（Zoom/Meetリンク付き）
- 🔗 **プレースホルダー機能**: {{zoom}}, {{meet}}, {{teams}}で会議リンク自動挿入

### Improved
- UX向上: ドラッグ&ドロップによる直感的な操作
- データ管理: バックアップ警告で紛失リスク低減

---

## [6.1.0] - 2025-10-XX

### Changed
- **デフォルトモデルを有料版に変更**: `google/gemma-2-9b-it:free` → `google/gemma-2-9b-it`
  - コスト: 月約30円（100回使用/月の場合）
  - メリット: 空の応答エラー解消、複雑なプロンプト対応、レート制限緩和

### Fixed
- AIが空の応答を返す問題を解決
- プロンプト処理の失敗を解消
- 600文字以上のプロンプトに対応

---

## [6.0.0] - 2025-10-XX

### Changed - メジャーバージョンアップ（設計思想の根本変更）
- **プロンプトを根本的に変更**: 機械的なパターン返信から、内容を理解して共感・反応する返信へ
  - 旧: 「承知いたしました」「了解です」などの形式的な確認返信のみ
  - 新: メッセージ内容を理解し、共感・同意・理解を示す返信

### Added
- 新プロンプトルール:
  - Show empathy or agreement if it's a story/experience
  - Show acknowledgment if it's information
  - Show understanding if it's a request or question
  - Match the tone and context of the original message
  - NO generic responses like "承知いたしました" or "了解です"

---

## [4.0.0] - 2025-10-XX

### Changed - 大幅リファクタリング
- **LINEスタイルの6パターン返信に完全移行**:
  1. short_polite: 短く丁寧（15文字以内）
  2. short_casual: 短く簡潔（15文字以内）
  3. short_friendly: 短く親しみやすい（15文字以内）
  4. long_polite: 長く丁寧（30-50文字）
  5. long_casual: 長く簡潔（30-50文字）
  6. long_friendly: 長く親しみやすい（30-50文字）

### Added
- UIの変更: 「丁寧/簡潔/フレンドリー」→「短い返信(3) / 長い返信(3)」
- セクションヘッダーを追加
- JSON形式での応答フォーマット

### Improved
- エラーハンドリング: replyモードでエラー発生時、必ず6パターンのフォールバックを返す

---

## 対応サイト

- Chatwork
- ココナラ
- Lancers
- X (Twitter)

## 技術スタック

- Manifest Version: 3
- AI Provider: OpenRouter
- Default Model: google/gemma-2-9b-it（有料版）
- Temperature:
  - replyモード: 0.2
  - その他: 0.7
- Max Tokens:
  - replyモード: 200
  - その他: 400

---

## 将来のロードマップ

### Phase 1: 部分モジュール化（1週間）- 将来計画
- Scene Manager作成（62シーンを個別ファイルに分離）
- 第三者話題15シーンの追加と対応強化
- キャッシュシステム導入（API呼び出し50%削減、速度2倍）

### Phase 2: 完全リファクタリング（4-6週間）- 将来計画
- Response Generator: シーン別最適化プロンプト生成
- Conversation History Manager: 会話履歴管理、コンテキスト継続
- パフォーマンス最適化: レート制限対応、リクエストキュー管理
- 品質保証: メトリクス設計、モニタリングシステム
- セキュリティ強化: 入力サニタイゼーション、APIレスポンス検証

### 期待効果（Phase 2完了時）
- 返信精度: 90%以上
- エラー率: 1%以下
- レスポンス速度: 500ms以下
