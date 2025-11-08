/**
 * 唯美雪景水晶球 - Canvas粒子动画
 * 梦幻粉白配色，球形边界，多层景深
 */

class CrystalBallSnow {
    constructor() {
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.snowflakes = [];
        this.animationId = null;

        // 水晶球参数
        this.ballRadius = 75; // 球体半径
        this.centerX = 90;    // 球心X坐标
        this.centerY = 85;    // 球心Y坐标

        // 雪花数量
        this.snowflakeCount = 200;

        // 鼠标交互
        this.mouseX = 0;
        this.mouseY = 0;
        this.isHovered = false;

        // 中央旋转图片
        this.centerImages = [];
        this.currentImageIndex = 0;
        this.rotation = 0;
        this.rotationSpeed = 0.01; // 旋转速度（弧度/帧）
        this.lastRotationCheck = 0;
        this.imagesLoaded = false;
    }

    init() {
        // 创建容器
        this.container = document.querySelector('.crystal-ball-container');
        if (!this.container) {
            console.error('水晶球容器未找到');
            return;
        }

        // 创建Canvas
        this.canvas = document.getElementById('crystalBallCanvas');
        if (!this.canvas) {
            console.error('水晶球Canvas未找到');
            return;
        }

        this.ctx = this.canvas.getContext('2d');
        console.log('水晶球初始化成功，雪花数量:', this.snowflakeCount);

        // 设置Canvas尺寸（高分辨率）
        const scale = window.devicePixelRatio || 1;
        this.canvas.width = 180 * scale;
        this.canvas.height = 170 * scale;
        this.canvas.style.width = '180px';
        this.canvas.style.height = '170px';
        this.ctx.scale(scale, scale);

        // 初始化雪花
        this.createSnowflakes();

        // 加载中央图片
        this.loadCenterImages();

        // 绑定事件
        this.container.addEventListener('mouseenter', () => this.isHovered = true);
        this.container.addEventListener('mouseleave', () => this.isHovered = false);
        this.container.addEventListener('mousemove', (e) => {
            const rect = this.container.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });

        // 开始动画
        this.animate();
    }

    loadCenterImages() {
        // 获取static/ball文件夹下的所有图片
        const imageFiles = [
            '/static/ball/水星 (1).png',
            '/static/ball/水星 (3).jpg'
        ];

        let loadedCount = 0;

        imageFiles.forEach((src, index) => {
            const img = new Image();
            img.onload = () => {
                loadedCount++;
                console.log(`图片加载完成: ${src}`);
                if (loadedCount === imageFiles.length) {
                    this.imagesLoaded = true;
                    console.log('所有水晶球中央图片加载完成');
                }
            };
            img.onerror = () => {
                console.error(`图片加载失败: ${src}`);
                loadedCount++;
            };
            img.src = src;
            this.centerImages.push(img);
        });

        // 随机选择初始图片
        this.currentImageIndex = Math.floor(Math.random() * imageFiles.length);
    }

    createSnowflakes() {
        for (let i = 0; i < this.snowflakeCount; i++) {
            // 在球体内随机生成位置
            let x, y;
            do {
                x = Math.random() * (this.ballRadius * 2) - this.ballRadius;
                y = Math.random() * (this.ballRadius * 2) - this.ballRadius;
            } while (x * x + y * y > this.ballRadius * this.ballRadius);

            this.snowflakes.push({
                x: this.centerX + x,
                y: this.centerY + y,
                z: Math.random(), // 深度（0-1，用于大小和透明度）
                size: Math.random() * 3.5 + 1.5, // 增大雪花尺寸
                speedY: Math.random() * 0.5 + 0.2,
                speedX: (Math.random() - 0.5) * 0.3,
                swing: Math.random() * Math.PI * 2, // 摆动相位
                swingSpeed: Math.random() * 0.02 + 0.01,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.05,
                color: Math.random() > 0.3 ? 'white' : 'pink' // 70%白色，30%粉色
            });
        }
    }

    updateSnowflake(flake) {
        // 摆动效果
        flake.swing += flake.swingSpeed;
        const swingOffset = Math.sin(flake.swing) * 0.5;

        // 鼠标晃动效果
        if (this.isHovered) {
            const dx = (this.mouseX - flake.x) * 0.001;
            const dy = (this.mouseY - flake.y) * 0.001;
            flake.x -= dx * (1 - flake.z); // 近的雪花移动更明显
            flake.y -= dy * (1 - flake.z);
        }

        // 移动
        flake.y += flake.speedY * (1 - flake.z * 0.5); // 近的雪花下落更快
        flake.x += (flake.speedX + swingOffset);
        flake.rotation += flake.rotationSpeed;

        // 球形边界检测和重置
        let dx = flake.x - this.centerX;
        let dy = flake.y - this.centerY;
        let distanceSquared = dx * dx + dy * dy;

        // 如果超出球体或到达底部
        if (distanceSquared > this.ballRadius * this.ballRadius || flake.y > this.centerY + this.ballRadius) {
            // 重置到顶部
            let newX, newY;
            const topY = this.centerY - this.ballRadius + 5;
            do {
                newX = this.centerX + (Math.random() - 0.5) * this.ballRadius * 1.5;
                newY = topY;
                dx = newX - this.centerX;
                dy = newY - this.centerY;
                distanceSquared = dx * dx + dy * dy;
            } while (distanceSquared > this.ballRadius * this.ballRadius);

            flake.x = newX;
            flake.y = newY;
        }
    }

    drawSnowflake(flake) {
        this.ctx.save();
        this.ctx.translate(flake.x, flake.y);
        this.ctx.rotate(flake.rotation);

        // 根据深度调整大小和透明度
        const depth = flake.z;
        const size = flake.size * (0.5 + depth * 0.5);
        const alpha = 0.6 + depth * 0.4; // 提高最小透明度到0.6

        // 颜色
        if (flake.color === 'pink') {
            this.ctx.fillStyle = `rgba(255, 182, 193, ${alpha})`;
        } else {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        }

        // 绘制雪花（实心圆形，更明显）
        this.ctx.beginPath();
        this.ctx.arc(0, 0, size, 0, Math.PI * 2);
        this.ctx.fill();

        // 添加白色边框使其更明显
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
        this.ctx.lineWidth = 0.5;
        this.ctx.stroke();

        // 添加光晕效果（对于近处的大雪花）
        if (depth > 0.7 && size > 1.5) {
            this.ctx.beginPath();
            this.ctx.arc(0, 0, size * 1.5, 0, Math.PI * 2);
            const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.5);
            gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.3})`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
        }

        this.ctx.restore();
    }

    animate() {
        // 清空画布
        this.ctx.clearRect(0, 0, 180, 170);

        // 绘制中央旋转图片（在雪花之前，这样雪花在前面）
        this.drawCenterImage();

        // 更新旋转角度
        this.rotation += this.rotationSpeed;

        // 检查是否旋转了180度（π弧度）
        if (Math.floor(this.rotation / Math.PI) > this.lastRotationCheck) {
            this.lastRotationCheck = Math.floor(this.rotation / Math.PI);
            // 随机切换图片
            const oldIndex = this.currentImageIndex;
            do {
                this.currentImageIndex = Math.floor(Math.random() * this.centerImages.length);
            } while (this.currentImageIndex === oldIndex && this.centerImages.length > 1);
            console.log(`💫 水晶球图片切换: ${this.currentImageIndex + 1}`);
        }

        // 按深度排序（远的先画）
        this.snowflakes.sort((a, b) => a.z - b.z);

        // 更新和绘制雪花
        this.snowflakes.forEach(flake => {
            this.updateSnowflake(flake);
            this.drawSnowflake(flake);
        });

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    drawCenterImage() {
        if (!this.imagesLoaded || this.centerImages.length === 0) {
            return;
        }

        const img = this.centerImages[this.currentImageIndex];
        if (!img || !img.complete) {
            return;
        }

        this.ctx.save();

        // 移动到球心
        this.ctx.translate(this.centerX, this.centerY);

        // 计算横向旋转的缩放比例（模拟3D透视）
        // cos(rotation) 会让图片在旋转到侧面时变窄，模拟3D效果
        const scaleX = Math.cos(this.rotation);

        // 计算图片大小（适应球体，留出边距）
        const maxSize = this.ballRadius * 1.2; // 稍微比球体小一点
        const imgAspect = img.width / img.height;
        let drawWidth, drawHeight;

        if (imgAspect > 1) {
            // 宽图
            drawWidth = maxSize;
            drawHeight = maxSize / imgAspect;
        } else {
            // 高图或方图
            drawHeight = maxSize;
            drawWidth = maxSize * imgAspect;
        }

        // 应用横向缩放（模拟绕Y轴旋转）
        this.ctx.scale(scaleX, 1);

        // 根据旋转角度调整透明度（侧面时更透明）
        const alpha = 0.5 + Math.abs(scaleX) * 0.3; // 0.5-0.8之间
        this.ctx.globalAlpha = alpha;

        // 绘制图片（居中）
        this.ctx.drawImage(
            img,
            -drawWidth / 2,
            -drawHeight / 2,
            drawWidth,
            drawHeight
        );

        this.ctx.restore();
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
}

// 全局实例
let crystalBall = null;

// 页面加载后初始化
window.addEventListener('DOMContentLoaded', () => {
    crystalBall = new CrystalBallSnow();
    crystalBall.init();
});

// 导出用于控制
window.crystalBallSnow = crystalBall;
