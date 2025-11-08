/* 使用Matter.js的美食堆叠雨特效系统 */

class FoodRainMatterSystem {
    constructor(options = {}) {
        // 配置参数
        this.config = {
            maxFoodCount: options.maxFoodCount || 100,  // 屏幕内最大食物数量
            spawnRate: options.spawnRate || 2,          // 每秒生成2个食物
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
        this.Runner = Matter.Runner;
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
        this.foodBodies = [];  // 存储所有美食刚体及其emoji（按创建时间排序，FIFO队列）
        this.lastSpawnTime = 0;
        this.spawnInterval = 1000 / this.config.spawnRate;  // 每秒2个 = 500ms
        this.groundY = 0;
        this.needImmediateSpawn = false;  // 点击删除后立即补充标记

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

        // 不使用Matter.js的Render，自己创建canvas
        this.canvas = document.createElement('canvas');
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 100;
            pointer-events: none;
        `;
        document.body.insertBefore(this.canvas, document.body.firstChild);
        this.ctx = this.canvas.getContext('2d');

        console.log('创建自定义Canvas:', this.canvas.width, 'x', this.canvas.height);

        // 计算地面位置（屏幕底部）
        this.groundY = window.innerHeight;

        // 创建不可见的地面（放在屏幕底部）
        const ground = this.Bodies.rectangle(
            window.innerWidth / 2,
            this.groundY - 10,  // 地面在屏幕底部往上10px，确保在屏幕内
            window.innerWidth * 2,  // 加宽地面防止边缘漏掉
            50,
            {
                isStatic: true,
                label: 'ground',
                render: {
                    fillStyle: 'transparent',
                    strokeStyle: 'transparent'
                }
            }
        );

        this.World.add(this.world, ground);
        console.log('地面创建在 Y:', this.groundY - 10, '窗口高度:', window.innerHeight);

        // 添加鼠标控制（用于点击移除）
        this.setupMouseControl();

        // 预生成初始美食（减少初始数量，让食物自然下落堆积）
        this.preGenerateStackedFoods(10);

        // 启动引擎（使用Runner）
        this.runner = this.Runner.create();
        this.Runner.run(this.runner, this.engine);

        // 启动自定义渲染循环
        this.startRenderLoop();

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

                    // 标记需要立即补充
                    this.needImmediateSpawn = true;

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
            friction: 0.8,     // 增加摩擦力，更容易堆叠
            frictionStatic: 1.0,
            density: 0.002,    // 稍微增加密度，更稳定
            render: {
                fillStyle: 'transparent',
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
        console.log(`地面位置 groundY: ${this.groundY}`);

        for (let row = 0; row < rows; row++) {
            const foodsInThisRow = Math.min(foodsPerRow, count - row * foodsPerRow);
            const startX = (screenWidth - foodsInThisRow * spacing) / 2 + spacing / 2;

            for (let i = 0; i < foodsInThisRow && this.foodBodies.length < count; i++) {
                const x = startX + i * spacing + this.randomRange(-5, 5);
                // 确保美食在地面上方，地面是 groundY - 10
                const y = this.groundY - 35 - row * avgSize;
                const emoji = this.config.foodTypes[Math.floor(Math.random() * this.config.foodTypes.length)];

                this.createFoodBody(x, y, emoji, { x: 0, y: 0 });
            }
        }

        console.log(`实际生成了 ${this.foodBodies.length} 个美食，位置范围: Y=${this.groundY - 35} 到 Y=${this.groundY - 35 - rows * avgSize}`);
    }

    startSpawning() {
        const spawn = () => {
            const currentTime = Date.now();

            // 检查是否需要生成新食物
            const shouldSpawn = this.needImmediateSpawn ||
                               (currentTime - this.lastSpawnTime > this.spawnInterval);

            if (shouldSpawn && this.foodBodies.length < this.config.maxFoodCount) {
                const x = Math.random() * window.innerWidth;
                const y = -50;
                this.createFoodBody(x, y);
                this.lastSpawnTime = currentTime;
                this.needImmediateSpawn = false;  // 重置立即生成标记
            }

            // 清理和高度控制
            this.autoCleanup();

            requestAnimationFrame(spawn);
        };

        requestAnimationFrame(spawn);
        console.log(`美食生成循环已启动 - 最大${this.config.maxFoodCount}个，每秒${this.config.spawnRate}个`);
    }

    startRenderLoop() {
        const render = () => {
            // 清空canvas
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            // 绘制所有美食
            this.renderEmojis();

            requestAnimationFrame(render);
        };

        requestAnimationFrame(render);
        console.log('自定义渲染循环已启动');
    }

    renderEmojis() {
        const context = this.ctx;

        // 调试：打印美食数量和第一个美食的位置
        if (!this._hasLoggedFoodCount && this.foodBodies.length > 0) {
            console.log(`正在渲染 ${this.foodBodies.length} 个美食`);
            const first = this.foodBodies[0];
            console.log(`第一个美食位置: x=${first.body.position.x.toFixed(0)}, y=${first.body.position.y.toFixed(0)}, emoji=${first.emoji}, size=${first.size}`);
            console.log(`Canvas尺寸: ${this.canvas.width} x ${this.canvas.height}`);

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
            context.fillStyle = '#000000';
            context.textAlign = 'center';
            context.textBaseline = 'middle';

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

        // 限制总数量 - FIFO队列方式，删除最早创建的
        while (this.foodBodies.length > this.config.maxFoodCount) {
            const oldestFood = this.foodBodies[0];  // 第一个是最早的
            if (oldestFood) {
                this.World.remove(this.world, oldestFood.body);
                this.foodBodies.shift();  // 从头部删除
            }
        }
    }

    randomRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    handleResize() {
        // 更新canvas大小
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.groundY = window.innerHeight;

        // 更新地面位置
        const bodies = Matter.Composite.allBodies(this.world);
        const ground = bodies.find(body => body.isStatic && body.label === 'ground');
        if (ground) {
            this.Body.setPosition(ground, {
                x: window.innerWidth / 2,
                y: this.groundY - 10
            });
        }
    }

    destroy() {
        if (this.canvas) {
            this.canvas.remove();
        }

        if (this.runner) {
            this.Runner.stop(this.runner);
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
            maxFoodCount: 100,   // 屏幕内最大100个食物
            spawnRate: 2         // 每秒生成2个食物
        });
        console.log('🍎 Matter.js 美食堆叠雨特效已启动');
        console.log('📊 配置: 最大100个食物，每秒生成2个，点击消除立即补充');
    }, 800);
});
