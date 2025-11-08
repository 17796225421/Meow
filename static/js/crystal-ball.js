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
        const dx = flake.x - this.centerX;
        const dy = flake.y - this.centerY;
        const distanceSquared = dx * dx + dy * dy;

        // 如果超出球体或到达底部
        if (distanceSquared > this.ballRadius * this.ballRadius || flake.y > this.centerY + this.ballRadius) {
            // 重置到顶部
            let newX, newY;
            const topY = this.centerY - this.ballRadius + 5;
            do {
                newX = this.centerX + (Math.random() - 0.5) * this.ballRadius * 1.5;
                newY = topY;
                const testDx = newX - this.centerX;
                const testDy = newY - this.centerY;
                distanceSquared = testDx * testDx + testDy * testDy;
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

        // 按深度排序（远的先画）
        this.snowflakes.sort((a, b) => a.z - b.z);

        // 更新和绘制雪花
        this.snowflakes.forEach(flake => {
            this.updateSnowflake(flake);
            this.drawSnowflake(flake);
        });

        this.animationId = requestAnimationFrame(() => this.animate());
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
