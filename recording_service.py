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
    """获取录播列表"""
    try:
        recordings = []

        if os.path.exists(RECORDINGS_DIR):
            for filename in os.listdir(RECORDINGS_DIR):
                # 只处理视频文件
                if filename.endswith(('.mp4', '.ts', '.flv')):
                    filepath = os.path.join(RECORDINGS_DIR, filename)
                    stat = os.stat(filepath)

                    # 解析文件名获取日期时间
                    # 格式: SL_林木垚Meow_2025-10-08_15-02-38.mp4
                    try:
                        parts = filename.replace('.mp4', '').replace('.ts', '').replace('.flv', '').split('_')
                        if len(parts) >= 3:
                            date_str = parts[-2]  # 2025-10-08
                            time_str = parts[-1]  # 15-02-38
                            datetime_str = f"{date_str} {time_str.replace('-', ':')}"
                        else:
                            datetime_str = ""
                    except:
                        datetime_str = ""

                    recordings.append({
                        "filename": filename,
                        "url": f"/recordings/{filename}",
                        "size": stat.st_size,
                        "size_mb": round(stat.st_size / 1024 / 1024, 2),
                        "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                        "date": datetime_str
                    })

        # 按创建时间倒序排序
        recordings.sort(key=lambda x: x["created_at"], reverse=True)

        return {
            "success": True,
            "data": recordings
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def get_recordings_dir():
    """获取录播目录路径（供main.py挂载使用）"""
    return RECORDINGS_DIR
