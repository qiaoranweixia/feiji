// 在文件开头添加这些全局变量
let ctx;
let currentGoal;
let enemiesDefeated = 0;
let gameTime = 0;
let keys = {};

// 在文件开头添加这个函数
function domReady(fn) {
    if (document.readyState !== 'loading') {
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', fn);
    }
}

// 将所有的初始化代码包装在这个函数中
domReady(() => {
    // 在文件顶部添加这些行
    const canvas = document.getElementById('game-canvas');
    if (!canvas) {
        console.error('无法找到 canvas 元素');
    } else {
        console.log('canvas 元素已找到');
        ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('无法获取 canvas 2d 上下文');
        } else {
            console.log('canvas 2d 上下文已获取');
        }
    }

    // 游戏状态
    let gameState = 'start';
    let score = 0;
    let highScore = 0;
    let currentLevel = 1;
    let playerHealth = 100;

    // 游戏对象
    let player;
    let bullets = [];
    let enemies = [];
    let powerUps = [];
    let boss = null;

    // 游���设置
    const playerSpeed = 2;
    const bulletSpeed = 1;
    const enemySpeed = 0.5;

    // 在文件顶部添加这个变量
    let imagesLoaded = 0;
    const totalImages = 4; // player, enemy, bullet, powerup

    // 修改图像加载部分
    const playerImg = new Image();
    playerImg.src = 'player.png';
    playerImg.onerror = () => handleImageError('player');
    playerImg.onload = () => imageLoaded('player');

    const enemyImg = new Image();
    enemyImg.src = 'enemy.png';
    enemyImg.onerror = () => handleImageError('enemy');
    enemyImg.onload = () => imageLoaded('enemy');

    const bulletImg = new Image();
    bulletImg.src = 'bullet.png';
    bulletImg.onerror = () => handleImageError('bullet');
    bulletImg.onload = () => imageLoaded('bullet');

    const powerUpImg = new Image();
    powerUpImg.src = 'powerup.png';
    powerUpImg.onerror = () => handleImageError('powerup');
    powerUpImg.onload = () => imageLoaded('powerup');

    function handleImageError(imageName) {
        console.warn(`无法加载图片: ${imageName}`);
        imagesLoaded++;
        checkAllImagesLoaded();
    }

    function imageLoaded(imageName) {
        console.log(`图片加载成功: ${imageName}`);
        imagesLoaded++;
        checkAllImagesLoaded();
    }

    function checkAllImagesLoaded() {
        if (imagesLoaded === totalImages) {
            console.log('所有图片加载完成，开始游戏');
            initGame();
        }
    }

    // 游戏音效
    const shootSound = new Audio('shoot.mp3');
    const explosionSound = new Audio('explosion.mp3');
    const powerUpSound = new Audio('powerup.mp3');
    const levelCompleteSound = new Audio('level-complete.mp3');

    // 添加错误处理
    shootSound.onerror = handleAudioError;
    explosionSound.onerror = handleAudioError;
    powerUpSound.onerror = handleAudioError;
    levelCompleteSound.onerror = handleAudioError;

    function handleAudioError(e) {
        console.warn(`无法加载音频文件: ${e.target.src}`);
    }

    // 添加新的全局变量
    let difficulty = 'normal';
    let isPaused = false;
    let powerups = [];
    let enemySpawnInterval;
    let enemiesPerWave = 1;
    let currentWave = 0;
    let enemiesInWave = 0;
    let waveInterval = 10000; // 每波敌人之间的间隔时间（毫秒）
    let maxEnemiesPerWave = 10; // 每波最大敌人数量

    // 在文件顶部添加新的全局变量
    let playerBulletType = 'normal';
    let playerBulletTimer = 0;
    const PLAYER_BULLET_COOLDOWN = 300; // 玩家射击冷却时间（毫秒）

    // 在文件顶部添加新的全局变量
    let playerLevel = 1;
    let playerExperience = 0;
    let playerSkill = null;
    let levelGoal = 100;

    // 定义不同类型的敌人
    const enemyTypes = {
        normal: { health: 1, speed: 1, color: 'red', points: 10 },
        fast: { health: 1, speed: 2, color: 'yellow', points: 20 },
        tank: { health: 3, speed: 0.5, color: 'green', points: 30 },
        bomber: { health: 2, speed: 1, color: 'purple', points: 25 }
    };

    // 初始化游戏
    function initGame() {
        console.log('初始化游戏');
        player = {
            x: canvas.width / 2 - 20,
            y: canvas.height - 60,
            width: 40,
            height: 40
        };
        score = 0;
        playerHealth = 100;
        currentLevel = 1;
        bullets = [];
        enemies = [];
        powerUps = [];
        boss = null;
        updateGameInfo();

        // 重置游戏时间和击败的敌人数量
        gameTime = 0;
        enemiesDefeated = 0;

        // 重置波次相关变量
        currentWave = 0;
        enemiesInWave = 0;
        enemiesPerWave = 1;

        console.log('开始第一波敌人');
        startNextWave();

        document.getElementById('difficulty').addEventListener('change', (e) => {
            difficulty = e.target.value;
        });

        document.getElementById('pause-button').addEventListener('click', togglePause);
        document.getElementById('resume-button').addEventListener('click', togglePause);
        document.getElementById('quit-button').addEventListener('click', quitGame);

        // 设置关卡目标
        setLevelGoal();

        // 延迟播放背景音乐
        setTimeout(() => {
            const backgroundMusic = document.getElementById('background-music');
            backgroundMusic.volume = 0.5;
            backgroundMusic.play().catch(e => console.warn('无法播放背景音乐:', e));
        }, 1000);

        console.log('开始游戏循环');
        gameLoop();

        resizeCanvas(); // 确保游戏开始时画布大小正确

        // 添加键盘事件监听器
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
    }

    // 添加键盘按下事件处理函数
    function handleKeyDown(e) {
        keys[e.key] = true;
    }

    // 添加键盘释放事件处理函数
    function handleKeyUp(e) {
        keys[e.key] = false;
    }

    // 添加新的函数来开始下一波敌人
    function startNextWave() {
        currentWave++;
        enemiesInWave = 0;
        clearInterval(enemySpawnInterval);

        // 根据当前波次和得分计算这一波的敌人数量
        enemiesPerWave = Math.min(Math.floor(currentWave / 2) + 1, maxEnemiesPerWave);
        
        // 根据当前得分增加难度
        const difficultyFactor = 1 + (score / 1000); // 每1000分增加一次难度

        enemySpawnInterval = setInterval(() => {
            if (enemiesInWave < enemiesPerWave) {
                spawnEnemy(difficultyFactor);
                enemiesInWave++;
            } else {
                clearInterval(enemySpawnInterval);
            }
        }, 2000 / difficultyFactor); // 随难度增加，成速度加快

        // 设置下一波的定时器
        setTimeout(startNextWave, waveInterval);
    }

    // 游戏主循环
    function gameLoop() {
        try {
            if (gameState === 'playing' && !isPaused) {
                gameTime += 16; // 假设游戏以60FPS运行
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                updatePlayerPosition(); // 新增：更新玩家位置
                drawPlayer();
                updateBullets();
                updateEnemies();
                updatePowerUps();
                
                if (boss) {
                    updateBoss();
                }
                
                checkCollisions();
                updateGameInfo();
                checkLevelGoal();
            }
            requestAnimationFrame(gameLoop);
        } catch (error) {
            console.error('游戏循环中发生错误:', error);
        }
    }

    // 添加更新玩家位置的函数
    function updatePlayerPosition() {
        const speed = 5; // 玩家移动速度
        if (keys['ArrowLeft'] || keys['a']) {
            player.x = Math.max(0, player.x - speed);
        }
        if (keys['ArrowRight'] || keys['d']) {
            player.x = Math.min(canvas.width - player.width, player.x + speed);
        }
        if (keys['ArrowUp'] || keys['w']) {
            player.y = Math.max(0, player.y - speed);
        }
        if (keys['ArrowDown'] || keys['s']) {
            player.y = Math.min(canvas.height - player.height, player.y + speed);
        }
    }

    // 修改 drawPlayer 函数
    function drawPlayer() {
        const playerWidth = canvas.width * 0.1; // 玩家宽度为画布宽度的 10%
        const playerHeight = canvas.height * 0.05; // 玩家高度为画布高度的 5%
        if (playerImg.complete && playerImg.naturalWidth !== 0) {
            ctx.drawImage(playerImg, player.x, player.y, playerWidth, playerHeight);
        } else {
            ctx.fillStyle = 'blue';
            ctx.fillRect(player.x, player.y, playerWidth, playerHeight);
        }
    }

    // 修改 updateBullets 函数
    function updateBullets() {
        bullets = bullets.filter(bullet => bullet.y > 0 && bullet.y < canvas.height && bullet.x > 0 && bullet.x < canvas.width);
        bullets.forEach(bullet => {
            if (bullet.type === 'enemy') {
                bullet.y += bullet.speed;
            } else {
                bullet.y -= bullet.speed;
                if (bullet.pattern === 'zigzag') {
                    bullet.x += Math.sin(bullet.y * 0.1) * 2;
                } else if (bullet.pattern === 'spiral') {
                    let angle = bullet.y * 0.1;
                    bullet.x += Math.cos(angle) * 2;
                }
            }
            if (bulletImg.complete && bulletImg.naturalWidth !== 0) {
                ctx.drawImage(bulletImg, bullet.x, bullet.y, bullet.width, bullet.height);
            } else {
                ctx.fillStyle = 'yellow';
                ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
            }
        });
    }

    // 修改 spawnEnemy 函数
    function spawnEnemy(difficultyFactor) {
        const types = Object.keys(enemyTypes);
        const type = types[Math.floor(Math.random() * types.length)];
        const enemyType = enemyTypes[type];

        const enemy = {
            x: Math.random() * (canvas.width - 30),
            y: -30,
            width: 30,
            height: 30,
            health: Math.ceil(enemyType.health * difficultyFactor),
            speed: enemyType.speed * (0.5 + (currentLevel * 0.05) * difficultyFactor),
            color: enemyType.color,
            points: enemyType.points,
            shootTimer: 0,
            shootInterval: Math.max(3000 - currentLevel * 100, 1000),
            type: type
        };
        enemies.push(enemy);
    }

    // 修改 updateEnemies 函数
    function updateEnemies() {
        enemies = enemies.filter(enemy => enemy.y < canvas.height && enemy.health > 0);
        enemies.forEach(enemy => {
            enemy.y += enemy.speed;
            if (enemyImg.complete && enemyImg.naturalWidth !== 0) {
                ctx.drawImage(enemyImg, enemy.x, enemy.y, enemy.width, enemy.height);
            } else {
                ctx.fillStyle = enemy.color;
                ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            }

            if (enemy.type === 'bomber' && Math.random() < 0.01) {
                enemyShoot(enemy);
            }

            enemy.shootTimer += 16;
            if (enemy.shootTimer >= enemy.shootInterval) {
                enemyShoot(enemy);
                enemy.shootTimer = 0;
            }
        });
    }

    // 添加敌人射击函数
    function enemyShoot(enemy) {
        bullets.push({
            x: enemy.x + enemy.width / 2,
            y: enemy.y + enemy.height,
            width: 5,
            height: 10,
            speed: 3,
            type: 'enemy'
        });
    }

    // 修改 updatePowerUps 函数
    function updatePowerUps() {
        powerUps = powerUps.filter(powerUp => powerUp.y < canvas.height);
        powerUps.forEach(powerUp => {
            powerUp.y += 1;
            if (powerUpImg.complete && powerUpImg.naturalWidth !== 0) {
                ctx.drawImage(powerUpImg, powerUp.x, powerUp.y, powerUp.width, powerUp.height);
            } else {
                ctx.fillStyle = 'green';
                ctx.fillRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height);
            }
        });
    }

    // 更新Boss
    function updateBoss() {
        boss.update();
        boss.draw(ctx);
    }

    // 修改 checkCollisions 函数
    function checkCollisions() {
        // 玩家子弹与敌人碰撞
        for (let i = bullets.length - 1; i >= 0; i--) {
            if (bullets[i].type !== 'enemy') {
                for (let j = enemies.length - 1; j >= 0; j--) {
                    if (isColliding(bullets[i], enemies[j])) {
                        enemies[j].health--;
                        bullets.splice(i, 1);
                        if (enemies[j].health <= 0) {
                            score += enemies[j].points * currentLevel;
                            playerExperience += enemies[j].points;
                            enemies.splice(j, 1);
                            enemiesDefeated++;
                            explosionSound.play().catch(e => console.warn('无法播放音效:', e));
                            checkLevelUp();
                        }
                        break;
                    }
                }
            }
        }

        // 敌人子弹与玩家碰撞
        for (let i = bullets.length - 1; i >= 0; i--) {
            if (bullets[i].type === 'enemy' && isColliding(bullets[i], player)) {
                bullets.splice(i, 1);
                playerHealth -= 10;
                if (playerHealth <= 0) {
                    gameOver();
                }
            }
        }

        // 玩家与敌人碰撞
        enemies.forEach((enemy, index) => {
            if (isColliding(player, enemy)) {
                enemies.splice(index, 1);
                playerHealth -= 10;
                if (playerHealth <= 0) {
                    gameOver();
                }
            }
        });

        // 玩家与Boss碰撞
        if (boss && isColliding(player, boss)) {
            playerHealth -= 20;
            if (playerHealth <= 0) {
                gameOver();
            }
        }

        // 玩家与道具碰撞
        powerUps.forEach((powerUp, index) => {
            if (isColliding(player, powerUp)) {
                powerUps.splice(index, 1);
                switch (powerUp.type) {
                    case 'health':
                        playerHealth = Math.min(playerHealth + 20, 100);
                        break;
                    case 'doubleBullet':
                        playerBulletType = 'double';
                        setTimeout(() => { playerBulletType = 'normal'; }, 10000);
                        break;
                    case 'zigzagBullet':
                        playerBulletType = 'zigzag';
                        setTimeout(() => { playerBulletType = 'normal'; }, 10000);
                        break;
                    case 'spiralBullet':
                        playerBulletType = 'spiral';
                        setTimeout(() => { playerBulletType = 'normal'; }, 10000);
                        break;
                }
                powerUpSound.play().catch(e => console.warn('无法播放音效:', e));
            }
        });
    }

    // 碰撞检测
    function isColliding(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    // 修改 spawnPowerUp 函数
    function spawnPowerUp() {
        const powerUpTypes = ['health', 'doubleBullet', 'zigzagBullet', 'spiralBullet'];
        const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];

        powerUps.push({
            x: Math.random() * (canvas.width - 20),
            y: 0,
            width: 20,
            height: 20,
            type: randomType
        });
    }

    // 关卡完成
    function levelComplete() {
        currentLevel++;
        levelCompleteSound.play().catch(e => console.warn('无法播放音效:', e));
        
        // 增加每波敌人的最大数量
        maxEnemiesPerWave = Math.min(maxEnemiesPerWave + 1, 15);
        
        // 减少波次间隔时间，但不少于5000毫秒
        waveInterval = Math.max(waveInterval - 500, 5000);
        
        // 清空当前的敌人
        enemies = [];
        
        // 显示"下一关"消息
        showLevelMessage();
    }

    // 添加显示关卡消息的函数
    function showLevelMessage() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'white';
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`第 ${currentLevel} 关`, canvas.width / 2, canvas.height / 2 - 30);
        ctx.fillText('准备开始！', canvas.width / 2, canvas.height / 2 + 30);
        
        // 3秒后开始新关卡
        setTimeout(() => {
            if (currentLevel % 5 === 0) {
                spawnBoss();
            }
        }, 3000);
    }

    // 生成Boss
    function spawnBoss() {
        boss = {
            x: canvas.width / 2 - 50,
            y: 50,
            width: 100,
            height: 100,
            health: 50 * currentLevel,
            maxHealth: 50 * currentLevel,
            speed: 1, // 降低Boss的移动速度
            direction: 1,
            update: function() {
                this.x += this.speed * this.direction;
                if (this.x <= 0 || this.x + this.width >= canvas.width) {
                    this.direction *= -1;
                }
            },
            draw: function(ctx) {
                ctx.fillStyle = 'red';
                ctx.fillRect(this.x, this.y, this.width, this.height);

                // 绘制血条
                const healthBarWidth = this.width;
                const healthBarHeight = 10;
                const healthPercentage = this.health / this.maxHealth;

                ctx.fillStyle = 'gray';
                ctx.fillRect(this.x, this.y - 20, healthBarWidth, healthBarHeight);

                ctx.fillStyle = 'green';
                ctx.fillRect(this.x, this.y - 20, healthBarWidth * healthPercentage, healthBarHeight);
            }
        };
    }

    // 游戏结束
    function gameOver() {
        gameState = 'gameOver';
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('highScore', highScore);
        }
        document.getElementById('game-screen').style.display = 'none';
        document.getElementById('game-over-screen').style.display = 'flex';
        document.getElementById('final-score').textContent = score;
        document.getElementById('new-high-score').textContent = highScore;
        document.getElementById('final-level').textContent = currentLevel;
    }

    // 修改游戏更新函数
    function updateGame() {
        if (isPaused) return;

        // 现有的更新代码...

        // 根据难度调整游戏参数
        const difficultyMultiplier = difficulty === 'easy' ? 0.8 : (difficulty === 'hard' ? 1.2 : 1);
        enemySpawnRate *= difficultyMultiplier;
        enemySpeed *= difficultyMultiplier;

        // 生成道具
        if (Math.random() < 0.005) {
            spawnPowerup();
        }

        // 更新道具
        updatePowerups();

        // 检测玩家与道具的碰撞
        checkPowerupCollisions();
    }

    // 添加道具相关函数
    function spawnPowerup() {
        // 创建新的道具对象并添加到 powerups 数组
    }

    function updatePowerups() {
        // 更新道具位置，移除屏幕外的道具
    }

    function checkPowerupCollisions() {
        // 检测玩家与道具的碰撞，应用道具效果
    }

    // 添加玩家射击函数
    function playerShoot() {
        if (Date.now() - playerBulletTimer < PLAYER_BULLET_COOLDOWN) return;

        playerBulletTimer = Date.now();

        let bulletPattern;
        switch (playerBulletType) {
            case 'zigzag':
                bulletPattern = 'zigzag';
                break;
            case 'spiral':
                bulletPattern = 'spiral';
                break;
            default:
                bulletPattern = 'normal';
        }

        if (playerSkill === '快速射击') {
            PLAYER_BULLET_COOLDOWN = 150;
        } else if (playerSkill === '穿透子弹') {
            bulletPattern = 'piercing';
        } else if (playerSkill === '范围攻击') {
            for (let i = -1; i <= 1; i++) {
                bullets.push({
                    x: player.x + player.width / 2 - 2.5 + i * 10,
                    y: player.y,
                    width: 5,
                    height: 10,
                    speed: 7,
                    type: 'player',
                    pattern: bulletPattern
                });
            }
        } else {
            bullets.push({
                x: player.x + player.width / 2 - 2.5,
                y: player.y,
                width: 5,
                height: 10,
                speed: 7,
                type: 'player',
                pattern: bulletPattern
            });
        }

        const shootSound = document.getElementById('shoot-sound');
        shootSound.currentTime = 0;
        shootSound.play().catch(e => console.warn('无法播放音效:', e));
    }

    // 修改敌人被击中函数以添加音效
    function enemyHit(enemy) {
        // 现有的敌人被击中代码...
        const explosionSound = document.getElementById('explosion-sound');
        explosionSound.currentTime = 0;
        explosionSound.play().catch(e => console.warn('无法播放音效:', e));
    }

    // 修改道具拾取函数以添加音效
    function powerupCollected(powerup) {
        // 应用道具效果...
        const powerupSound = document.getElementById('powerup-sound');
        powerupSound.currentTime = 0;
        powerupSound.play().catch(e => console.warn('无法播放音效:', e));
    }

    // 添加升级系统
    function checkLevelUp() {
        if (playerExperience >= levelGoal) {
            playerLevel++;
            playerExperience -= levelGoal;
            levelGoal *= 1.5;
            playerHealth = 100; // 升级时恢复生命值
            showLevelUpMessage();
        }
    }

    function showLevelUpMessage() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'white';
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`升级到 ${playerLevel} 级！`, canvas.width / 2, canvas.height / 2 - 30);
        ctx.fillText('选择一个技能：', canvas.width / 2, canvas.height / 2 + 30);

        // 显示技能选择按钮
        showSkillButtons();
    }

    function showSkillButtons() {
        const skills = ['快速射击', '穿透子弹', '范围攻击'];
        skills.forEach((skill, index) => {
            const button = document.createElement('button');
            button.textContent = skill;
            button.style.position = 'absolute';
            button.style.left = `${(index + 1) * 100}px`;
            button.style.top = `${canvas.height / 2 + 100}px`;
            button.onclick = () => selectSkill(skill);
            document.body.appendChild(button);
        });
    }

    function selectSkill(skill) {
        playerSkill = skill;
        // 移除技能选择按钮
        document.querySelectorAll('button').forEach(button => button.remove());
        gameState = 'playing';
    }

    function setLevelGoal() {
        const goals = ['消灭50个敌人', '获得1000分', '生存2分钟'];
        currentGoal = goals[Math.floor(Math.random() * goals.length)];
        document.getElementById('level-goal').textContent = currentGoal;
    }

    function checkLevelGoal() {
        let goalCompleted = false;
        switch (currentGoal) {
            case '消灭50个敌人':
                if (enemiesDefeated >= 50) goalCompleted = true;
                break;
            case '获得1000分':
                if (score >= 1000) goalCompleted = true;
                break;
            case '生存2分钟':
                if (gameTime >= 120000) goalCompleted = true;
                break;
        }

        if (goalCompleted) {
            levelComplete();
        }
    }

    // 修改 updateGameInfo 函数
    function updateGameInfo() {
        const elements = {
            'score': score,
            'health': playerHealth,
            'level': playerLevel,
            'experience': `${playerExperience}/${Math.floor(levelGoal)}`,
            'skill': playerSkill || '无',
            'level-goal': currentGoal
        };

        for (const [id, value] of Object.entries(elements)) {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            } else {
                console.warn(`Element with id '${id}' not found`);
            }
        }
    }

    function getBulletTypeText() {
        switch (playerBulletType) {
            case 'double': return '双发';
            case 'zigzag': return '之字形';
            case 'spiral': return '螺旋形';
            default: return '普通';
        }
    }

    // 事件监听器
    document.getElementById('start-button').addEventListener('click', () => {
        gameState = 'playing';
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('game-screen').style.display = 'block';
        if (imagesLoaded === totalImages) {
            initGame();
        } else {
            // 如果图像还没有加载完成，显示加载消息
            ctx.fillStyle = 'white';
            ctx.font = '20px Arial';
            ctx.fillText('Loading...', canvas.width / 2 - 40, canvas.height / 2);
        }
    });

    document.getElementById('restart-button').addEventListener('click', () => {
        gameState = 'playing';
        document.getElementById('game-over-screen').style.display = 'none';
        document.getElementById('game-screen').style.display = 'block';
        initGame();
    });

    document.getElementById('pause-button').addEventListener('click', () => {
        if (gameState === 'playing') {
            gameState = 'paused';
            document.getElementById('pause-button').textContent = '继续';
        } else if (gameState === 'paused') {
            gameState = 'playing';
            document.getElementById('pause-button').textContent = '暂停';
        }
    });

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && gameState === 'playing' && player) {
            playerShoot();
        }
    });

    // 加载保存的最高分
    const savedHighScore = localStorage.getItem('highScore');
    if (savedHighScore) {
        highScore = parseInt(savedHighScore);
        const highScoreElement = document.getElementById('high-score');
        if (highScoreElement) {
            highScoreElement.textContent = highScore;
        }
    }

    // 添加暂停功能
    function togglePause() {
        isPaused = !isPaused;
        if (isPaused) {
            document.getElementById('pause-menu').style.display = 'block';
            document.getElementById('game-screen').style.display = 'none';
        } else {
            document.getElementById('pause-menu').style.display = 'none';
            document.getElementById('game-screen').style.display = 'block';
        }
    }

    function quitGame() {
        // 停止游戏循环
        // 显示开始屏幕
        // 重置游戏状态
    }

    // 添加背景颜色选择功能
    const backgroundSelect = document.createElement('select');
    backgroundSelect.id = 'background-select';
    const lightOption = document.createElement('option');
    lightOption.value = 'light';
    lightOption.textContent = '浅色背景';
    const darkOption = document.createElement('option');
    darkOption.value = 'dark';
    darkOption.textContent = '深色背景';
    backgroundSelect.appendChild(lightOption);
    backgroundSelect.appendChild(darkOption);
    document.getElementById('difficulty-select').after(backgroundSelect);

    backgroundSelect.addEventListener('change', (e) => {
        if (e.target.value === 'dark') {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    });

    // 调整游戏画布大小
    function resizeCanvas() {
        const container = document.getElementById('game-container');
        const canvas = document.getElementById('game-canvas');
        const aspectRatio = 2 / 3; // 保持 3:2 的宽高比
        let newWidth = container.clientWidth;
        let newHeight = container.clientHeight;

        if (newWidth / newHeight > aspectRatio) {
            newWidth = newHeight * aspectRatio;
        } else {
            newHeight = newWidth / aspectRatio;
        }

        canvas.width = newWidth;
        canvas.height = newHeight;
        canvas.style.width = `${newWidth}px`;
        canvas.style.height = `${newHeight}px`;
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas(); // 初始调整
});