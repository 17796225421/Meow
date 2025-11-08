/* 二次元美食飘落特效系统 */

class FoodRainSystem {
    constructor(options = {}) {
        // 配置参数
        this.config = {
            foodCount: options.foodCount || 30, // 美食数量
            minSize: options.minSize || 15,
            maxSize: options.maxSize || 25,
            minSpeed: options.minSpeed || 1.0,
            maxSpeed: options.maxSpeed || 3.0,
            // 40种美食emoji
            foodTypes: [
                '🍎', '🍇', '🍓', '🫐', '🍉', '🍒', '🥞', '🧈',
                '🍞', '🍗', '🥩', '🍖', '🍟', '🌮', '🫔', '🫕',
                '🍝', '🍜', '🍛', '🍙', '🍥', '🍡', '🍢', '🍦',
                '🍧', '🍨', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬',
                '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🫘', '🍯'
            ],
            reduceOnMobile: options.reduceOnMobile !== false
        };

        // 初始化
        this.foods = [];
        this.animationId = null;
        this.canvas = null;
        this.ctx = null;

        this.init();
    }

    init() {
        // 创建Canvas
        this.createCanvas();

        // 调整移动端美食数量
        if (this.config.reduceOnMobile && window.innerWidth < 768) {
            this.config.foodCount = Math.floor(this.config.foodCount * 0.5);
        }

        // 创建美食粒子
        this.createFoods();

        // 开始动画
        this.animate();

        // 监听窗口大小变化
        window.addEventListener('resize', () => this.handleResize());
    }

    createCanvas() {
        // 创建canvas元素
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'food-rain-canvas';
        this.canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 2;
        `;

        // 设置canvas尺寸
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        // 获取绘图上下文
        this.ctx = this.canvas.getContext('2d');

        // 添加到body
        document.body.insertBefore(this.canvas, document.body.firstChild);
    }

    createFoods() {
        this.foods = [];
        for (let i = 0; i < this.config.foodCount; i++) {
            this.foods.push(this.createFood());
        }
    }

    createFood() {
        return {
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height - this.canvas.height,
            size: this.randomRange(this.config.minSize, this.config.maxSize),
            speedY: this.randomRange(this.config.minSpeed, this.config.maxSpeed),
            speedX: this.randomRange(-0.5, 0.5),
            emoji: this.config.foodTypes[Math.floor(Math.random() * this.config.foodTypes.length)],
            rotation: Math.random() * 360,
            rotationSpeed: this.randomRange(-2, 2),
            opacity: this.randomRange(0.7, 1.0),
            swing: Math.random() * Math.PI * 2,
            swingSpeed: this.randomRange(0.01, 0.03)
        };
    }

    randomRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    updateFood(food) {
        // 更新位置
        food.y += food.speedY;
        food.swing += food.swingSpeed;
        food.x += Math.sin(food.swing) * 0.8 + food.speedX;

        // 更新旋转
        food.rotation += food.rotationSpeed;

        // 重置超出屏幕的粒子
        if (food.y > this.canvas.height + food.size) {
            food.y = -food.size;
            food.x = Math.random() * this.canvas.width;
            food.emoji = this.config.foodTypes[Math.floor(Math.random() * this.config.foodTypes.length)];
        }

        if (food.x > this.canvas.width + food.size) {
            food.x = -food.size;
        } else if (food.x < -food.size) {
            food.x = this.canvas.width + food.size;
        }
    }

    drawFood(food) {
        this.ctx.save();

        // 移动到食物位置
        this.ctx.translate(food.x, food.y);
        this.ctx.rotate(food.rotation * Math.PI / 180);

        // 设置透明度
        this.ctx.globalAlpha = food.opacity;

        // 设置字体大小
        this.ctx.font = `${food.size}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // 绘制emoji
        this.ctx.fillText(food.emoji, 0, 0);

        this.ctx.restore();
    }

    animate() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 更新和绘制所有美食
        this.foods.forEach(food => {
            this.updateFood(food);
            this.drawFood(food);
        });

        // 继续动画
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    handleResize() {
        // 更新canvas尺寸
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        // 调整移动端美食数量
        const targetCount = window.innerWidth < 768
            ? Math.floor(this.config.foodCount * 0.5)
            : this.config.foodCount;

        if (this.foods.length !== targetCount) {
            this.createFoods();
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

// 页面加载完成后初始化美食雨
document.addEventListener('DOMContentLoaded', function() {
    // 等待一小段时间确保页面完全渲染
    setTimeout(() => {
        window.foodRain = new FoodRainSystem({
            foodCount: 30,
            minSize: 15,
            maxSize: 25,
            minSpeed: 1.0,
            maxSpeed: 3.0
        });
        console.log('🍎 美食飘落特效已启动');
    }, 800);
});
