"""
录播服务模块
负责处理直播录播的列表、文件信息等功能
"""

from fastapi import APIRouter, HTTPException
import os
from datetime import datetime

# 创建路由
router = APIRouter(prefix="/api", tags=["录播"])

# 录播目录
RECORDINGS_DIR = os.path.join(
    os.path.dirname(__file__),
    'DouyinLiveRecorder',
    'DouyinLiveRecorder_v4.0.6',
    'downloads',
    '抖音直播',
    'SL_林木垚Meow'
)

@router.get("/recordings")
async def get_recordings():
    """获取录播列表（包括视频和弹幕）"""
    try:
        recordings = []
        danmaku_files = []

        if os.path.exists(RECORDINGS_DIR):
            for filename in os.listdir(RECORDINGS_DIR):
                filepath = os.path.join(RECORDINGS_DIR, filename)

                # 跳过目录
                if os.path.isdir(filepath):
                    continue

                stat = os.stat(filepath)

                # 解析文件名获取真实录制时间
                # 格式1: SL_林木垚Meow_2025-10-08_15-02-38.mp4
                # 格式2: SL_林木垚Meow_2025-10-08_15-02-38_000.mp4（带序号）
                # 格式3: SL_林木垚Meow_2025-10-08_15-02-38.json（弹幕文件）
                try:
                    # 移除扩展名
                    name_without_ext = filename.rsplit('.', 1)[0]
                    parts = name_without_ext.split('_')

                    # 找到日期和时间部分
                    if len(parts) >= 4:
                        # 倒数第二个或第三个是日期
                        date_str = parts[-2] if not parts[-1].isdigit() else parts[-3]
                        time_str = parts[-1] if not parts[-1].isdigit() else parts[-2]

                        # 构造日期时间字符串
                        datetime_str = f"{date_str} {time_str.replace('-', ':')}"

                        # 解析为datetime对象，用于场次分组
                        try:
                            recorded_time = datetime.strptime(datetime_str, "%Y-%m-%d %H:%M:%S")
                            created_at = recorded_time.isoformat()
                        except:
                            # 解析失败，使用文件创建时间
                            created_at = datetime.fromtimestamp(stat.st_ctime).isoformat()
                    else:
                        datetime_str = ""
                        created_at = datetime.fromtimestamp(stat.st_ctime).isoformat()
                except:
                    datetime_str = ""
                    created_at = datetime.fromtimestamp(stat.st_ctime).isoformat()

                # 处理视频文件
                if filename.endswith(('.mp4', '.ts', '.flv')):
                    recordings.append({
                        "filename": filename,
                        "url": f"/recordings/{filename}",
                        "size": stat.st_size,
                        "size_mb": round(stat.st_size / 1024 / 1024, 2),
                        "created_at": created_at,  # 使用录制时间而非文件创建时间
                        "date": datetime_str
                    })

                # 处理弹幕JSON文件
                elif filename.endswith('.json'):
                    danmaku_files.append({
                        "filename": filename,
                        "url": f"/recordings/{filename}",
                        "size": stat.st_size,
                        "size_mb": round(stat.st_size / 1024 / 1024, 2),
                        "created_at": created_at,
                        "date": datetime_str
                    })

        # 按创建时间倒序排序
        recordings.sort(key=lambda x: x["created_at"], reverse=True)
        danmaku_files.sort(key=lambda x: x["created_at"], reverse=True)

        return {
            "success": True,
            "data": {
                "videos": recordings,
                "danmaku": danmaku_files
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def get_recordings_dir():
    """获取录播目录路径（供main.py挂载使用）"""
    return RECORDINGS_DIR
