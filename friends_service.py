"""
好朋友多模型聊天 - 后端API转发服务
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import httpx
import logging
import json
import os

router = APIRouter()
logger = logging.getLogger(__name__)

# 配置文件路径
CONFIG_FILE = os.path.join(os.path.dirname(__file__), 'friends_models_config.json')

# 读取模型配置（支持热加载）
def load_models_config():
    """从JSON文件读取模型配置"""
    try:
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            config = json.load(f)
        logger.info(f"✅ 成功加载模型配置，共{len(config.get('models', []))}个模型")
        return config
    except FileNotFoundError:
        logger.error(f"❌ 配置文件不存在: {CONFIG_FILE}")
        return {"api": {}, "models": []}
    except json.JSONDecodeError as e:
        logger.error(f"❌ 配置文件JSON格式错误: {e}")
        return {"api": {}, "models": []}
    except Exception as e:
        logger.error(f"❌ 读取配置文件失败: {e}")
        return {"api": {}, "models": []}

# 请求模型
class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    model: str
    messages: List[Message]
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 2000

# 响应模型
class ChatResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

@router.get("/api/friends/models")
async def get_models_config():
    """获取模型配置（支持热加载）"""
    try:
        config = load_models_config()
        return {
            "success": True,
            "data": {
                "models": config.get("models", [])
            }
        }
    except Exception as e:
        logger.error(f"获取模型配置失败: {e}")
        return {
            "success": False,
            "error": str(e)
        }

@router.post("/api/friends/chat")
async def friends_chat(request: ChatRequest):
    """
    转发聊天请求到OpenAI兼容的API（异步并发）
    """
    try:
        # 读取配置（支持热加载）
        config = load_models_config()
        api_config = config.get("api", {})
        api_url = api_config.get("endpoint", "http://localhost:3001/v1/chat/completions")
        api_key = api_config.get("apiKey", "")

        # 准备请求数据
        payload = {
            "model": request.model,
            "messages": [{"role": msg.role, "content": msg.content} for msg in request.messages],
            "temperature": request.temperature,
            "max_tokens": request.max_tokens
        }

        # 准备请求头
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }

        # 转发请求（使用异步HTTP客户端）
        logger.info(f"转发请求到AI API: 模型={request.model}, URL={api_url}")

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                api_url,
                json=payload,
                headers=headers
            )

        # 检查响应状态
        if response.status_code != 200:
            error_msg = f"API返回错误: {response.status_code}"
            try:
                error_detail = response.json()
                error_msg += f" - {error_detail}"
            except:
                error_msg += f" - {response.text}"

            logger.error(error_msg)
            return ChatResponse(success=False, error=error_msg)

        # 返回成功响应
        result = response.json()
        logger.info(f"请求成功: 模型={request.model}")

        return ChatResponse(success=True, data=result)

    except httpx.TimeoutException:
        error_msg = "请求超时，请稍后重试"
        logger.error(error_msg)
        return ChatResponse(success=False, error=error_msg)

    except httpx.ConnectError:
        error_msg = "无法连接到AI服务，请检查服务是否运行"
        logger.error(error_msg)
        return ChatResponse(success=False, error=error_msg)

    except Exception as e:
        error_msg = f"服务器错误: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return ChatResponse(success=False, error=error_msg)
