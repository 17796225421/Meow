/* 二次元樱花粒子特效系统 */

class SakuraParticleSystem {
    constructor(options = {}) {
        // 配置参数
        this.config = {
            particleCount: options.particleCount || 50, // 樱花数量
            minSize: options.minSize || 10,
            maxSize: options.maxSize || 20,
            minSpeed: options.minSpeed || 1,
            maxSpeed: options.maxSpeed || 3,
            colors: options.colors || ['#FFB7D5', '#FFC9E0', '#FFD6E8', '#E8B4D6', '#F8C8DC'], // 粉色系
            reduceOnMobile: options.reduceOnMobile !== false // 移动端减少粒子
        };

        // 初始化
        this.particles = [];
        this.animationId = null;
        this.canvas = null;
        this.ctx = null;

        this.init();
    }

    init() {
        // 创建Canvas
        this.createCanvas();

        // 调整移动端粒子数量
        if (this.config.reduceOnMobile && window.innerWidth < 768) {
            this.config.particleCount = Math.floor(this.config.particleCount * 0.4);
        }

        // 创建粒子
        this.createParticles();

        // 开始动画
        this.animate();

        // 监听窗口大小变化
        window.addEventListener('resize', () => this.handleResize());
    }

    createCanvas() {
        // 创建canvas元素
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'sakura-canvas';
        this.canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1;
        `;

        // 设置canvas尺寸
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        // 获取绘图上下文
        this.ctx = this.canvas.getContext('2d');

        // 添加到body
        document.body.insertBefore(this.canvas, document.body.firstChild);
    }

    createParticles() {
        this.particles = [];
        for (let i = 0; i < this.config.particleCount; i++) {
            this.particles.push(this.createParticle());
        }
    }

    createParticle() {
        return {
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height - this.canvas.height,
            size: this.randomRange(this.config.minSize, this.config.maxSize),
            speedY: this.randomRange(this.config.minSpeed, this.config.maxSpeed),
            speedX: this.randomRange(-0.5, 0.5),
            color: this.config.colors[Math.floor(Math.random() * this.config.colors.length)],
            rotation: Math.random() * 360,
            rotationSpeed: this.randomRange(-2, 2),
            opacity: this.randomRange(0.4, 0.9),
            swing: Math.random() * Math.PI * 2, // 摆动相位
            swingSpeed: this.randomRange(0.01, 0.03) // 摆动速度
        };
    }

    randomRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    updateParticle(particle) {
        // 更新位置
        particle.y += particle.speedY;
        particle.swing += particle.swingSpeed;
        particle.x += Math.sin(particle.swing) * 0.5 + particle.speedX;

        // 更新旋转
        particle.rotation += particle.rotationSpeed;

        // 重置超出屏幕的粒子
        if (particle.y > this.canvas.height + particle.size) {
            particle.y = -particle.size;
            particle.x = Math.random() * this.canvas.width;
        }

        if (particle.x > this.canvas.width + particle.size) {
            particle.x = -particle.size;
        } else if (particle.x < -particle.size) {
            particle.x = this.canvas.width + particle.size;
        }
    }

    drawParticle(particle) {
        this.ctx.save();

        // 移动到粒子位置
        this.ctx.translate(particle.x, particle.y);
        this.ctx.rotate(particle.rotation * Math.PI / 180);

        // 设置透明度和颜色
        this.ctx.globalAlpha = particle.opacity;
        this.ctx.fillStyle = particle.color;

        // 绘制樱花花瓣（简化版五瓣樱花）
        this.drawSakuraPetal(particle.size);

        this.ctx.restore();
    }

    drawSakuraPetal(size) {
        // 绘制五瓣樱花
        const petals = 5;
        const outerRadius = size;
        const innerRadius = size * 0.4;

        this.ctx.beginPath();

        for (let i = 0; i < petals * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (Math.PI * i) / petals;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }

        this.ctx.closePath();
        this.ctx.fill();

        // 添加中心点
        this.ctx.beginPath();
        this.ctx.arc(0, 0, size * 0.2, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.fill();
    }

    animate() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 更新和绘制所有粒子
        this.particles.forEach(particle => {
            this.updateParticle(particle);
            this.drawParticle(particle);
        });

        // 继续动画
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    handleResize() {
        // 更新canvas尺寸
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        // 调整移动端粒子数量
        const targetCount = window.innerWidth < 768
            ? Math.floor(this.config.particleCount * 0.4)
            : this.config.particleCount;

        if (this.particles.length !== targetCount) {
            this.createParticles();
        }
    }

    destroy() {
        // 停止动画
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        // 移除canvas
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }

        // 移除事件监听
        window.removeEventListener('resize', this.handleResize);
    }
}

// 页面加载完成后初始化樱花特效
document.addEventListener('DOMContentLoaded', function() {
    // 等待一小段时间确保页面完全渲染
    setTimeout(() => {
        window.sakuraEffect = new SakuraParticleSystem({
            particleCount: 50,
            minSize: 8,
            maxSize: 16,
            minSpeed: 0.8,
            maxSpeed: 2.5,
            colors: ['#FFB7D5', '#FFC9E0', '#FFD6E8', '#E8B4D6', '#F8C8DC', '#FFE5F0']
        });
        console.log('🌸 樱花特效已启动');
    }, 500);
});
