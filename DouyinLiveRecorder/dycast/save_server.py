#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
弹幕保存服务
接收前端发送的弹幕数据，保存到指定目录
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import json
import os
import logging

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 保存目录
SAVE_DIR = r"C:\Users\Administrator\Desktop\Meow\DouyinLiveRecorder\DouyinLiveRecorder_v4.0.6\downloads\抖音直播\SL_林木垚Meow"

# 主播名称
STREAMER_NAME = "SL_林木垚Meow"


@app.route('/api/save-danmaku', methods=['POST'])
def save_danmaku():
    """保存弹幕到文件"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({'success': False, 'message': '没有接收到数据'}), 400

        # 获取弹幕数据
        danmaku_list = data.get('danmaku', [])
        if not danmaku_list or len(danmaku_list) == 0:
            return jsonify({'success': False, 'message': '弹幕列表为空'}), 400

        # 获取开始时间，如果没有提供则使用当前时间
        start_time = data.get('startTime')
        if start_time:
            # 前端传来的是 ISO 格式时间戳
            dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        else:
            dt = datetime.now()

        # 生成文件名：SL_林木垚Meow_2025-10-04_15-02-58.json
        timestamp = dt.strftime('%Y-%m-%d_%H-%M-%S')
        filename = f"{STREAMER_NAME}_{timestamp}.json"

        # 确保目录存在
        os.makedirs(SAVE_DIR, exist_ok=True)

        # 完整文件路径
        filepath = os.path.join(SAVE_DIR, filename)

        # 保存到文件
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(danmaku_list, f, ensure_ascii=False, indent=2)

        logger.info(f"弹幕已保存: {filepath} (共 {len(danmaku_list)} 条)")

        return jsonify({
            'success': True,
            'message': '弹幕保存成功',
            'filename': filename,
            'filepath': filepath,
            'count': len(danmaku_list)
        })

    except Exception as e:
        logger.error(f"保存弹幕时出错: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': f'保存失败: {str(e)}'
        }), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查"""
    return jsonify({
        'status': 'ok',
        'save_dir': SAVE_DIR,
        'streamer': STREAMER_NAME
    })


if __name__ == '__main__':
    logger.info(f"弹幕保存服务启动")
    logger.info(f"保存目录: {SAVE_DIR}")
    logger.info(f"服务地址: http://localhost:5175")
    app.run(host='0.0.0.0', port=5175, debug=True)
