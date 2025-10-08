"""
情感配置文件
为每个情感风格配置对应的参考音频和参数
"""

import os

# GPT-SoVITS 项目根目录
GPT_SOVITS_DIR = os.path.join(os.path.dirname(__file__), "GPT-SoVITS-v2pro-20250604-nvidia50")

# 模型路径配置
MODEL_CONFIG = {
    "gpt_model": os.path.join(GPT_SOVITS_DIR, "GPT_weights_v2ProPlus/xxx-e15.ckpt"),
    "sovits_model": os.path.join(GPT_SOVITS_DIR, "SoVITS_weights_v2ProPlus/xxx_e8_s168.pth"),
}

# 情感风格配置（每个情感对应不同的参考音频和参数）
EMOTION_CONFIGS = {
    "平静": {
        "name": "平静",
        "emoji": "😌",
        "description": "平和、自然的语调",
        "ref_audio": os.path.join(GPT_SOVITS_DIR, "logs/xxx/5-wav32k/vocal_SL_林木垚Meow_2025-10-04_15-02-58_000.mp4.reformatted.wav_10.flac_0000003200_0000148480.wav"),
        "ref_text": "恩恩,听我的声音有什么?",
        "speed": 1.0,
        "temperature": 0.8,
        "top_k": 10,
        "top_p": 0.8
    },
    "开朗": {
        "name": "开朗",
        "emoji": "😄",
        "description": "欢快、活泼的语调",
        "ref_audio": os.path.join(GPT_SOVITS_DIR, "logs/xxx/5-wav32k/vocal_SL_林木垚Meow_2025-10-04_15-02-58_000.mp4.reformatted.wav_10.flac_0008278400_0008396480.wav"),
        "ref_text": "谢谢,太好了.",
        "speed": 1.05,
        "temperature": 1.0,
        "top_k": 15,
        "top_p": 0.85
    },
    "兴奋": {
        "name": "兴奋",
        "emoji": "🎉",
        "description": "激动、热情的语调",
        "ref_audio": os.path.join(GPT_SOVITS_DIR, "logs/xxx/5-wav32k/vocal_SL_林木垚Meow_2025-10-04_15-02-58_000.mp4.reformatted.wav_10.flac_0006549120_0006633280.wav"),
        "ref_text": "好笑的事情来了.",
        "speed": 1.1,
        "temperature": 1.1,
        "top_k": 20,
        "top_p": 0.9
    },
    "温柔": {
        "name": "温柔",
        "emoji": "🌸",
        "description": "轻柔、温和的语调",
        "ref_audio": os.path.join(GPT_SOVITS_DIR, "logs/xxx/5-wav32k/vocal_SL_林木垚Meow_2025-10-04_15-02-58_000.mp4.reformatted.wav_10.flac_0005571200_0005706880.wav"),
        "ref_text": "谢谢小表情的灯牌,嘿嘿.",
        "speed": 0.95,
        "temperature": 0.7,
        "top_k": 8,
        "top_p": 0.75
    }
}

# 默认生成参数
DEFAULT_PARAMS = {
    "text_lang": "zh",
    "prompt_lang": "zh",
    "text_split_method": "cut5",
    "batch_size": 1,
    "media_type": "wav",
    "streaming_mode": False,
    "parallel_infer": True,
    "repetition_penalty": 1.35
}
