/* 使用Matter.js的美食堆叠雨特效系统 */

class FoodRainMatterSystem {
    constructor(options = {}) {
        // 配置参数
        this.config = {
            maxFallingFoods: options.maxFallingFoods || 50,
            maxStackedFoods: options.maxStackedFoods || 80,
            maxLayers: options.maxLayers || 3,
            minSize: options.minSize || 20,
            maxSize: options.maxSize || 30,
            foodTypes: [
                '🍎', '🍇', '🍓', '🫐', '🍉', '🍒', '🥞', '🧈',
                '🍞', '🍗', '🥩', '🍖', '🍟', '🌮', '🫔', '🫕',
                '🍝', '🍜', '🍛', '🍙', '🍥', '🍡', '🍢', '🍦',
                '🍧', '🍨', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬',
                '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🫘', '🍯'
            ]
        };

        // Matter.js 核心模块
        this.Engine = Matter.Engine;
        this.Render = Matter.Render;
        this.World = Matter.World;
        this.Bodies = Matter.Bodies;
        this.Events = Matter.Events;
        this.Mouse = Matter.Mouse;
        this.MouseConstraint = Matter.MouseConstraint;
        this.Body = Matter.Body;

        // 状态变量
        this.engine = null;
        this.render = null;
        this.world = null;
        this.foodBodies = [];  // 存储所有美食刚体及其emoji
        this.lastSpawnTime = 0;
        this.spawnInterval = 400;
        this.groundY = 0;

        this.init();
    }

    init() {
        // 创建物理引擎
        this.engine = this.Engine.create({
            gravity: {
                x: 0,
                y: 0.02  // 极低重力，像雪花
            }
        });

        this.world = this.engine.world;

        // 创建渲染器
        this.render = this.Render.create({
            element: document.body,
            engine: this.engine,
            options: {
                width: window.innerWidth,
                height: window.innerHeight,
                wireframes: false,
                background: 'transparent',
                pixelRatio: window.devicePixelRatio || 1
            }
        });

        // 设置canvas样式 - pointer-events: none 让点击穿透到下方元素
        this.render.canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 100;
            pointer-events: none;
        `;

        // 计算地面位置
        this.groundY = window.innerHeight;

        // 创建不可见的地面
        const ground = this.Bodies.rectangle(
            window.innerWidth / 2,
            this.groundY + 25,
            window.innerWidth,
            50,
            {
                isStatic: true,
                render: {
                    fillStyle: 'transparent',
                    strokeStyle: 'transparent'
                }
            }
        );

        this.World.add(this.world, ground);

        // 添加鼠标控制（用于点击移除）
        this.setupMouseControl();

        // 添加afterRender事件来绘制emoji
        this.Events.on(this.render, 'afterRender', () => {
            this.renderEmojis();
        });

        // 预生成初始堆叠美食
        this.preGenerateStackedFoods(35);

        // 启动引擎和渲染
        this.Engine.run(this.engine);
        this.Render.run(this.render);

        // 启动生成循环
        this.startSpawning();

        // 监听窗口大小变化
        window.addEventListener('resize', () => this.handleResize());
    }

    setupMouseControl() {
        // 在document上监听点击，不使用Matter的MouseConstraint
        // 这样不会干扰页面其他元素的点击
        document.addEventListener('click', (e) => {
            const clickX = e.clientX;
            const clickY = e.clientY;

            // 只处理底部区域的点击（堆叠美食区）
            if (clickY < this.groundY - 150) {
                return;
            }

            // 检查是否点击到美食
            for (let i = this.foodBodies.length - 1; i >= 0; i--) {
                const foodItem = this.foodBodies[i];
                const body = foodItem.body;

                // 检查点击位置是否在刚体内（使用圆形检测）
                const dx = clickX - body.position.x;
                const dy = clickY - body.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const radius = foodItem.size / 2;

                if (distance < radius) {
                    // 移除刚体
                    this.World.remove(this.world, body);
                    this.foodBodies.splice(i, 1);
                    e.stopPropagation();
                    e.preventDefault();
                    break;
                }
            }
        }, true);
    }

    createFoodBody(x, y, emoji, initialVelocity = null) {
        const size = this.randomRange(this.config.minSize, this.config.maxSize);
        const radius = size / 2;

        const body = this.Bodies.circle(x, y, radius, {
            restitution: 0.2,  // 低弹性
            friction: 0.5,
            density: 0.001,    // 轻盈
            render: {
                fillStyle: 'transparent',  // 不显示默认渲染
                strokeStyle: 'transparent'
            }
        });

        // 设置初始速度（雪花飘动效果）
        if (initialVelocity) {
            this.Body.setVelocity(body, initialVelocity);
        } else {
            this.Body.setVelocity(body, {
                x: this.randomRange(-0.5, 0.5),
                y: this.randomRange(0.05, 0.15)
            });
        }

        // 添加到世界
        this.World.add(this.world, body);

        // 存储刚体及其emoji
        this.foodBodies.push({
            body: body,
            emoji: emoji || this.config.foodTypes[Math.floor(Math.random() * this.config.foodTypes.length)],
            size: size
        });

        return body;
    }

    preGenerateStackedFoods(count) {
        const screenWidth = window.innerWidth;
        const avgSize = (this.config.minSize + this.config.maxSize) / 2;
        const spacing = avgSize * 1.2;

        // 计算每行可以放多少个
        const foodsPerRow = Math.floor(screenWidth / spacing);
        const rows = Math.ceil(count / foodsPerRow);

        console.log(`预生成 ${count} 个堆叠美食，每行 ${foodsPerRow} 个，共 ${rows} 行`);

        for (let row = 0; row < rows; row++) {
            const foodsInThisRow = Math.min(foodsPerRow, count - row * foodsPerRow);
            const startX = (screenWidth - foodsInThisRow * spacing) / 2 + spacing / 2;

            for (let i = 0; i < foodsInThisRow && this.foodBodies.length < count; i++) {
                const x = startX + i * spacing + this.randomRange(-5, 5);
                const y = this.groundY - 30 - row * avgSize * 0.9;
                const emoji = this.config.foodTypes[Math.floor(Math.random() * this.config.foodTypes.length)];

                this.createFoodBody(x, y, emoji, { x: 0, y: 0 });
            }
        }

        console.log(`实际生成了 ${this.foodBodies.length} 个美食`);
    }

    startSpawning() {
        const spawn = () => {
            const currentTime = Date.now();

            if (currentTime - this.lastSpawnTime > this.spawnInterval) {
                if (this.foodBodies.length < this.config.maxFallingFoods) {
                    const x = Math.random() * window.innerWidth;
                    const y = -50;
                    this.createFoodBody(x, y);
                    this.lastSpawnTime = currentTime;
                }
            }

            // 清理和高度控制
            this.autoCleanup();

            requestAnimationFrame(spawn);
        };

        requestAnimationFrame(spawn);
    }

    renderEmojis() {
        const context = this.render.context;

        // 调试：打印美食数量（只打印一次）
        if (!this._hasLoggedFoodCount && this.foodBodies.length > 0) {
            console.log(`正在渲染 ${this.foodBodies.length} 个美食`);
            this._hasLoggedFoodCount = true;
        }

        // 遍历所有美食刚体并绘制emoji
        for (const foodItem of this.foodBodies) {
            const body = foodItem.body;
            const emoji = foodItem.emoji;
            const size = foodItem.size;

            context.save();

            // 移动到刚体位置
            context.translate(body.position.x, body.position.y);
            context.rotate(body.angle);

            // 设置字体和样式
            context.font = `${size}px Arial`;
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.globalAlpha = 0.9;

            // 绘制emoji
            context.fillText(emoji, 0, 0);

            context.restore();
        }
    }

    autoCleanup() {
        // 移除超出屏幕的美食
        this.foodBodies = this.foodBodies.filter(foodItem => {
            if (foodItem.body.position.y > window.innerHeight + 100 ||
                foodItem.body.position.x < -100 ||
                foodItem.body.position.x > window.innerWidth + 100) {
                this.World.remove(this.world, foodItem.body);
                return false;
            }
            return true;
        });

        // 检查堆叠层数
        const maxHeight = this.calculateMaxHeight();
        const layerHeight = 30;
        const layers = Math.ceil(maxHeight / layerHeight);

        if (layers > this.config.maxLayers) {
            // 移除最底层的美食
            this.removeBottomLayer();
        }

        // 限制总数量
        if (this.foodBodies.length > this.config.maxStackedFoods) {
            const removeCount = this.foodBodies.length - this.config.maxStackedFoods;
            // 移除最底层的
            for (let i = 0; i < removeCount; i++) {
                const bottomFood = this.findBottomFood();
                if (bottomFood) {
                    this.World.remove(this.world, bottomFood.body);
                    const index = this.foodBodies.indexOf(bottomFood);
                    if (index > -1) {
                        this.foodBodies.splice(index, 1);
                    }
                }
            }
        }
    }

    calculateMaxHeight() {
        let maxHeight = 0;
        for (const foodItem of this.foodBodies) {
            const height = this.groundY - foodItem.body.position.y;
            if (height > maxHeight) {
                maxHeight = height;
            }
        }
        return maxHeight;
    }

    removeBottomLayer() {
        const layerHeight = 35;
        const bottomFoods = this.foodBodies.filter(foodItem =>
            foodItem.body.position.y >= this.groundY - layerHeight
        );

        for (const foodItem of bottomFoods) {
            this.World.remove(this.world, foodItem.body);
            const index = this.foodBodies.indexOf(foodItem);
            if (index > -1) {
                this.foodBodies.splice(index, 1);
            }
        }
    }

    findBottomFood() {
        let bottomFood = null;
        let maxY = -Infinity;

        for (const foodItem of this.foodBodies) {
            if (foodItem.body.position.y > maxY) {
                maxY = foodItem.body.position.y;
                bottomFood = foodItem;
            }
        }

        return bottomFood;
    }

    randomRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    handleResize() {
        // 更新渲染器大小
        this.render.canvas.width = window.innerWidth;
        this.render.canvas.height = window.innerHeight;
        this.render.options.width = window.innerWidth;
        this.render.options.height = window.innerHeight;

        this.groundY = window.innerHeight;

        // 更新地面位置
        const bodies = Matter.Composite.allBodies(this.world);
        const ground = bodies.find(body => body.isStatic);
        if (ground) {
            this.Body.setPosition(ground, {
                x: window.innerWidth / 2,
                y: this.groundY + 25
            });
        }
    }

    destroy() {
        if (this.render) {
            this.Render.stop(this.render);
            this.render.canvas.remove();
        }

        if (this.engine) {
            this.Engine.clear(this.engine);
        }

        window.removeEventListener('resize', this.handleResize);
    }
}

// 页面加载完成后初始化美食雨
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        window.foodRainMatter = new FoodRainMatterSystem({
            maxFallingFoods: 50,
            maxStackedFoods: 80,
            maxLayers: 3
        });
        console.log('🍎 Matter.js 美食堆叠雨特效已启动 - 点击美食可消除！');
    }, 800);
});
