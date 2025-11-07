"""
画室功能服务模块
处理图片展示相关的 API
"""

from fastapi import APIRouter, HTTPException, Response, BackgroundTasks
from pydantic import BaseModel
import requests
import json
import os
import asyncio
import aiohttp
import aiofiles
from pathlib import Path
from typing import List, Dict, Any
import hashlib
from datetime import datetime

# 创建路由
router = APIRouter(prefix="/api/gallery", tags=["gallery"])

# Alist OSS 配置
ALIST_BASE_URL = "http://8.135.33.2"
ALIST_API_URL = f"{ALIST_BASE_URL}/api/fs/list"

# 本地缓存目录
GALLERY_CACHE_DIR = Path(__file__).parent / "static" / "gallery"
GALLERY_CACHE_DIR.mkdir(parents=True, exist_ok=True)

# 同步状态
sync_status = {
    "is_syncing": False,
    "progress": 0,
    "total": 0,
    "message": "未开始同步"
}

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

# 获取本地缓存的文件列表
@router.get("/local-list")
async def get_local_gallery_list():
    """
    获取本地缓存的所有图片列表（按文件夹分组）
    """
    folders = {}
    total_count = 0

    # 遍历gallery目录，按文件夹分组
    for root, dirs, files in os.walk(GALLERY_CACHE_DIR):
        # 获取相对路径作为文件夹名
        relative_root = Path(root).relative_to(GALLERY_CACHE_DIR)
        folder_name = str(relative_root).replace('\\', '/')

        # 跳过根目录的文件
        if folder_name == '.':
            continue

        # 如果是子文件夹，获取顶级文件夹名
        folder_parts = folder_name.split('/')
        top_folder = folder_parts[0]

        # 初始化文件夹数据
        if top_folder not in folders:
            folders[top_folder] = {
                "name": top_folder,
                "count": 0,
                "preview_images": [],
                "all_images": []
            }

        # 收集该文件夹中的图片
        for file in files:
            # 检查是否为图片文件
            if file.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp')):
                file_path = Path(root) / file
                relative_path = file_path.relative_to(GALLERY_CACHE_DIR)

                # 获取文件信息
                stat = file_path.stat()

                image_info = {
                    "name": file,
                    "path": str(relative_path).replace('\\', '/'),
                    "size": stat.st_size,
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "url": f"/static/gallery/{str(relative_path).replace(os.sep, '/')}",
                    "downloadUrl": f"/static/gallery/{str(relative_path).replace(os.sep, '/')}"
                }

                folders[top_folder]["all_images"].append(image_info)
                folders[top_folder]["count"] += 1
                total_count += 1

                # 只取前4张作为预览
                if len(folders[top_folder]["preview_images"]) < 4:
                    folders[top_folder]["preview_images"].append(image_info["url"])

    # 转换为列表并按文件夹名排序
    folder_list = list(folders.values())
    folder_list.sort(key=lambda x: x["name"])

    return {
        "status": "ok",
        "total_count": total_count,
        "folder_count": len(folder_list),
        "folders": folder_list
    }

# 异步下载文件
async def download_file(session: aiohttp.ClientSession, url: str, local_path: Path):
    """
    异步下载文件到本地
    """
    try:
        async with session.get(url) as response:
            if response.status == 200:
                # 确保目录存在
                local_path.parent.mkdir(parents=True, exist_ok=True)

                # 写入文件
                async with aiofiles.open(local_path, 'wb') as f:
                    async for chunk in response.content.iter_chunked(8192):
                        await f.write(chunk)
                return True
    except Exception as e:
        print(f"下载文件失败 {url}: {e}")
    return False

# 递归获取远程文件列表
async def get_remote_files(session: aiohttp.ClientSession, path: str, base_path: str = "") -> List[Dict]:
    """
    递归获取远程所有文件信息
    """
    files = []

    try:
        async with session.post(
            ALIST_API_URL,
            json={"path": path, "password": "", "page": 1, "per_page": 0},
            headers={"Content-Type": "application/json"}
        ) as response:
            if response.status == 200:
                data = await response.json()

                if data.get("code") == 200:
                    # 确保 items 不是 None
                    items = data.get("data", {}).get("content")
                    if items is None:
                        items = []

                    for item in items:
                        if item.get("is_dir"):
                            # 递归处理子文件夹
                            sub_path = f"{path}/{item['name']}"
                            sub_base = f"{base_path}/{item['name']}" if base_path else item['name']
                            sub_files = await get_remote_files(session, sub_path, sub_base)
                            files.extend(sub_files)
                        else:
                            # 检查是否为图片
                            name = item['name'].lower()
                            if name.endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp')):
                                relative_path = f"{base_path}/{item['name']}" if base_path else item['name']
                                files.append({
                                    "name": item['name'],
                                    "path": relative_path,
                                    "size": item.get('size', 0),
                                    "remote_path": f"{path}/{item['name']}"
                                })
    except Exception as e:
        print(f"获取远程文件列表失败 {path}: {e}")

    return files

# 执行同步任务
async def sync_gallery_task():
    """
    执行画室图片同步任务
    """
    global sync_status

    try:
        sync_status["is_syncing"] = True
        sync_status["message"] = "开始同步..."

        async with aiohttp.ClientSession() as session:
            # 1. 获取远程文件列表
            sync_status["message"] = "获取远程文件列表..."
            remote_files = await get_remote_files(session, "/asunny0/画栈/小垚的世界")

            # 2. 获取本地文件列表
            local_files = {}
            for root, dirs, files in os.walk(GALLERY_CACHE_DIR):
                for file in files:
                    file_path = Path(root) / file
                    relative_path = file_path.relative_to(GALLERY_CACHE_DIR)
                    stat = file_path.stat()
                    local_files[str(relative_path).replace('\\', '/')] = {
                        "path": file_path,
                        "size": stat.st_size
                    }

            # 3. 比较差异
            to_download = []
            to_delete = []

            # 检查需要下载或更新的文件
            for remote_file in remote_files:
                local_key = remote_file['path']

                if local_key in local_files:
                    # 比较大小
                    if remote_file['size'] != local_files[local_key]['size']:
                        # 大小不同，需要重新下载
                        to_delete.append(local_files[local_key]['path'])
                        to_download.append(remote_file)
                else:
                    # 本地不存在，需要下载
                    to_download.append(remote_file)

            # 检查需要删除的文件（本地有但远程没有）
            remote_paths = {f['path'] for f in remote_files}
            for local_path, local_info in local_files.items():
                if local_path not in remote_paths:
                    to_delete.append(local_info['path'])

            sync_status["total"] = len(to_download) + len(to_delete)
            sync_status["progress"] = 0

            # 4. 删除旧文件
            for file_path in to_delete:
                try:
                    file_path.unlink()
                    sync_status["progress"] += 1
                    sync_status["message"] = f"删除文件: {file_path.name}"
                except Exception as e:
                    print(f"删除文件失败 {file_path}: {e}")

            # 5. 下载新文件
            for remote_file in to_download:
                try:
                    # 获取文件信息和下载URL
                    get_api_url = f"{ALIST_BASE_URL}/api/fs/get"

                    async with session.post(
                        get_api_url,
                        json={"path": remote_file['remote_path']},
                        headers={"Content-Type": "application/json"}
                    ) as response:
                        if response.status == 200:
                            data = await response.json()
                            if data.get("code") == 200:
                                file_info = data.get("data", {})
                                raw_url = file_info.get("raw_url")
                                sign = file_info.get("sign", "")

                                if not raw_url:
                                    raw_url = f"{ALIST_BASE_URL}/d{remote_file['remote_path']}"
                                    if sign:
                                        raw_url += f"?sign={sign}"

                                # 下载文件
                                local_path = GALLERY_CACHE_DIR / remote_file['path']
                                await download_file(session, raw_url, local_path)

                                sync_status["progress"] += 1
                                sync_status["message"] = f"下载: {remote_file['name']}"
                except Exception as e:
                    print(f"下载文件失败 {remote_file['name']}: {e}")
                    sync_status["progress"] += 1

            sync_status["message"] = "同步完成"

    except Exception as e:
        sync_status["message"] = f"同步失败: {str(e)}"
        print(f"同步任务失败: {e}")
    finally:
        sync_status["is_syncing"] = False

# 触发同步
@router.post("/sync")
async def trigger_sync(background_tasks: BackgroundTasks):
    """
    触发画室图片同步（异步执行）
    """
    if sync_status["is_syncing"]:
        return {
            "status": "already_syncing",
            "message": "同步任务正在进行中"
        }

    # 添加到后台任务
    background_tasks.add_task(sync_gallery_task)

    return {
        "status": "started",
        "message": "同步任务已启动"
    }

# 获取同步状态
@router.get("/sync-status")
async def get_sync_status():
    """
    获取当前同步状态
    """
    return sync_status