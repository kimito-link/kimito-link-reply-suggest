document.addEventListener('DOMContentLoaded', async () => {
  const $ = (id) => document.getElementById(id);
  const providerEl = $('provider');
  const modelEl = $('model');
  const apiKeyEl = $('apiKey');
  const temperatureEl = $('temperature');
  const statusBarEl = $('statusBar');
  const modelDescEl = $('modelDescText');

  // モデルの説明
  const MODEL_DESCRIPTIONS = {
    'qwen/qwen-2.5-7b-instruct:free': '🆓 <strong>Qwen 2.5 7B</strong> (推奨)<br>Alibaba製の無料モデル。軽量で速く、安定している。日本語対応。<br>💰 料金: <strong>完全無料</strong> | 速度: ⚡⚡ 非常に速い | 品質: ⭐⭐⭐⭐',
    'microsoft/phi-3-mini-128k-instruct:free': '🆓 <strong>Phi-3 Mini</strong><br>Microsoft製の小型モデル。速度重視。<br>💰 料金: <strong>完全無料</strong> | 速度: ⚡⚡ 非常に速い | 品質: ⭐⭐⭐',
    'meta-llama/llama-3.2-3b-instruct:free': '🆓 <strong>Llama 3.2 3B</strong><br>Meta製の新しいモデル。軽量で速い。<br>💰 料金: <strong>完全無料</strong> | 速度: ⚡⚡ 速い | 品質: ⭐⭐⭐',
    'openai/gpt-4o-mini': '💵 <strong>GPT-4o mini</strong><br>OpenAIの安価版モデル。コストパフォーマンス抜群。日本語品質が高い。<br>💰 料金: <strong>安価</strong> (約1円/1000字) | 速度: ⚡⚡ 速い | 品質: ⭐⭐⭐⭐',
    'openai/gpt-4o': '💵 <strong>GPT-4o</strong><br>OpenAIの最新高性能モデル。自然で洗練された返信。ビジネス用途に最適。<br>💰 料金: <strong>中程度</strong> (約10円/1000字) | 速度: ⚡ 速い | 品質: ⭐⭐⭐⭐⭐',
    'anthropic/claude-3.5-sonnet': '💵 <strong>Claude 3.5 Sonnet</strong><br>Anthropic社の最高峰モデル。文章の質が非常に高く、細かいニュアンスを表現。<br>💰 料金: <strong>高額</strong> (約15円/1000字) | 速度: ⚡ 速い | 品質: ⭐⭐⭐⭐⭐⭐',
    'google/gemini-pro-1.5': '💵 <strong>Gemini Pro 1.5</strong><br>Googleのバランス型モデル。品質とコストのバランスが良い。日本語得意。<br>💰 料金: <strong>中程度</strong> (約8円/1000字) | 速度: ⚡ 速い | 品質: ⭐⭐⭐⭐⭐'
  };

  // モデル選択時に説明を表示
  function updateModelDescription() {
    if (!modelDescEl) return; // 要素が存在しない場合はスキップ
    const selectedModel = modelEl.value;
    const description = MODEL_DESCRIPTIONS[selectedModel] || 'モデルを選択してください';
    modelDescEl.innerHTML = description;
  }

  // ステータス表示関数
  function showStatus(message, type = 'info') {
    statusBarEl.style.display = 'block';
    statusBarEl.className = `status-bar ${type}`;
    
    const icon = {
      info: '💬',
      success: '✅',
      error: '❌',
      loading: '⏳'
    }[type] || '💬';
    
    statusBarEl.textContent = `${icon} ${message}`;
  }

  function hideStatus() {
    statusBarEl.style.display = 'none';
  }

  // load
  chrome.storage.sync.get({
    provider: 'openrouter',
    model: 'google/gemma-2-9b-it:free',
    apiKey: '',
    temperature: 0.6,
  }, (s) => {
    providerEl.value = s.provider;
    modelEl.value = s.model;
    apiKeyEl.value = s.apiKey;
    temperatureEl.value = s.temperature;
    
    // モデル説明を表示
    updateModelDescription();
    
    // APIキーが設定されていない場合は警告表示
    if (!s.apiKey) {
      showStatus('APIキーが設定されていません。OpenRouterでAPIキーを取得して設定してください。', 'error');
    }
  });

  // モデル変更時に説明を更新
  modelEl.addEventListener('change', updateModelDescription);

  // APIキーの表示/非表示を切り替え
  const toggleApiKeyBtn = $('toggleApiKey');
  if (toggleApiKeyBtn) {
    toggleApiKeyBtn.addEventListener('click', () => {
      const currentType = apiKeyEl.type;
      if (currentType === 'password') {
        apiKeyEl.type = 'text';
        toggleApiKeyBtn.textContent = '🙈';
        toggleApiKeyBtn.title = 'パスワードを隠す';
      } else {
        apiKeyEl.type = 'password';
        toggleApiKeyBtn.textContent = '👁️';
        toggleApiKeyBtn.title = 'パスワードを表示';
      }
    });
  }

  // save
  document.getElementById('save').addEventListener('click', async () => {
    const provider = providerEl.value;
    const model = modelEl.value.trim() || 'google/gemma-2-9b-it:free';
    const apiKey = apiKeyEl.value.trim();
    const temperature = Math.max(0, Math.min(1, parseFloat(temperatureEl.value || '0.6')));
    
    if (!apiKey) {
      showStatus('APIキーを入力してください', 'error');
      return;
    }
    
    showStatus('設定を保存中...', 'loading');
    
    chrome.storage.sync.set({ provider, model, apiKey, temperature }, () => {
      if (chrome.runtime.lastError) {
        showStatus('保存に失敗: ' + chrome.runtime.lastError.message, 'error');
      } else {
        showStatus('設定を保存しました！ポップアップからAI機能が使えるようになりました。', 'success');
      }
    });
  });

  // reload extension page
  document.getElementById('reload').addEventListener('click', () => {
    showStatus('ページを再読み込みします...', 'loading');
    setTimeout(() => {
      location.reload();
    }, 500);
  });

  // 🔗 Zoom/Meetリンクの読み込み
  const zoomLinkEl = $('zoomLink');
  const meetLinkEl = $('meetLink');
  const teamsLinkEl = $('teamsLink');
  const saveLinksBtn = $('saveLinks');

  // リンクを読み込む
  if (zoomLinkEl && meetLinkEl && teamsLinkEl) {
    chrome.storage.local.get({
      zoomLink: '',
      meetLink: '',
      teamsLink: ''
    }, (data) => {
      zoomLinkEl.value = data.zoomLink || '';
      meetLinkEl.value = data.meetLink || '';
      teamsLinkEl.value = data.teamsLink || '';
    });
  }

  // リンクを保存
  if (saveLinksBtn) {
    saveLinksBtn.addEventListener('click', () => {
      const zoomLink = zoomLinkEl.value.trim();
      const meetLink = meetLinkEl.value.trim();
      const teamsLink = teamsLinkEl.value.trim();

      showStatus('リンクを保存中...', 'loading');

      chrome.storage.local.set({ zoomLink, meetLink, teamsLink }, () => {
        if (chrome.runtime.lastError) {
          showStatus('保存に失敗: ' + chrome.runtime.lastError.message, 'error');
        } else {
          showStatus('🔗 リンクを保存しました！定型文で {{zoom}} {{meet}} {{teams}} が使えます。', 'success');
        }
      });
    });
  }

console.log('✅ options.js 読み込み完了');
});