// AI 语音生成器 - 前端逻辑

// 全局变量
let selectedEmotion = null;
let toastInstance = null;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化 Toast
    const toastEl = document.getElementById('toast');
    toastInstance = new bootstrap.Toast(toastEl);

    // 加载情感选项
    loadEmotions();

    // 加载历史记录
    loadHistory();

    // 绑定事件
    bindEvents();

    // 检查服务状态
    checkServiceStatus();
});

// 绑定事件
function bindEvents() {
    const textInput = document.getElementById('textInput');
    const generateBtn = document.getElementById('generateBtn');

    // 文本输入事件
    textInput.addEventListener('input', function() {
        updateCharCount();
        updateGenerateButton();
    });

    // 生成按钮点击事件
    generateBtn.addEventListener('click', generateSpeech);
}

// 更新字符计数
function updateCharCount() {
    const textInput = document.getElementById('textInput');
    const charCount = document.getElementById('charCount');
    const count = textInput.value.length;
    charCount.textContent = count;

    // 超过限制时变红
    if (count > 500) {
        charCount.style.color = '#dc3545';
    } else {
        charCount.style.color = '#667eea';
    }
}

// 更新生成按钮状态
function updateGenerateButton() {
    const textInput = document.getElementById('textInput');
    const generateBtn = document.getElementById('generateBtn');
    const text = textInput.value.trim();

    generateBtn.disabled = !(text.length > 0 && text.length <= 500 && selectedEmotion);
}

// 加载情感选项
async function loadEmotions() {
    try {
        const response = await fetch('/api/emotions');
        const result = await response.json();

        if (result.success) {
            renderEmotions(result.data);
        } else {
            showToast('加载情感选项失败', 'danger');
        }
    } catch (error) {
        console.error('加载情感失败:', error);
        showToast('加载失败，请刷新页面重试', 'danger');
    }
}

// 渲染情感按钮
function renderEmotions(emotions) {
    const container = document.getElementById('emotionButtons');
    container.innerHTML = '';

    emotions.forEach((emotion, index) => {
        const btn = document.createElement('div');
        btn.className = 'emotion-btn';
        btn.dataset.emotion = emotion.key;
        btn.innerHTML = `
            <span class="emoji">${emotion.emoji}</span>
            <span class="name">${emotion.name}</span>
            <span class="desc">${emotion.description}</span>
        `;

        btn.addEventListener('click', function() {
            selectEmotion(emotion.key);
        });

        container.appendChild(btn);

        // 默认选中第一个
        if (index === 0) {
            selectEmotion(emotion.key);
        }
    });
}

// 选择情感
function selectEmotion(emotionKey) {
    selectedEmotion = emotionKey;

    // 更新按钮状态
    document.querySelectorAll('.emotion-btn').forEach(btn => {
        if (btn.dataset.emotion === emotionKey) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    updateGenerateButton();
}

// 生成语音
async function generateSpeech() {
    const textInput = document.getElementById('textInput');
    const text = textInput.value.trim();

    if (!text || !selectedEmotion) {
        showToast('请输入文本并选择情感', 'warning');
        return;
    }

    // 显示加载动画
    showLoading(true);
    hidePlayer();

    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                emotion: selectedEmotion
            })
        });

        const result = await response.json();

        if (result.success) {
            // 显示音频播放器
            showAudioPlayer(result.data);
            showToast('语音生成成功!', 'success');

            // 刷新历史记录
            setTimeout(() => loadHistory(), 500);
        } else {
            showToast('生成失败: ' + (result.detail || '未知错误'), 'danger');
        }
    } catch (error) {
        console.error('生成失败:', error);
        showToast('生成失败，请检查服务是否正常运行', 'danger');
    } finally {
        showLoading(false);
    }
}

// 显示/隐藏加载动画
function showLoading(show) {
    const loading = document.getElementById('loadingIndicator');
    const generateBtn = document.getElementById('generateBtn');

    if (show) {
        loading.style.display = 'block';
        generateBtn.disabled = true;
    } else {
        loading.style.display = 'none';
        updateGenerateButton();
    }
}

// 显示音频播放器
function showAudioPlayer(data) {
    const player = document.getElementById('audioPlayer');
    const audio = document.getElementById('audioElement');
    const downloadBtn = document.getElementById('downloadBtn');

    audio.src = data.audio_url;
    downloadBtn.href = data.audio_url;
    downloadBtn.download = data.filename;

    player.style.display = 'block';

    // 自动播放
    audio.play().catch(err => {
        console.log('自动播放失败:', err);
    });

    // 滚动到播放器
    player.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// 隐藏播放器
function hidePlayer() {
    const player = document.getElementById('audioPlayer');
    const audio = document.getElementById('audioElement');

    player.style.display = 'none';
    audio.pause();
    audio.src = '';
}

// 加载历史记录
async function loadHistory() {
    try {
        const response = await fetch('/api/history');
        const result = await response.json();

        if (result.success) {
            renderHistory(result.data);
        }
    } catch (error) {
        console.error('加载历史记录失败:', error);
    }
}

// 渲染历史记录
function renderHistory(files) {
    const container = document.getElementById('historyList');

    if (files.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted">
                <i class="bi bi-hourglass-split"></i>
                <p>暂无历史记录</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';

    files.forEach(file => {
        const item = document.createElement('div');
        item.className = 'history-item';

        const date = new Date(file.created_at);
        const timestamp = formatDate(date);

        item.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <div class="filename">
                        <i class="bi bi-file-earmark-music text-primary"></i>
                        ${file.filename}
                    </div>
                    <div class="timestamp">
                        <i class="bi bi-clock"></i>
                        ${timestamp}
                    </div>
                </div>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-primary" onclick="playAudio('${file.url}')">
                        <i class="bi bi-play-fill"></i> 播放
                    </button>
                    <a href="${file.url}" download="${file.filename}" class="btn btn-sm btn-outline-success">
                        <i class="bi bi-download"></i> 下载
                    </a>
                </div>
            </div>
        `;

        container.appendChild(item);
    });
}

// 播放历史音频
function playAudio(url) {
    const audio = document.getElementById('audioElement');
    const player = document.getElementById('audioPlayer');

    audio.src = url;
    player.style.display = 'block';
    audio.play();

    // 滚动到播放器
    player.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// 格式化日期
function formatDate(date) {
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days} 天前`;
    } else if (hours > 0) {
        return `${hours} 小时前`;
    } else if (minutes > 0) {
        return `${minutes} 分钟前`;
    } else {
        return '刚刚';
    }
}

// 显示 Toast 通知
function showToast(message, type = 'info') {
    const toastBody = document.getElementById('toastBody');
    const toastEl = document.getElementById('toast');
    const toastHeader = toastEl.querySelector('.toast-header');

    toastBody.textContent = message;

    // 更新图标和颜色
    let icon = 'bi-info-circle text-primary';
    if (type === 'success') icon = 'bi-check-circle text-success';
    if (type === 'danger') icon = 'bi-exclamation-circle text-danger';
    if (type === 'warning') icon = 'bi-exclamation-triangle text-warning';

    const iconEl = toastHeader.querySelector('i');
    iconEl.className = `bi ${icon} me-2`;

    toastInstance.show();
}

// 检查服务状态
async function checkServiceStatus() {
    try {
        const response = await fetch('/api/status');
        const result = await response.json();

        if (result.success && !result.data.api_online) {
            showToast('语音服务正在启动中，请稍候...', 'warning');
        }
    } catch (error) {
        console.error('检查服务状态失败:', error);
    }
}
