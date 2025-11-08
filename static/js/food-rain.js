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
            maxFallingFoods: options.maxFallingFoods || 50,  // 同时飘落的美食数
            maxStackedFoods: options.maxStackedFoods || 80,   // 最大堆叠数
            maxLayers: options.maxLayers || 3,                // 最大堆叠层数（降低以防止堆太高）
            minSize: options.minSize || 20,
            maxSize: options.maxSize || 30,
            minSpeed: options.minSpeed || 0.05,   // 极慢的初始速度
            maxSpeed: options.maxSpeed || 0.15,   // 极慢的最大速度
            bounceStrength: options.bounceStrength || 0.4,
            friction: options.friction || 0.92,
            gravity: options.gravity || 0.02,     // 极低重力，像雪花
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
        this.spawnInterval = 400;  // 生成间隔(ms)，更频繁生成

        this.init();
    }

    init() {
        this.createCanvas();

        // 计算地面位置（屏幕最底部）
        this.groundY = this.canvas.height;

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
            speedX: this.randomRange(-0.2, 0.2),  // 初始横向速度
            speedY: isStacked ? 0 : this.randomRange(this.config.minSpeed, this.config.maxSpeed),
            emoji: this.config.foodTypes[Math.floor(Math.random() * this.config.foodTypes.length)],
            rotation: Math.random() * 360,
            rotationSpeed: this.randomRange(-1, 1),  // 减慢旋转速度
            opacity: this.randomRange(0.85, 1.0),
            state: isStacked ? FoodState.STACKED : FoodState.FALLING,
            bounceCount: 0,
            scale: 1.0,
            removeProgress: 0,
            // 雪花飘动效果参数
            swingAmplitude: this.randomRange(0.3, 0.8),  // 摆动幅度
            swingSpeed: this.randomRange(0.01, 0.03),     // 摆动速度
            swingOffset: Math.random() * Math.PI * 2,     // 摆动初始偏移
            driftX: this.randomRange(-0.1, 0.1)           // 随机横向漂移
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
        // 检查堆叠层数（优先处理）
        const layerCount = this.calculateLayers();
        if (layerCount > this.config.maxLayers) {
            // 移除最底层的所有美食
            const bottomFoods = this.getBottomLayerFoods();
            bottomFoods.forEach(food => {
                // 直接删除，不触发物理效果（避免连锁反应）
                food.state = FoodState.REMOVING;
                food.removeProgress = 0;
            });
        }

        // 限制堆叠数量
        if (this.stackedFoods.length > this.config.maxStackedFoods) {
            const removeCount = this.stackedFoods.length - this.config.maxStackedFoods;
            for (let i = 0; i < removeCount; i++) {
                // 移除最底层的
                const lowestFood = this.findLowestFood();
                if (lowestFood && lowestFood.state === FoodState.STACKED) {
                    lowestFood.state = FoodState.REMOVING;
                    lowestFood.removeProgress = 0;
                }
            }
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

        const layerHeight = 30;  // 每层大约高度
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
        const layerHeight = 35;
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

        // 检查是否有美食在这个美食上方（依赖它支撑）
        this.checkAndDropFoodsAbove(food);
    }

    checkAndDropFoodsAbove(removedFood) {
        // 找出所有在被移除美食上方的美食
        for (let food of this.stackedFoods) {
            if (food.state !== FoodState.STACKED) continue;
            if (food === removedFood) continue;

            // 如果美食在被移除美食的上方附近（y值更小，且x位置接近）
            const dx = Math.abs(food.x - removedFood.x);
            const dy = removedFood.y - food.y;

            // 检查是否在上方并且距离足够近（可能依赖这个美食支撑）
            if (dy > 0 && dy < 100 && dx < 50) {
                // 检查下方是否还有其他支撑
                if (!this.hasOtherSupport(food, removedFood)) {
                    // 没有其他支撑，让它重新掉落
                    food.state = FoodState.FALLING;
                    food.speedY = 0.1;  // 给一个小的初始下落速度
                    food.speedX = this.randomRange(-0.2, 0.2);
                    food.rotationSpeed = this.randomRange(-1, 1);

                    // 重新初始化雪花飘动参数
                    food.swingAmplitude = this.randomRange(0.3, 0.8);
                    food.swingSpeed = this.randomRange(0.01, 0.03);
                    food.swingOffset = Math.random() * Math.PI * 2;
                    food.driftX = this.randomRange(-0.1, 0.1);
                }
            }
        }
    }

    hasOtherSupport(food, excludeFood) {
        // 检查这个美食下方是否有其他美食支撑（除了被移除的那个）
        for (let other of this.stackedFoods) {
            if (other.state !== FoodState.STACKED) continue;
            if (other === food || other === excludeFood) continue;

            const dx = Math.abs(food.x - other.x);
            const dy = food.y - other.y;

            // 如果下方有接近的美食，说明有支撑
            if (dy > 0 && dy < 50 && dx < 40) {
                return true;
            }
        }

        // 检查是否接近地面
        if (food.y >= this.groundY - 40) {
            return true;
        }

        return false;
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

            // 雪花飘动效果：正弦波横向移动
            food.swingOffset += food.swingSpeed;
            const swingX = Math.sin(food.swingOffset) * food.swingAmplitude;

            // 更新位置
            food.y += food.speedY;
            food.x += food.speedX + swingX + food.driftX;

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

        // 检查堆叠美食中是否有重新变成FALLING状态的
        const refallingFoods = [];
        this.stackedFoods = this.stackedFoods.filter(food => {
            if (food.state === FoodState.FALLING) {
                refallingFoods.push(food);
                return false;  // 从堆叠列表移除
            }
            return true;
        });

        // 将重新掉落的美食加入飘落列表
        this.fallingFoods.push(...refallingFoods);

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
        this.groundY = this.canvas.height;

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
            maxFallingFoods: 50,
            maxStackedFoods: 80,
            maxLayers: 3,
            minSize: 20,
            maxSize: 30,
            minSpeed: 0.05,
            maxSpeed: 0.15,
            gravity: 0.02
        });
        console.log('🍎 美食堆叠雨特效已启动 - 点击美食可消除！');
    }, 800);
});
