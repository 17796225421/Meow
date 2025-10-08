"""
AI小垚 - 主入口文件
整合 TTS 语音生成和录播回放功能
"""

from fastapi import FastAPI, Request, Response
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import subprocess
import time
import sys
import requests

# 导入服务模块
from tts_service import router as tts_router, get_outputs_dir
from recording_service import router as recording_router, get_recordings_dir
from emotion_config import MODEL_CONFIG, EMOTION_CONFIGS, GPT_SOVITS_DIR

# 创建 FastAPI 应用
app = FastAPI(title="AI小垚平台", version="1.0.0")

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
outputs_dir = get_outputs_dir()
recordings_dir = get_recordings_dir()

# 挂载静态文件
app.mount('/static', StaticFiles(directory=static_dir), name='static')
app.mount('/outputs', StaticFiles(directory=outputs_dir), name='outputs')
app.mount('/recordings', StaticFiles(directory=recordings_dir), name='recordings')

# 注册路由
app.include_router(tts_router)
app.include_router(recording_router)

# GPT-SoVITS API 进程
gpt_sovits_process = None
GPT_SOVITS_API_URL = "http://127.0.0.1:9880"

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
    print("🎤 AI小垚平台正在启动...")
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
    print("🎤 语音生成 & 📹 录播回放 已就绪")
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

@app.get("/", response_class=HTMLResponse)
async def root(request: Request, response: Response):
    """主页面"""
    index_path = os.path.join(static_dir, 'index.html')
    if os.path.exists(index_path):
        with open(index_path, 'r', encoding='utf-8') as f:
            return HTMLResponse(f.read())
    else:
        return HTMLResponse('<h3>页面文件未找到</h3>')

if __name__ == "__main__":
    import uvicorn

    # 确保输出目录存在
    os.makedirs(outputs_dir, exist_ok=True)

    uvicorn.run(app, host="0.0.0.0", port=3000)
