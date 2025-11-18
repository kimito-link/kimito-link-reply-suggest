// 📦 モジュールインポート
import { buildPrompt } from './ai/prompts/prompt-builder.js';
import { generateReplySuggestions } from './ai/core/ai-service.js';
import { analyzeContext } from './ai/core/context-analyzer.js';

const PROVIDERS = {
  openrouter: { name: "OpenRouter", endpoint: "https://openrouter.ai/api/v1/chat/completions", defaultModel: "google/gemma-2-9b-it" },  // 有料版（月約30円、安定）
  openai: { name: "OpenAI", endpoint: "https://api.openai.com/v1/chat/completions", defaultModel: "gpt-4o-mini" },
  local: { name: "Local (OpenAI-compatible)", endpoint: "http://localhost:1234/v1/chat/completions", defaultModel: "llama-3.1-8b-instruct" }
};

// デフォルトAPIキー（ユーザーが設定する必要があります）
const DEFAULT_API_KEY = "";

// 無料版の使用回数制限（1日あたり）
const FREE_TIER_DAILY_LIMIT = 10;

// 📋 クリップボード履歴管理
const CLIPBOARD_MAX_ITEMS = 30;
const CLIPBOARD_EXPIRY_HOURS = 24;

async function getClipboardHistory() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ clipboardHistory: [] }, (data) => {
      resolve(data.clipboardHistory || []);
    });
  });
}

async function addClipboardItem(text, url) {
  const history = await getClipboardHistory();
  const filteredHistory = history.filter(item => item.text !== text);
  const newItem = {
    id: Date.now(),
    text: text,
    url: url,
    timestamp: Date.now(),
    isPassword: detectPassword(text)
  };
  filteredHistory.unshift(newItem);
  const limitedHistory = filteredHistory.slice(0, CLIPBOARD_MAX_ITEMS);
  await chrome.storage.sync.set({ clipboardHistory: limitedHistory });
  console.log('📋 クリップボード履歴に追加:', text.substring(0, 50) + '...');
  return limitedHistory;
}

function detectPassword(text) {
  if (text.length < 8 || text.length > 50) return false;
  if (text.includes(' ')) return false;
  if (text.startsWith('http://') || text.startsWith('https://')) return false;
  const hasOnlyAscii = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/.test(text);
  if (!hasOnlyAscii) return false;
  const hasDigit = /\d/.test(text);
  const hasLetter = /[a-zA-Z]/.test(text);
  return hasDigit && hasLetter;
}

// 🎯 継続学習：成功例管理
const SUCCESS_EXAMPLES_MAX = 10; // 最大保存数

async function getSuccessExamples() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ successExamples: [] }, (data) => {
      resolve(data.successExamples || []);
    });
  });
}

async function addSuccessExample(message, reply) {
  const examples = await getSuccessExamples();
  const newExample = {
    id: Date.now(),
    message: message.slice(0, 200), // 最大200文字
    reply: reply.slice(0, 100), // 最大100文字
    timestamp: Date.now()
  };
  examples.unshift(newExample);
  const limitedExamples = examples.slice(0, SUCCESS_EXAMPLES_MAX);
  await chrome.storage.sync.set({ successExamples: limitedExamples });
  console.log('🎯 成功例を追加:', reply.slice(0, 30));
  return limitedExamples;
}

async function removeSuccessExample(id) {
  const examples = await getSuccessExamples();
  const filtered = examples.filter(ex => ex.id !== id);
  await chrome.storage.sync.set({ successExamples: filtered });
  console.log('❌ 成功例を削除:', id);
  return filtered;
}

async function deleteClipboardItem(id) {
  const history = await getClipboardHistory();
  const filtered = history.filter(item => item.id !== id);
  await chrome.storage.sync.set({ clipboardHistory: filtered });
  return filtered;
}

async function clearClipboardHistory() {
  await chrome.storage.sync.set({ clipboardHistory: [] });
  console.log('📋 クリップボード履歴を全削除');
}

async function cleanupOldClipboardItems() {
  const history = await getClipboardHistory();
  const now = Date.now();
  const expiryTime = CLIPBOARD_EXPIRY_HOURS * 60 * 60 * 1000;
  const filtered = history.filter(item => (now - item.timestamp) < expiryTime);
  if (filtered.length < history.length) {
    await chrome.storage.sync.set({ clipboardHistory: filtered });
    console.log(`📋 ${history.length - filtered.length}件の古い履歴を削除`);
  }
}

setInterval(cleanupOldClipboardItems, 60 * 60 * 1000);

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get({
      provider: 'openrouter',
      model: 'google/gemma-2-9b-it',
      apiKey: '',
      temperature: 0.3
    }, (settings) => {
      console.log('⚙️ 設定を読み込み:', {
        provider: settings.provider,
        model: settings.model,
        hasApiKey: !!settings.apiKey,
        apiKeyLength: settings.apiKey?.length || 0,
        temperature: settings.temperature
      });
      resolve(settings);
    });
  });
}

async function callLLM({userPrompt, mode, testMode = false, isFreeTier = false}) {
  const {provider, model, apiKey, temperature} = await getSettings();
  if (!apiKey) throw new Error("APIキーが未設定です。設定でOpenRouterのキー（sk-or-...）を入力してください。");
  const prov = PROVIDERS[provider];
  
  // モデル選択：テストモード時は高性能モデル、一般ユーザーは無料モデル
  let selectedModel = model;
  if (testMode) {
    // テストモード：高性能モデルを使用（月３０００円以内）
    selectedModel = 'anthropic/claude-3-haiku';
    console.log('🧪 テストモード：高性能モデルを使用 ->', selectedModel);
  } else if (isFreeTier) {
    // 一般ユーザー：無料モデル
    selectedModel = 'google/gemma-2-9b-it:free';
    console.log('🆓 無料モデルを使用 ->', selectedModel);
  } else {
    console.log('💳 ユーザーAPIキーでモデルを使用 ->', selectedModel);
  }
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`
  };
  // Extra recommended headers for OpenRouter
  if (provider === "openrouter") {
    headers["HTTP-Referer"] = "https://reverse-re-birth-hack.com/";
    headers["X-Title"] = "Kimito Link Reply Copilot (JA)";
  }

  // replyモード専用のSystem prompt
  let systemPrompt = "日本語で答えてください。";
  if (mode === 'reply') {
    systemPrompt = "You are a strict JSON-only generator. Rules:\n1. Return ONLY valid JSON\n2. NO markdown (no ```json)\n3. NO explanations\n4. NO extra text\n5. Start with { and end with }\n6. All text values in Japanese\n7. Escape special characters properly";
  }

  // replyモードの場合、より確実にJSONを生成するための設定
  const replyMode = mode === 'reply';
  const body = {
    model: selectedModel || prov.defaultModel,
    temperature: replyMode ? 0.2 : 0.7,  // replyモードは低めに設定して一貫性を確保
    max_tokens: replyMode ? 500 : 400,   // replyモードで6パターンを確実に生成
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]
  };
  
  // OpenRouter構造化出力: JSONスキーマで型安全な応答を保証
  if (replyMode && provider === 'openrouter') {
    body.response_format = {
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
          required: ["short_polite", "short_casual", "short_friendly", "long_polite", "long_casual", "long_friendly"],
          additionalProperties: false
        }
      }
    };
    console.log('🔒 構造化出力を有効化: JSONスキーマ適用');
  }

  console.log('🚀 LLMリクエスト:', { model, temperature, promptLength: userPrompt.length });
  console.log('📝 実際のプロンプト:', userPrompt);
  
  const res = await fetch(prov.endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
  
  if (!res.ok) {
    const text = await res.text();
    console.error('❌ LLMエラー:', res.status, text);
    throw new Error(`LLM呼び出し失敗 (${res.status}): ${text}`);
  }
  
  const data = await res.json();
  console.log('✅ LLMレスポンス:', data);
  
  const content = data?.choices?.[0]?.message?.content?.trim() || "";
  
  if (!content) {
    console.error('❌ 空のレスポンス:', data);
    throw new Error(`AIが空の応答を返しました。モデル: ${model}、プロンプト長: ${userPrompt.length}文字`);
  }
  
  console.log('✅ 生成完了:', content.slice(0, 100) + '...');
  return content;
}

// simple memory
async function getThreadMemory(threadKey) {
  return new Promise(resolve => chrome.storage.sync.get({[`mem:${threadKey}`]: {notes:"", history:[]}}, v => resolve(v[`mem:${threadKey}`])));
}
async function setThreadMemory(threadKey, mem) {
  return new Promise(resolve => chrome.storage.sync.set({[`mem:${threadKey}`]: mem}, resolve));
}

// サービスごとの文脈情報
const SERVICE_CONTEXT = {
  coconala: '【ココナラ】フリーランスマーケット。受注者と発注者のやり取り。丁寧で親しみやすく、受注意欲を示しすぎず適度に。',
  lancers: '【ランサーズ】ビジネスマッチングサイト。プロフェッショナルなやり取り。丁寧だが簡潔に、ビジネスライクに。',
  chatwork: '【Chatwork】ビジネスチャット。チームやクライアントとの連絡。簡潔でテンポ良く、でも失礼のない表現。',
  twitter: '【X】SNS。リプライやDM。カジュアルで自然な会話。140字以内を意識。',
  general: '【一般】自然な日本語で、相手に合わせたトーンで。'
};

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg.type === "LLM_SUGGEST") {
        const {threadKey, mode, contextText, userNotes, tone, service = 'general'} = msg.payload;
        
        // 使用回数制限をチェック（テストモードでない場合）
        const settings = await getSettings();
        const apiKey = settings.apiKey || '';
        // デフォルトAPIキーを使用している場合のみ無料版とする
        const isFreeTier = apiKey === DEFAULT_API_KEY || !apiKey || apiKey.trim() === '';
        
        // テストモードをチェック（開発中はデフォルトでON）
        const testModeData = await new Promise(resolve => {
          chrome.storage.sync.get(['testMode'], resolve);
        });
        const testMode = testModeData.testMode !== undefined ? testModeData.testMode : true;
        
        console.log('📊 isFreeTier:', isFreeTier);
        console.log('🧪 testMode:', testMode);
        
        if (isFreeTier && !testMode) {
          // 無料版でテストモードでない場合、使用回数をチェック
          const today = new Date().toISOString().split('T')[0];
          const usageData = await new Promise(resolve => {
            chrome.storage.sync.get(['usageDate', 'usageCount'], resolve);
          });
          
          let usageDate = usageData.usageDate || '';
          let usageCount = usageData.usageCount || 0;
          
          // 日付が変わったらリセット
          if (usageDate !== today) {
            usageDate = today;
            usageCount = 0;
          }
          
          console.log(`📊 使用回数: ${usageCount}/${FREE_TIER_DAILY_LIMIT}`);
          
          if (usageCount >= FREE_TIER_DAILY_LIMIT) {
            console.error(`❌ 使用回数制限を超えました: ${usageCount}/${FREE_TIER_DAILY_LIMIT}`);
            sendResponse({
              ok: false,
              error: `無料版の使用回数制限を超えました。\n\n今日の残り: 0/${FREE_TIER_DAILY_LIMIT}回\n\nテストモードを有効にするか、自分のAPIキーを設定してください。`
            });
            return;
          }
          
          // 使用回数をインクリメント
          usageCount++;
          await new Promise(resolve => {
            chrome.storage.sync.set({ usageDate, usageCount }, resolve);
          });
          console.log(`✅ 使用回数を更新: ${usageCount}/${FREE_TIER_DAILY_LIMIT}`);
        } else if (testMode) {
          console.log('🧪 テストモード有効：使用回数制限をスキップ');
        }
        
        const mem = await getThreadMemory(threadKey);
        if (userNotes !== undefined) mem.notes = userNotes;

        const trimmedContext = contextText;

        let userPrompt = "";
        if (mode === "summary") {
          userPrompt = `＜会話全文＞\n${contextText}\n\n# 指示\n1) 事実のみを3行で要約（箇条書き）。2) 依頼・期日・懸念があれば明示。`;
        } else if (mode === "confirm") {
          userPrompt = `＜会話全文＞\n${contextText}\n＜既知メモ＞\n${mem.notes||""}\n\n# 指示\n相手に負担をかけない確認文を2通り:\n1) 「つまりこういうことでしょうか？」で始め、要点を1〜3行\n2) Yes/Noで答えられる確認質問を2〜3個\n3) 追加で必要な情報を最大2点、丁寧に。`;
        } else if (mode === "reply") {
          // 📌 新しいモジュール化プロンプトシステムを使用
          const maxContextLength = 800;
          let contextForPrompt = trimmedContext;
          if (trimmedContext.length > maxContextLength) {
            console.log(`⚠️ プロンプトが長すぎます（${trimmedContext.length}文字）。最後の${maxContextLength}文字のみ使用します。`);
            contextForPrompt = trimmedContext.slice(-maxContextLength);
          }
          
          // 🔍 コンテキスト分析
          const context = analyzeContext(contextForPrompt);
          console.log(`� コンテキスト分析:`, context);
          
          // 🚀 新しいプロンプトビルダーを使用（Few-shot + Chain-of-Thought）
          userPrompt = buildPrompt(contextForPrompt, {
            includeFewShot: true,
            includeChainOfThought: true
          });
          
          console.log(`✅ モジュール化プロンプト生成完了（${userPrompt.length}文字）`);


        } else if (mode === "ideas") {
          userPrompt = `相手のメッセージ:
${trimmedContext}

返信候補を3案作成。1) 丁寧 2) 簡潔 3) 調整/催促 をそれぞれ200〜350字で。`;
        } else {
          throw new Error("未知のモード: " + mode);
        }

        const content = await callLLM({ userPrompt, mode, testMode, isFreeTier });
        mem.history = (mem.history || []).concat([{ts: Date.now(), mode, tokens: content.slice(0,60)}]).slice(-50);
        await setThreadMemory(threadKey, mem);
        
        // replyモードの場合、JSONをパースして複数候補として返す
        console.log('🔍 mode:', mode);
        if (mode === 'reply') {
          console.log('✅ replyモードに入りました');
          console.log('📝 content:', content);
          console.log('📝 content長さ:', content.length);
          console.log('📝 contentの先頭100文字:', content.substring(0, 100));
          try {
            // JSONパース前に徹底的にクリーンアップ
            let cleanedContent = content;
            
            console.log('📝 元のcontent:', content);
            
            // 1. マークダウンを削除
            cleanedContent = cleanedContent.replace(/```json\s*/g, '').replace(/```\s*/g, '');
            
            // 2. 行頭の記号（-, *, #）を削除
            cleanedContent = cleanedContent.replace(/^[\-\*#]+\s*/gm, '');
            
            // 3. 最初のJSONのみを抽出（複数のJSONがある場合は最初の1つだけ）
            const jsonMatches = cleanedContent.match(/\{[\s\S]*?\}/g);
            if (jsonMatches && jsonMatches.length > 0) {
              cleanedContent = jsonMatches[0]; // 最初のJSONのみ
              console.log('📦 複数のJSONが見つかりました。最初の1つを使用:', jsonMatches.length + '個');
            } else {
              const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                cleanedContent = jsonMatch[0];
              }
            }
            
            // 4. 基本的なクリーンアップのみ
            // 全角カンマを半角に
            cleanedContent = cleanedContent.replace(/，/g, ',');
            // 改行をスペースに
            cleanedContent = cleanedContent.replace(/\r?\n/g, ' ');
            // タブをスペースに
            cleanedContent = cleanedContent.replace(/\t/g, ' ');
            // 複数のスペースを1つに
            cleanedContent = cleanedContent.replace(/\s+/g, ' ');
            
            // 5. 最終クリーンアップ
            cleanedContent = cleanedContent.trim();
            
            console.log('🧼 クリーンアップ後:', cleanedContent.substring(0, 200));
            console.log('🧼 クリーンアップ後(末尾):', cleanedContent.substring(cleanedContent.length - 100));
            
            let suggestions = JSON.parse(cleanedContent);
            console.log('✅ JSONパース成功:', suggestions);
            
            // パターンA: {"返信例": [...]} 形式の場合
            if (suggestions['返信例'] && Array.isArray(suggestions['返信例'])) {
              console.log('🔄 {"返信例": [...]} 形式を検出、LINEスタイルに変換します');
              const replies = suggestions['返信例'];
              suggestions = {
                short_polite: replies[0] || '承知いたしました',
                short_casual: replies[1] || '了解です',
                short_friendly: replies[2] || 'OK！',
                long_polite: replies[3] || 'かしこまりました。ご連絡ありがとうございます。',
                long_casual: replies[4] || 'わかりました。どうもありがとう！',
                long_friendly: replies[5] || '了解です！教えてくれてありがとうございます😊'
              };
              console.log('✅ 変換後:', suggestions);
            }
            // パターンB: {"suggestions": [...]} 形式の場合
            else if (suggestions.suggestions && Array.isArray(suggestions.suggestions)) {
              console.log('🔄 {"suggestions": [...]} 形式を検出、LINEスタイルに変換します');
              const replies = suggestions.suggestions;
              suggestions = {
                short_polite: replies[0] || '承知いたしました',
                short_casual: replies[1] || '了解です',
                short_friendly: replies[2] || 'OK！',
                long_polite: replies[3] || 'かしこまりました。ご連絡ありがとうございます。',
                long_casual: replies[4] || 'わかりました。どうもありがとう！',
                long_friendly: replies[5] || '了解です！教えてくれてありがとうございます😊'
              };
              console.log('✅ 変換後:', suggestions);
            }
            
            // LINEスタイルの6パターンをチェック
            const hasShortPolite = suggestions.short_polite && typeof suggestions.short_polite === 'string' && suggestions.short_polite.length > 0;
            const hasShortCasual = suggestions.short_casual && typeof suggestions.short_casual === 'string' && suggestions.short_casual.length > 0;
            const hasShortFriendly = suggestions.short_friendly && typeof suggestions.short_friendly === 'string' && suggestions.short_friendly.length > 0;
            const hasLongPolite = suggestions.long_polite && typeof suggestions.long_polite === 'string' && suggestions.long_polite.length > 0;
            const hasLongCasual = suggestions.long_casual && typeof suggestions.long_casual === 'string' && suggestions.long_casual.length > 0;
            const hasLongFriendly = suggestions.long_friendly && typeof suggestions.long_friendly === 'string' && suggestions.long_friendly.length > 0;
            
            console.log('🔍 最終チェック (LINEスタイル):', {
              hasShortPolite, hasShortCasual, hasShortFriendly,
              hasLongPolite, hasLongCasual, hasLongFriendly
            });
            
            if (hasShortPolite && hasShortCasual && hasShortFriendly && 
                hasLongPolite && hasLongCasual && hasLongFriendly) {
              console.log('✅ 6種類の返信候補を生成 (LINEスタイル):', suggestions);
              const response = {ok: true, isMultiple: true, suggestions};
              console.log('🚀 sendResponseを呼び出します:', response);
              sendResponse(response);
              console.log('✅ returnします');
              return;
            } else {
              console.log('❌ 6パターンのいずれかがundefinedです');
              console.log('⚠️ フォールバック: 通常の返信として処理します');
            }
          } catch (e) {
            console.error('❌ JSONパースエラー:', e);
            console.error('❌ 元のcontent:', content);
            console.log('⚠️ フォールバック: テキストを3分割して返信候補を作成します');
            
            // フォールバック: AIが生成したテキストから返信を抽出
            console.log('🔧 フォールバック処理を開始...');
            console.log('📝 AI生成テキスト:', content);
            
            const text = content.trim();
            
            // テキストが空または短すぎる場合は、エラーを返す
            if (text.length < 10) {
              console.log('❌ LLMレスポンスが空または短すぎます');
              sendResponse({ok: false, error: 'AIが空の応答を返しました。もう一度お試しください。'});
              return;
            }
            
            // 英語が多すぎる場合（80%以上）はエラー
            const englishCount = (text.match(/[a-zA-Z]/g) || []).length;
            const totalCount = text.length;
            const englishRatio = englishCount / totalCount;
            console.log(`🔍 英語比率: ${(englishRatio * 100).toFixed(1)}%`);
            
            if (englishRatio > 0.8) {
              console.log('❌ 英語が多すぎるため、再試行が必要です');
              sendResponse({ok: false, error: 'AIが英語で応答しました。もう一度お試しください。'});
              return;
            }
            
            // 改行で分割して、各行を返信候補として使う
            let lines = text.split('\n').map(line => {
              // 行頭の記号を削除
              return line.replace(/^[\-\*#"'`【】１２３123)\)]+\s*/, '').trim();
            }).filter(line => {
              // 5文字以上の日本語行のみ
              return line.length >= 5 && !/^[a-zA-Z\s]+$/.test(line);
            });
            
            console.log(`📝 抽出した行数: ${lines.length}`);
            lines.forEach((line, i) => console.log(`  ${i+1}. ${line}`));
            
            // 6行以上あれば、そのまま使用
            const fallbackSuggestions = {
              short_polite: lines[0] || "お疲れ様です",
              short_casual: lines[1] || "わかりました",
              short_friendly: lines[2] || "了解！",
              long_polite: lines[3] || "かしこまりました",
              long_casual: lines[4] || "了解です",
              long_friendly: lines[5] || "OK"
            };
            
            console.log('✅ フォールバック候補 (LINEスタイル):', fallbackSuggestions);
            const response = {ok: true, isMultiple: true, suggestions: fallbackSuggestions};
            sendResponse(response);
            return;
          }
        } else {
          console.log('🔴 replyモードではありません');
        }
        
        sendResponse({ok:true, content});
      } else if (msg.type === "MEM_SAVE") {
        const {threadKey, notes} = msg.payload;
        const mem = await getThreadMemory(threadKey);
        mem.notes = notes || "";
        await setThreadMemory(threadKey, mem);
        sendResponse({ok:true});
      }
      else if (msg.type === "CLIPBOARD_COPY") {
        const {text, url} = msg.payload;
        const history = await addClipboardItem(text, url);
        sendResponse({ok: true, history});
      }
      else if (msg.type === "GET_CLIPBOARD_HISTORY") {
        const history = await getClipboardHistory();
        sendResponse({ok: true, history});
      }
      else if (msg.type === "DELETE_CLIPBOARD_ITEM") {
        const {id} = msg.payload;
        const history = await deleteClipboardItem(id);
        sendResponse({ok: true, history});
      }
      else if (msg.type === "CLEAR_CLIPBOARD_HISTORY") {
        await clearClipboardHistory();
        sendResponse({ok: true});
      }
      else if (msg.type === "UPDATE_CLIPBOARD_ORDER") {
        const updatedHistory = msg.payload.history || [];
        await chrome.storage.sync.set({ clipboardHistory: updatedHistory });
        console.log('🔄 履歴の順番を更新しました');
        sendResponse({ok: true, history: updatedHistory});
      }
      else if (msg.type === "IMPORT_CLIPBOARD_HISTORY") {
        const importHistory = msg.payload.history || [];
        await chrome.storage.sync.set({ clipboardHistory: importHistory });
        sendResponse({ok: true, history: importHistory});
      }
      else if (msg.type === "ADD_SUCCESS_EXAMPLE") {
        const {message, reply} = msg.payload;
        const examples = await addSuccessExample(message, reply);
        sendResponse({ok: true, examples});
      }
      else if (msg.type === "GET_SUCCESS_EXAMPLES") {
        const examples = await getSuccessExamples();
        sendResponse({ok: true, examples});
      }
      else if (msg.type === "REMOVE_SUCCESS_EXAMPLE") {
        const {id} = msg.payload;
        const examples = await removeSuccessExample(id);
        sendResponse({ok: true, examples});
      }
      else {
        sendResponse({ok:false, error:"未知のtype"});
      }
    } catch (e) {
      sendResponse({ok:false, error: String(e)});
    }
  })();
  return true;
});
