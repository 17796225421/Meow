#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Dycast 启动脚本
同时启动前端 Vite 开发服务器和后端 Flask API 服务
"""

import subprocess
import sys
import os
import time
import threading
from pathlib import Path

# 获取当前脚本所在目录
SCRIPT_DIR = Path(__file__).parent.absolute()

# 保存服务文件路径
SAVE_SERVER_PATH = SCRIPT_DIR / "save_server.py"


def run_vite_dev():
    """启动 Vite 前端开发服务器"""
    print("=" * 60)
    print("正在启动前端开发服务器 (Vite)...")
    print("=" * 60)
    try:
        # 在 dycast 目录下运行 npm run dev
        process = subprocess.Popen(
            ["npm", "run", "dev"],
            cwd=SCRIPT_DIR,
            shell=True
        )
        process.wait()
    except KeyboardInterrupt:
        print("\n前端服务器已停止")
    except Exception as e:
        print(f"启动前端服务器失败: {e}")


def run_flask_api():
    """启动 Flask 后端 API 服务"""
    print("=" * 60)
    print("正在启动后端 API 服务 (Flask)...")
    print("=" * 60)
    time.sleep(2)  # 延迟 2 秒启动，避免输出混乱

    try:
        # 直接运行 save_server.py
        process = subprocess.Popen(
            [sys.executable, str(SAVE_SERVER_PATH)],
            shell=True
        )
        process.wait()
    except KeyboardInterrupt:
        print("\n后端 API 服务已停止")
    except Exception as e:
        print(f"启动后端 API 服务失败: {e}")


def main():
    """主函数"""
    print("\n" + "=" * 60)
    print("Dycast 弹幕抓取工具")
    print("=" * 60)
    print(f"工作目录: {SCRIPT_DIR}")
    print(f"Python: {sys.executable}")
    print("=" * 60)
    print("\n按 Ctrl+C 停止所有服务\n")

    # 检查 save_server.py 是否存在
    if not SAVE_SERVER_PATH.exists():
        print(f"错误: 找不到 {SAVE_SERVER_PATH}")
        sys.exit(1)

    # 创建线程启动两个服务
    vite_thread = threading.Thread(target=run_vite_dev, daemon=True)
    flask_thread = threading.Thread(target=run_flask_api, daemon=True)

    # 启动服务
    vite_thread.start()
    flask_thread.start()

    try:
        # 主线程保持运行
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n\n正在停止所有服务...")
        print("=" * 60)
        print("所有服务已停止")
        print("=" * 60)
        sys.exit(0)


if __name__ == "__main__":
    main()
