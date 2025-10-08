"""
TTS 语音生成服务模块
负责处理语音生成、情感配置、用户历史等功能
"""

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel
import requests
import os
from datetime import datetime
from typing import Dict
import uuid

# 导入情感配置
from emotion_config import EMOTION_CONFIGS

# 创建路由
router = APIRouter(prefix="/api", tags=["TTS"])

# 输出目录
OUTPUTS_DIR = os.path.join(os.path.dirname(__file__), 'outputs')

# GPT-SoVITS API 配置
GPT_SOVITS_API_URL = "http://127.0.0.1:9880"

# 用户历史记录存储 {session_id: [filename1, filename2, ...]}
user_history: Dict[str, list] = {}

# 数据模型
class GenerateRequest(BaseModel):
    text: str
    emotion: str = "平静"

def get_or_create_session(request: Request, response: Response) -> str:
    """获取或创建会话ID"""
    session_id = request.cookies.get("session_id")
    if not session_id:
        session_id = str(uuid.uuid4())
        response.set_cookie(key="session_id", value=session_id, max_age=86400*30)  # 30天
    return session_id

@router.get("/emotions")
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

@router.post("/generate")
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

        response_api = requests.get(
            f"{GPT_SOVITS_API_URL}/",
            params=params,
            timeout=60
        )

        if response_api.status_code != 200:
            raise HTTPException(status_code=500, detail="语音生成失败")

        # 保存生成的音频
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"tts_{timestamp}.wav"
        filepath = os.path.join(OUTPUTS_DIR, filename)

        with open(filepath, 'wb') as f:
            f.write(response_api.content)

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

@router.get("/history")
async def get_history(request: Request, response: Response):
    """获取当前用户的历史生成记录"""
    # 获取会话ID
    session_id = get_or_create_session(request, response)

    try:
        files = []

        # 获取该用户的历史记录
        user_files = user_history.get(session_id, [])

        for filename in user_files:
            filepath = os.path.join(OUTPUTS_DIR, filename)
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

@router.get("/status")
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

def get_outputs_dir():
    """获取输出目录路径（供main.py挂载使用）"""
    return OUTPUTS_DIR
