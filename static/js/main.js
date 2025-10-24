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

// 按时间间隔分组录播为场次
function groupRecordingsBySessions(recordings, danmakuFiles = []) {
    // 间隔阈值：4小时 = 14400000 毫秒
    const SESSION_GAP_MS = 4 * 60 * 60 * 1000;

    // 先按时间正序排序（最早的在前）
    const sorted = [...recordings].sort((a, b) =>
        new Date(a.created_at) - new Date(b.created_at)
    );

    const sessions = [];
    let currentSession = null;

    sorted.forEach(recording => {
        const recordingTime = new Date(recording.created_at);

        if (!currentSession) {
            // 第一个录播，创建第一个场次
            currentSession = {
                recordings: [recording],
                danmaku: [],
                startTime: recordingTime,
                endTime: recordingTime
            };
        } else {
            // 计算与当前场次最后一个录播的时间差
            const timeDiff = recordingTime - currentSession.endTime;

            if (timeDiff > SESSION_GAP_MS) {
                // 间隔超过1小时，保存当前场次，创建新场次
                sessions.push(currentSession);
                currentSession = {
                    recordings: [recording],
                    danmaku: [],
                    startTime: recordingTime,
                    endTime: recordingTime
                };
            } else {
                // 间隔小于1小时，加入当前场次
                currentSession.recordings.push(recording);
                currentSession.endTime = recordingTime;
            }
        }
    });

    // 保存最后一个场次
    if (currentSession) {
        sessions.push(currentSession);
    }

    // 将弹幕文件分配到对应的场次
    danmakuFiles.forEach(danmaku => {
        const danmakuTime = new Date(danmaku.created_at);

        // 找到弹幕所属的场次（弹幕时间在场次的startTime和endTime + SESSION_GAP_MS范围内）
        for (let session of sessions) {
            const sessionStart = session.startTime.getTime();
            const sessionEnd = session.endTime.getTime() + SESSION_GAP_MS;

            if (danmakuTime.getTime() >= sessionStart && danmakuTime.getTime() <= sessionEnd) {
                session.danmaku.push(danmaku);
                break;
            }
        }
    });

    // 场次倒序（最新的场次在前）
    return sessions.reverse();
}

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

// 格式化场次日期
function formatSessionDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}年${month}月${day}日`;
}

// 格式化场次时间（只显示时分）
function formatSessionTime(date) {
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${hour}:${minute}`;
}

// 创建单个录播项元素
function createRecordingItem(recording) {
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
                <button class="btn btn-primary mb-2 w-100" onclick="playVideo('${recording.url}', '${recording.filename}', event)">
                    <i class="bi bi-play-fill"></i> 在线观看
                </button>
                <a href="${recording.url}" download="${recording.filename}" class="btn btn-success w-100">
                    <i class="bi bi-download"></i> 下载
                </a>
            </div>
        </div>
    `;

    return item;
}

// 创建弹幕区域
function createDanmakuSection(danmakuFiles, sessionId) {
    const section = document.createElement('div');
    section.className = 'danmaku-section mt-4 p-3' ;
    section.style.cssText = 'background: #f8f9fa; border-radius: 8px; border: 1px solid #dee2e6;';

    const danmakuId = `danmaku-${sessionId}`;

    section.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h6 class="mb-0">
                <i class="bi bi-chat-dots-fill me-2" style="color: #667eea;"></i>
                弹幕记录（${danmakuFiles.length} 个文件）
            </h6>
            <button class="btn btn-sm btn-outline-primary" onclick="toggleDanmakuView('${danmakuId}', ${JSON.stringify(danmakuFiles.map(f => f.url)).replace(/"/g, '&quot;')})">
                <i class="bi bi-eye-fill"></i> 查看弹幕
            </button>
        </div>
        <div class="danmaku-files mb-2">
            ${danmakuFiles.map(f => `
                <a href="${f.url}" download="${f.filename}" class="badge bg-secondary me-2 text-decoration-none" style="cursor: pointer;" title="点击下载">
                    <i class="bi bi-file-earmark-text"></i> ${f.filename}
                    <i class="bi bi-download ms-1" style="font-size: 0.8em;"></i>
                </a>
            `).join('')}
        </div>
        <div id="${danmakuId}-container" style="display: none;">
            <!-- 弹幕类型筛选 -->
            <div class="danmaku-filters mb-3 p-2" style="background: white; border-radius: 4px; display: flex; gap: 10px; align-items: center;">
                <span style="color: #868e96; font-size: 14px; font-weight: 500;">筛选：</span>
                <button class="danmaku-filter-btn active" data-type="chat" onclick="toggleDanmakuFilter('${danmakuId}', 'chat')"
                        style="border: none; background: none; cursor: pointer; font-size: 1.5rem; opacity: 1; transition: opacity 0.2s;"
                        title="聊天消息">
                    💬
                </button>
                <button class="danmaku-filter-btn active" data-type="gift" onclick="toggleDanmakuFilter('${danmakuId}', 'gift')"
                        style="border: none; background: none; cursor: pointer; font-size: 1.5rem; opacity: 1; transition: opacity 0.2s;"
                        title="礼物">
                    🎁
                </button>
                <button class="danmaku-filter-btn" data-type="like" onclick="toggleDanmakuFilter('${danmakuId}', 'like')"
                        style="border: none; background: none; cursor: pointer; font-size: 1.5rem; opacity: 0.3; transition: opacity 0.2s;"
                        title="点赞">
                    ❤️
                </button>
                <button class="danmaku-filter-btn" data-type="member" onclick="toggleDanmakuFilter('${danmakuId}', 'member')"
                        style="border: none; background: none; cursor: pointer; font-size: 1.5rem; opacity: 0.3; transition: opacity 0.2s;"
                        title="进入直播间">
                    👋
                </button>
                <button class="danmaku-filter-btn active" data-type="social" onclick="toggleDanmakuFilter('${danmakuId}', 'social')"
                        style="border: none; background: none; cursor: pointer; font-size: 1.5rem; opacity: 1; transition: opacity 0.2s;"
                        title="关注">
                    ⭐
                </button>
            </div>
            <div id="${danmakuId}" class="danmaku-content" style="max-height: 400px; overflow-y: auto; background: white; border-radius: 4px; padding: 12px;">
                <div class="text-center text-muted">
                    <div class="spinner-border spinner-border-sm" role="status"></div>
                    <span class="ms-2">加载中...</span>
                </div>
            </div>
        </div>
    `;

    return section;
}

// 切换弹幕显示
async function toggleDanmakuView(danmakuId, fileUrls) {
    const container = document.getElementById(`${danmakuId}-container`);

    // 切换显示状态
    if (container.style.display !== 'none') {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';

    // 如果已经加载过，直接显示
    const content = document.getElementById(danmakuId);
    if (content.dataset.loaded === 'true') {
        return;
    }

    await loadDanmaku(danmakuId, fileUrls);
}

// 加载弹幕数据
async function loadDanmaku(danmakuId, fileUrls) {
    const container = document.getElementById(danmakuId);

    try {
        // 加载所有弹幕文件
        const allDanmaku = [];

        for (const url of fileUrls) {
            const response = await fetch(url);
            const data = await response.json();

            if (Array.isArray(data)) {
                allDanmaku.push(...data);
            }
        }

        // 按时间排序
        allDanmaku.sort((a, b) => {
            const timeA = a.timestamp || 0;
            const timeB = b.timestamp || 0;
            return timeA - timeB;
        });

        // 保存原始数据
        container.dataset.danmaku = JSON.stringify(allDanmaku);
        container.dataset.loaded = 'true';

        // 渲染弹幕
        renderDanmakuList(danmakuId, allDanmaku);

        // 应用默认筛选（隐藏 like 和 member）
        applyDanmakuFilters(danmakuId);
    } catch (error) {
        console.error('加载弹幕失败:', error);
        container.innerHTML = `
            <div class="text-center text-danger py-3">
                <i class="bi bi-exclamation-triangle"></i>
                <p class="mb-0 mt-2">加载弹幕失败</p>
            </div>
        `;
    }
}

// 渲染弹幕列表
function renderDanmakuList(danmakuId, danmakuList) {
    const container = document.getElementById(danmakuId);

    if (danmakuList.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-3">
                <i class="bi bi-chat-dots"></i>
                <p class="mb-0 mt-2">暂无弹幕</p>
            </div>
        `;
        return;
    }

    container.innerHTML = danmakuList.map(msg => {
        const method = (msg.method || '未知').toLowerCase();
        const content = msg.content || '';
        const userName = msg.user?.name || msg.user?.nickname || '匿名';

        // 根据类型显示不同的图标和颜色
        let icon = '💬';
        let typeColor = '#667eea';
        let dataType = 'chat';

        if (method.includes('gift')) {
            icon = '🎁';
            typeColor = '#ff6b6b';
            dataType = 'gift';
        } else if (method.includes('like')) {
            icon = '❤️';
            typeColor = '#ff8787';
            dataType = 'like';
        } else if (method.includes('member')) {
            icon = '👋';
            typeColor = '#51cf66';
            dataType = 'member';
        } else if (method.includes('social')) {
            icon = '⭐';
            typeColor = '#ffd43b';
            dataType = 'social';
        } else if (method.includes('chat')) {
            dataType = 'chat';
        }

        return `
            <div class="danmaku-item d-flex align-items-start mb-1 pb-1" data-type="${dataType}" style="border-bottom: 1px solid #f1f3f5;">
                <div class="me-2" style="font-size: 1.1rem; line-height: 1.5;">${icon}</div>
                <div class="flex-grow-1" style="line-height: 1.5;">
                    <strong style="color: ${typeColor};">${userName}</strong><span style="color: #868e96; margin: 0 4px;">:</span><span style="color: #495057; word-break: break-word;">${content}</span>
                </div>
            </div>
        `;
    }).join('');
}

// 切换弹幕类型筛选
function toggleDanmakuFilter(danmakuId, type) {
    const container = document.getElementById(`${danmakuId}-container`);
    const filterBtn = container.querySelector(`.danmaku-filter-btn[data-type="${type}"]`);

    // 切换按钮状态
    if (filterBtn.classList.contains('active')) {
        filterBtn.classList.remove('active');
        filterBtn.style.opacity = '0.3';
    } else {
        filterBtn.classList.add('active');
        filterBtn.style.opacity = '1';
    }

    // 应用筛选
    applyDanmakuFilters(danmakuId);
}

// 应用弹幕筛选
function applyDanmakuFilters(danmakuId) {
    const container = document.getElementById(`${danmakuId}-container`);
    const content = document.getElementById(danmakuId);

    // 获取所有激活的筛选类型
    const activeFilters = Array.from(container.querySelectorAll('.danmaku-filter-btn.active'))
        .map(btn => btn.dataset.type);

    // 显示/隐藏弹幕项
    const danmakuItems = content.querySelectorAll('.danmaku-item');

    danmakuItems.forEach(item => {
        const itemType = item.dataset.type;
        if (activeFilters.includes(itemType)) {
            item.style.display = '';  // 清除内联样式，使用类的样式
        } else {
            item.style.display = 'none';  // 强制隐藏
            item.style.setProperty('display', 'none', 'important');  // 添加 !important
        }
    });
}

// 渲染录播列表（按场次分组）
function renderRecordings(data) {
    const container = document.getElementById('recordingsList');

    // 适配新的数据格式
    const videos = data.videos || data;  // 兼容旧格式
    const danmaku = data.danmaku || [];

    if (videos.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="bi bi-camera-video display-4"></i>
                <p class="mt-3">暂无录播</p>
            </div>
        `;
        return;
    }

    // 按场次分组（传入视频和弹幕文件）
    const sessions = groupRecordingsBySessions(videos, danmaku);

    container.innerHTML = '';

    // 第一步：统计每个日期的场次总数
    const dateCounts = {};
    sessions.forEach(session => {
        const dateStr = formatSessionDate(session.startTime);
        dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
    });

    // 第二步：渲染场次，每天的场次编号从1开始
    const dateIndices = {};

    sessions.forEach((session, index) => {
        // 获取场次日期
        const sessionDate = formatSessionDate(session.startTime);

        // 初始化该日期的索引
        if (!(sessionDate in dateIndices)) {
            dateIndices[sessionDate] = 0;
        }

        // 计算当天的场次编号（倒序：最新的编号最大）
        const sessionNumber = dateCounts[sessionDate] - dateIndices[sessionDate];
        dateIndices[sessionDate]++;

        // 计算场次统计数据
        const videoCount = session.recordings.length;
        const totalSizeMB = session.recordings.reduce((sum, r) => sum + r.size_mb, 0).toFixed(2);

        // 格式化时间
        const startTime = formatSessionTime(session.startTime);
        const endTime = formatSessionTime(session.endTime);
        const timeRange = session.startTime.getTime() === session.endTime.getTime()
            ? startTime
            : `${startTime} - ${endTime}`;

        // 创建场次卡片
        const sessionCard = document.createElement('div');
        sessionCard.className = 'session-card';

        const sessionId = `session-${index}`;

        sessionCard.innerHTML = `
            <div class="session-header" onclick="toggleSession('${sessionId}')">
                <div class="session-info">
                    <h5 class="session-title">
                        <i class="bi bi-camera-video-fill me-2"></i>
                        ${sessionDate} · 第 ${sessionNumber} 场
                    </h5>
                    <div class="session-meta">
                        <span class="me-3">
                            <i class="bi bi-clock"></i> ${timeRange}
                        </span>
                        <span class="me-3">
                            <i class="bi bi-collection-play"></i> ${videoCount} 个视频
                        </span>
                        <span>
                            <i class="bi bi-hdd"></i> ${totalSizeMB} MB
                        </span>
                    </div>
                </div>
                <div class="session-toggle">
                    <i class="bi bi-chevron-down"></i>
                </div>
            </div>
            <div id="${sessionId}" class="session-content">
                <!-- 场次内的录播列表 -->
            </div>
        `;

        container.appendChild(sessionCard);

        // 渲染该场次的录播
        const sessionContent = document.getElementById(sessionId);
        session.recordings.forEach(recording => {
            const recordingItem = createRecordingItem(recording);
            sessionContent.appendChild(recordingItem);
        });

        // 渲染该场次的弹幕
        if (session.danmaku && session.danmaku.length > 0) {
            const danmakuSection = createDanmakuSection(session.danmaku, sessionId);
            sessionContent.appendChild(danmakuSection);
        }
    });
}

// 切换场次展开/折叠
function toggleSession(sessionId) {
    const content = document.getElementById(sessionId);
    const header = content.previousElementSibling;
    const icon = header.querySelector('.session-toggle i');

    if (content.classList.contains('expanded')) {
        content.classList.remove('expanded');
        icon.classList.remove('bi-chevron-up');
        icon.classList.add('bi-chevron-down');
    } else {
        content.classList.add('expanded');
        icon.classList.remove('bi-chevron-down');
        icon.classList.add('bi-chevron-up');
    }
}

// 播放视频（内嵌模式）
function playVideo(url, filename, event) {
    const player = document.getElementById('embeddedVideoPlayer');
    const video = document.getElementById('embeddedVideo');
    const videoSource = document.getElementById('embeddedVideoSource');
    const videoTitle = document.getElementById('embeddedVideoTitle');

    // 设置视频源和标题
    videoSource.src = url;
    video.load();
    videoTitle.textContent = filename;

    // 找到被点击的录播项，将播放器移动到其下方
    if (event) {
        const recordingItem = event.target.closest('.recording-item');
        if (recordingItem) {
            recordingItem.after(player);
        }
    }

    // 显示播放器
    player.style.display = 'block';

    // 滚动到播放器位置
    player.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // 自动播放
    video.play().catch(err => {
        console.log('自动播放失败:', err);
    });
}

// 关闭内嵌视频播放器
function closeEmbeddedPlayer() {
    const player = document.getElementById('embeddedVideoPlayer');
    const video = document.getElementById('embeddedVideo');
    const videoSource = document.getElementById('embeddedVideoSource');

    // 暂停并重置视频
    video.pause();
    videoSource.src = '';
    video.load();

    // 隐藏播放器
    player.style.display = 'none';
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
async function showFriendsContent() {
    document.getElementById('passwordPrompt').style.display = 'none';
    document.getElementById('friendsContent').style.display = 'block';

    // 初始化字符计数
    initFriendsCharCount();

    // 先加载模型配置（支持热加载）
    const loaded = await loadModelsConfig();

    if (loaded) {
        // 恢复聊天状态（如果有）
        loadChatState();
    }
}

// ========== 好朋友多模型聊天功能 ==========

// 模型配置（从服务器动态加载）
let AI_MODELS = [];

// API配置 - 使用后端转发
const API_CONFIG = {
    endpoint: '/api/friends/chat',  // 通过后端转发，解决手机访问问题
    modelsEndpoint: '/api/friends/models'  // 获取模型配置
};

// 加载模型配置（支持热加载）
async function loadModelsConfig() {
    try {
        const response = await fetch(API_CONFIG.modelsEndpoint);
        const result = await response.json();

        if (result.success && result.data && result.data.models) {
            AI_MODELS = result.data.models;
            console.log(`✅ 成功加载${AI_MODELS.length}个模型配置`);

            // 动态生成状态指示器
            renderStatusIndicators();

            return true;
        } else {
            console.error('❌ 加载模型配置失败:', result.error);
            showToast('加载模型配置失败', 'danger');
            return false;
        }
    } catch (error) {
        console.error('❌ 获取模型配置失败:', error);
        showToast('无法连接到服务器', 'danger');
        return false;
    }
}

// 动态生成状态指示器
function renderStatusIndicators() {
    const container = document.querySelector('.status-indicators');
    if (!container) return;

    container.innerHTML = '';

    AI_MODELS.forEach(model => {
        const indicator = document.createElement('div');
        indicator.className = 'status-indicator';
        indicator.setAttribute('data-model', model.id);
        indicator.setAttribute('data-status', 'idle');

        indicator.innerHTML = `
            <span class="indicator-icon">${model.icon}</span>
            <span class="indicator-name">${model.name}</span>
            <span class="indicator-badge">待发送</span>
        `;

        container.appendChild(indicator);
    });

    console.log('✅ 状态指示器已生成');
}

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

    // 发送新问题前，保存上一轮对话到历史
    saveToHistory();

    // 显示当前问题
    const questionDisplay = document.getElementById('currentQuestionDisplay');
    const questionText = document.getElementById('currentQuestionText');
    questionText.textContent = message;
    questionDisplay.style.display = 'block';

    // 清空响应容器，准备新的响应
    const container = document.getElementById('modelsResponseContainer');
    container.innerHTML = '';

    // 重置所有状态指示器
    AI_MODELS.forEach(model => {
        updateModelStatus(model.id, 'idle', '待发送');
    });

    // 保存初始状态（显示了新问题）
    saveChatState();

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
    const startTime = Date.now();

    // 更新状态为加载中
    updateModelStatus(modelId, 'loading', '加载中');

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

        // 计算响应时间
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        // 更新状态为成功
        updateModelStatus(modelId, 'success', '完成');

        // 动态创建并插入响应卡片
        createResponseCard(modelId, content, duration);

    } catch (error) {
        console.error(`${modelName} 错误:`, error);

        // 更新状态为错误
        updateModelStatus(modelId, 'error', '失败');

        // 可选：也可以为错误创建卡片
        // createResponseCard(modelId, `错误: ${error.message}`, null, true);
    }
}

// 更新状态栏中的模型状态
function updateModelStatus(modelId, status, text) {
    const indicator = document.querySelector(`.status-indicator[data-model="${modelId}"]`);
    if (!indicator) return;

    // 更新状态属性
    indicator.setAttribute('data-status', status);

    // 更新状态文本
    const badge = indicator.querySelector('.indicator-badge');
    if (badge) {
        badge.textContent = text;
    }

    // 保存状态变化
    saveChatState();
}

// 动态创建响应卡片（先完成的在上，后完成的在下）
function createResponseCard(modelId, content, duration, isError = false) {
    const container = document.getElementById('modelsResponseContainer');
    if (!container) return;

    // 移除"暂无响应"提示
    const noResponsesEl = container.querySelector('.no-responses-yet');
    if (noResponsesEl) {
        noResponsesEl.remove();
    }

    // 获取模型信息
    const modelInfo = AI_MODELS.find(m => m.id === modelId);
    if (!modelInfo) return;

    // 创建卡片元素
    const card = document.createElement('div');
    card.className = 'model-response-card';
    card.setAttribute('data-model', modelId);

    // 动态应用模型颜色（从配置文件）
    if (modelInfo.color) {
        card.style.borderLeftColor = modelInfo.color;
    }

    // 创建卡片内容
    const timeText = duration ? `${duration}秒` : '';
    card.innerHTML = `
        <div class="model-header">
            <span class="model-icon">${modelInfo.icon}</span>
            <span class="model-name">${modelInfo.name}</span>
            ${timeText ? `<span class="model-time">${timeText}</span>` : ''}
        </div>
        <div class="model-response-content">
            ${isError ? `<div class="error-state">${content}</div>` : content}
        </div>
    `;

    // 插入到容器底部（先完成的在上，后完成的在下）
    container.appendChild(card);

    // 保存聊天状态
    saveChatState();
}

// 清空所有响应
function clearAllResponses() {
    // 清空输入框
    const input = document.getElementById('friendsInput');
    if (input) {
        input.value = '';
        document.getElementById('friendsCharCount').textContent = '0';
    }

    // 重置所有状态指示器
    AI_MODELS.forEach(model => {
        updateModelStatus(model.id, 'idle', '待发送');
    });

    // 清空响应卡片容器
    const container = document.getElementById('modelsResponseContainer');
    if (container) {
        container.innerHTML = `
            <div class="no-responses-yet">
                <i class="bi bi-inbox" style="font-size: 2rem; opacity: 0.3;"></i>
                <p class="text-muted mt-2 mb-0">暂无响应结果</p>
            </div>
        `;
    }

    // 隐藏当前问题显示
    const questionDisplay = document.getElementById('currentQuestionDisplay');
    if (questionDisplay) {
        questionDisplay.style.display = 'none';
    }

    // 清除保存的聊天状态
    clearChatState();

    showToast('已清空所有内容', 'info');
}

// ========== 历史对话管理 ==========

// 保存当前对话到历史
function saveToHistory() {
    // 获取当前问题
    const questionText = document.getElementById('currentQuestionText');
    if (!questionText || !questionText.textContent.trim()) {
        return; // 没有当前问题，不保存
    }

    const question = questionText.textContent.trim();

    // 获取所有响应卡片
    const container = document.getElementById('modelsResponseContainer');
    const responseCards = container.querySelectorAll('.model-response-card');

    if (responseCards.length === 0) {
        return; // 没有响应，不保存
    }

    // 克隆所有响应卡片
    const clonedCards = Array.from(responseCards).map(card => card.cloneNode(true));

    // 创建历史记录项
    const historyContainer = document.getElementById('historyContainer');
    const chatHistory = document.getElementById('chatHistory');

    // 显示历史区域
    chatHistory.style.display = 'block';

    // 创建历史项元素
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';

    const timestamp = new Date().toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });

    const historyId = `history-${Date.now()}`;

    historyItem.innerHTML = `
        <div class="history-question" onclick="toggleHistoryItem('${historyId}')">
            <div class="history-question-label">
                <span class="toggle-icon">▶</span>历史问题
            </div>
            <div class="history-question-text">${question}</div>
            <div class="history-question-meta">${timestamp} · ${clonedCards.length}个回答</div>
        </div>
        <div id="${historyId}" class="history-responses">
            <!-- 响应卡片将被插入这里 -->
        </div>
    `;

    // 插入到历史容器顶部（最新的在上面）
    historyContainer.insertBefore(historyItem, historyContainer.firstChild);

    // 将克隆的卡片插入到历史响应区
    const responsesContainer = historyItem.querySelector(`#${historyId}`);
    clonedCards.forEach(card => {
        responsesContainer.appendChild(card);
    });

    // 保存聊天状态
    saveChatState();
}

// 切换历史项展开/折叠
function toggleHistoryItem(historyId) {
    const responsesEl = document.getElementById(historyId);
    const toggleIcon = responsesEl.previousElementSibling.querySelector('.toggle-icon');

    if (responsesEl.classList.contains('expanded')) {
        responsesEl.classList.remove('expanded');
        toggleIcon.classList.remove('expanded');
    } else {
        responsesEl.classList.add('expanded');
        toggleIcon.classList.add('expanded');
    }
}

// ========== 聊天状态持久化（sessionStorage） ==========

const CHAT_STATE_KEY = 'friendsChatState';

// 保存聊天状态到 sessionStorage
function saveChatState() {
    try {
        const state = {
            // 当前问题
            currentQuestion: document.getElementById('currentQuestionText')?.textContent || '',
            questionVisible: document.getElementById('currentQuestionDisplay')?.style.display !== 'none',

            // 当前响应容器HTML
            responsesHTML: document.getElementById('modelsResponseContainer')?.innerHTML || '',

            // 历史记录容器HTML
            historyHTML: document.getElementById('historyContainer')?.innerHTML || '',
            historyVisible: document.getElementById('chatHistory')?.style.display !== 'none',

            // 模型状态
            modelStates: {},

            // 保存时间戳
            timestamp: new Date().toISOString()
        };

        // 保存所有模型状态
        AI_MODELS.forEach(model => {
            const indicator = document.querySelector(`.status-indicator[data-model="${model.id}"]`);
            if (indicator) {
                const status = indicator.getAttribute('data-status');
                const badge = indicator.querySelector('.indicator-badge');
                state.modelStates[model.id] = {
                    status: status,
                    text: badge ? badge.textContent : '待发送'
                };
            }
        });

        sessionStorage.setItem(CHAT_STATE_KEY, JSON.stringify(state));
        console.log('💾 聊天状态已保存');
    } catch (error) {
        console.error('保存聊天状态失败:', error);
    }
}

// 从 sessionStorage 恢复聊天状态
function loadChatState() {
    try {
        const stateJSON = sessionStorage.getItem(CHAT_STATE_KEY);
        if (!stateJSON) {
            console.log('📭 无保存的聊天状态');
            return;
        }

        const state = JSON.parse(stateJSON);
        console.log('📂 正在恢复聊天状态...');

        // 恢复当前问题
        if (state.currentQuestion && state.questionVisible) {
            const questionDisplay = document.getElementById('currentQuestionDisplay');
            const questionText = document.getElementById('currentQuestionText');
            if (questionDisplay && questionText) {
                questionText.textContent = state.currentQuestion;
                questionDisplay.style.display = 'block';
            }
        }

        // 恢复响应容器
        const responsesContainer = document.getElementById('modelsResponseContainer');
        if (responsesContainer && state.responsesHTML) {
            responsesContainer.innerHTML = state.responsesHTML;
        }

        // 恢复历史记录
        const historyContainer = document.getElementById('historyContainer');
        const chatHistory = document.getElementById('chatHistory');
        if (historyContainer && state.historyHTML) {
            historyContainer.innerHTML = state.historyHTML;
            if (chatHistory && state.historyVisible) {
                chatHistory.style.display = 'block';
            }
        }

        // 恢复模型状态
        if (state.modelStates) {
            Object.keys(state.modelStates).forEach(modelId => {
                const modelState = state.modelStates[modelId];
                updateModelStatus(modelId, modelState.status, modelState.text);
            });
        }

        console.log('✅ 聊天状态恢复完成');
    } catch (error) {
        console.error('恢复聊天状态失败:', error);
    }
}

// 清除保存的聊天状态
function clearChatState() {
    sessionStorage.removeItem(CHAT_STATE_KEY);
    console.log('🗑️ 聊天状态已清除');
}
