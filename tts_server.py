"""
TTS Web 服务器 - FastAPI 后端
极简用户界面，用户只需输入文本和选择情感
"""

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import os
import json
from datetime import datetime
from typing import Optional, Dict
import subprocess
import time
import sys
import uuid

# 导入情感配置
from emotion_config import EMOTION_CONFIGS, MODEL_CONFIG, DEFAULT_PARAMS, GPT_SOVITS_DIR

app = FastAPI(title="AI 语音生成器", version="1.0.0")

# CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静态文件目录
static_dir = os.path.join(os.path.dirname(__file__), 'static')
outputs_dir = os.path.join(os.path.dirname(__file__), 'outputs')

# 挂载静态文件
app.mount('/static', StaticFiles(directory=static_dir), name='static')
app.mount('/outputs', StaticFiles(directory=outputs_dir), name='outputs')

# GPT-SoVITS API 配置
GPT_SOVITS_API_URL = "http://127.0.0.1:9880"
gpt_sovits_process = None

# 用户历史记录存储 {session_id: [filename1, filename2, ...]}
user_history: Dict[str, list] = {}

# 数据模型
class GenerateRequest(BaseModel):
    text: str
    emotion: str = "平静"

class EmotionInfo(BaseModel):
    name: str
    emoji: str
    description: str

def kill_port_process(port=9880):
    """杀掉占用指定端口的进程"""
    try:
        print(f"🔍 检查端口 {port} 占用情况...")
        result = subprocess.run(['netstat', '-ano'], capture_output=True, text=True, encoding='gbk')
        lines = result.stdout.split('\n')

        for line in lines:
            if f':{port}' in line and 'LISTENING' in line:
                parts = line.split()
                if len(parts) >= 5:
                    pid = parts[-1]
                    try:
                        print(f"⚠️  发现占用端口 {port} 的进程 PID: {pid}")
                        subprocess.run(['taskkill', '/F', '/PID', pid], capture_output=True)
                        print(f"✅ 已终止进程 {pid}")
                        time.sleep(1)
                    except Exception as e:
                        print(f"❌ 终止进程 {pid} 失败: {e}")
    except Exception as e:
        print(f"⚠️  检查端口时出错: {e}")

@app.on_event("startup")
async def startup_event():
    """启动时自动启动 GPT-SoVITS API"""
    global gpt_sovits_process

    print("\n" + "="*60)
    print("🎤 AI 语音生成器正在启动...")
    print("="*60)

    # 检查模型文件是否存在
    if not os.path.exists(MODEL_CONFIG["gpt_model"]):
        print(f"❌ 错误: GPT 模型文件不存在: {MODEL_CONFIG['gpt_model']}")
        return

    if not os.path.exists(MODEL_CONFIG["sovits_model"]):
        print(f"❌ 错误: SoVITS 模型文件不存在: {MODEL_CONFIG['sovits_model']}")
        return

    # 杀掉占用 9880 端口的进程
    kill_port_process(9880)

    # 启动 GPT-SoVITS API 服务
    try:
        print("\n📡 正在启动 GPT-SoVITS API 服务...")

        python_exe = os.path.join(GPT_SOVITS_DIR, "runtime", "python.exe")
        api_script = os.path.join(GPT_SOVITS_DIR, "api.py")

        # 使用第一个情感的参考音频作为默认
        default_emotion = list(EMOTION_CONFIGS.values())[0]

        cmd = [
            python_exe,
            api_script,
            "-s", MODEL_CONFIG["sovits_model"],
            "-g", MODEL_CONFIG["gpt_model"],
            "-dr", default_emotion["ref_audio"],
            "-dt", default_emotion["ref_text"],
            "-dl", "zh",
            "-p", "9880"
        ]

        # 不使用 CREATE_NO_WINDOW，让输出显示
        gpt_sovits_process = subprocess.Popen(
            cmd,
            cwd=GPT_SOVITS_DIR,
            text=True,
            encoding='utf-8',
            errors='ignore'
        )

        print("⏳ 等待 API 服务启动（约15秒）...")
        print(f"   提示：如果启动失败，请查看上方的错误信息")

        # 等待并检查 API 是否启动
        max_attempts = 15
        api_ready = False
        for i in range(max_attempts):
            time.sleep(1)
            try:
                # 使用 POST 请求测试，传入测试参数
                test_params = {
                    "text": "测试",
                    "text_language": "zh"
                }
                response = requests.post(f"{GPT_SOVITS_API_URL}/", json=test_params, timeout=2)
                # 只要能连接上就算成功（即使返回错误也说明API在运行）
                if response.status_code in [200, 400, 500]:
                    print("✅ GPT-SoVITS API 服务启动成功!")
                    api_ready = True
                    break
            except requests.exceptions.ConnectionError:
                if i < max_attempts - 1:
                    print(f"   等待中... ({i+1}/{max_attempts})")
            except Exception as e:
                # 其他错误也可能说明API已经启动
                print("✅ GPT-SoVITS API 服务启动成功!")
                api_ready = True
                break

        if not api_ready:
            print("⚠️  API 启动超时，但服务器将继续运行")
            print("   如果生成失败，请手动检查 GPT-SoVITS 配置")

    except Exception as e:
        print(f"❌ 启动 GPT-SoVITS API 失败: {e}")

    print("\n" + "="*60)
    print("🎉 服务器启动完成!")
    print("📝 本地访问: http://localhost:3000")
    print("="*60 + "\n")

@app.on_event("shutdown")
async def shutdown_event():
    """关闭时停止 GPT-SoVITS API"""
    global gpt_sovits_process
    if gpt_sovits_process:
        print("\n🛑 正在关闭 GPT-SoVITS API 服务...")
        gpt_sovits_process.terminate()
        gpt_sovits_process.wait()
        print("✅ 服务已关闭")

def get_or_create_session(request: Request, response: Response) -> str:
    """获取或创建会话ID"""
    session_id = request.cookies.get("session_id")
    if not session_id:
        session_id = str(uuid.uuid4())
        response.set_cookie(key="session_id", value=session_id, max_age=86400*30)  # 30天
    return session_id

@app.get("/", response_class=HTMLResponse)
async def root(request: Request, response: Response):
    """主页面"""
    # 确保用户有会话ID
    get_or_create_session(request, response)

    index_path = os.path.join(static_dir, 'index.html')
    if os.path.exists(index_path):
        with open(index_path, 'r', encoding='utf-8') as f:
            return HTMLResponse(f.read())
    else:
        return HTMLResponse('<h3>页面文件未找到</h3>')

@app.get("/api/emotions")
async def get_emotions():
    """获取所有可用的情感风格"""
    emotions = []
    for key, config in EMOTION_CONFIGS.items():
        emotions.append({
            "key": key,
            "name": config["name"],
            "emoji": config["emoji"],
            "description": config["description"]
        })

    return {
        "success": True,
        "data": emotions
    }

@app.post("/api/generate")
async def generate_speech(request: GenerateRequest, req: Request, response: Response):
    """生成语音"""
    # 获取会话ID
    session_id = get_or_create_session(req, response)

    try:
        # 验证情感类型
        if request.emotion not in EMOTION_CONFIGS:
            raise HTTPException(status_code=400, detail="无效的情感类型")

        # 验证文本
        if not request.text or len(request.text.strip()) == 0:
            raise HTTPException(status_code=400, detail="文本不能为空")

        if len(request.text) > 500:
            raise HTTPException(status_code=400, detail="文本长度不能超过500字")

        # 获取情感配置
        emotion_config = EMOTION_CONFIGS[request.emotion]

        # 准备请求参数
        params = {
            "text": request.text,
            "text_language": "zh",
            "refer_wav_path": emotion_config["ref_audio"],
            "prompt_text": emotion_config["ref_text"],
            "prompt_language": "zh",
            "top_k": emotion_config["top_k"],
            "top_p": emotion_config["top_p"],
            "temperature": emotion_config["temperature"],
            "speed": emotion_config["speed"]
        }

        # 调用 GPT-SoVITS API
        print(f"\n🎵 正在生成语音...")
        print(f"📝 文本: {request.text[:50]}...")
        print(f"😊 情感: {emotion_config['name']}")

        response = requests.get(
            f"{GPT_SOVITS_API_URL}/",
            params=params,
            timeout=60
        )

        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="语音生成失败")

        # 保存生成的音频
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"tts_{timestamp}.wav"
        filepath = os.path.join(outputs_dir, filename)

        with open(filepath, 'wb') as f:
            f.write(response.content)

        print(f"✅ 语音生成成功: {filename}")

        # 将文件名添加到用户历史记录
        if session_id not in user_history:
            user_history[session_id] = []
        user_history[session_id].insert(0, filename)  # 插入到开头
        # 只保留最近10条
        user_history[session_id] = user_history[session_id][:10]

        return {
            "success": True,
            "data": {
                "audio_url": f"/outputs/{filename}",
                "filename": filename,
                "text": request.text,
                "emotion": emotion_config["name"],
                "timestamp": timestamp
            }
        }

    except requests.exceptions.RequestException as e:
        print(f"❌ API 调用失败: {e}")
        raise HTTPException(status_code=503, detail="语音服务暂时不可用，请稍后重试")
    except Exception as e:
        print(f"❌ 生成失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history")
async def get_history(request: Request, response: Response):
    """获取当前用户的历史生成记录"""
    # 获取会话ID
    session_id = get_or_create_session(request, response)

    try:
        files = []

        # 获取该用户的历史记录
        user_files = user_history.get(session_id, [])

        for filename in user_files:
            filepath = os.path.join(outputs_dir, filename)
            # 检查文件是否还存在
            if os.path.exists(filepath):
                stat = os.stat(filepath)
                files.append({
                    "filename": filename,
                    "url": f"/outputs/{filename}",
                    "size": stat.st_size,
                    "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat()
                })

        return {
            "success": True,
            "data": files
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/status")
async def get_status():
    """检查服务状态"""
    try:
        # 检查 GPT-SoVITS API 是否在线
        response = requests.get(f"{GPT_SOVITS_API_URL}/", timeout=5)
        api_online = response.status_code == 200 or response.status_code == 400
    except:
        api_online = False

    return {
        "success": True,
        "data": {
            "api_online": api_online,
            "emotions_count": len(EMOTION_CONFIGS)
        }
    }

if __name__ == "__main__":
    import uvicorn

    # 确保输出目录存在
    os.makedirs(outputs_dir, exist_ok=True)

    uvicorn.run(app, host="0.0.0.0", port=3000)
