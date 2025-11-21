// 全局变量定义
let ctx, canvas;
let gameState = 'start';
let gameTime = 0;
let score = 0;
let highScore = 0;
let keys = {};
let isPaused = false;
let difficulty = 'normal';

// 游戏实体数组
let player;
let bullets = [];
let enemies = [];
let powerUps = [];
let particles = []; // 新增：粒子系统
let floatingTexts = []; // 新增：漂浮文字
let boss = null;

// 视觉增强变量
let screenShake = 0;
let backgroundStars = [];

// 游戏资源
let imagesLoaded = 0;
const totalImages = 4;
const playerImg = new Image();
const enemyImg = new Image();
const bulletImg = new Image();
const powerUpImg = new Image();

// 音频资源
const shootSound = document.getElementById('shoot-sound');
const explosionSound = document.getElementById('explosion-sound');
const powerUpSound = document.getElementById('powerup-sound');
const levelCompleteSound = document.getElementById('level-complete-sound'); // 假设HTML里加了这个，如果没有也没事

// 游戏参数
let currentLevel = 1;
let playerHealth = 100;
let playerMaxHealth = 100;
let playerExperience = 0;
let levelGoal = 100;
let playerLevel = 1;
let playerSkill = null;
let currentGoal;
let enemiesDefeated = 0;

// 波次控制
let enemySpawnInterval;
let currentWave = 0;
let enemiesInWave = 0;
let enemiesPerWave = 1;
let maxEnemiesPerWave = 10;
let waveInterval = 10000;

// 玩家射击
let playerBulletType = 'normal';
let playerBulletTimer = 0;
let PLAYER_BULLET_COOLDOWN = 300;

// 敌人配置
const enemyTypes = {
    normal: { health: 1, speed: 1, color: '#ff4444', points: 10, width: 30, height: 30 },
    fast: { health: 1, speed: 2.5, color: '#ffff00', points: 20, width: 25, height: 25 },
    tank: { health: 4, speed: 0.6, color: '#00ff00', points: 30, width: 40, height: 40 },
    bomber: { health: 2, speed: 1.2, color: '#bd00ff', points: 25, width: 35, height: 35 }
};

// --- 辅助类：视觉效果 ---

// 星空背景
class Star {
    constructor() {
        this.reset();
        this.y = Math.random() * canvas.height;
    }
    reset() {
        this.x = Math.random() * canvas.width;
        this.y = -10;
        this.z = Math.random() * 2 + 0.5; // 深度/速度
        this.size = Math.random() * 1.5;
        this.opacity = Math.random() * 0.5 + 0.3;
    }
    update() {
        this.y += this.z * (difficulty === 'hard' ? 1.5 : 1);
        if (this.y > canvas.height) this.reset();
    }
    draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// 粒子效果
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 1.0;
        this.decay = Math.random() * 0.03 + 0.02;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, 3, 3);
        ctx.restore();
    }
}

// 漂浮文字
class FloatingText {
    constructor(text, x, y, color) {
        this.text = text;
        this.x = x;
        this.y = y;
        this.color = color;
        this.life = 1.0;
        this.vy = -1;
    }
    update() {
        this.y += this.vy;
        this.life -= 0.02;
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.font = "bold 16px Arial";
        ctx.shadowColor = "black";
        ctx.shadowBlur = 2;
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

// --- 初始化 ---

function domReady(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
}

domReady(() => {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // 加载图片
    const imgLoadHandler = (name) => {
        console.log(`${name} loaded`);
        imagesLoaded++;
        if (imagesLoaded === totalImages) console.log('All images loaded');
    };
    const imgErrorHandler = (name) => {
        console.warn(`${name} failed to load, using fallback graphics`);
        imagesLoaded++; // 即使失败也继续，我们有 Canvas 绘图兜底
    };

    playerImg.onload = () => imgLoadHandler('player');
    playerImg.onerror = () => imgErrorHandler('player');
    playerImg.src = 'player.png';

    enemyImg.onload = () => imgLoadHandler('enemy');
    enemyImg.onerror = () => imgErrorHandler('enemy');
    enemyImg.src = 'enemy.png';

    bulletImg.onload = () => imgLoadHandler('bullet');
    bulletImg.onerror = () => imgErrorHandler('bullet');
    bulletImg.src = 'bullet.png';

    powerUpImg.onload = () => imgLoadHandler('powerup');
    powerUpImg.onerror = () => imgErrorHandler('powerup');
    powerUpImg.src = 'powerup.png';

    // 初始化星空
    for(let i=0; i<100; i++) backgroundStars.push(new Star());

    // UI 事件绑定
    document.getElementById('start-button').addEventListener('click', () => {
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('game-screen').style.display = 'block';
        initGame();
    });

    document.getElementById('difficulty').addEventListener('change', (e) => {
        difficulty = e.target.value;
    });

    document.getElementById('pause-button').addEventListener('click', togglePause);
    document.getElementById('resume-button').addEventListener('click', togglePause);
    
    document.getElementById('quit-button').addEventListener('click', () => {
        isPaused = false;
        gameState = 'start';
        document.getElementById('pause-menu').style.display = 'none';
        document.getElementById('game-screen').style.display = 'none';
        document.getElementById('start-screen').style.display = 'flex';
        stopAudio();
    });

    document.getElementById('restart-button').addEventListener('click', () => {
        document.getElementById('game-over-screen').style.display = 'none';
        document.getElementById('game-screen').style.display = 'block';
        initGame();
    });

    // 键盘控制
    window.addEventListener('keydown', (e) => {
        keys[e.key] = true;
        if (e.code === 'Space' && gameState === 'playing' && !isPaused) playerShoot();
        if (e.key === 'Escape') togglePause();
    });
    window.addEventListener('keyup', (e) => keys[e.key] = false);

    // 背景音乐
    const bgMusic = document.getElementById('background-music');
    bgMusic.volume = 0.4;

    gameLoop();
});

function resizeCanvas() {
    const container = document.getElementById('game-container');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    if(player) { // 确保玩家不跑出屏幕
        player.x = Math.min(player.x, canvas.width - player.width);
        player.y = Math.min(player.y, canvas.height - player.height);
    }
}

function initGame() {
    gameState = 'playing';
    score = 0;
    gameTime = 0;
    enemiesDefeated = 0;
    playerHealth = 100;
    currentLevel = 1;
    playerExperience = 0;
    playerLevel = 1;
    levelGoal = 100;
    playerSkill = null;
    
    player = {
        x: canvas.width / 2 - 20,
        y: canvas.height - 80,
        width: 40,
        height: 40
    };

    bullets = [];
    enemies = [];
    powerUps = [];
    particles = [];
    floatingTexts = [];
    boss = null;
    currentWave = 0;
    
    updateGameInfo();
    setLevelGoal();
    startNextWave();
    
    document.getElementById('background-music').play().catch(e => console.warn('Autoplay prevented'));
}

function togglePause() {
    if (gameState !== 'playing' && gameState !== 'paused') return;
    isPaused = !isPaused;
    
    const pauseMenu = document.getElementById('pause-menu');
    pauseMenu.style.display = isPaused ? 'flex' : 'none';
    gameState = isPaused ? 'paused' : 'playing';
}

function stopAudio() {
    const bgMusic = document.getElementById('background-music');
    bgMusic.pause();
    bgMusic.currentTime = 0;
}

// --- 游戏主循环 ---

function gameLoop() {
    requestAnimationFrame(gameLoop);

    // 绘制背景（始终运行）
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制星空
    backgroundStars.forEach(star => {
        if (!isPaused) star.update();
        star.draw();
    });

    // 震动效果应用
    ctx.save();
    if (screenShake > 0) {
        const dx = (Math.random() - 0.5) * screenShake;
        const dy = (Math.random() - 0.5) * screenShake;
        ctx.translate(dx, dy);
        screenShake *= 0.9;
        if (screenShake < 0.5) screenShake = 0;
    }

    if (gameState === 'playing' && !isPaused) {
        gameTime += 16;
        
        updatePlayerPosition();
        updateBullets();
        updateEnemies();
        updatePowerUps();
        updateParticles();
        updateFloatingTexts();
        
        if (boss) updateBoss();
        
        checkCollisions();
        checkLevelGoal();
        updateGameInfo(); // 现在只在循环里更新UI条
    }

    // 绘制层
    if (gameState !== 'start') {
        drawPowerUps(); // 地面物品
        drawPlayer();
        drawEnemies();
        if (boss) boss.draw(ctx);
        drawBullets();
        drawParticles();
        drawFloatingTexts();
    }

    ctx.restore(); // 结束震动偏移
}

// --- 更新逻辑 ---

function updatePlayerPosition() {
    const speed = 5;
    if (keys['ArrowLeft'] || keys['a']) player.x = Math.max(0, player.x - speed);
    if (keys['ArrowRight'] || keys['d']) player.x = Math.min(canvas.width - player.width, player.x + speed);
    if (keys['ArrowUp'] || keys['w']) player.y = Math.max(0, player.y - speed);
    if (keys['ArrowDown'] || keys['s']) player.y = Math.min(canvas.height - player.height, player.y + speed);
}

function startNextWave() {
    currentWave++;
    enemiesInWave = 0;
    clearInterval(enemySpawnInterval);

    enemiesPerWave = Math.min(Math.floor(currentWave / 1.5) + 2, maxEnemiesPerWave);
    const difficultyFactor = 1 + (score / 2000) + (currentLevel * 0.1);
    const spawnRate = Math.max(2000 / difficultyFactor, 500);

    enemySpawnInterval = setInterval(() => {
        if (enemiesInWave < enemiesPerWave) {
            spawnEnemy(difficultyFactor);
            enemiesInWave++;
        } else {
            clearInterval(enemySpawnInterval);
        }
    }, spawnRate);

    setTimeout(startNextWave, waveInterval);
}

function spawnEnemy(difficultyFactor) {
    const types = Object.keys(enemyTypes);
    // 根据难度增加出现高级敌人的概率
    let type = types[0];
    const rand = Math.random();
    if (currentLevel > 2 && rand < 0.2) type = 'tank';
    else if (currentLevel > 1 && rand < 0.4) type = 'bomber';
    else if (rand < 0.3) type = 'fast';
    
    const enemyType = enemyTypes[type];

    enemies.push({
        x: Math.random() * (canvas.width - enemyType.width),
        y: -40,
        width: enemyType.width,
        height: enemyType.height,
        health: Math.ceil(enemyType.health * difficultyFactor),
        maxHealth: Math.ceil(enemyType.health * difficultyFactor), // 用于血条
        speed: enemyType.speed * (difficulty === 'easy' ? 0.8 : (difficulty === 'hard' ? 1.2 : 1)),
        color: enemyType.color,
        points: enemyType.points,
        shootTimer: Math.random() * 1000,
        shootInterval: Math.max(2500 - currentLevel * 100, 800),
        type: type
    });
}

function updateEnemies() {
    enemies = enemies.filter(e => e.y < canvas.height + 50 && e.health > 0);
    enemies.forEach(enemy => {
        enemy.y += enemy.speed;
        
        enemy.shootTimer += 16;
        if (enemy.shootTimer >= enemy.shootInterval) {
            // 某些敌人会射击
            if (['bomber', 'tank'].includes(enemy.type) || (currentLevel > 3 && Math.random() < 0.3)) {
                enemyShoot(enemy);
            }
            enemy.shootTimer = 0;
        }
    });
}

function enemyShoot(enemy) {
    bullets.push({
        x: enemy.x + enemy.width / 2 - 2.5,
        y: enemy.y + enemy.height,
        width: 5,
        height: 10,
        speed: 4,
        type: 'enemy',
        color: '#ff0000'
    });
}

function updateBullets() {
    bullets = bullets.filter(b => b.y > -20 && b.y < canvas.height + 20 && b.x > -20 && b.x < canvas.width + 20);
    bullets.forEach(b => {
        if (b.type === 'enemy') {
            b.y += b.speed;
        } else {
            b.y -= b.speed;
            if (b.pattern === 'zigzag') b.x += Math.sin(b.y * 0.05) * 3;
            else if (b.pattern === 'spiral') b.x += Math.cos(b.y * 0.1) * 3;
        }
    });
}

function updateParticles() {
    particles.forEach(p => p.update());
    particles = particles.filter(p => p.life > 0);
}

function updateFloatingTexts() {
    floatingTexts.forEach(t => t.update());
    floatingTexts = floatingTexts.filter(t => t.life > 0);
}

function updatePowerUps() {
    powerUps.forEach(p => p.y += 1.5);
    powerUps = powerUps.filter(p => p.y < canvas.height);
}

function playerShoot() {
    if (Date.now() - playerBulletTimer < PLAYER_BULLET_COOLDOWN) return;
    playerBulletTimer = Date.now();
    
    if (shootSound) {
        shootSound.currentTime = 0;
        shootSound.play().catch(()=>{});
    }

    const createBullet = (offsetX, pattern) => ({
        x: player.x + player.width / 2 - 2.5 + offsetX,
        y: player.y,
        width: 5,
        height: 12,
        speed: 8,
        type: 'player',
        pattern: pattern,
        color: '#00ffff'
    });

    let pattern = playerBulletType;
    if (playerSkill === '穿透子弹') pattern = 'piercing';

    if (playerBulletType === 'double' || playerSkill === '范围攻击') {
        bullets.push(createBullet(-10, pattern));
        bullets.push(createBullet(10, pattern));
    } else if (playerSkill === '范围攻击' || playerBulletType === 'triple') {
         bullets.push(createBullet(0, pattern));
         bullets.push(createBullet(-15, 'zigzag'));
         bullets.push(createBullet(15, 'zigzag'));
    } else {
        bullets.push(createBullet(0, pattern));
    }
}

// --- 碰撞检测 ---

function checkCollisions() {
    // 子弹击中敌人
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        if (b.type === 'player') {
            for (let j = enemies.length - 1; j >= 0; j--) {
                let e = enemies[j];
                if (isColliding(b, e)) {
                    e.health--;
                    // 创建击中小粒子
                    particles.push(new Particle(b.x, b.y, '#fff'));
                    
                    if (b.pattern !== 'piercing') bullets.splice(i, 1);

                    if (e.health <= 0) {
                        killEnemy(e, j);
                    }
                    break; // 子弹已销毁（除非穿透），跳出敌人循环
                }
            }
            // Boss 碰撞
            if (boss && isColliding(b, boss)) {
                 boss.health--;
                 particles.push(new Particle(b.x, b.y, '#fff'));
                 if (b.pattern !== 'piercing') bullets.splice(i, 1);
                 if (boss.health <= 0) killBoss();
            }
        }
    }

    // 玩家被击中
    // 1. 敌人子弹
    for (let i = bullets.length - 1; i >= 0; i--) {
        if (bullets[i].type === 'enemy' && isColliding(bullets[i], player)) {
            bullets.splice(i, 1);
            takeDamage(10);
        }
    }
    // 2. 撞击敌人
    enemies.forEach((e, idx) => {
        if (isColliding(player, e)) {
            killEnemy(e, idx);
            takeDamage(20);
        }
    });
    // 3. 撞击Boss
    if (boss && isColliding(player, boss)) {
        takeDamage(1); // Boss持续伤害
    }

    // 道具拾取
    powerUps.forEach((p, idx) => {
        if (isColliding(player, p)) {
            collectPowerUp(p);
            powerUps.splice(idx, 1);
        }
    });
}

function isColliding(r1, r2) {
    return r1.x < r2.x + r2.width &&
           r1.x + r1.width > r2.x &&
           r1.y < r2.y + r2.height &&
           r1.y + r1.height > r2.y;
}

function killEnemy(enemy, index) {
    enemies.splice(index, 1);
    score += enemy.points * currentLevel;
    playerExperience += enemy.points;
    enemiesDefeated++;
    
    // 视觉效果
    createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.color, 10);
    floatingTexts.push(new FloatingText(`+${enemy.points}`, enemy.x, enemy.y, '#ffff00'));
    
    if(explosionSound) {
        explosionSound.currentTime = 0;
        explosionSound.play().catch(()=>{});
    }
    
    // 掉落道具
    if (Math.random() < 0.1) spawnPowerUp(enemy.x, enemy.y);
    
    checkLevelUp();
}

function killBoss() {
    score += 500 * currentLevel;
    createExplosion(boss.x + boss.width/2, boss.y + boss.height/2, 'red', 50);
    screenShake = 20;
    boss = null;
    // Boss死后必定升级或掉落大奖，这里简化为大量经验
    playerExperience += 500;
    checkLevelUp();
}

function createExplosion(x, y, color, count) {
    for(let i=0; i<count; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function takeDamage(amount) {
    playerHealth -= amount;
    screenShake = 5;
    floatingTexts.push(new FloatingText(`-${amount}`, player.x, player.y, 'red'));
    
    if (playerHealth <= 0) {
        gameOver();
    }
}

function spawnPowerUp(x, y) {
    const types = ['health', 'doubleBullet', 'zigzagBullet', 'spiralBullet'];
    const type = types[Math.floor(Math.random() * types.length)];
    powerUps.push({ x, y, width: 20, height: 20, type });
}

function collectPowerUp(p) {
    if(powerUpSound) powerUpSound.play().catch(()=>{});
    
    let msg = "";
    switch (p.type) {
        case 'health':
            playerHealth = Math.min(playerHealth + 30, 100);
            msg = "HP +30";
            break;
        case 'doubleBullet':
            playerBulletType = 'double';
            setTimeout(() => playerBulletType = 'normal', 10000);
            msg = "双重火力";
            break;
        case 'zigzagBullet':
            playerBulletType = 'zigzag';
            setTimeout(() => playerBulletType = 'normal', 10000);
            msg = "S型弹幕";
            break;
        case 'spiralBullet':
            playerBulletType = 'spiral';
            setTimeout(() => playerBulletType = 'normal', 10000);
            msg = "螺旋弹幕";
            break;
    }
    floatingTexts.push(new FloatingText(msg, player.x, player.y - 20, '#00ff00'));
}

// --- 绘制函数 (视觉美化核心) ---

function drawPlayer() {
    if (playerImg.complete && playerImg.naturalWidth !== 0) {
        ctx.drawImage(playerImg, player.x, player.y, player.width, player.height);
    } else {
        // Fallback 图形
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00f3ff';
        ctx.fillStyle = '#00f3ff';
        // 画一个三角形飞机
        ctx.beginPath();
        ctx.moveTo(player.x + player.width/2, player.y);
        ctx.lineTo(player.x + player.width, player.y + player.height);
        ctx.lineTo(player.x, player.y + player.height);
        ctx.fill();
        ctx.restore();
    }
    
    // 绘制喷射火焰
    if (!isPaused) {
        ctx.fillStyle = `rgba(0, 255, 255, ${Math.random() * 0.5 + 0.2})`;
        ctx.beginPath();
        ctx.moveTo(player.x + 10, player.y + player.height);
        ctx.lineTo(player.x + player.width/2, player.y + player.height + Math.random()*20 + 10);
        ctx.lineTo(player.x + player.width - 10, player.y + player.height);
        ctx.fill();
    }
}

function drawEnemies() {
    enemies.forEach(enemy => {
        if (enemyImg.complete && enemyImg.naturalWidth !== 0) {
            ctx.drawImage(enemyImg, enemy.x, enemy.y, enemy.width, enemy.height);
        } else {
            ctx.save();
            ctx.shadowBlur = 10;
            ctx.shadowColor = enemy.color;
            ctx.fillStyle = enemy.color;
            ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            ctx.restore();
        }
        
        // 绘制小血条（如果有伤害）
        if (enemy.health < enemy.maxHealth) {
            ctx.fillStyle = 'red';
            ctx.fillRect(enemy.x, enemy.y - 5, enemy.width, 3);
            ctx.fillStyle = '#0f0';
            ctx.fillRect(enemy.x, enemy.y - 5, enemy.width * (enemy.health / enemy.maxHealth), 3);
        }
    });
}

function drawBullets() {
    bullets.forEach(bullet => {
        if (bulletImg.complete && bulletImg.naturalWidth !== 0) {
            ctx.drawImage(bulletImg, bullet.x, bullet.y, bullet.width, bullet.height);
        } else {
            ctx.save();
            ctx.shadowBlur = 5;
            ctx.shadowColor = bullet.color || 'yellow';
            ctx.fillStyle = bullet.color || 'yellow';
            ctx.beginPath();
            ctx.arc(bullet.x + bullet.width/2, bullet.y + bullet.height/2, 3, 0, Math.PI*2);
            ctx.fill();
            ctx.restore();
        }
    });
}

function drawPowerUps() {
    powerUps.forEach(p => {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00ff00';
        if (powerUpImg.complete && powerUpImg.naturalWidth !== 0) {
            ctx.drawImage(powerUpImg, p.x, p.y, p.width, p.height);
        } else {
            ctx.fillStyle = '#00ff00';
            ctx.beginPath();
            ctx.arc(p.x + 10, p.y + 10, 8, 0, Math.PI*2);
            ctx.fill();
            // 内部文字
            ctx.fillStyle = 'black';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('?', p.x + 10, p.y + 14);
        }
        ctx.restore();
    });
}

function drawParticles() {
    particles.forEach(p => p.draw());
}

function drawFloatingTexts() {
    floatingTexts.forEach(t => t.draw());
}

// --- UI 更新与升级 ---

function updateGameInfo() {
    // 更新分数
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = playerLevel;
    document.getElementById('skill').textContent = playerSkill || 'NORMAL';
    document.getElementById('level-goal').textContent = currentGoal;
    
    // 更新血条UI宽度
    const hpPercent = Math.max(0, (playerHealth / 100) * 100);
    document.getElementById('hp-bar-fill').style.width = `${hpPercent}%`;
    document.getElementById('health').textContent = Math.floor(playerHealth);

    // 更新经验条
    const expPercent = Math.min(100, (playerExperience / levelGoal) * 100);
    document.getElementById('exp-bar-fill').style.width = `${expPercent}%`;
    document.getElementById('experience').textContent = `${Math.floor(playerExperience)}/${Math.floor(levelGoal)}`;
}

function checkLevelUp() {
    if (playerExperience >= levelGoal) {
        playerLevel++;
        playerExperience -= levelGoal;
        levelGoal *= 1.5;
        playerHealth = 100;
        
        // 暂停游戏显示升级选项
        showLevelUpOptions();
    }
}

function showLevelUpOptions() {
    gameState = 'paused'; // 临时暂停逻辑，但不显示暂停菜单
    
    // 清除已有的按钮
    const existingBtns = document.querySelectorAll('.skill-btn');
    existingBtns.forEach(b => b.remove());

    const skills = ['快速射击', '穿透子弹', '范围攻击'];
    
    // 创建遮罩层
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0,0,canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SYSTEM UPGRADE', canvas.width/2, canvas.height/2 - 60);

    skills.forEach((skill, index) => {
        const btn = document.createElement('button');
        btn.textContent = skill;
        btn.className = 'skill-btn';
        btn.style.left = '50%';
        btn.style.top = `${canvas.height/2 + index * 50}px`;
        
        btn.onclick = () => {
            playerSkill = skill;
            if(skill === '快速射击') PLAYER_BULLET_COOLDOWN = 150;
            
            // 清除按钮并恢复游戏
            document.querySelectorAll('.skill-btn').forEach(b => b.remove());
            gameState = 'playing';
        };
        
        document.getElementById('game-container').appendChild(btn);
    });
}

function setLevelGoal() {
    const goals = ['消灭50个敌人', '获得1000分', '生存2分钟'];
    currentGoal = goals[Math.floor(Math.random() * goals.length)];
    document.getElementById('level-goal').textContent = currentGoal;
}

function checkLevelGoal() {
    let goalCompleted = false;
    if (currentGoal === '消灭50个敌人' && enemiesDefeated >= 50) goalCompleted = true;
    if (currentGoal === '获得1000分' && score >= 1000) goalCompleted = true;
    if (currentGoal === '生存2分钟' && gameTime >= 120000) goalCompleted = true;

    if (goalCompleted) {
        levelComplete();
    }
}

function levelComplete() {
    if(levelCompleteSound) levelCompleteSound.play().catch(()=>{});
    currentLevel++;
    enemiesDefeated = 0;
    gameTime = 0; // 如果目标是生存，重置时间
    waveInterval = Math.max(waveInterval - 500, 5000);
    setLevelGoal(); // 新目标
    
    floatingTexts.push(new FloatingText("LEVEL UP!", canvas.width/2 - 40, canvas.height/2, '#00ffff'));
    
    if (currentLevel % 5 === 0) spawnBoss();
}

// Boss 逻辑
function spawnBoss() {
    boss = {
        x: canvas.width / 2 - 50,
        y: 60,
        width: 100,
        height: 100,
        health: 50 * currentLevel,
        maxHealth: 50 * currentLevel,
        speed: 1.5,
        direction: 1,
        color: 'red',
        draw: function(ctx) {
            ctx.save();
            ctx.shadowBlur = 20;
            ctx.shadowColor = 'red';
            ctx.fillStyle = '#800000';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            
            // Boss 核心
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height/2, 20, 0, Math.PI*2);
            ctx.fill();
            
            // 血条
            ctx.shadowBlur = 0;
            const hpBarW = 200;
            const hpW = (this.health / this.maxHealth) * hpBarW;
            ctx.fillStyle = '#333';
            ctx.fillRect(canvas.width/2 - hpBarW/2, 20, hpBarW, 15);
            ctx.fillStyle = 'red';
            ctx.fillRect(canvas.width/2 - hpBarW/2, 20, hpW, 15);
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(canvas.width/2 - hpBarW/2, 20, hpBarW, 15);
            
            ctx.restore();
        }
    };
}

function updateBoss() {
    boss.x += boss.speed * boss.direction;
    if (boss.x <= 0 || boss.x + boss.width >= canvas.width) {
        boss.direction *= -1;
    }
    // Boss 射击逻辑可以加在这里
    if (Math.random() < 0.05) {
        bullets.push({
            x: boss.x + boss.width / 2,
            y: boss.y + boss.height,
            width: 10,
            height: 20,
            speed: 5,
            type: 'enemy',
            color: 'orange'
        });
    }
}

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

// 加载存储的最高分
const savedHighScore = localStorage.getItem('highScore');
if (savedHighScore) {
    highScore = parseInt(savedHighScore);
    document.getElementById('high-score').textContent = highScore;
}
