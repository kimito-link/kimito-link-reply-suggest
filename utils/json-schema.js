/**
 * OpenRouter構造化出力用のJSONスキーマ定義
 * 
 * 6パターンの返信候補を型安全に生成するためのスキーマ
 */

export const REPLY_SUGGESTIONS_SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "reply_suggestions",
    strict: true,
    schema: {
      type: "object",
      properties: {
        short_polite: {
          type: "string",
          description: "短く丁寧な返信（10-20文字）"
        },
        short_casual: {
          type: "string",
          description: "短くカジュアルな返信（10-20文字）"
        },
        short_friendly: {
          type: "string",
          description: "短く親しみやすい返信（10-20文字）"
        },
        long_polite: {
          type: "string",
          description: "長く丁寧な返信（30-50文字）"
        },
        long_casual: {
          type: "string",
          description: "長くカジュアルな返信（30-50文字）"
        },
        long_friendly: {
          type: "string",
          description: "長く親しみやすい返信（30-50文字）"
        }
      },
      required: [
        "short_polite", 
        "short_casual", 
        "short_friendly", 
        "long_polite", 
        "long_casual", 
        "long_friendly"
      ],
      additionalProperties: false
    }
  }
};

/**
 * スキーマの検証
 * @param {Object} response - 検証対象のレスポンス
 * @returns {boolean} - 有効な場合はtrue
 */
export function validateResponse(response) {
  const requiredFields = [
    'short_polite',
    'short_casual',
    'short_friendly',
    'long_polite',
    'long_casual',
    'long_friendly'
  ];
  
  return requiredFields.every(field => 
    typeof response[field] === 'string' && response[field].length > 0
  );
}