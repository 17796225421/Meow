/* 二次元美食堆叠雨特效系统 - 支持碰撞和堆叠 */

// 美食状态枚举
const FoodState = {
    FALLING: 'falling',
    STACKED: 'stacked',
    REMOVING: 'removing'
};

class FoodRainSystem {
    constructor(options = {}) {
        // 配置参数
        this.config = {
            maxFallingFoods: options.maxFallingFoods || 20,  // 同时飘落的美食数
            maxStackedFoods: options.maxStackedFoods || 60,   // 最大堆叠数
            maxLayers: options.maxLayers || 6,                // 最大堆叠层数
            minSize: options.minSize || 20,
            maxSize: options.maxSize || 30,
            minSpeed: options.minSpeed || 1.5,
            maxSpeed: options.maxSpeed || 4.0,
            bounceStrength: options.bounceStrength || 0.4,
            friction: options.friction || 0.92,
            gravity: options.gravity || 0.3,
            foodTypes: [
                '🍎', '🍇', '🍓', '🫐', '🍉', '🍒', '🥞', '🧈',
                '🍞', '🍗', '🥩', '🍖', '🍟', '🌮', '🫔', '🫕',
                '🍝', '🍜', '🍛', '🍙', '🍥', '🍡', '🍢', '🍦',
                '🍧', '🍨', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬',
                '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🫘', '🍯'
            ],
            reduceOnMobile: options.reduceOnMobile !== false
        };

        // 状态变量
        this.fallingFoods = [];   // 飘落中的美食
        this.stackedFoods = [];   // 已堆叠的美食
        this.animationId = null;
        this.canvas = null;
        this.ctx = null;
        this.groundY = 0;
        this.lastSpawnTime = 0;
        this.spawnInterval = 800;  // 生成间隔(ms)

        this.init();
    }

    init() {
        this.createCanvas();

        // 计算地面位置（屏幕底部附近）
        this.groundY = this.canvas.height - 20;

        // 调整移动端参数
        if (this.config.reduceOnMobile && window.innerWidth < 768) {
            this.config.maxFallingFoods = Math.floor(this.config.maxFallingFoods * 0.5);
            this.config.maxStackedFoods = Math.floor(this.config.maxStackedFoods * 0.5);
            this.spawnInterval = 1200;
        }


        // 预生成初始堆叠美食
        this.preGenerateStackedFoods(35);

        // 开始动画
        this.animate();

        // 监听窗口大小变化
        window.addEventListener('resize', () => this.handleResize());
    }

    createCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'food-rain-canvas';
        this.canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 100;
            pointer-events: none;
        `;

        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.ctx = this.canvas.getContext('2d');

        document.body.insertBefore(this.canvas, document.body.firstChild);

        // 在document上监听点击，这样不会阻止其他元素的点击
        document.addEventListener('click', (e) => this.handleDocumentClick(e), true);
    }

    createFood(isStacked = false) {
        const size = this.randomRange(this.config.minSize, this.config.maxSize);
        return {
            x: Math.random() * this.canvas.width,
            y: isStacked ? this.groundY - size : -size,
            size: size,
            speedX: this.randomRange(-0.5, 0.5),
            speedY: isStacked ? 0 : this.randomRange(this.config.minSpeed, this.config.maxSpeed),
            emoji: this.config.foodTypes[Math.floor(Math.random() * this.config.foodTypes.length)],
            rotation: Math.random() * 360,
            rotationSpeed: this.randomRange(-3, 3),
            opacity: this.randomRange(0.85, 1.0),
            state: isStacked ? FoodState.STACKED : FoodState.FALLING,
            bounceCount: 0,
            scale: 1.0,
            removeProgress: 0
        };
    }

    randomRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    spawnFood(currentTime) {
        if (currentTime - this.lastSpawnTime > this.spawnInterval) {
            if (this.fallingFoods.length < this.config.maxFallingFoods) {
                this.fallingFoods.push(this.createFood());
                this.lastSpawnTime = currentTime;
            }
        }
    }

    checkGroundCollision(food) {
        return food.y + food.size / 2 >= this.groundY;
    }

    checkFoodCollision(food) {
        for (let stacked of this.stackedFoods) {
            if (stacked.state === FoodState.REMOVING) continue;

            const dx = food.x - stacked.x;
            const dy = food.y - stacked.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDistance = (food.size + stacked.size) / 2 * 0.9;

            if (distance < minDistance && food.y < stacked.y) {
                return { collided: true, stackedFood: stacked };
            }
        }
        return { collided: false };
    }

    stackFood(food, collision) {
        food.state = FoodState.STACKED;
        food.speedY = 0;
        food.speedX = 0;
        food.rotationSpeed = 0;
        food.opacity = 0.9;  // 半透明，不完全遮挡内容

        // 轻微弹跳效果
        food.scale = 1.2;

        // 如果碰到其他美食，放在其上方
        if (collision && collision.stackedFood) {
            food.y = collision.stackedFood.y - (food.size + collision.stackedFood.size) / 2;
        } else {
            food.y = this.groundY - food.size / 2;
        }

        this.stackedFoods.push(food);

        // 检查是否需要清理
        this.autoCleanup();
    }

    autoCleanup() {
        // 限制堆叠数量
        if (this.stackedFoods.length > this.config.maxStackedFoods) {
            const removeCount = this.stackedFoods.length - this.config.maxStackedFoods;
            for (let i = 0; i < removeCount; i++) {
                // 移除最底层的
                const lowestFood = this.findLowestFood();
                if (lowestFood) {
                    this.removeFood(lowestFood);
                }
            }
        }

        // 检查堆叠层数
        const layerCount = this.calculateLayers();
        if (layerCount > this.config.maxLayers) {
            // 移除最底层
            const bottomFoods = this.getBottomLayerFoods();
            bottomFoods.forEach(food => this.removeFood(food));
        }
    }

    preGenerateStackedFoods(count) {
        // 预生成初始堆叠美食
        const screenWidth = this.canvas.width;
        const foodSize = (this.config.minSize + this.config.maxSize) / 2;

        // 计算每行可以放多少个美食
        const foodsPerRow = Math.floor(screenWidth / (foodSize * 1.5));
        const rows = Math.ceil(count / foodsPerRow);

        let generatedCount = 0;

        for (let row = 0; row < rows && generatedCount < count; row++) {
            const foodsInThisRow = Math.min(foodsPerRow, count - generatedCount);
            const startX = (screenWidth - foodsInThisRow * foodSize * 1.5) / 2;

            for (let i = 0; i < foodsInThisRow; i++) {
                const food = this.createFood(true);

                // 设置位置：底部向上堆叠
                food.x = startX + i * foodSize * 1.5 + this.randomRange(-5, 5);
                food.y = this.groundY - (row * foodSize * 0.9) - food.size / 2;

                // 设置为堆叠状态
                food.state = FoodState.STACKED;
                food.speedY = 0;
                food.speedX = 0;
                food.rotationSpeed = 0;
                food.opacity = 0.9;  // 半透明，不完全遮挡内容

                this.stackedFoods.push(food);
                generatedCount++;
            }
        }
    }

    findLowestFood() {
        let lowest = null;
        let maxY = -Infinity;

        for (let food of this.stackedFoods) {
            if (food.state !== FoodState.REMOVING && food.y > maxY) {
                maxY = food.y;
                lowest = food;
            }
        }

        return lowest;
    }

    calculateLayers() {
        if (this.stackedFoods.length === 0) return 0;

        const layerHeight = 35;  // 每层大约高度
        let maxHeight = 0;

        for (let food of this.stackedFoods) {
            if (food.state !== FoodState.REMOVING) {
                const height = this.groundY - food.y;
                if (height > maxHeight) maxHeight = height;
            }
        }

        return Math.ceil(maxHeight / layerHeight);
    }

    getBottomLayerFoods() {
        const layerHeight = 40;
        const bottomFoods = [];

        for (let food of this.stackedFoods) {
            if (food.state !== FoodState.REMOVING) {
                if (food.y >= this.groundY - layerHeight) {
                    bottomFoods.push(food);
                }
            }
        }

        return bottomFoods;
    }

    removeFood(food) {
        food.state = FoodState.REMOVING;
        food.removeProgress = 0;
    }

    handleDocumentClick(e) {
        // 只处理底部堆叠美食区域的点击
        const clickY = e.clientY;
        const stackedAreaY = this.groundY;

        // 如果点击的不是堆叠美食区域，直接返回让点击穿透
        if (clickY < stackedAreaY) {
            return;
        }

        // 计算Canvas坐标
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        const canvasY = (e.clientY - rect.top) * (this.canvas.height / rect.height);

        // 检查是否点击到堆叠的美食
        let clickedFood = false;
        for (let i = this.stackedFoods.length - 1; i >= 0; i--) {
            const food = this.stackedFoods[i];
            if (food.state === FoodState.REMOVING) continue;

            const dx = canvasX - food.x;
            const dy = canvasY - food.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < food.size / 2) {
                this.removeFood(food);
                clickedFood = true;
                e.stopPropagation();  // 阻止事件继续传播
                e.preventDefault();   // 阻止默认行为
                break;
            }
        }
    }

    updateFood(food, deltaTime) {
        if (food.state === FoodState.FALLING) {
            // 应用重力
            food.speedY += this.config.gravity;

            // 更新位置
            food.y += food.speedY;
            food.x += food.speedX;

            // 更新旋转
            food.rotation += food.rotationSpeed;

            // 边界检查
            if (food.x < food.size / 2) {
                food.x = food.size / 2;
                food.speedX *= -0.5;
            }
            if (food.x > this.canvas.width - food.size / 2) {
                food.x = this.canvas.width - food.size / 2;
                food.speedX *= -0.5;
            }

            // 检查碰撞
            const collision = this.checkFoodCollision(food);
            const groundCollision = this.checkGroundCollision(food);

            if (collision.collided || groundCollision) {
                this.stackFood(food, collision);
                return true;  // 标记需要从飘落列表移除
            }
        } else if (food.state === FoodState.STACKED) {
            // 弹跳缩放动画
            if (food.scale > 1.0) {
                food.scale -= 0.05;
                if (food.scale < 1.0) food.scale = 1.0;
            }
        } else if (food.state === FoodState.REMOVING) {
            // 消除动画
            food.removeProgress += 0.05;
            food.rotation += 15;
            food.scale = 1.0 - food.removeProgress;
            food.opacity = 1.0 - food.removeProgress;

            if (food.removeProgress >= 1.0) {
                return true;  // 标记需要移除
            }
        }

        return false;
    }

    drawFood(food) {
        this.ctx.save();

        this.ctx.translate(food.x, food.y);
        this.ctx.rotate(food.rotation * Math.PI / 180);
        this.ctx.scale(food.scale, food.scale);
        this.ctx.globalAlpha = food.opacity;

        this.ctx.font = `${food.size}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // 添加阴影效果（仅堆叠状态）
        if (food.state === FoodState.STACKED) {
            this.ctx.shadowColor = 'rgba(255, 183, 213, 0.5)';
            this.ctx.shadowBlur = 8;
        }

        this.ctx.fillText(food.emoji, 0, 0);

        this.ctx.restore();
    }

    animate(currentTime = 0) {
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 生成新美食
        this.spawnFood(currentTime);

        // 更新飘落中的美食
        this.fallingFoods = this.fallingFoods.filter(food => {
            const shouldRemove = this.updateFood(food, 16);
            if (!shouldRemove) {
                this.drawFood(food);
            }
            return !shouldRemove;
        });

        // 更新和绘制堆叠的美食
        this.stackedFoods = this.stackedFoods.filter(food => {
            const shouldRemove = this.updateFood(food, 16);
            if (!shouldRemove) {
                this.drawFood(food);
            }
            return !shouldRemove;
        });

        // 继续动画
        this.animationId = requestAnimationFrame((time) => this.animate(time));
    }

    handleResize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.groundY = this.canvas.height - 20;

        // 清理超出屏幕的堆叠美食
        this.stackedFoods = this.stackedFoods.filter(food =>
            food.y < this.canvas.height
        );
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }

        window.removeEventListener('resize', this.handleResize);
    }
}

// 页面加载完成后初始化美食雨
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        window.foodRain = new FoodRainSystem({
            maxFallingFoods: 20,
            maxStackedFoods: 60,
            maxLayers: 6,
            minSize: 20,
            maxSize: 30,
            minSpeed: 1.5,
            maxSpeed: 4.0
        });
        console.log('🍎 美食堆叠雨特效已启动 - 点击美食可消除！');
    }, 800);
});
