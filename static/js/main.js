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

// ========== 录播功能 ==========

// 加载录播列表
async function loadRecordings() {
    const container = document.getElementById('recordingsList');

    try {
        container.innerHTML = `
            <div class="text-center text-muted py-5">
                <div class="spinner-border" role="status"></div>
                <p class="mt-3">加载中...</p>
            </div>
        `;

        const response = await fetch('/api/recordings');
        const result = await response.json();

        if (result.success) {
            renderRecordings(result.data);
        } else {
            container.innerHTML = `
                <div class="text-center text-danger py-5">
                    <i class="bi bi-exclamation-circle display-4"></i>
                    <p class="mt-3">加载失败</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('加载录播列表失败:', error);
        container.innerHTML = `
            <div class="text-center text-danger py-5">
                <i class="bi bi-exclamation-circle display-4"></i>
                <p class="mt-3">加载失败，请稍后重试</p>
            </div>
        `;
    }
}

// 渲染录播列表
function renderRecordings(recordings) {
    const container = document.getElementById('recordingsList');

    if (recordings.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="bi bi-camera-video display-4"></i>
                <p class="mt-3">暂无录播</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';

    recordings.forEach(recording => {
        const item = document.createElement('div');
        item.className = 'recording-item';

        item.innerHTML = `
            <div class="row align-items-center">
                <div class="col-md-3">
                    <div class="recording-thumbnail" style="height: 120px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center;">
                        <i class="bi bi-play-circle-fill" style="font-size: 3rem; color: white;"></i>
                    </div>
                </div>
                <div class="col-md-6 recording-info mt-3 mt-md-0">
                    <h6>${recording.filename}</h6>
                    <div class="recording-meta">
                        <span class="me-3">
                            <i class="bi bi-calendar3"></i>
                            ${recording.date || '未知日期'}
                        </span>
                        <span class="badge bg-info">
                            <i class="bi bi-hdd"></i>
                            ${recording.size_mb} MB
                        </span>
                    </div>
                </div>
                <div class="col-md-3 text-md-end mt-3 mt-md-0">
                    <button class="btn btn-primary mb-2 w-100" onclick="playVideo('${recording.url}', '${recording.filename}')">
                        <i class="bi bi-play-fill"></i> 在线观看
                    </button>
                    <a href="${recording.url}" download="${recording.filename}" class="btn btn-success w-100">
                        <i class="bi bi-download"></i> 下载
                    </a>
                </div>
            </div>
        `;

        container.appendChild(item);
    });
}

// 播放视频
function playVideo(url, filename) {
    const modal = new bootstrap.Modal(document.getElementById('videoModal'));
    const videoPlayer = document.getElementById('videoPlayer');
    const videoSource = document.getElementById('videoSource');
    const modalTitle = document.getElementById('videoModalTitle');

    videoSource.src = url;
    videoPlayer.load();
    modalTitle.textContent = filename;

    modal.show();

    // 模态框关闭时暂停视频
    document.getElementById('videoModal').addEventListener('hidden.bs.modal', function () {
        videoPlayer.pause();
        videoSource.src = '';
    });
}

// ========== 好朋友功能 ==========

// 检查好朋友访问权限
function checkFriendsAccess() {
    // 检查是否已验证
    const isVerified = sessionStorage.getItem('friendsVerified');

    if (isVerified === 'true') {
        showFriendsContent();
    } else {
        // 重置界面
        document.getElementById('passwordPrompt').style.display = 'block';
        document.getElementById('friendsContent').style.display = 'none';
        document.getElementById('friendsPassword').value = '';
        document.getElementById('passwordError').style.display = 'none';
    }
}

// 验证密码
function verifyPassword() {
    const passwordInput = document.getElementById('friendsPassword');
    const passwordError = document.getElementById('passwordError');
    const correctPassword = '小垚的好朋友';

    if (passwordInput.value === correctPassword) {
        // 密码正确
        sessionStorage.setItem('friendsVerified', 'true');
        showFriendsContent();
        showToast('验证成功！欢迎来到好朋友专区', 'success');
    } else {
        // 密码错误
        passwordError.style.display = 'block';
        passwordInput.value = '';
        passwordInput.focus();

        // 3秒后隐藏错误提示
        setTimeout(() => {
            passwordError.style.display = 'none';
        }, 3000);
    }
}

// 显示好朋友内容
function showFriendsContent() {
    document.getElementById('passwordPrompt').style.display = 'none';
    document.getElementById('friendsContent').style.display = 'block';

    // 初始化字符计数
    initFriendsCharCount();
}

// ========== 好朋友多模型聊天功能 ==========

// 模型配置
const AI_MODELS = [
    {
        id: 'opus',
        name: 'Claude Opus',
        model: 'claude-opus-4-1',
        icon: '🎨'
    },
    {
        id: 'sonnet',
        name: 'Claude Sonnet',
        model: 'claude-sonnet-4-5',
        icon: '⚡'
    },
    {
        id: 'deepseek',
        name: 'DeepSeek',
        model: 'deepseek-chat-3-1',
        icon: '🤖'
    },
    {
        id: 'gpt5',
        name: 'GPT-5',
        model: 'gpt-5',
        icon: '🚀'
    }
];

// API配置 - 使用后端转发
const API_CONFIG = {
    endpoint: '/api/friends/chat'  // 通过后端转发，解决手机访问问题
};

// 初始化字符计数
function initFriendsCharCount() {
    const input = document.getElementById('friendsInput');
    const charCount = document.getElementById('friendsCharCount');

    if (input && charCount) {
        input.addEventListener('input', function() {
            const count = input.value.length;
            charCount.textContent = count;

            // 超过限制时变红
            if (count > 2000) {
                charCount.style.color = '#dc3545';
            } else {
                charCount.style.color = '#667eea';
            }
        });
    }
}

// 发送消息给所有模型
async function sendToAllModels() {
    const input = document.getElementById('friendsInput');
    const message = input.value.trim();

    if (!message) {
        showToast('请输入消息', 'warning');
        return;
    }

    if (message.length > 2000) {
        showToast('消息长度超过限制', 'warning');
        return;
    }

    // 禁用发送按钮
    const sendBtn = document.getElementById('sendFriendsBtn');
    sendBtn.disabled = true;

    // 并行调用所有模型
    const promises = AI_MODELS.map(model =>
        callModelAPI(model.id, model.model, message)
    );

    // 等待所有请求完成
    await Promise.allSettled(promises);

    // 重新启用发送按钮
    sendBtn.disabled = false;
}

// 调用单个模型的API（通过后端转发）
async function callModelAPI(modelId, modelName, message) {
    // 更新状态为加载中
    updateModelStatus(modelId, 'loading', '正在思考...');
    updateModelResponse(modelId, '');

    try {
        const response = await fetch(API_CONFIG.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: modelName,
                messages: [
                    {
                        role: 'user',
                        content: message
                    }
                ],
                temperature: 0.7,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        // 检查后端响应
        if (!result.success) {
            throw new Error(result.error || '未知错误');
        }

        // 提取响应内容
        let content = '';
        if (result.data && result.data.choices && result.data.choices.length > 0) {
            content = result.data.choices[0].message.content;
        } else {
            throw new Error('响应格式错误');
        }

        // 更新状态为成功
        updateModelStatus(modelId, 'success', '回复完成');
        updateModelResponse(modelId, content);

    } catch (error) {
        console.error(`${modelName} 错误:`, error);

        // 更新状态为错误
        updateModelStatus(modelId, 'error', '请求失败');
        updateModelResponse(modelId, `❌ 错误: ${error.message}`, true);
    }
}

// 更新模型状态
function updateModelStatus(modelId, status, text) {
    const card = document.querySelector(`.model-response-card[data-model="${modelId}"]`);
    if (!card) return;

    const statusEl = card.querySelector('.model-status');
    const statusText = card.querySelector('.status-text');

    if (statusEl) {
        statusEl.setAttribute('data-status', status);
    }

    if (statusText) {
        statusText.textContent = text;
    }
}

// 更新模型响应内容
function updateModelResponse(modelId, content, isError = false) {
    const card = document.querySelector(`.model-response-card[data-model="${modelId}"]`);
    if (!card) return;

    const contentEl = card.querySelector('.model-response-content');
    if (!contentEl) return;

    if (!content) {
        contentEl.innerHTML = '<div class="empty-state">正在生成响应...</div>';
    } else if (isError) {
        contentEl.innerHTML = `<div class="error-state">${content}</div>`;
    } else {
        // 显示正常内容
        contentEl.textContent = content;

        // 自动滚动到顶部
        contentEl.scrollTop = 0;
    }
}

// 清空所有响应
function clearAllResponses() {
    // 清空输入框
    const input = document.getElementById('friendsInput');
    if (input) {
        input.value = '';
        document.getElementById('friendsCharCount').textContent = '0';
    }

    // 重置所有模型卡片
    AI_MODELS.forEach(model => {
        updateModelStatus(model.id, 'idle', '待发送');
        const card = document.querySelector(`.model-response-card[data-model="${model.id}"]`);
        if (card) {
            const contentEl = card.querySelector('.model-response-content');
            if (contentEl) {
                contentEl.innerHTML = '<div class="empty-state">等待发送消息...</div>';
            }
        }
    });

    showToast('已清空所有内容', 'info');
}
