"""
画室功能服务模块
处理图片展示相关的 API
"""

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel
import requests
import json
import os
from typing import List, Dict, Any

# 创建路由
router = APIRouter(prefix="/api/gallery", tags=["gallery"])

# Alist OSS 配置
ALIST_BASE_URL = "https://oss.asunny.art"
ALIST_API_URL = f"{ALIST_BASE_URL}/api/fs/list"

class GalleryListRequest(BaseModel):
    """图片列表请求模型"""
    path: str

@router.post("/list")
async def get_gallery_list(request: GalleryListRequest):
    """
    代理 Alist API 获取文件列表
    """
    try:
        # 调用 Alist API
        response = requests.post(
            ALIST_API_URL,
            json={"path": request.path, "password": "", "page": 1, "per_page": 0},
            headers={"Content-Type": "application/json"},
            timeout=10
        )

        # 返回响应
        if response.status_code == 200:
            return response.json()
        else:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Alist API 返回错误: {response.text}"
            )

    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=f"请求 Alist API 失败: {str(e)}"
        )

@router.get("/image")
async def get_image(path: str):
    """
    代理获取图片内容 - 使用Alist的get接口
    """
    try:
        # 先获取文件信息以获得sign
        get_api_url = f"{ALIST_BASE_URL}/api/fs/get"

        # 请求文件信息
        info_response = requests.post(
            get_api_url,
            json={"path": path},
            headers={"Content-Type": "application/json"},
            timeout=10
        )

        if info_response.status_code != 200:
            raise HTTPException(
                status_code=info_response.status_code,
                detail="获取文件信息失败"
            )

        info_data = info_response.json()

        if info_data.get("code") != 200:
            raise HTTPException(
                status_code=500,
                detail=f"获取文件信息失败: {info_data.get('message', '未知错误')}"
            )

        # 获取文件的raw_url
        file_info = info_data.get("data", {})
        raw_url = file_info.get("raw_url")
        sign = file_info.get("sign", "")

        if not raw_url:
            # 如果没有raw_url，尝试构造URL
            raw_url = f"{ALIST_BASE_URL}/d{path}"
            if sign:
                raw_url += f"?sign={sign}"

        # 获取图片内容
        response = requests.get(raw_url, timeout=30, stream=True)

        if response.status_code == 200:
            # 获取内容类型
            content_type = response.headers.get('content-type', 'image/jpeg')

            # 返回图片
            return Response(
                content=response.content,
                media_type=content_type,
                headers={
                    "Cache-Control": "public, max-age=31536000",
                    "Access-Control-Allow-Origin": "*"
                }
            )
        else:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"获取图片失败: HTTP {response.status_code}"
            )

    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取图片失败: {str(e)}"
        )

@router.get("/download")
async def download_image(path: str):
    """
    代理下载图片 - 使用Alist的get接口
    """
    try:
        # 先获取文件信息以获得sign
        get_api_url = f"{ALIST_BASE_URL}/api/fs/get"

        # 请求文件信息
        info_response = requests.post(
            get_api_url,
            json={"path": path},
            headers={"Content-Type": "application/json"},
            timeout=10
        )

        if info_response.status_code != 200:
            raise HTTPException(
                status_code=info_response.status_code,
                detail="获取文件信息失败"
            )

        info_data = info_response.json()

        if info_data.get("code") != 200:
            raise HTTPException(
                status_code=500,
                detail=f"获取文件信息失败: {info_data.get('message', '未知错误')}"
            )

        # 获取文件的raw_url
        file_info = info_data.get("data", {})
        raw_url = file_info.get("raw_url")
        sign = file_info.get("sign", "")

        if not raw_url:
            # 如果没有raw_url，尝试构造URL
            raw_url = f"{ALIST_BASE_URL}/d{path}"
            if sign:
                raw_url += f"?sign={sign}"

        # 获取图片内容
        response = requests.get(raw_url, timeout=30, stream=True)

        if response.status_code == 200:
            # 获取文件名
            filename = os.path.basename(path)

            # 获取内容类型
            content_type = response.headers.get('content-type', 'application/octet-stream')

            # 返回图片
            return Response(
                content=response.content,
                media_type=content_type,
                headers={
                    "Content-Disposition": f'attachment; filename="{filename}"',
                    "Access-Control-Allow-Origin": "*"
                }
            )
        else:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"下载图片失败: HTTP {response.status_code}"
            )

    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=f"下载图片失败: {str(e)}"
        )

# 健康检查
@router.get("/status")
async def gallery_status():
    """
    检查画室服务状态
    """
    try:
        # 测试 Alist API 连接
        response = requests.post(
            ALIST_API_URL,
            json={"path": "/", "password": "", "page": 1, "per_page": 1},
            headers={"Content-Type": "application/json"},
            timeout=5
        )

        if response.status_code == 200:
            return {
                "status": "ok",
                "service": "gallery",
                "alist_api": "connected",
                "message": "画室服务正常运行"
            }
        else:
            return {
                "status": "warning",
                "service": "gallery",
                "alist_api": "error",
                "message": f"Alist API 返回错误: {response.status_code}"
            }

    except Exception as e:
        return {
            "status": "error",
            "service": "gallery",
            "alist_api": "disconnected",
            "message": f"无法连接到 Alist API: {str(e)}"
        }