document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  const notesEl = $('notes');
  const modeEl = $('mode');
  const toneEl = $('tone');
  const statusBarEl = $('statusBar');
  const usageInfoEl = $('usageInfo');
  const usageTextEl = $('usageText');

  // Extension context invalidatedエラーのグローバルハンドラー
  window.addEventListener('error', (event) => {
    if (event.message && event.message.includes('Extension context invalidated')) {
      console.error('⚠️ Extension context invalidatedエラーを検知しました');
      
      // ユーザーにメッセージを表示
      if (statusBarEl) {
        statusBarEl.style.display = 'block';
        statusBarEl.className = 'status-bar error';
        statusBarEl.innerHTML = `
          <div style="text-align:center; padding:10px">
            <div style="font-size:16px; margin-bottom:8px">🔄 拡張機能が更新されました</div>
            <div style="font-size:12px">このポップアップを閉じて、もう一度開いてください</div>
            <button id="closePopup" style="margin-top:10px; padding:8px 16px; background:#ef4444; color:#fff; border:none; border-radius:4px; cursor:pointer; font-weight:bold">閉じる</button>
          </div>
        `;
        
        // 閉じるボタンのイベント
        const closeBtn = document.getElementById('closePopup');
        if (closeBtn) {
          closeBtn.addEventListener('click', () => {
            window.close();
          });
        }
      }
      
      event.preventDefault();
      return false;
    }
  });

  // 自動抽出したメッセージを保存
  let extractedMessages = '';
  let generatedText = ''; // 生成されたテキストを保存
  let currentSuggestions = null; // 現在の返信候補を保存

  // ストレージ選択用ヘルパー関数
  async function getTemplateStorage() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['useStorageSync'], (data) => {
        // デフォルトはlocal（大容量）
        const useSync = data.useStorageSync || false;
        resolve(useSync ? chrome.storage.sync : chrome.storage.local);
      });
    });
  }

  // 使用回数を表示する関数
  function updateUsageDisplay() {
    console.log(' updateUsageDisplay()が呼び出されました');
    console.log('usageInfoEl:', usageInfoEl);
    console.log('usageTextEl:', usageTextEl);

    if (!usageInfoEl || !usageTextEl) {
      console.error(' 使用回数表示用の要素が見つかりません');
      return;
    }

    chrome.storage.sync.get(['apiKey', 'usageDate', 'usageCount', 'testMode'], (data) => {
      console.log(' storageデータ:', data);
      const apiKey = data.apiKey || '';
      const isFreeTier = !apiKey || apiKey.trim() === '';
      // 開発中はデフォルトでテストモードON
      const testMode = data.testMode !== undefined ? data.testMode : true;
      console.log(' isFreeTier:', isFreeTier);
      console.log(' testMode:', testMode);

      if (testMode) {
        usageTextEl.textContent = ' テストモード: 制限なし';
        usageTextEl.style.color = '#000000';
        usageTextEl.style.fontWeight = 'bold';
        usageInfoEl.style.display = 'block';
        console.log(' テストモードを表示しました');
      } else if (isFreeTier) {
        const today = new Date().toISOString().split('T')[0];
        let usageDate = data.usageDate || '';
        let usageCount = data.usageCount || 0;

        // 日付が変わったらリセット
        if (usageDate !== today) {
          usageCount = 0;
        }

        const remaining = 10 - usageCount;
        console.log(' 残り回数:', remaining);
        usageTextEl.textContent = ` 無料版: 今日の残り ${remaining}/10回`;
        usageTextEl.style.color = '#000000';
        usageTextEl.style.fontWeight = 'bold';
        usageInfoEl.style.display = 'block';
        console.log(' 無料版の使用回数を表示しました');
      } else {
        usageTextEl.textContent = ' 有料版: 無制限';
        usageTextEl.style.color = '#000000';
        usageTextEl.style.fontWeight = 'bold';
        usageInfoEl.style.display = 'block';
        usageInfoEl.style.background = '#f0fdf4';
        usageInfoEl.style.borderColor = '#86efac';
        console.log(' 有料版を表示しました');
      }
    });
  }

  // 使用回数を表示
  updateUsageDisplay();

  // ⚠️ バックアップ警告バナーの表示制御
  const backupWarning = $('backupWarning');
  const lastBackupDateEl = $('lastBackupDate');
  const quickBackupBtn = $('quickBackup');
  const closeWarningBtn = $('closeWarning');
  const dontShowWarningCheckbox = $('dontShowWarning');

  // 最終バックアップ日時を確認
  chrome.storage.local.get(['lastBackupDate', 'templates', 'dontShowWarning'], async (data) => {
    const lastBackup = data.lastBackupDate;
    const hasTemplates = data.templates && data.templates.length > 0;
    const dontShow = data.dontShowWarning || false;
    
    // 履歴を確認
    const clipboardResponse = await chrome.runtime.sendMessage({ type: 'GET_CLIPBOARD_HISTORY' });
    const hasHistory = clipboardResponse.ok && clipboardResponse.history && clipboardResponse.history.length > 0;

    // データがあり、かつ「今後表示しない」がチェックされていない場合のみ表示
    if ((hasTemplates || hasHistory) && !dontShow) {
      backupWarning.style.display = 'block';

      if (lastBackup) {
        const backupDate = new Date(lastBackup);
        const now = new Date();
        const daysSinceBackup = Math.floor((now - backupDate) / (1000 * 60 * 60 * 24));

        if (daysSinceBackup === 0) {
          lastBackupDateEl.textContent = '今日 ' + backupDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
          lastBackupDateEl.style.color = '#10b981'; // 緑
        } else if (daysSinceBackup <= 7) {
          lastBackupDateEl.textContent = daysSinceBackup + '日前';
          lastBackupDateEl.style.color = '#f59e0b'; // オレンジ
        } else {
          lastBackupDateEl.textContent = daysSinceBackup + '日前（警告！）';
          lastBackupDateEl.style.color = '#ef4444'; // 赤
        }
      } else {
        lastBackupDateEl.textContent = '未実施';
        lastBackupDateEl.style.color = '#ef4444'; // 赤
      }
    }
  });

  // ×閉じるボタンのイベント
  if (closeWarningBtn) {
    closeWarningBtn.addEventListener('click', () => {
      backupWarning.style.display = 'none';
    });
  }

  // 「今後表示しない」チェックボックスのイベント
  if (dontShowWarningCheckbox) {
    dontShowWarningCheckbox.addEventListener('change', (e) => {
      const checked = e.target.checked;
      chrome.storage.local.set({ dontShowWarning: checked }, () => {
        if (checked) {
          console.log('✅ 警告バナーを今後表示しない設定にしました');
          // チェックしたら即座に非表示
          backupWarning.style.display = 'none';
        } else {
          console.log('✅ 警告バナーを再度表示する設定にしました');
        }
      });
    });
  }

  // クイックバックアップボタン
  if (quickBackupBtn) {
    quickBackupBtn.addEventListener('click', async () => {
      try {
        const localStorage = await chrome.storage.local.get(['templates']);
        const clipboardResponse = await chrome.runtime.sendMessage({ type: 'GET_CLIPBOARD_HISTORY' });

        const exportData = {
          version: '1.0',
          exportDate: new Date().toISOString(),
          templates: localStorage.templates || [],
          clipboardHistory: clipboardResponse.history || []
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const dateStr = new Date().toISOString().split('T')[0];
        a.href = url;
        a.download = `ai-reply-backup-${dateStr}.json`;
        a.click();
        URL.revokeObjectURL(url);

        // 最終バックアップ日時を保存
        chrome.storage.local.set({ lastBackupDate: new Date().toISOString() }, () => {
          lastBackupDateEl.textContent = '今日 ' + new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
          lastBackupDateEl.style.color = '#10b981';
          quickBackupBtn.textContent = '✅ バックアップ完了！';
          quickBackupBtn.style.background = '#10b981';
          setTimeout(() => {
            quickBackupBtn.textContent = '💾 今すぐバックアップ（1クリック）';
            quickBackupBtn.style.background = '#f59e0b';
          }, 2000);
        });

        showStatus(`バックアップ完了！ (定型文: ${exportData.templates.length}件, 履歴: ${exportData.clipboardHistory.length}件)`, 'success');
      } catch (error) {
        console.error('バックアップエラー:', error);
        showStatus('バックアップに失敗しました', 'error');
      }
    });
  }

  // テストモードボタン
  const toggleTestModeBtn = $('toggleTestMode');
  const testModeInfoEl = $('testModeInfo');

  if (toggleTestModeBtn) {
    toggleTestModeBtn.addEventListener('click', () => {
      chrome.storage.sync.get(['testMode'], (data) => {
        const currentTestMode = data.testMode || false;
        const newTestMode = !currentTestMode;

        chrome.storage.sync.set({ testMode: newTestMode }, () => {
          console.log(' テストモード:', newTestMode);

          if (newTestMode) {
            toggleTestModeBtn.textContent = ' テスト中';
            toggleTestModeBtn.style.background = '#10b981';
            testModeInfoEl.style.display = 'block';
            usageInfoEl.style.background = '#fef3c7';
            usageInfoEl.style.borderColor = '#fbbf24';
            usageTextEl.style.color = '#000000';
            usageTextEl.style.fontWeight = 'bold';
          } else {
            toggleTestModeBtn.textContent = ' テストモード';
            toggleTestModeBtn.style.background = '#8b5cf6';
            testModeInfoEl.style.display = 'none';
            usageInfoEl.style.background = '#f0f9ff';
            usageInfoEl.style.borderColor = '#bfdbfe';
            usageTextEl.style.color = '#000000';
            usageTextEl.style.fontWeight = 'bold';
          }

          // 使用回数を再表示
          updateUsageDisplay();
        });
      });
    });

    // 初回起動時にテストモードの状態を読み込む
    chrome.storage.local.get(['testMode'], (data) => {
      // 開発中はデフォルトでテストモードON
      const testMode = data.testMode !== undefined ? data.testMode : true;

      if (testMode) {
        // デフォルトでテストモードを有効化
        chrome.storage.sync.set({ testMode: true }, () => {
          toggleTestModeBtn.textContent = ' テスト中';
          toggleTestModeBtn.style.background = '#10b981';
          testModeInfoEl.style.display = 'block';
          usageInfoEl.style.background = '#fef3c7';
          usageInfoEl.style.borderColor = '#fbbf24';
          usageTextEl.style.color = '#000000';
          usageTextEl.style.fontWeight = 'bold';
          updateUsageDisplay();
        });
      }
    });
  }

  // ステータス表示関数
  function showStatus(message, type = 'info', tooltip = '') {
    statusBarEl.style.display = 'block';
    statusBarEl.className = `status-bar ${type}`;

    const icon = {
      info: '',
      success: '',
      error: '',
      loading: ''
    }[type] || '';

    statusBarEl.textContent = `${icon} ${message}`;

    // ツールチップを設定
    if (tooltip) {
      statusBarEl.title = tooltip;
    } else {
      statusBarEl.removeAttribute('title');
    }
  }

  function hideStatus() {
    statusBarEl.style.display = 'none';
  }

  // URLからサービスを判別
  function detectService(url) {
    try {
      const host = new URL(url).host.toLowerCase();
      if (host.includes('coconala.com')) return 'coconala';
      if (host.includes('lancers.jp')) return 'lancers';
      if (host.includes('chatwork.com')) return 'chatwork';
      if (host.includes('x.com') || host.includes('twitter.com')) return 'twitter';
      return 'general';
    } catch {
      return 'general';
    }
  }

  // URLとサービス情報を取得
  async function getTabInfo() {
    return new Promise((resolve) => {
      try {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const url = tabs && tabs[0] && tabs[0].url ? tabs[0].url : '';
          const host = (() => { try { return new URL(url).host; } catch { return 'unknown'; } })();
          const service = detectService(url);
          resolve({ threadKey: host || 'unknown', service });
        });
      } catch {
        resolve({ threadKey: 'unknown', service: 'general' });
      }
    });
  }

  async function saveNotes(threadKey, notes) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'MEM_SAVE', payload: { threadKey, notes } }, (res) => resolve(res));
    });
  }

  async function runLLM(threadKey, service) {
    const mode = modeEl.value;
    const tone = toneEl.value;
    const userNotes = notesEl.value.trim();

    // 自動抽出したメッセージがなければ、再度抽出を試みる
    if (!extractedMessages) {
      showStatus('メッセージを取得中...', 'loading');
      const extracted = await autoExtractMessages();
      if (!extracted) {
        showStatus('⚠️ AI返信生成は使えません（メッセージ未検出）\n📝 定型文・🕒履歴は利用可能です！', 'warning');
        return null;
      }
    }

    const contextText = extractedMessages;

    showStatus('AIが生成中... 少々お待ちください', 'loading');

    await saveNotes(threadKey, userNotes);

    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: 'LLM_SUGGEST',
        payload: { threadKey, mode, contextText, userNotes, tone, service }
      }, (res) => {
        console.log(' service-workerからのレスポンス:', res);
        if (!res || !res.ok) {
          showStatus('失敗: ' + (res && res.error ? res.error : '未知のエラー'), 'error');
          resolve(null);
          return;
        }

        console.log(' res.isMultiple:', res.isMultiple);
        console.log(' res.suggestions:', res.suggestions);
        console.log(' res.content:', res.content);

        // 複数候補か単一返信かを判定
        if (res.isMultiple && res.suggestions) {
          console.log(' isMultiple=true を返します');
          resolve({ isMultiple: true, suggestions: res.suggestions });
        } else {
          console.log(' isMultiple=false を返します');
          generatedText = res.content || '';
          resolve({ isMultiple: false, content: generatedText });
        }
      });
    });
  }

  // LINEスタイルのアコーディオンUI
  function showSuggestions(suggestions) {
    const area = $('suggestionArea');

    // 現在の返信候補を保存
    currentSuggestions = suggestions;

    // 短い返信4つ（常に表示）
    const sugg1 = $('suggestion1');
    const sugg2 = $('suggestion2');
    const sugg3 = $('suggestion3');
    const sugg4 = $('suggestion4');

    // アコーディオン（丁寧・長い）
    const sugg5 = $('suggestion5'); // 丁寧
    const sugg6 = $('suggestion6'); // 長い

    // テキストを設定（短い返信3つ + カジュアル1つ）
    sugg1.querySelector('.suggestion-text').textContent = suggestions.short_polite || '';
    sugg2.querySelector('.suggestion-text').textContent = suggestions.short_casual || '';
    sugg3.querySelector('.suggestion-text').textContent = suggestions.short_friendly || '';
    sugg4.querySelector('.suggestion-text').textContent = suggestions.long_casual || ''; // 4つ目はlong_casual

    // アコーディオン内容
    sugg5.querySelector('.suggestion-text').textContent = suggestions.long_polite || '';
    sugg6.querySelector('.suggestion-text').textContent = suggestions.long_friendly || '';

    // 表示（短い返信4つのみ）
    area.style.display = 'block';
    sugg1.style.display = 'block';
    sugg2.style.display = 'block';
    sugg3.style.display = 'block';
    sugg4.style.display = 'block';
    sugg5.style.display = 'block';
    sugg6.style.display = 'block';

    // クリックイベント
    sugg1.onclick = () => insertTextToPage(suggestions.short_polite);
    sugg2.onclick = () => insertTextToPage(suggestions.short_casual);
    sugg3.onclick = () => insertTextToPage(suggestions.short_friendly);
    sugg4.onclick = () => insertTextToPage(suggestions.long_casual);
    sugg5.onclick = () => insertTextToPage(suggestions.long_polite);
    sugg6.onclick = () => insertTextToPage(suggestions.long_friendly);
  }

  // テキストをページに挿入（失敗時はクリップボードにコピー）
  async function insertTextToPage(text) {
    try {
      showStatus('テキストボックスに挿入中...', 'loading');
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log(' content.jsにメッセージ送信:', tab.id, text.substring(0, 50));

      const response = await chrome.tabs.sendMessage(tab.id, { action: 'insertText', text });
      console.log(' content.jsからの応答:', response);

      if (response && response.ok) {
        showStatus('挿入完了！あとは送信ボタンを押すだけです！', 'success');
      } else {
        console.error('挿入失敗:', response);
        showStatus('挿入失敗: ' + (response?.error || 'テキストボックスが見つかりません'), 'error');
      }
    } catch (e) {
      console.error('挿入エラー:', e);

      // Extension context invalidatedエラーを検知
      if (e.message && e.message.includes('Extension context invalidated')) {
        showStatus('拡張機能が更新されました\nこのポップアップを閉じて、もう一度開いてください', 'error');

        // 3秒後に自動で閉じる
        setTimeout(() => {
          window.close();
        }, 3000);
        return;
      }

      // フォールバック：クリップボードにコピー
      try {
        await navigator.clipboard.writeText(text);
        showStatus('テキストボックスに挿入できませんでしたが、\nクリップボードにコピーしました！貼り付けてください。', 'success');
        console.log('クリップボードにコピーしました');
      } catch (clipboardError) {
        console.error('クリップボードコピー失敗:', clipboardError);
        showStatus('挿入できませんでした。\nChatwork/ココナラ/ランサーズでお試しください。', 'error');
      }
    }
  }

  // 🔗 プレースホルダーを置き換える関数
  async function replacePlaceholders(text) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['zoomLink', 'meetLink', 'teamsLink'], (data) => {
        let result = text;

        // {{zoom}} を Zoomリンクに置き換え
        if (data.zoomLink) {
          result = result.replace(/\{\{zoom\}\}/g, data.zoomLink);
        }

        // {{meet}} を Google Meetリンクに置き換え
        if (data.meetLink) {
          result = result.replace(/\{\{meet\}\}/g, data.meetLink);
        }

        // {{teams}} を Teamsリンクに置き換え
        if (data.teamsLink) {
          result = result.replace(/\{\{teams\}\}/g, data.teamsLink);
        }

        resolve(result);
      });
    });
  }

  // 生成して挿入（ワンクリック）
  const runAndInsertBtn = $('runAndInsert');
  if (!runAndInsertBtn) {
    console.error(' runAndInsertボタンが見つかりません！');
  } else {
    console.log(' runAndInsertボタンを発見');
    runAndInsertBtn.addEventListener('click', async () => {
      console.log(' ボタンがクリックされました！');

      try {
        const { threadKey, service } = await getTabInfo();
        console.log(' サービス:', service);

        const result = await runLLM(threadKey, service);
        console.log(' AI生成結果:', result);
        console.log(' result.isMultiple:', result?.isMultiple);
        console.log(' result.suggestions:', result?.suggestions);

        if (result) {
          // replyモードで複数候補が返ってきた場合
          if (result.isMultiple) {
            console.log(' showSuggestions()を呼び出します');
            const count = Object.keys(result.suggestions).length;
            showSuggestions(result.suggestions);
            showStatus(` ${count}つの返信候補を生成しました！クリックで挿入できます。`, 'success');
          } else {
            console.log(' isMultipleがfalseなので、直接挿入します');
            // 従来通り1つの返信を挿入
            await insertTextToPage(result.content || result);
          }
        }
      } catch (error) {
        console.error(' 全体エラー:', error);
        showStatus('エラー: ' + error.message + ' → 拡張機能とページをリロードしてください', 'error');
      }
    });
  }

  $('opts').addEventListener('click', () => {
    if (chrome.runtime.openOptionsPage) chrome.runtime.openOptionsPage();
  });

  // データ説明リンクのイベント
  const dataInfoLink = $('dataInfoLink');
  if (dataInfoLink) {
    dataInfoLink.addEventListener('click', (e) => {
      e.preventDefault();
      // 設定画面を#dataInfoハッシュ付きで開く
      const optionsUrl = chrome.runtime.getURL('options.html#dataInfo');
      chrome.tabs.create({ url: optionsUrl });
    });
  }

  // ページからメッセージを自動抽出
  async function autoExtractMessages() {
    try {
      console.log(' autoExtractMessages() を開始...');
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log(' タブ情報:', tab);

      if (!tab || !tab.url) {
        console.error(' タブ情報が取得できません');
        return false;
      }

      console.log(' content.jsにメッセージを送信中... tab.id:', tab.id);
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractMessages' });
      console.log(' content.jsからのレスポンス:', response);

      if (response && response.ok && response.messages && response.messages.length > 0) {
        extractedMessages = response.messages;
        console.log(' メッセージを自動取得:', extractedMessages.substring(0, 50) + '...');
        console.log(' メッセージの長さ:', extractedMessages.length, '文字');
        return true;
      } else {
        console.warn(' メッセージが空または無効です');
      }
    } catch (error) {
      // コンテンツスクリプトが読み込まれていない場合のエラーは無視
      if (error.message && error.message.includes('Could not establish connection')) {
        console.log(' 対応サイトではありません。');
      } else {
        console.error(' 自動抽出エラー:', error.message);
      }
      return false;
    }
  }

  // 初回起動時に自動抽出を試みる
  (async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentUrl = tab?.url || '';

    const { service } = await getTabInfo();
    const serviceNames = {
      coconala: ' ココナラ',
      lancers: ' ランサーズ',
      chatwork: ' Chatwork',
      twitter: ' X (Twitter)',
      general: ' 一般'
    };
    const serviceName = serviceNames[service] || ' 一般';

    // 現在のURLを表示
    console.log(' 現在のURL:', currentUrl);

    if (service !== 'general') {
      showStatus(`${serviceName} からメッセージを取得中...\n ${currentUrl}`, 'loading');
      const extracted = await autoExtractMessages();

      if (extracted) {
        // ツールチップ用の詳細情報（URL + メッセージ全文）
        const tooltip = `${currentUrl}\n\n[取得したメッセージ]\n${extractedMessages}`;
        // 簡潔な表示（チェックマーク1つのみ）
        showStatus('✅ メッセージ取得完了！AI返信生成が使えます', 'success', tooltip);
        // AI返信生成ボタンを有効化
        if (runAndInsertBtn) {
          runAndInsertBtn.disabled = false;
          runAndInsertBtn.style.opacity = '1';
          runAndInsertBtn.style.cursor = 'pointer';
        }
      } else {
        // リトライ回数を確認（sessionStorageでタブごとに管理）
        const retryKey = `autoReloadRetry_${tab.id}`;
        const retryCount = parseInt(sessionStorage.getItem(retryKey) || '0');
        const maxRetries = 2;

        if (retryCount < maxRetries) {
          // 自動リロードを表示
          let countdown = 3;
          const retryNum = retryCount + 1;

          showStatus(`${serviceName} で使用中\n⚠️ メッセージ未検出\n🔄 ${countdown}秒後にページをリロードします... (${retryNum}/${maxRetries})`, 'warning', currentUrl);

          // AI返信生成ボタンを無効化
          if (runAndInsertBtn) {
            runAndInsertBtn.disabled = true;
            runAndInsertBtn.style.opacity = '0.5';
            runAndInsertBtn.style.cursor = 'not-allowed';
          }

          // キャンセルボタンを追加
          const cancelBtn = document.createElement('button');
          cancelBtn.textContent = 'キャンセル';
          cancelBtn.style.cssText = 'margin-top:8px; padding:6px 12px; background:#ef4444; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:11px';
          statusBarEl.appendChild(cancelBtn);

          let canceled = false;

          cancelBtn.addEventListener('click', () => {
            canceled = true;
            sessionStorage.removeItem(retryKey);
            showStatus(`${serviceName} で使用中\n⚠️ AI返信生成は使えません（メッセージ未検出）\n📝 定型文・🕒履歴は利用可能です！`, 'warning', currentUrl);
          });

          // カウントダウン
          const countdownInterval = setInterval(() => {
            if (canceled) {
              clearInterval(countdownInterval);
              return;
            }

            countdown--;
            if (countdown > 0) {
              showStatus(`${serviceName} で使用中\n⚠️ メッセージ未検出\n🔄 ${countdown}秒後にページをリロードします... (${retryNum}/${maxRetries})`, 'warning', currentUrl);
              statusBarEl.appendChild(cancelBtn);
            } else {
              clearInterval(countdownInterval);

              if (!canceled) {
                // リトライ回数をインクリメント
                sessionStorage.setItem(retryKey, String(retryCount + 1));

                // ページをリロード
                chrome.tabs.reload(tab.id);

                // ポップアップを閉じる
                window.close();
              }
            }
          }, 1000);

        } else {
          // 最大リトライ回数に達した
          sessionStorage.removeItem(retryKey);
          showStatus(`${serviceName} で使用中\n⚠️ AI返信生成は使えません（メッセージ未検出）\n📝 定型文・🕒履歴は利用可能です！`, 'warning', currentUrl);
          // AI返信生成ボタンを無効化
          if (runAndInsertBtn) {
            runAndInsertBtn.disabled = true;
            runAndInsertBtn.style.opacity = '0.5';
            runAndInsertBtn.style.cursor = 'not-allowed';
          }
        }
      }
    } else {
      showStatus(`${serviceName} で使用中\n ${currentUrl}`, 'info');
      // 一般サイトではAI返信生成ボタンを無効化
      if (runAndInsertBtn) {
        runAndInsertBtn.disabled = true;
        runAndInsertBtn.style.opacity = '0.5';
        runAndInsertBtn.style.cursor = 'not-allowed';
      }
    }

    // 履歴と定型文を先に読み込む
    await loadClipboardHistory();

    // システムクリップボードから最新テキストを取得（VSCode、秀丸、EmEditor等のコピーに対応）
    try {
      const clipboardText = await navigator.clipboard.readText();

      if (clipboardText && clipboardText.trim().length > 0) {
        console.log(' システムクリップボードから取得:', clipboardText.substring(0, 50) + '...');

        // 既存の履歴と重複していないかチェック
        const isDuplicate = allClipboardHistory.some(item => item.text === clipboardText);
        
        if (!isDuplicate) {
          // 履歴に追加
          await chrome.runtime.sendMessage({
            type: 'CLIPBOARD_COPY',
            payload: {
              text: clipboardText,
              url: ' システムクリップボード',
              timestamp: Date.now()
            }
          });
          console.log(' システムクリップボードの内容を履歴に追加しました');
          
          // UIを更新
          await loadClipboardHistory();
        } else {
          console.log(' システムクリップボードの内容は既に履歴に存在します');
        }
      }
    } catch (error) {
      console.log(' クリップボード読み取り失敗:', error.message);
      // エラーは無視（権限がない場合など）
    }

    // 定型文を読み込んで表示（初回起動時）- デフォルト：local（大容量）
    chrome.storage.local.get(['templates'], (result) => {
      if (result.templates && result.templates.length > 0) {
        allTemplates = result.templates;
        renderTemplates();
        console.log(`✅ 定型文を読み込みました: ${result.templates.length}件`);
      } else {
        console.log('💭 定型文がありません');
        // 空の状態を表示
        renderTemplates();
      }
    });

    console.log('🎉 popup.js 読み込み完了');
  })();

  // クリップボード履歴読み込み
  let allClipboardHistory = []; // 全履歴を保持
  let allTemplates = []; // 全定型文を保持

  async function loadClipboardHistory() {
    console.log('クリップボード履歴を読み込み中...');
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_CLIPBOARD_HISTORY' });
      console.log('履歴取得結果:', response);

      if (response.ok && response.history) {
        allClipboardHistory = response.history;
        renderClipboardHistory(response.history);
      } else {
        console.error('履歴取得失敗');
      }
    } catch (error) {
      console.error('履歴読み込みエラー:', error);
    }
  }

  // クリップボード履歴表示
  function renderClipboardHistory(history) {
    const clipboardList = $('clipboardList');
    if (!clipboardList) return;

    if (history.length === 0) {
      clipboardList.innerHTML = '<p style="text-align:center; color:#999; padding:20px">履歴がありません</p>';
    } else {
      // order順に表示（orderがない場合はID降順）
      const sortedHistory = [...history].sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        return b.id - a.id;
      });

      clipboardList.innerHTML = sortedHistory.map(item => {
        const date = new Date(item.timestamp);
        const timeStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
        const fullDate = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
        const preview = item.text.length > 35 ? item.text.substring(0, 35) + '...' : item.text;
        const isPassword = item.isPassword ? ' ' : '';

        // ツールチップ用のテキスト（日付 + 全文）
        const tooltipText = `${fullDate}\n${item.text}`;

        return `
          <div class="clipboard-item" draggable="true" title="${tooltipText.replace(/"/g, '&quot;')}" style="position:relative; padding:8px 12px 8px 30px; margin-bottom:6px; border:1px solid #ddd; border-radius:6px; background:#fff; cursor:move; transition:all 0.2s" data-id="${item.id}">
            <button class="delete-clipboard-item" data-id="${item.id}" style="position:absolute; top:6px; left:6px; padding:0; width:18px; height:18px; font-size:16px; background:transparent; color:#ef4444; border:none; cursor:pointer; line-height:1; display:flex; align-items:center; justify-content:center">×</button>
            <div class="clipboard-content" style="font-size:12px; color:#000; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; pointer-events:none">
              ${isPassword}${preview}
            </div>
          </div>
        `;

      }).join('');

      let draggedElement = null;
      let draggedId = null;

      // ドラッグ&ドロップイベント
      clipboardList.querySelectorAll('.clipboard-item').forEach(el => {
        // ...
        // ドラッグ開始
        el.addEventListener('dragstart', (e) => {
          if (e.target.classList.contains('delete-clipboard-item')) {
            e.preventDefault();
            return;
          }
          draggedElement = el;
          draggedId = parseInt(el.dataset.id);
          const item = history.find(h => h.id === draggedId);
          
          el.style.opacity = '0.4';
          e.dataTransfer.effectAllowed = 'copyMove'; // コピーも移動も許可
          e.dataTransfer.setData('text/html', el.innerHTML);
          
          // 定型文エリアへのドロップ用に履歴データを設定
          if (item) {
            e.dataTransfer.setData('historyItemId', String(item.id));
            e.dataTransfer.setData('historyItemText', item.text);
          }
        });

        // ドラッグ中
        el.addEventListener('dragover', (e) => {
          if (e.preventDefault) e.preventDefault();
          e.dataTransfer.dropEffect = 'move';

          if (draggedElement && el !== draggedElement) {
            el.style.borderTop = '2px solid #3b82f6';
          }
          return false;
        });

        // ドラッグ離脱
        el.addEventListener('dragleave', () => {
          el.style.borderTop = '1px solid #ddd';
        });

        // ドロップ
        el.addEventListener('drop', async (e) => {
          if (e.stopPropagation) e.stopPropagation();
          e.preventDefault();

          el.style.borderTop = '1px solid #ddd';

          if (draggedElement !== el) {
            const dropId = parseInt(el.dataset.id);

            // 順番を再計算
            const newOrder = [];
            sortedHistory.forEach((item, index) => {
              if (item.id === draggedId) return;

              if (item.id === dropId) {
                newOrder.push({ ...history.find(h => h.id === draggedId), order: newOrder.length });
              }
              newOrder.push({ ...item, order: newOrder.length });
            });

            // 更新した履歴を保存
            const response = await chrome.runtime.sendMessage({
              type: 'UPDATE_CLIPBOARD_ORDER',
              payload: { history: newOrder }
            });

            if (response.ok) {
              allClipboardHistory = response.history;
              renderClipboardHistory(response.history);
            }
          }

          return false;
        });

        // ドラッグ終了
        el.addEventListener('dragend', () => {
          el.style.opacity = '1';
          clipboardList.querySelectorAll('.clipboard-item').forEach(item => {
            item.style.borderTop = '1px solid #ddd';
          });
        });
      });

      // 左クリックイベント: テキストエリアに自動挿入
      clipboardList.querySelectorAll('.clipboard-item').forEach(el => {
        el.addEventListener('click', async (e) => {
          if (e.target.classList.contains('delete-clipboard-item')) return;

          const id = parseInt(el.dataset.id);
          const item = history.find(h => h.id === id);
          if (item) {
            console.log('履歴から挿入:', item.text.substring(0, 50));

            // 視覚フィードバック
            el.style.background = '#d4f4dd';

            // テキストエリアに挿入
            await insertTextToPage(item.text);

            setTimeout(() => {
              el.style.background = '#fff';
            }, 300);
          }
        });

        // 右クリックイベント: 定型文として保存
        el.addEventListener('contextmenu', async (e) => {
          e.preventDefault();
          if (e.target.classList.contains('delete-clipboard-item')) return;

          const id = parseInt(el.dataset.id);
          const item = history.find(h => h.id === id);
          if (item) {
            const title = prompt('定型文のタイトルを入力してください:', item.text.substring(0, 30));

            if (title && title.trim()) {
              // chrome.storage.localに定型文を保存（端末内、大容量）
              chrome.storage.local.get(['templates'], (result) => {
                const templates = result.templates || [];
                templates.push({ id: Date.now(), title: title.trim(), text: item.text });
                chrome.storage.local.set({ templates }, () => {
                  console.log('定型文を保存:', title);
                  alert(`「${title}」を定型文として保存しました！`);
                  // UIを更新
                  allTemplates = templates;
                  renderTemplates();
                });
              });
            }
          }
        });
      });

      // 削除イベント
      clipboardList.querySelectorAll('.delete-clipboard-item').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = parseInt(btn.dataset.id);
          console.log('履歴削除:', id);

          const response = await chrome.runtime.sendMessage({
            type: 'DELETE_CLIPBOARD_ITEM',
            payload: { id }
          });

          if (response.ok) {
            renderClipboardHistory(response.history);
          }
        });
      });
    }
  }

  // 定型文の読み込みと表示
  function renderTemplates(templatesToShow = null) {
    const templates = templatesToShow || allTemplates;
    const templateList = $('templateList');

    if (!templateList) return;

    // 定型文エリアをドロップゾーンとして設定
    templateList.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      templateList.style.background = '#fef3c7'; // ドラッグ中の視覚フィードバック
    });

    templateList.addEventListener('dragleave', () => {
      templateList.style.background = '';
    });

    templateList.addEventListener('drop', async (e) => {
      e.preventDefault();
      templateList.style.background = '';

      // 履歴アイテムからのドロップか確認
      const historyItemId = e.dataTransfer.getData('historyItemId');
      const historyItemText = e.dataTransfer.getData('historyItemText');

      if (historyItemId && historyItemText) {
        // タイトル入力プロンプト
        const title = prompt('定型文のタイトルを入力してください:', historyItemText.substring(0, 30));

        if (title && title.trim()) {
          // chrome.storage.localに定型文を保存
          chrome.storage.local.get(['templates'], (result) => {
            const templates = result.templates || [];
            
            // 重複チェック
            const isDuplicate = templates.some(t => 
              t.title.trim() === title.trim() && t.text.trim() === historyItemText.trim()
            );

            if (isDuplicate) {
              showStatus('同じ内容の定型文が既に存在します', 'error');
              return;
            }

            templates.push({ id: Date.now(), title: title.trim(), text: historyItemText });
            chrome.storage.local.set({ templates }, () => {
              console.log('定型文を保存:', title);
              allTemplates = templates;
              renderTemplates();
              showStatus(`「${title}」を定型文として保存しました！`, 'success');
            });
          });
        }
      }
    });

    if (templates.length === 0) {
      templateList.innerHTML = '<p style="text-align:center; color:#999; padding:10px; font-size:11px; margin:0">定型文がありません</p>';
    } else {
      // order順に表示（orderがない場合はID降順）
      const sortedTemplates = [...templates].sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        return b.id - a.id;
      });

      templateList.innerHTML = sortedTemplates.map(template => {
        const preview = template.title.length > 30 ? template.title.substring(0, 30) + '...' : template.title;
        // ツールチップ用のテキスト（タイトル + 全文）
        const tooltipText = `[タイトル] ${template.title}\n\n[内容]\n${template.text}`;
        return `
          <div class="template-item" draggable="true" title="${tooltipText.replace(/"/g, '&quot;').replace(/\n/g, '&#10;')}" style="position:relative; padding:6px 8px 6px 24px; margin-bottom:4px; border:1px solid #d1d5db; border-radius:4px; background:#fff; cursor:move; transition:all 0.2s; font-size:11px" data-id="${template.id}">
            <button class="delete-template-item" data-id="${template.id}" style="position:absolute; top:4px; left:4px; padding:0; width:16px; height:16px; font-size:14px; background:transparent; color:#f59e0b; border:none; cursor:pointer; line-height:1; display:flex; align-items:center; justify-content:center">×</button>
            <div class="template-content" style="color:#333; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; pointer-events:none"> ${preview}</div>
          </div>
        `;
      }).join('');

      let draggedElement = null;
      let draggedId = null;

      // ドラッグ&ドロップイベント
      templateList.querySelectorAll('.template-item').forEach(el => {
        // ドラッグ開始
        el.addEventListener('dragstart', (e) => {
          if (e.target.classList.contains('delete-template-item')) {
            e.preventDefault();
            return;
          }
          draggedElement = el;
          draggedId = parseInt(el.dataset.id);
          el.style.opacity = '0.4';
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/html', el.innerHTML);
        });

        // ドラッグ中
        el.addEventListener('dragover', (e) => {
          if (e.preventDefault) e.preventDefault();
          e.dataTransfer.dropEffect = 'move';

          if (draggedElement && el !== draggedElement) {
            el.style.borderTop = '2px solid #f59e0b';
          }
          return false;
        });

        // ドラッグ離脱
        el.addEventListener('dragleave', () => {
          el.style.borderTop = '1px solid #d1d5db';
        });

        // ドロップ
        el.addEventListener('drop', async (e) => {
          if (e.stopPropagation) e.stopPropagation();
          e.preventDefault();

          el.style.borderTop = '1px solid #d1d5db';

          if (draggedElement !== el) {
            const dropId = parseInt(el.dataset.id);

            // 順番を再計算
            const newOrder = [];
            sortedTemplates.forEach((item, index) => {
              if (item.id === draggedId) return;

              if (item.id === dropId) {
                newOrder.push({ ...templates.find(t => t.id === draggedId), order: newOrder.length });
              }
              newOrder.push({ ...item, order: newOrder.length });
            });

            // 更新した定型文を保存
            chrome.storage.local.set({ templates: newOrder }, () => {
              allTemplates = newOrder;
              renderTemplates();
            });
          }

          return false;
        });

        // ドラッグ終了
        el.addEventListener('dragend', () => {
          el.style.opacity = '1';
          templateList.querySelectorAll('.template-item').forEach(item => {
            item.style.borderTop = '1px solid #d1d5db';
          });
        });
      });

      templateList.querySelectorAll('.template-item').forEach(el => {
        el.addEventListener('click', async (e) => {
          if (e.target.classList.contains('delete-template-item')) return;

          const id = parseInt(el.dataset.id);
          const template = templates.find(t => t.id === id);
          if (template) {
            console.log('定型文を挿入:', template.title);

            // 視覚フィードバック
            el.style.background = '#fef3c7';

            // プレースホルダーを置き換えてから挿入
            const processedText = await replacePlaceholders(template.text);
            await insertTextToPage(processedText);

            setTimeout(() => {
              el.style.background = '#fff';
            }, 300);
          }
        });
      });

      // 削除イベント
      templateList.querySelectorAll('.delete-template-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = parseInt(btn.dataset.id);
          const template = templates.find(t => t.id === id);

          if (template && confirm(`「${template.title}」を削除しますか？`)) {
            const updatedTemplates = templates.filter(t => t.id !== id);
            chrome.storage.local.set({ templates: updatedTemplates }, () => {
              console.log('定型文を削除:', template.title);
              allTemplates = updatedTemplates;
              renderTemplates();
            });
          }
        });
      });
    }
  }

  // 📅 日程調整の折りたたみボタン
  const toggleScheduleBtn = $('toggleSchedule');
  const scheduleContent = $('scheduleContent');
  
  if (toggleScheduleBtn && scheduleContent) {
    toggleScheduleBtn.addEventListener('click', () => {
      const isHidden = scheduleContent.style.display === 'none';
      scheduleContent.style.display = isHidden ? 'block' : 'none';
      toggleScheduleBtn.textContent = isHidden ? '🔽 閉じる' : '📹 日程調整';
    });
  }

  // 📅 日程調整生成ボタン
  const generateScheduleBtn = $('generateSchedule');
  if (generateScheduleBtn) {
    generateScheduleBtn.addEventListener('click', async () => {
      // 日付と時刻を取得
      const date1 = $('scheduleDate1').value;
      const time1 = $('scheduleTime1').value;
      const date2 = $('scheduleDate2').value;
      const time2 = $('scheduleTime2').value;
      const date3 = $('scheduleDate3').value;
      const time3 = $('scheduleTime3').value;

      // 最低1つの候補が入力されているかチェック
      if (!date1 || !time1) {
        alert('候補1は必須です。日付と時刻を入力してください。');
        return;
      }

      // 日付を「○月○日（曜日）」形式に変換
      const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
        const weekday = weekdays[date.getDay()];
        return `${month}月${day}日（${weekday}）`;
      };

      // Zoom/Meetリンクを取得
      const links = await new Promise((resolve) => {
        chrome.storage.local.get(['zoomLink', 'meetLink'], (data) => {
          resolve(data);
        });
      });

      // 提案文を生成
      let scheduleText = '以下の日程はいかがでしょうか？\n\n';
      
      if (date1 && time1) {
        scheduleText += `① ${formatDate(date1)} ${time1}\n`;
      }
      if (date2 && time2) {
        scheduleText += `② ${formatDate(date2)} ${time2}\n`;
      }
      if (date3 && time3) {
        scheduleText += `③ ${formatDate(date3)} ${time3}\n`;
      }

      scheduleText += '\nご都合の良い日時をお知らせください。';

      // Zoomリンクを追加
      if (links.zoomLink) {
        scheduleText += `\nZoomリンク：${links.zoomLink}`;
      } else if (links.meetLink) {
        scheduleText += `\nGoogle Meetリンク：${links.meetLink}`;
      }

      // テキストエリアに挿入
      await insertTextToPage(scheduleText);

      // 視覚フィードバック
      generateScheduleBtn.style.background = '#059669';
      generateScheduleBtn.textContent = '✅ 挿入完了！';
      setTimeout(() => {
        generateScheduleBtn.style.background = '#10b981';
        generateScheduleBtn.textContent = '✨ 日程提案文を生成';
      }, 2000);
    });
  }

  // 定型文追加ボタン
  const addTemplateBtn = $('addTemplate');
  if (addTemplateBtn) {
    addTemplateBtn.addEventListener('click', () => {
      const title = prompt('定型文のタイトルを入力してください:');
      if (!title || !title.trim()) return;

      const text = prompt('定型文の内容を入力してください:');
      if (!text || !text.trim()) return;

      chrome.storage.local.get(['templates'], (result) => {
        const templates = result.templates || [];

        // 重複チェック（タイトルと内容が同じ場合）
        const isDuplicate = templates.some(t => 
          t.title.trim() === title.trim() && t.text.trim() === text.trim()
        );

        if (isDuplicate) {
          alert('同じ内容の定型文が既に存在します！');
          return;
        }

        templates.push({ id: Date.now(), title: title.trim(), text: text.trim() });
        
        chrome.storage.local.set({ templates }, () => {
          if (chrome.runtime.lastError) {
            console.error('定型文保存エラー:', chrome.runtime.lastError);
            alert(`保存に失敗しました：${chrome.runtime.lastError.message}`);
          } else {
            console.log('定型文を保存:', title);
            allTemplates = templates;
            renderTemplates();
            alert(`「${title}」を定型文として保存しました！`);
          }
        });
      });
    });
  }

  // 定型文全削除ボタン
  const clearAllTemplates = $('clearAllTemplates');
  if (clearAllTemplates) {
    clearAllTemplates.addEventListener('click', () => {
      if (!confirm('すべての定型文を削除しますか？')) return;

      chrome.storage.local.set({ templates: [] }, () => {
        console.log('全定型文削除');
        allTemplates = [];
        renderTemplates();
      });
    });
  }

  // 定型文検索機能
  const templateSearch = $('templateSearch');
  if (templateSearch) {
    templateSearch.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();

      if (query === '') {
        renderTemplates();
      } else {
        const filtered = allTemplates.filter(template =>
          template.title.toLowerCase().includes(query) ||
          template.text.toLowerCase().includes(query)
        );
        renderTemplates(filtered);
      }
    });
  }

  // 定型文を初期表示
  // renderTemplates(); // 削除

  // 定型文保存後に再読み込み
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.templates) {
      renderTemplates();
    }
  });

  // 履歴全削除ボタン
  const clearAllClipboard = $('clearAllClipboard');
  if (clearAllClipboard) {
    clearAllClipboard.addEventListener('click', async () => {
      if (!confirm('すべての履歴を削除しますか？')) return;

      console.log('全履歴削除');
      const response = await chrome.runtime.sendMessage({ type: 'CLEAR_CLIPBOARD_HISTORY' });

      if (response.ok) {
        allClipboardHistory = [];
        renderClipboardHistory([]);
      }
    });
  }

  // CSVエクスポート
  const exportCSVBtn = $('exportCSV');
  if (exportCSVBtn) {
    exportCSVBtn.addEventListener('click', async () => {
      try {
        const localStorage = await chrome.storage.local.get(['templates', 'zoomLink', 'meetLink', 'teamsLink', 'provider', 'model', 'temperature']);
        const syncStorage = await chrome.storage.sync.get(['apiKey', 'testMode']);
        const clipboardResponse = await chrome.runtime.sendMessage({ type: 'GET_CLIPBOARD_HISTORY' });
        
        const templates = localStorage.templates || [];
        const history = clipboardResponse.history || [];
        
        // CSVヘッダー（コメントと情報）
        let csvContent = '\ufeff'; // BOM（Excelで文字化け対策）
        // タイトル
        csvContent += '# 君斗りんくのAI返信サジェスト[定型文・履歴機能付き]\n';
        csvContent += '#\n';
        
        // 設定情報をコメントとして追加
        csvContent += '#\n';
        csvContent += '# ═══════════════════════════════════════════════════════════════════\n';
        csvContent += '# 【📋 現在の設定情報】バックアップ日時: ' + new Date().toLocaleString('ja-JP') + '\n';
        csvContent += '# ═══════════════════════════════════════════════════════════════════\n';
        csvContent += '#\n';
        csvContent += '# 🤖 AI設定\n';
        csvContent += `#   ├─ プロバイダ: ${localStorage.provider || 'openrouter (デフォルト)'}\n`;
        csvContent += `#   ├─ AIモデル: ${localStorage.model || 'google/gemma-2-9b-it:free (デフォルト)'}\n`;
        csvContent += `#   ├─ 温度: ${localStorage.temperature || '0.2 (デフォルト)'}\n`;
        csvContent += `#   ├─ APIキー: ${syncStorage.apiKey ? '✅ 設定済み (★★★★★★★★)' : '❌ 未設定'}\n`;
        csvContent += `#   └─ テストモード: ${syncStorage.testMode ? '🧪 ON (制限なし)' : '✅ OFF (通常動作)'}\n`;
        csvContent += '#\n';
        csvContent += '# 🔗 ビデオ会議リンク\n';
        csvContent += `#   ├─ Zoom: ${localStorage.zoomLink || '❌ 未設定'}\n`;
        csvContent += `#   ├─ Google Meet: ${localStorage.meetLink || '❌ 未設定'}\n`;
        csvContent += `#   └─ Microsoft Teams: ${localStorage.teamsLink || '❌ 未設定'}\n`;
        csvContent += '#\n';
        csvContent += '# ───────────────────────────────────────────────────────────────────\n';
        csvContent += '# 【💡 使い方】\n';
        csvContent += '# ───────────────────────────────────────────────────────────────────\n';
        csvContent += '#\n';
        csvContent += '# ■ 定型文でリンクを使う方法\n';
        csvContent += '#   定型文の内容に以下を書くと、自動的にリンクに置き換わります：\n';
        csvContent += '#   - {{zoom}}  → Zoomリンク\n';
        csvContent += '#   - {{meet}}  → Google Meetリンク\n';
        csvContent += '#   - {{teams}} → Microsoft Teamsリンク\n';
        csvContent += '#\n';
        csvContent += '#   例：「○月○日 14:00でいかがでしょうか？ {{zoom}}」\n';
        csvContent += '#   → 「○月○日 14:00でいかがでしょうか？ https://zoom.us/j/あなたのID」\n';
        csvContent += '#\n';
        csvContent += '# ■ APIキーの取得方法（無料プランあり）\n';
        csvContent += '#   1. https://openrouter.ai/ にアクセス\n';
        csvContent += '#   2. 右上の「Sign Up」をクリック\n';
        csvContent += '#   3. Googleアカウントでログイン\n';
        csvContent += '#   4. 左メニューの「Keys」をクリック\n';
        csvContent += '#   5. 「Create Key」で新しいAPIキーを発行\n';
        csvContent += '#   6. 拡張機能の「設定」画面で「🔑 APIキー」欄に貼り付け\n';
        csvContent += '#   7. 「💾 保存する」をクリック\n';
        csvContent += '#\n';
        csvContent += '# ■ 無料プラン（OpenRouter）の制限\n';
        csvContent += '#   - APIキー未設定: 1日10回まで\n';
        csvContent += '#   - APIキー設定済み: 無料モデルは制限なし\n';
        csvContent += '#   - おすすめモデル: Google Gemma 2 9B (無料)\n';
        csvContent += '#\n';
        csvContent += '# ■ このCSVファイルの復元方法\n';
        csvContent += '#   1. 拡張機能のポップアップを開く\n';
        csvContent += '#   2. 「💾 バックアップ」セクションの「📤 復元」ボタンをクリック\n';
        csvContent += '#   3. このCSVファイルを選択\n';
        csvContent += '#   4. 確認ダイアログで「OK」をクリック\n';
        csvContent += '#   ※ 設定情報（APIキー、リンクなど）は手動で再設定してください\n';
        csvContent += '#\n';
        csvContent += '# ═══════════════════════════════════════════════════════════════════\n';
        csvContent += '# - 君斗りんくのアイドル応援ちゃんねる: https://www.youtube.com/@idolfunch\n';
        csvContent += '# - 君斗りんくの配信者応援ちゃんねる: https://www.youtube.com/@streamerfunch\n';
        csvContent += '# - リバースハックちゃんねる-reverse-Re-rebirth: https://www.youtube.com/@reverseseotop\n';
        csvContent += '# TikTok\n';
        csvContent += '# - 君斗りんく＠アイドル応援: https://www.tiktok.com/@idolfunch\n';
        csvContent += '# - 君斗りんく＠クリエイター応援: https://www.tiktok.com/@stremerfunch\n';
        csvContent += '# - リバースハック-逆seo +サジェスト汚染対策のプロ: https://www.tiktok.com/@revercetop\n';
        csvContent += '# Instagram\n';
        csvContent += '# - 君斗りんく＠クリエイター応援: https://www.instagram.com/streamerfunch/\n';
        csvContent += '# - 君斗りんく＠アイドル応援: https://www.instagram.com/idolfunch/\n';
        csvContent += '# - リバースハック-逆seo +サジェスト汚染対策のプロ: https://www.instagram.com/revercetop/\n';
        csvContent += '#\n';
        
        // データヘッダー
        csvContent += '"種別","タイトル","内容","日時","画像URL"\n';
        
        // 定型文
        templates.forEach(t => {
          const title = (t.title || '').replace(/"/g, '""');
          const text = (t.text || '').replace(/"/g, '""');
          const imageUrl = (t.imageUrl || '').replace(/""/g, '"');
          csvContent += `"定型文","${title}","${text}","","${imageUrl}"\n`;
        });
        
        // 履歴
        history.forEach(h => {
          const text = (h.text || '').replace(/"/g, '""');
          const date = new Date(h.timestamp).toLocaleString('ja-JP');
          csvContent += `"履歴","","${text}","${date}",""\n`;
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const dateStr = new Date().toISOString().split('T')[0];
        a.href = url;
        a.download = `ai-reply-backup-${dateStr}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        
        showStatus(`CSV保存完了！ (定型文: ${templates.length}件, 履歴: ${history.length}件)`, 'success');
      } catch (error) {
        console.error('CSVエクスポートエラー:', error);
        showStatus('CSV保存に失敗しました', 'error');
      }
    });
  }
  
  // JSONエクスポート（完全復元用）
  const exportJSONBtn = $('exportJSON');
  if (exportJSONBtn) {
    exportJSONBtn.addEventListener('click', async () => {
      try {
        const localStorage = await chrome.storage.local.get(['templates']);
        const clipboardResponse = await chrome.runtime.sendMessage({ type: 'GET_CLIPBOARD_HISTORY' });

        const exportData = {
          version: '1.0',
          exportDate: new Date().toISOString(),
          templates: localStorage.templates || [],
          clipboardHistory: clipboardResponse.history || []
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const dateStr = new Date().toISOString().split('T')[0];
        a.href = url;
        a.download = `ai-reply-backup-${dateStr}.json`;
        a.click();
        URL.revokeObjectURL(url);

        showStatus(`JSON保存完了！ (定型文: ${exportData.templates.length}件, 履歴: ${exportData.clipboardHistory.length}件)`, 'success');
      } catch (error) {
        console.error('JSONエクスポートエラー:', error);
        showStatus('JSON保存に失敗しました', 'error');
      }
    });
  }

  // インポート機能（CSV/JSON自動判別）
  const importDataBtn = $('importData');
  const importFileInput = $('importFileInput');

  if (importDataBtn && importFileInput) {
    importDataBtn.addEventListener('click', () => {
      importFileInput.click();
    });

    importFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const fileName = file.name.toLowerCase();
        
        let importData = { templates: [], clipboardHistory: [] };
        
        // ファイル形式を自動判別
        if (fileName.endsWith('.json')) {
          // JSON形式
          const jsonData = JSON.parse(text);
          if (!jsonData.version || !jsonData.templates || !jsonData.clipboardHistory) {
            throw new Error('無効なJSONファイルです');
          }
          importData = jsonData;
          
        } else if (fileName.endsWith('.csv')) {
          // CSV形式
          const lines = text.split('\n').filter(line => line.trim() && !line.startsWith('#'));
          if (lines.length < 2) throw new Error('CSVファイルが空です');
          
          // ヘッダーをスキップ
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            // CSVパース（画像URL列対応）
            const match = line.match(/"([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)"/); 
            if (!match) continue;
            
            const [, type, title, content, , imageUrl] = match;
            
            if (type === '定型文') {
              importData.templates.push({
                id: Date.now() + i,
                title: title.replace(/""/g, '"'),
                text: content.replace(/""/g, '"'),
                imageUrl: imageUrl ? imageUrl.replace(/""/g, '"') : ''
              });
            } else if (type === '履歴') {
              importData.clipboardHistory.push({
                id: Date.now() + i,
                text: content.replace(/""/g, '"'),
                url: 'インポート',
                timestamp: Date.now()
              });
            }
          }
          
        } else {
          throw new Error('対応していないファイル形式です。CSV, JSONのみ対応しています。');
        }

        // 確認ダイアログ
        const confirmMsg = `以下のデータを復元しますか？\n\n定型文: ${importData.templates.length}件\n履歴: ${importData.clipboardHistory.length}件\n\n※ 現在のデータは上書きされます！`;
        if (!confirm(confirmMsg)) return;

        // 定型文を復元
        await chrome.storage.local.set({ templates: importData.templates });

        // 履歴を復元
        await chrome.runtime.sendMessage({
          type: 'IMPORT_CLIPBOARD_HISTORY',
          payload: { history: importData.clipboardHistory }
        });

        // UIを更新
        allTemplates = importData.templates;
        allClipboardHistory = importData.clipboardHistory;
        renderTemplates();
        renderClipboardHistory(importData.clipboardHistory);

        showStatus(`復元完了！ (定型文: ${importData.templates.length}件, 履歴: ${importData.clipboardHistory.length}件)`, 'success');

        // ファイル入力をリセット
        importFileInput.value = '';
      } catch (error) {
        console.error('インポートエラー:', error);
        showStatus('復元に失敗しました: ' + error.message, 'error');
        importFileInput.value = '';
      }
    });
  }

  // Claudeスタイルのフィードバックバー機能
  const copyAllBtn = $('copyAllBtn');
  const feedbackGoodBtn = $('feedbackGoodBtn');
  const feedbackBadBtn = $('feedbackBadBtn');
  const retryBtn = $('retryBtn');

  // コピーボタン：すべての返信候補をコピー
  if (copyAllBtn) {
    copyAllBtn.addEventListener('click', async () => {
      if (!currentSuggestions) {
        showStatus('コピーする返信候補がありません', 'error');
        return;
      }

      const allText = [
        `【短い返信 - 丁寧】\n${currentSuggestions.short_polite}`,
        `【短い返信 - 簡潔】\n${currentSuggestions.short_casual}`,
        `【短い返信 - フレンドリー】\n${currentSuggestions.short_friendly}`,
        `【長い返信 - 簡潔】\n${currentSuggestions.long_casual}`,
        `【長い返信 - 丁寧】\n${currentSuggestions.long_polite}`,
        `【長い返信 - フレンドリー】\n${currentSuggestions.long_friendly}`
      ].join('\n\n');

      try {
        await navigator.clipboard.writeText(allText);
        copyAllBtn.style.background = '#d4f4dd';
        copyAllBtn.style.borderColor = '#10b981';
        showStatus('すべての返信候補をコピーしました！', 'success');
        setTimeout(() => {
          copyAllBtn.style.background = '#fff';
          copyAllBtn.style.borderColor = '#d1d5db';
        }, 500);
      } catch (error) {
        console.error('コピーエラー:', error);
        showStatus('コピーに失敗しました', 'error');
      }
    });
  }

  // 良い返信ボタン：現在の返信スタイルを学習
  if (feedbackGoodBtn) {
    feedbackGoodBtn.addEventListener('click', async () => {
      if (!currentSuggestions) {
        showStatus('返信候補がありません', 'error');
        return;
      }

      console.log('良い返信スタイルとして学習');

      // すべての返信候補を成功例として保存
      const responses = await Promise.all([
        chrome.runtime.sendMessage({
          type: 'ADD_SUCCESS_EXAMPLE',
          payload: { message: extractedMessages, reply: currentSuggestions.short_polite }
        }),
        chrome.runtime.sendMessage({
          type: 'ADD_SUCCESS_EXAMPLE',
          payload: { message: extractedMessages, reply: currentSuggestions.short_casual }
        }),
        chrome.runtime.sendMessage({
          type: 'ADD_SUCCESS_EXAMPLE',
          payload: { message: extractedMessages, reply: currentSuggestions.short_friendly }
        })
      ]);

      if (responses.every(r => r && r.ok)) {
        feedbackGoodBtn.style.background = '#d4f4dd';
        feedbackGoodBtn.style.borderColor = '#10b981';
        feedbackGoodBtn.innerHTML = '✅ <span style="font-size:11px">学習完了</span>';
        showStatus('学習しました！次回から同じようなスタイルで返信します', 'success');
        setTimeout(() => {
          feedbackGoodBtn.style.background = '#fff';
          feedbackGoodBtn.style.borderColor = '#d1d5db';
          feedbackGoodBtn.innerHTML = '👍 <span style="font-size:11px">良い返信</span>';
        }, 2000);
      }
    });
  }

  // 悪い返信ボタン：視覚的フィードバックのみ
  if (feedbackBadBtn) {
    feedbackBadBtn.addEventListener('click', () => {
      console.log('悪い返信スタイル');
      feedbackBadBtn.style.background = '#fee2e2';
      feedbackBadBtn.style.borderColor = '#ef4444';
      feedbackBadBtn.innerHTML = '❌ <span style="font-size:11px">フィードバック済</span>';
      showStatus('フィードバックを記録しました', 'info');
      setTimeout(() => {
        feedbackBadBtn.style.background = '#fff';
        feedbackBadBtn.style.borderColor = '#d1d5db';
        feedbackBadBtn.innerHTML = '👎 <span style="font-size:11px">悪い返信</span>';
      }, 2000);
    });
  }

  // 再試行ボタン：もう一度AI返信を生成
  if (retryBtn) {
    retryBtn.addEventListener('click', async () => {
      console.log('再試行');
      retryBtn.style.background = '#fef3c7';
      retryBtn.style.borderColor = '#fbbf24';
      showStatus('再生成中...', 'loading');

      try {
        const { threadKey, service } = await getTabInfo();
        const result = await runLLM(threadKey, service);

        if (result && result.isMultiple) {
          showSuggestions(result.suggestions);
          showStatus('新しい返信候補を生成しました！', 'success');
        } else if (result) {
          await insertTextToPage(result.content || result);
        }
      } catch (error) {
        console.error('再試行エラー:', error);
        showStatus('再生成に失敗しました', 'error');
      } finally {
        setTimeout(() => {
          retryBtn.style.background = '#fff';
          retryBtn.style.borderColor = '#d1d5db';
        }, 500);
      }
    });
  }
});