// 各サービスからメッセージを抽出
async function extractMessages() {
  const host = window.location.host.toLowerCase();
  let messages = [];
  
  try {
    // Chatwork
    if (host.includes('chatwork.com')) {
      console.log('🔍 Chatworkのメッセージを探索中...');
      console.log('📏 現在のURL:', window.location.href);
      
      // メッセージコンテナを特定
      const messageContainer = document.querySelector('[id*="_timeLine"]') || 
                              document.querySelector('[class*="timeline"]') ||
                              document.querySelector('[class*="Timeline"]') ||
                              document.querySelector('#_chatContent') ||
                              document.querySelector('#_timelineView');
      
      let allDivs;
      if (messageContainer) {
        console.log('✅ メッセージコンテナを発見しました');
        allDivs = messageContainer.querySelectorAll('div');
      } else {
        console.log('⚠️ メッセージコンテナが見つからないため、全体を探索します');
        allDivs = document.querySelectorAll('div');
      }
      
      console.log(`📋 対象div数: ${allDivs.length}`);
      
      const candidates = [];
      const seenTexts = new Set();  // 重複チェック用
      
      // メッセージらしいdivを抽出（テキストが10～1000文字のもの）
      allDivs.forEach((div, idx) => {
        // 👤 ユーザー名要素を除外してからテキストを取得
        const divClone = div.cloneNode(true);
        const userNameElements = divClone.querySelectorAll('[data-testid="timeline_user-name"]');
        userNameElements.forEach(el => el.remove());
        const text = divClone.textContent?.trim();
        
        // デバッグ：コーヒー関連のテキストを発見したらログ出力
        if (text && (text.includes('コンビニ') || text.includes('コーヒー'))) {
          console.log(`🔴 コーヒー関連div発見 (${idx}): 文字数=${text.length}, テキスト="${text.substring(0, 100)}"`);
        }
        
        if (text && text.length >= 10 && text.length <= 1000) {
          // UI要素、ユーザー名、タイトルを厳格に除外
          const isUIElement = 
            text.includes('送信') || 
            text.includes('編集') || 
            text.includes('削除') || 
            text.includes('返信') || 
            text.includes('タスク') || 
            text.includes('ファイル') ||
            text.includes('TO') ||
            text.includes('RE') ||
            text.includes('閉じる') ||  // アコーディオンボタン
            text.includes('丁寧') ||    // UIボタン
            text.includes('長く') ||    // UIボタン
            text.includes('モード') ||  // UIラベル
            text.includes('トーン') ||  // UIラベル
            text.includes('丸投げ') ||  // UIボタン
            text.includes('メモ') ||    // UIラベル
            text.includes('設定') ||    // UIボタン
            text.includes('AI返信') || // UIボタン
            text.includes('テストモード') || // UIラベル
            text.includes('返信候補') || // UIラベル
            text.includes('生成しました') || // UIメッセージ
            text.includes('クリック') || // UIメッセージ
            text.includes('削除されました') || // 削除済みメッセージ
            text.includes('招待') ||    // 招待リンク
            text.includes('コピー') ||  // コピーボタン
            text.includes('リンク') ||  // リンク関連
            text.includes('.zip') ||    // ファイル名
            text.includes('.pdf') ||    // ファイル名
            text.includes('.jpg') ||    // ファイル名
            text.includes('.png') ||    // ファイル名
            text.includes('reply-copilot') || // 拡張機能名
            // text.includes('のみ対応') ||  // グループ名
            text.includes('Chatwork Live') || // システムメッセージ
            text.includes('Zoom') || // システムメッセージ
            text.includes('通話') || // システムメッセージ
            text.includes('開始') || // システムメッセージ
            text.includes('終了') || // システムメッセージ
            text.includes('チーム') ||  // サイドバーのUI要素
            text.includes('グループ') ||  // サイドバーのUI要素
            text.includes('概要') ||  // サイドバーのUI要素
            text.includes('メンバー') ||  // サイドバーのUI要素
            text.includes('画像') ||  // UI要素
            text.includes('引用') ||  // UIボタン
            text.includes('リアクション') ||  // UIボタン
            text.includes('ブックマーク') ||  // UIボタン
            text.match(/^@/) ||  // 先頭が@で始まるメンション
            text === 'TO' ||  // 単独のTOテキスト
            text === 'RE' ||  // 単独のREテキスト
            text.match(/^今日/) ||  // 「今日」で始まる短いテキストを除外
            text.match(/^\d{4}年\d{1,2}月\d{1,2}日/) ||  // 完全な日付を除外
            text.match(/^\d{1,2}月\d{1,2}日/) ||  // 日付を除外
            text.match(/📝|📏|⚡|⚙️|📦/) ||  // 絵文字を含むUI要素
            text.match(/\d+\.\d+ (MB|KB|GB)/) ||  // ファイルサイズ
            div.tagName === 'BUTTON' ||
            div.tagName === 'INPUT' ||
            div.tagName === 'TEXTAREA';
          
          // 重複チェック：同じテキストは1回だけ追加
          if (!isUIElement && !seenTexts.has(text)) {
            seenTexts.add(text);
            candidates.push({ text, element: div, index: idx });
          } else if ((text.includes('コンビニ') || text.includes('コーヒー')) && isUIElement) {
            console.log(`❌ コーヒー関連divをUI要素として除外: "${text.substring(0, 80)}"`);
          } else if ((text.includes('コンビニ') || text.includes('コーヒー')) && seenTexts.has(text)) {
            console.log(`❌ コーヒー関連divを重複として除外: "${text.substring(0, 80)}"`);
          }
        } else if (text && (text.includes('コンビニ') || text.includes('コーヒー'))) {
          console.log(`❌ コーヒー関連divを文字数制限で除外: 文字数=${text.length}`);
        }
      });
      
      console.log(`📋 メッセージ候補: ${candidates.length}件`);
      
      // 🐛 デバッグ: 候補が0件の場合、フィルターされたテキストを表示
      if (candidates.length === 0) {
        console.log('⚠️ デバッグ: フィルターされたテキストを確認中...');
        allDivs.forEach((div, idx) => {
          const text = div.textContent?.trim();
          if (text && text.includes('田中')) {
            console.log(`🔴 "田中"を含むdiv発見 (${idx}): "${text.substring(0, 100)}"`);
          }
        });
      }
      
      // デバッグ: 全候補を表示（DOM順）
      if (candidates.length > 0) {
        console.log('📝 候補一覧（DOM順）:');
        candidates.forEach((c, i) => {
          console.log(`  ${i + 1}. "${c.text.substring(0, 50)}..."`);
        });
      }
      
      if (candidates.length > 0) {
        // 直近の会話だけを取得（画面上で下の方＝最新）
        const contextCount = Math.min(10, candidates.length);
        const contextMessages = candidates.slice(-contextCount);
        
        console.log(`� AIに送信する${contextCount}件のメッセージ:`);
        contextMessages.forEach((msg, idx) => {
          console.log(`  ${idx + 1}. "${msg.text.substring(0, 50)}..."`);
        });
        
        // メッセージから日付・時刻のタイムスタンプを除去（Chatworkの表示用日時）
        const cleanedMessages = contextMessages.map(c => {
          let cleanText = c.text;
          
          // 👤 ユーザー名を削除（例：「小林@居館あるクライアントのみ対応」）
          // パターン1: 「名前@何か」の形式
          cleanText = cleanText.replace(/^[^あ-んァ-ン一-龥｡-ﾟ]*@[^あ-んァ-ン一-龥｡-ﾟ、。、。]*[、。？！。]?/, '');
          
          // 📅 日付・時刻を削除
          // 「2025年10月25日 23:51」形式の日時を削除
          cleanText = cleanText.replace(/\d{4}年\d{1,2}月\d{1,2}日\s+\d{1,2}:\d{2}/g, '');
          // 「10月26日 10:10」形式の日時を削除
          cleanText = cleanText.replace(/\d{1,2}月\d{1,2}日\s+\d{1,2}:\d{2}/g, '');
          // 「10月26日 0:08」のように時が1桁のパターンも削除
          cleanText = cleanText.replace(/\d{1,2}月\d{1,2}日\s+\d{1,2}:\d{1,2}/g, '');
          
          // 連続する空白を整理
          cleanText = cleanText.replace(/\s+/g, ' ').trim();
          return cleanText;
        });
        
        // メッセージを改行で連結（会話の流れが分かるように）
        const contextText = cleanedMessages.join('\n\n');
        console.log(`\n📝 最終的な文脈付きメッセージ (${contextText.length}文字):`);
        console.log(`"日時情報を除去後: ${contextText.substring(0, 200)}..."`);
        
        messages.push(contextText);
      } else {
        console.error('❌ メッセージ候補が1件も見つかりませんでした');
      }
    }
    
    // ココナラ
    else if (host.includes('coconala.com')) {
      console.log('🔍 ココナラのメッセージを探索中...');
      
      // 複数のセレクタを試す
      const selectors = [
        '[class*="Message"]',
        '[class*="message"]',
        '[class*="Talk"]',
        '[class*="talk"]',
        '[class*="chat"]',
        '[class*="Chat"]',
        '[class*="bubble"]',
        '[class*="Bubble"]',
        'div[class*="text"]',
        'p[class*="text"]',
        '[data-testid*="message"]',
        '[role="article"]'
      ];
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`✅ ${selector} で ${elements.length}件見つかりました`);
          elements.forEach(el => {
            const text = el.textContent?.trim();
            // UIテキストを厳格に除外
            if (text && 
                text.length > 15 && 
                text.length < 500 &&  // 長すぎるテキストを除外
                !text.includes('定型文') && 
                !text.includes('挿入') &&
                !text.includes('追加') &&
                !text.includes('http') &&  // URLを除外
                !text.includes('リンク') &&
                !text.includes('ファイル') &&
                !text.includes('画像') &&
                !text.includes('ダウンロード') &&
                !text.match(/\d{4}[-\/]\d{1,2}[-\/]\d{1,2}/) &&  // 日付を除外
                !messages.includes(text)) {
              console.log(`📝 メッセージを発見: ${text.substring(0, 50)}...`);
              messages.push(text);
            }
          });
          if (messages.length > 0) break;
        }
      }
    }
    
    // ランサーズ
    else if (host.includes('lancers.jp')) {
      console.log('🔍 ランサーズのメッセージを探索中...');
      console.log('📏 現在のURL:', window.location.href);
      
      const seenTexts = new Set();
      const candidates = [];
      
      // まず全体のdivを探索
      const allDivs = document.querySelectorAll('div');
      console.log(`📋 対象div数: ${allDivs.length}`);
      
      allDivs.forEach((div, idx) => {
        const text = div.textContent?.trim();
        
        // 適切な長さのテキストのみ抽出
        if (text && text.length >= 10 && text.length <= 500) {
          // UI要素を厳格に除外
          const isUIElement = 
            text.includes('送信する') ||
            text.includes('プレビュー') ||
            text.includes('テンプレート') ||
            text.includes('JavaScript') ||
            text.includes('シェア') ||
            text.includes('Twitter') ||
            text.includes('サービス作り') ||
            text.includes('参考にさせて') ||
            text.includes('ご意見') ||
            text.includes('ご要望') ||
            text.includes('安心安全') ||
            text.includes('連絡先') ||
            text.includes('違反報告') ||
            text.includes('ランサーズを利用') ||
            text.includes('設定を有効') ||
            text.includes('無効') ||
            text.includes('<em') ||  // HTMLタグを含む
            text.match(/<[^>]+>/) ||  // HTMLタグ
            text.match(/\d{4}[-\/]\d{1,2}[-\/]\d{1,2}/) ||  // 日付
            text.match(/^\d{1,2}:\d{2}/) ||  // 時刻
            div.tagName === 'BUTTON' ||
            div.tagName === 'INPUT' ||
            div.tagName === 'TEXTAREA';
          
          // 重複チェックとUI要素除外
          if (!isUIElement && !seenTexts.has(text)) {
            // 子要素を持たないdivを優先（実際のメッセージテキスト）
            const childDivs = div.querySelectorAll('div');
            if (childDivs.length === 0 || childDivs.length === 1) {
              seenTexts.add(text);
              candidates.push({ text, element: div, index: idx });
              console.log(`✅ メッセージ候補発見 (${idx}): "${text.substring(0, 60)}..."`);
            }
          }
        }
      });
      
      console.log(`📋 メッセージ候補: ${candidates.length}件`);
      
      if (candidates.length > 0) {
        // 最新10件に制限
        const contextCount = Math.min(10, candidates.length);
        const contextMessages = candidates.slice(-contextCount);
        
        console.log(`📤 AIに送信する${contextCount}件のメッセージ:`);
        contextMessages.forEach((msg, idx) => {
          console.log(`  ${idx + 1}. "${msg.text.substring(0, 50)}..."`);
        });
        
        // メッセージを改行で連結
        const contextText = contextMessages.map(c => c.text).join('\n\n');
        messages.push(contextText);
      } else {
        console.error('❌ メッセージ候補が1件も見つかりませんでした');
      }
    }
    
    // X (Twitter)
    else if (host.includes('x.com') || host.includes('twitter.com')) {
      const elements = document.querySelectorAll('[data-testid="tweetText"]');
      elements.forEach(el => {
        const text = el.textContent?.trim();
        if (text && text.length > 10 && !messages.includes(text)) {
          messages.push(text);
        }
      });
    }
    
    if (messages.length > 0) {
      console.log(`✅ ${messages.length}件のメッセージを抽出`);
      
      // 全メッセージをログ出力
      console.log('📝 抽出した全メッセージ:');
      messages.forEach((msg, idx) => {
        console.log(`  ${idx + 1}. ${msg.substring(0, 100)}${msg.length > 100 ? '...' : ''}`);
      });
      
      // 最新1件のみ、800文字に制限（長い技術的メッセージ対応）
      const lastMessage = messages[messages.length - 1].substring(0, 800);
      console.log(`\n✅ 最終的に使用するメッセージ:`);
      console.log(`"${lastMessage}"`);
      console.log(`✅ メッセージ長: ${lastMessage.length}文字\n`);
      return lastMessage;
    }
    console.log('❌ メッセージが1件も見つかりませんでした');
    return '';
  } catch (error) {
    console.log('メッセージ抽出エラー:', error);
    return '';
  }
}

// 各プラットフォームのテキストボックスを取得
function getTextBox() {
  console.log('🔍 テキストボックスを検索中...');
  
  const host = window.location.host.toLowerCase();
  
  // ココナラ専用処理
  if (host.includes('coconala.com')) {
    // 複数のセレクタを試す
    const selectors = [
      'textarea[placeholder*="内容"]',
      'textarea[placeholder*="メッセージ"]',
      'textarea[name*="message"]',
      'textarea[name*="content"]',
      'textarea:not([style*="display: none"])'
    ];
    
    for (const selector of selectors) {
      const ta = document.querySelector(selector);
      if (ta && ta.offsetWidth > 0 && ta.offsetHeight > 0) {
        console.log('✅ ココナラのtextareaを発見:', selector);
        return ta;
      }
    }
  }
  
  // 汎用処理
  const allTextareas = document.querySelectorAll('textarea');
  console.log(`📋 ページ内のtextarea: ${allTextareas.length}個`);
  
  // 表示されているtextareaを探す
  for (let i = 0; i < allTextareas.length; i++) {
    const ta = allTextareas[i];
    const style = window.getComputedStyle(ta);
    const isVisible = style.display !== 'none' && style.visibility !== 'hidden' && ta.offsetWidth > 0 && ta.offsetHeight > 0;
    
    console.log(`  ${i + 1}. visible: ${isVisible}, placeholder: "${ta.placeholder}", id: "${ta.id}", name: "${ta.name}"`);
    
    if (isVisible) {
      console.log('✅ 表示されているtextareaを発見！');
      return ta;
    }
  }
  
  // 表示されているものがない場合、最後のtextareaを使う
  if (allTextareas.length > 0) {
    console.log('⚠️ 最後のtextareaを使用');
    return allTextareas[allTextareas.length - 1];
  }
  
  console.error('❌ textareaが見つかりません');
  return null;
}

// テキストをテキストボックスに挿入
function insertText(text) {
  console.log('👉 insertText呼び出し:', text.substring(0, 50) + '...');
  
  const textBox = getTextBox();
  console.log('📍 見つかったテキストボックス:', textBox);
  
  if (!textBox) {
    console.error('❌ テキストボックスが見つかりません');
    
    // デバッグ: ページ内のすべてのtextareaを表示
    const allTextareas = document.querySelectorAll('textarea');
    console.log('📋 ページ内のすべてのtextarea:', allTextareas.length, '個');
    allTextareas.forEach((ta, i) => {
      console.log(`  ${i + 1}. tagName: ${ta.tagName}, placeholder: "${ta.placeholder}", id: "${ta.id}", class: "${ta.className}"`);
    });
    
    return { ok: false, error: 'テキストボックスが見つかりません' };
  }
  
  try {
    console.log('🔧 tagName:', textBox.tagName, 'contentEditable:', textBox.contentEditable);
    
    // textarea の場合
    if (textBox.tagName === 'TEXTAREA' || textBox.tagName === 'INPUT') {
      console.log('📝 textarea/inputに挿入中...');
      
      // フォーカスを当てる
      textBox.focus();
      
      // 値を設定
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      nativeInputValueSetter.call(textBox, text);
      
      // Reactなどのフレームワーク用に複数のイベントを発火
      textBox.dispatchEvent(new Event('input', { bubbles: true }));
      textBox.dispatchEvent(new Event('change', { bubbles: true }));
      textBox.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
      textBox.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
      textBox.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
      textBox.dispatchEvent(new KeyboardEvent('keypress', { bubbles: true }));
    }
    // contenteditable の場合
    else if (textBox.contentEditable === 'true') {
      console.log('📝 contenteditableに挿入中...');
      textBox.textContent = text;
      textBox.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    textBox.focus();
    console.log('✅ テキストを挿入しました');
    console.log('💬 現在の値:', textBox.value || textBox.textContent);
    return { ok: true };
  } catch (error) {
    console.error('❌ テキスト挿入エラー:', error);
    return { ok: false, error: error.message };
  }
}

// ポップアップからのメッセージを受け取る
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 content.js: メッセージを受信しました:', request);
  
  if (request.action === 'extractMessages') {
    console.log('🔍 extractMessages アクションを実行中...');
    
    // Promiseを使用してsendResponseを呼び出す
    extractMessages()
      .then(messages => {
        console.log('✅ メッセージ抽出完了:', typeof messages, messages?.substring ? messages.substring(0, 50) : messages);
        sendResponse({ ok: true, messages });
      })
      .catch(error => {
        console.error('❌ メッセージ抽出エラー:', error);
        sendResponse({ ok: false, error: error.message });
      });
    
    return true; // Promiseを待つ
  }
  else if (request.action === 'insertText') {
    console.log('🔍 insertText アクションを実行中...');
    console.log('📝 挿入するテキスト:', request.text?.substring(0, 50) + '...');
    
    try {
      const result = insertText(request.text);
      console.log('✅ insertText結果:', result);
      sendResponse(result);
    } catch (error) {
      console.error('❌ insertTextエラー:', error);
      sendResponse({ ok: false, error: error.message });
    }
    return true; // 非同期処理を待つ
  }
  else {
    console.warn('⚠️ 不明なアクション:', request.action);
    sendResponse({ ok: false, error: '不明なアクション: ' + request.action });
    return false;
  }
});

console.log('✅✅✅ content.js 読み込み完了 ✅✅✅');
console.log('🌐🌐🌐 サイト:', window.location.host);
console.log('🔥🔥🔥 この拡張機能は正常に動作しています！');

// 📋 クリップボード監視機能
document.addEventListener('copy', async (e) => {
  try {
    const selection = window.getSelection();
    const copiedText = selection.toString().trim();
    
    if (copiedText && copiedText.length > 0) {
      console.log('📋 コピー検知:', copiedText.substring(0, 50) + '...');
      
      chrome.runtime.sendMessage({
        type: 'CLIPBOARD_COPY',
        payload: {
          text: copiedText,
          url: window.location.href,
          timestamp: Date.now()
        }
      }).catch(err => {
        // Extension context invalidatedエラーは無視（ページリロード時に発生）
        if (err.message && err.message.includes('Extension context invalidated')) {
          console.log('ℹ️ ページリロード中のため、クリップボード送信をスキップしました');
        } else {
          console.error('❌ クリップボード送信エラー:', err);
        }
      });
    }
  } catch (error) {
    // Extension context invalidatedエラーは無視（ページリロード時や拡張機能更新時に発生）
    if (error.message && error.message.includes('Extension context invalidated')) {
      console.log('ℹ️ 拡張機能が更新されたため、クリップボード監視をスキップしました');
    } else {
      console.error('❌ コピーイベントエラー:', error);
    }
  }
});

console.log('📋 クリップボード監視機能が有効です');